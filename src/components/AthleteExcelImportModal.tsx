import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Trash2,
  Shield,
  Layers,
  Sparkles,
  Check,
  Loader2,
  ClipboardPaste,
  FileText,
  RefreshCw,
  Info,
  Lock,
  LogIn,
} from 'lucide-react';
import { Athlete, Team, UserProfile } from '../types';
import {
  downloadAthleteImportTemplateExcel,
  parseAthletesFromExcel,
  getExcelWorkbookSheets,
  parseAthletesFromClipboardText,
  ParsedAthleteItem,
} from '../services/teamImport';
import { encryptText } from '../services/crypto';

interface AthleteExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  initialTeamFilter?: string;
  existingAthletesCount?: number;
  user?: UserProfile;
  onOpenLogin?: () => void;
  onConfirmImport: (
    importedAthletes: Athlete[],
    cleanMode?: 'none' | 'all' | 'target_teams'
  ) => void;
  onClearAllAthletes?: () => void;
}

export const AthleteExcelImportModal: React.FC<AthleteExcelImportModalProps> = ({
  isOpen,
  onClose,
  teams,
  initialTeamFilter,
  existingAthletesCount = 0,
  user,
  onOpenLogin,
  onConfirmImport,
  onClearAllAthletes,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoggedIn = Boolean(user && user.role && user.role !== 'viewer');
  const [activeInputTab, setActiveInputTab] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');

  // Clean data before import options: 'none' (merge/append), 'target_teams' (wipe athletes of target teams), 'all' (wipe all athletes)
  const [cleanMode, setCleanMode] = useState<'none' | 'all' | 'target_teams'>('none');
  const [showConfirmWipeModal, setShowConfirmWipeModal] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [previewAthletes, setPreviewAthletes] = useState<ParsedAthleteItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Selected default team when importing
  const [targetTeamId, setTargetTeamId] = useState<string>('');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset or initialize state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (initialTeamFilter && initialTeamFilter !== 'ALL') {
        const found = teams.find(
          (t) => t.id === initialTeamFilter || t.name.toLowerCase() === initialTeamFilter.toLowerCase()
        );
        setTargetTeamId(found ? found.id : teams[0]?.id || '');
      } else if (teams.length > 0) {
        setTargetTeamId(teams[0].id);
      }
    } else {
      setFile(null);
      setAvailableSheets([]);
      setSelectedSheet('ALL');
      setPreviewAthletes([]);
      setSelectedIds(new Set());
      setSearchFilter('');
      setTeamFilter('ALL');
      setIsDragOver(false);
      setErrorMessage(null);
      setPastedText('');
      setActiveInputTab('file');
    }
  }, [isOpen, initialTeamFilter, teams]);

  const currentTargetTeam = teams.find((t) => t.id === targetTeamId) || teams[0];

  // Distinct list of teams available (including any newly detected teams from Excel)
  const combinedTeamsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; group: string }>();
    teams.forEach((t) => map.set(t.id, { id: t.id, name: t.name, group: t.group }));

    previewAthletes.forEach((a) => {
      if (a.teamId && !map.has(a.teamId)) {
        map.set(a.teamId, { id: a.teamId, name: a.teamName, group: a.group });
      }
    });

    return Array.from(map.values());
  }, [teams, previewAthletes]);

  const processFile = async (f: File, sheetName = 'ALL') => {
    if (!isLoggedIn) {
      alert('Bạn phải đăng nhập tài khoản để có quyền nhập danh sách vận động viên từ Excel!');
      onOpenLogin?.();
      return;
    }
    setFile(f);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Get sheet names for selector
      const sheets = await getExcelWorkbookSheets(f);
      setAvailableSheets(sheets);

      // 2. Parse athletes
      const targetSheet = sheetName === 'ALL' ? undefined : sheetName;
      const res = await parseAthletesFromExcel(f, teams, targetTeamId || undefined, targetSheet);

      if (res.length === 0) {
        setErrorMessage(
          'Không tìm thấy danh sách vận động viên hợp lệ trong file. Vui lòng kiểm tra lại cấu trúc các cột (Họ và tên, Số áo, Đội/Lớp) hoặc tải file mẫu để đối chiếu.'
        );
      }

      setPreviewAthletes(res);
      setSelectedIds(new Set(res.map((a) => a.id)));
    } catch (err: unknown) {
      console.error('Error parsing Excel file:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(
        `Không thể phân tích file: ${msg}. Vui lòng kiểm tra file không bị khóa mật khẩu và đúng định dạng .xlsx, .xls, .csv.`
      );
      setPreviewAthletes([]);
      setSelectedIds(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected, selectedSheet);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSheetChange = async (newSheet: string) => {
    setSelectedSheet(newSheet);
    if (file) {
      await processFile(file, newSheet);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      await processFile(dropped, 'ALL');
    }
  };

  // Process manual paste data
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      setErrorMessage('Vui lòng dán dữ liệu bảng từ Excel trước khi bấm phân tích.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = parseAthletesFromClipboardText(pastedText, teams, targetTeamId || undefined);
      if (res.length === 0) {
        setErrorMessage(
          'Không tìm thấy dòng dữ liệu vận động viên nào hợp lệ. Vui lòng sao chép các hàng từ Excel có chứa tên học sinh/cầu thủ.'
        );
      }
      setPreviewAthletes(res);
      setSelectedIds(new Set(res.map((a) => a.id)));
    } catch (err: unknown) {
      console.error('Error parsing pasted text:', err);
      setErrorMessage('Đã xảy ra lỗi khi phân tích dữ liệu dán. Vui lòng kiểm tra lại định dạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamChange = (id: string, newTeamId: string) => {
    const targetTeam = combinedTeamsList.find((t) => t.id === newTeamId);
    if (!targetTeam) return;

    setPreviewAthletes((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              teamId: targetTeam.id,
              teamName: targetTeam.name,
              group: targetTeam.group,
              matchMethod: 'manual',
            }
          : a
      )
    );
  };

  // Bulk assign all athletes to a selected team
  const handleAssignAllToTeam = (teamIdToAssign: string) => {
    const targetTeam = combinedTeamsList.find((t) => t.id === teamIdToAssign);
    if (!targetTeam) return;

    setPreviewAthletes((prev) =>
      prev.map((a) => ({
        ...a,
        teamId: targetTeam.id,
        teamName: targetTeam.name,
        group: targetTeam.group,
        matchMethod: 'manual',
      }))
    );
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredAthletes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAthletes.map((a) => a.id)));
    }
  };

  const handleDeleteRow = (id: string) => {
    setPreviewAthletes((prev) => prev.filter((a) => a.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Count by team for badges
  const athletesCountByTeam = useMemo(() => {
    const map: Record<string, number> = {};
    previewAthletes.forEach((a) => {
      map[a.teamName] = (map[a.teamName] || 0) + 1;
    });
    return map;
  }, [previewAthletes]);

  const filteredAthletes = previewAthletes.filter((a) => {
    const matchSearch =
      !searchFilter.trim() ||
      a.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.jerseyNumber.toString().includes(searchFilter) ||
      a.teamName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (a.rawTeamFromExcel && a.rawTeamFromExcel.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchTeam = teamFilter === 'ALL' || a.teamId === teamFilter || a.teamName === teamFilter;
    return matchSearch && matchTeam;
  });

  const handleFinalConfirm = async () => {
    if (!isLoggedIn) {
      alert('Bạn phải đăng nhập tài khoản để có quyền nhập danh sách vận động viên từ Excel!');
      onOpenLogin?.();
      return;
    }

    const toImport = previewAthletes.filter((a) => selectedIds.has(a.id));
    if (toImport.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một vận động viên để nhập vào hệ thống!');
      return;
    }

    setIsLoading(true);

    try {
      const finalAthletes: Athlete[] = [];
      for (const item of toImport) {
        const encId = item.nationalId
          ? await encryptText(item.nationalId)
          : 'e2ee:aXRtc3BvcnRfZW5j';
        const encPhone = item.phone
          ? await encryptText(item.phone)
          : 'e2ee:aXRtc3BvcnRfZW5j';

        const foundTeam = teams.find((t) => t.id === item.teamId || t.name.toLowerCase() === item.teamName.toLowerCase());

        finalAthletes.push({
          id: `A_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${finalAthletes.length + 1}`,
          name: item.name,
          jerseyNumber: item.jerseyNumber,
          teamId: item.teamId,
          teamName: item.teamName,
          group: item.group,
          sportId: foundTeam?.sportId,
          categoryId: foundTeam?.categoryId,
          position: item.position,
          dateOfBirth: item.dateOfBirth,
          nationalIdEncrypted: encId,
          phoneEncrypted: encPhone,
          status: 'approved',
          registeredAt: new Date().toISOString().slice(0, 10),
          goalsOrPoints: 0,
          yellowCards: 0,
          redCards: 0,
          mvpCount: 0,
        });
      }

      onConfirmImport(finalAthletes, cleanMode);
      onClose();
    } catch (err: unknown) {
      console.error('Error confirming athletes import:', err);
      setErrorMessage('Đã xảy ra lỗi khi mã hóa và lưu dữ liệu vận động viên.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToChooseAnotherFile = () => {
    setFile(null);
    setPreviewAthletes([]);
    setSelectedIds(new Set());
    setAvailableSheets([]);
    setSelectedSheet('ALL');
    setErrorMessage(null);
    setPastedText('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-9 h-9 text-indigo-600 animate-spin" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Đang phân tích và xử lý danh sách vận động viên...
            </p>
          </div>
        )}

        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Nhập Danh Sách Vận Động Viên (VĐV)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  Excel / Copy-Paste
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tự động nhận diện đội/lớp qua cột &quot;Đội / Lớp&quot;, tên Sheet hoặc bộ lọc đã chọn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hidden accessible file input - connected via native label */}
        <input
          id="athlete-excel-native-input"
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={handleFileChange}
          className="sr-only"
        />

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Login Requirement Banner if Guest */}
          {!isLoggedIn && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-2xl border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start sm:items-center gap-3 text-amber-900 dark:text-amber-200">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block font-bold text-sm text-amber-950 dark:text-amber-100">
                    Yêu cầu đăng nhập để nhập vận động viên
                  </strong>
                  <span className="text-amber-800 dark:text-amber-300 mt-0.5 block leading-relaxed">
                    Bạn đang ở chế độ xem. Vui lòng đăng nhập tài khoản (Admin, Ban tổ chức, HLV) để có quyền tải lên và nhập danh sách vận động viên vào các đội.
                  </span>
                </div>
              </div>
              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin();
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng Nhập Ngay</span>
                </button>
              )}
            </div>
          )}

          {/* In-app Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-start justify-between gap-3 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Thông báo xử lý file:</span>
                  <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-100 cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Download Template Banner */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50 dark:from-indigo-950/30 dark:via-sky-950/20 dark:to-blue-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-xs sm:text-sm">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Tải file Excel mẫu chuẩn (.xlsx) danh sách VĐV:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Gồm các cột: STT, Họ và Tên, Số Áo, Đội / Lớp, Vị Trí, Ngày Sinh, SĐT, CCCD, Ghi Chú.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadAthleteImportTemplateExcel(currentTargetTeam?.name || '10A1')}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Mẫu VĐV (.xlsx)</span>
            </button>
          </div>

          {/* Chế độ làm sạch dữ liệu cũ để nhập mới */}
          <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200/90 dark:border-amber-800/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-200">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Chế độ làm sạch dữ liệu để nhập mới:</span>
              </div>
              {onClearAllAthletes && existingAthletesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmWipeModal(true)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Xóa trắng toàn bộ dữ liệu VĐV cũ ngay lập tức"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa sạch ngay {existingAthletesCount} VĐV hiện có</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border transition cursor-pointer ${
                  cleanMode === 'none'
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 dark:text-white'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="athleteCleanMode"
                  value="none"
                  checked={cleanMode === 'none'}
                  onChange={() => setCleanMode('none')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <strong className="block font-bold">Gộp dữ liệu (Append)</strong>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Giữ nguyên VĐV hiện có, chỉ bổ sung thêm các VĐV từ file.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border transition cursor-pointer ${
                  cleanMode === 'target_teams'
                    ? 'bg-white dark:bg-slate-900 border-amber-500 ring-2 ring-amber-500/20 text-slate-900 dark:text-white'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="athleteCleanMode"
                  value="target_teams"
                  checked={cleanMode === 'target_teams'}
                  onChange={() => setCleanMode('target_teams')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <strong className="block font-bold text-amber-700 dark:text-amber-300">
                    Làm sạch theo đội
                  </strong>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Chỉ xóa VĐV cũ của các đội có trong file Excel tải lên.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 rounded-xl border transition cursor-pointer ${
                  cleanMode === 'all'
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-200'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="athleteCleanMode"
                  value="all"
                  checked={cleanMode === 'all'}
                  onChange={() => setCleanMode('all')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <strong className="block font-bold text-rose-700 dark:text-rose-300">
                    Làm sạch toàn bộ (Mới)
                  </strong>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Xóa sạch toàn bộ VĐV cũ của giải đấu để nhập mới từ đầu.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* When NO data is loaded yet: Show Upload Options */}
          {previewAthletes.length === 0 && !file && (
            <div className="space-y-4">
              {/* Method Switcher Tabs */}
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveInputTab('file')}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeInputTab === 'file'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Chọn File Excel (.xlsx, .xls, .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInputTab('paste')}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                    activeInputTab === 'paste'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>Dán Trực Tiếp Bảng Excel (Copy-Paste)</span>
                </button>
              </div>

              {/* Tab 1: File Upload Dropzone with Native Label */}
              {activeInputTab === 'file' && (
                <label
                  htmlFor="athlete-excel-native-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition select-none block ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3.5 shadow-xs mx-auto">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="font-extrabold text-base sm:text-lg text-slate-800 dark:text-slate-100 mb-1">
                    {isDragOver ? 'Thả file Excel vào đây ngay' : 'Bấm vào đây hoặc kéo thả file Excel vào đây'}
                  </p>
                  <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                    Hỗ trợ định dạng <strong>.xlsx, .xls, .csv</strong>. Hệ thống tự động phân loại theo cột <strong>Đội / Lớp</strong> hoặc theo bộ lọc hiện tại.
                  </p>
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-xs pointer-events-none">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Chọn File Từ Máy Tính</span>
                  </span>
                </label>
              )}

              {/* Tab 2: Copy-Paste Raw Table Text */}
              {activeInputTab === 'paste' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold mb-1">
                      <Info className="w-4 h-4 text-indigo-600" />
                      <span>Cách sao chép trực tiếp từ Excel / Google Sheets:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      1. Mở file Excel trên máy của bạn &rarr; 2. Bôi đen các hàng dữ liệu VĐV &rarr; 3. Bấm <strong>Ctrl + C</strong> &rarr; 4. Nhấp vào khung bên dưới và bấm <strong>Ctrl + V</strong> &rarr; 5. Bấm &quot;Phân tích dữ liệu dán&quot;.
                    </p>
                  </div>

                  <textarea
                    rows={7}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`Dán bảng dữ liệu VĐV vào đây...\nVí dụ:\n1\tNguyễn Văn Hoàng\t10\t10A1\tTiền đạo\t2010-05-15\n2\tTrần Quốc Bảo\t1\t10A1\tThủ môn\t2010-08-20`}
                    className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPastedText('')}
                      className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      Xóa nội dung
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      disabled={!pastedText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Phân Tích Dữ Liệu Dán</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* When Data IS Loaded: Preview Table & Controls */}
          {previewAthletes.length > 0 && (
            <div className="space-y-4">
              {/* File Info Bar & Switch */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {file ? file.name : 'Dữ liệu dán trực tiếp'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-extrabold text-[10px]">
                    {previewAthletes.length} VĐV tìm thấy
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToChooseAnotherFile}
                    className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Chọn file khác</span>
                  </button>
                </div>
              </div>

              {/* Sheet Selection Pills (if multiple sheets exist in file) */}
              {availableSheets.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                  <span className="text-slate-400 text-[11px] font-semibold shrink-0">Chọn Sheet:</span>
                  <button
                    type="button"
                    onClick={() => handleSheetChange('ALL')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer ${
                      selectedSheet === 'ALL'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Tất cả các sheet ({availableSheets.length})
                  </button>
                  {availableSheets.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSheetChange(s)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer ${
                        selectedSheet === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Team Auto-Detection & Quick Bulk Assignment Bar */}
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Quy tắc phân bổ Đội / Lớp:</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      (Tự động nhận diện theo cột &quot;Đội / Lớp&quot; hoặc gán hàng loạt)
                    </span>
                  </div>

                  {/* Bulk Assign All Button */}
                  {targetTeamId && (
                    <button
                      type="button"
                      onClick={() => handleAssignAllToTeam(targetTeamId)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Gán tất cả vận động viên trong danh sách cho đội này"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Gán tất cả cho {currentTargetTeam?.name}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-indigo-100 dark:border-indigo-900/60 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold">Đội ưu tiên / Bộ lọc:</span>
                    <select
                      value={targetTeamId}
                      onChange={(e) => setTargetTeamId(e.target.value)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 outline-none"
                    >
                      {combinedTeamsList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.group})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Detected Distribution Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 text-[11px]">Đã nhận diện:</span>
                    {Object.entries(athletesCountByTeam).map(([tName, count]) => (
                      <span
                        key={tName}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs"
                      >
                        <span>{tName}:</span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold">{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Tìm theo tên VĐV, số áo, đội..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500">Xem lọc đội:</span>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="ALL">Tất cả đội ({previewAthletes.length})</option>
                    {combinedTeamsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredAthletes.length > 0 &&
                            selectedIds.size === filteredAthletes.length
                          }
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </th>
                      <th className="p-3">Số Áo</th>
                      <th className="p-3">Họ Và Tên VĐV</th>
                      <th className="p-3">Đội / Lớp Thi Đấu</th>
                      <th className="p-3">Vị Trí</th>
                      <th className="p-3">Ngày Sinh</th>
                      <th className="p-3">CCCD / SĐT</th>
                      <th className="p-3 text-right">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAthletes.map((a) => {
                      const isSelected = selectedIds.has(a.id);
                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(a.id)}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400">
                            #{a.jerseyNumber}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                            {a.name}
                          </td>
                          <td className="p-3">
                            <div className="space-y-1">
                              <select
                                value={a.teamId}
                                onChange={(e) => handleTeamChange(a.id, e.target.value)}
                                className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                              >
                                {combinedTeamsList.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.group})
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-1 text-[10px]">
                                {a.matchMethod === 'excel_column' && (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    ✓ Từ cột: &quot;{a.rawTeamFromExcel}&quot;
                                  </span>
                                )}
                                {a.matchMethod === 'excel_sheet' && (
                                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                                    ✓ Từ Sheet: &quot;{a.rawTeamFromExcel}&quot;
                                  </span>
                                )}
                                {a.matchMethod === 'default_filter' && (
                                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                    ⚡ Theo bộ lọc đã chọn
                                  </span>
                                )}
                                {a.matchMethod === 'manual' && (
                                  <span className="text-slate-400 font-medium">
                                    Đã chỉnh tay
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">{a.position}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            {a.dateOfBirth}
                          </td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">
                            <div>{a.nationalId || '---'}</div>
                            <div className="text-[10px] text-slate-400">{a.phone || '---'}</div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(a.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Xóa VĐV này khỏi danh sách xem trước"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-50 dark:bg-slate-950">
          <div className="text-xs text-slate-500">
            {previewAthletes.length > 0 ? (
              <span>
                Đã chọn <strong className="text-indigo-600 font-bold">{selectedIds.size}</strong> /{' '}
                {previewAthletes.length} vận động viên
              </span>
            ) : (
              <span>Chưa nạp dữ liệu vận động viên</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Hủy
            </button>
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogin?.();
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Đăng Nhập Để Nhập VĐV</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={previewAthletes.length === 0 || selectedIds.size === 0 || isLoading}
                className={`px-5 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer ${
                  cleanMode === 'all'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    : cleanMode === 'target_teams'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {cleanMode === 'all' ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Làm Sạch Toàn Bộ & Nhập Mới ({selectedIds.size}) VĐV</span>
                  </>
                ) : cleanMode === 'target_teams' ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Làm Sạch Theo Đội & Nhập ({selectedIds.size}) VĐV</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác Nhận Nhập VĐV ({selectedIds.size})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Instant Wipe All Existing Athletes */}
      {showConfirmWipeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/80 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Xác nhận làm sạch toàn bộ dữ liệu VĐV?
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ <strong>{existingAthletesCount}</strong> vận động viên hiện có trong giải đấu sẽ bị xóa sạch khỏi hệ thống và đồng bộ cơ sở dữ liệu để bạn có thể nhập mới hoàn toàn.
              </p>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              ⚠️ Thao tác này không thể hoàn tác. Danh sách các đội bóng vẫn được giữ nguyên.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmWipeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllAthletes) {
                    onClearAllAthletes();
                  }
                  setShowConfirmWipeModal(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xác Nhận Làm Sạch Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
