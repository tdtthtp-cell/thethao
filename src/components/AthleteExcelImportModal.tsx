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
} from 'lucide-react';
import { Athlete, Team } from '../types';
import {
  downloadAthleteImportTemplateExcel,
  parseAthletesFromExcel,
  ParsedAthleteItem,
} from '../services/teamImport';
import { encryptText } from '../services/crypto';

interface AthleteExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  initialTeamFilter?: string;
  onConfirmImport: (importedAthletes: Athlete[]) => void;
}

export const AthleteExcelImportModal: React.FC<AthleteExcelImportModalProps> = ({
  isOpen,
  onClose,
  teams,
  initialTeamFilter,
  onConfirmImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewAthletes, setPreviewAthletes] = useState<ParsedAthleteItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Selected default team when importing (can be set by user or derived from active team filter)
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

  useEffect(() => {
    if (isOpen) {
      if (initialTeamFilter && initialTeamFilter !== 'ALL') {
        const found = teams.find((t) => t.id === initialTeamFilter || t.name.toLowerCase() === initialTeamFilter.toLowerCase());
        setTargetTeamId(found ? found.id : (teams[0]?.id || ''));
      } else if (teams.length > 0) {
        setTargetTeamId(teams[0].id);
      }
    } else {
      // Clear file on close
      setFile(null);
      setPreviewAthletes([]);
      setSelectedIds(new Set());
      setSearchFilter('');
      setTeamFilter('ALL');
      setIsDragOver(false);
    }
  }, [isOpen, initialTeamFilter, teams]);

  if (!isOpen) return null;

  const currentTargetTeam = teams.find((t) => t.id === targetTeamId) || teams[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
    if (e.target) {
      e.target.value = ''; // Reset so user can pick same file again if desired
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
      await processFile(dropped);
    }
  };

  const processFile = async (f: File) => {
    setFile(f);
    setIsLoading(true);
    try {
      // Pass targetTeamId as the default fallback team for unmatched rows or if column is absent
      const res = await parseAthletesFromExcel(f, teams, targetTeamId || undefined);
      setPreviewAthletes(res);
      setSelectedIds(new Set(res.map((a) => a.id)));
    } catch (err) {
      console.error(err);
      alert('Không thể đọc file Excel VĐV! Vui lòng kiểm tra lại định dạng file (.xlsx, .xls, .csv).');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamChange = (id: string, newTeamId: string) => {
    const targetTeam = teams.find((t) => t.id === newTeamId);
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
    const targetTeam = teams.find((t) => t.id === teamIdToAssign);
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

  // Group stats for preview
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
    const toImport = previewAthletes.filter((a) => selectedIds.has(a.id));
    if (toImport.length === 0) {
      alert('Vui lòng chọn ít nhất một vận động viên để nhập vào hệ thống!');
      return;
    }

    setIsLoading(true);

    // Encrypt sensitive fields with E2EE
    const finalAthletes: Athlete[] = [];
    for (const item of toImport) {
      const encId = item.nationalId
        ? await encryptText(item.nationalId)
        : 'e2ee:aXRtc3BvcnRfZW5j';
      const encPhone = item.phone
        ? await encryptText(item.phone)
        : 'e2ee:aXRtc3BvcnRfZW5j';

      const foundTeam = teams.find((t) => t.id === item.teamId);

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

    setIsLoading(false);
    onConfirmImport(finalAthletes);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in overflow-y-auto"
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
          <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Đang phân tích & xử lý file Excel vận động viên...
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
                <span>Nhập Danh Sách Vận Động Viên Trong Đội</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                  File Excel
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Danh sách VĐV là tên các vận động viên cụ thể thuộc 1 đội (10A1, 10A2...).
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

        {/* Hidden file input controlled via ref */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Download Template Banner */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50 dark:from-indigo-950/30 dark:via-sky-950/20 dark:to-blue-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold text-xs sm:text-sm">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Tải file Excel mẫu danh sách VĐV theo đội:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Gồm các cột: STT, Họ và Tên VĐV, Số Áo, Đội / Lớp, Vị Trí, Ngày Sinh, SĐT, CCCD, Ghi Chú.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadAthleteImportTemplateExcel(teams[0]?.name || '10A1')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Mẫu VĐV (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition select-none ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <p className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-200 mb-1">
                {isDragOver ? 'Thả file Excel vào đây ngay' : 'Kéo thả file Excel danh sách VĐV vào đây'}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Hỗ trợ định dạng <strong>.xlsx, .xls, .csv</strong> (Hệ thống tự động nhận diện đội/lớp)
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Bấm Chọn File Từ Máy Tính</span>
              </button>
            </div>
          )}

          {/* Preview Section */}
          {file && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">{file.name}</span>
                  <span className="text-slate-400">
                    ({previewAthletes.length} vận động viên tìm thấy)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Chọn file khác
                </button>
              </div>

              {/* Team Auto-Detection & Quick Assignment Bar */}
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Quy tắc phân bổ Đội / Lớp:</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      (Tự động nhận diện từ cột "Đội / Lớp" hoặc gán theo bộ lọc)
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
                      {teams.map((t) => (
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
                    {teams.map((t) => (
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
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-bold sticky top-0">
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
                                {teams.map((t) => (
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
            {file ? (
              <span>
                Đã chọn <strong className="text-indigo-600 font-bold">{selectedIds.size}</strong> /{' '}
                {previewAthletes.length} vận động viên
              </span>
            ) : (
              <span>Chưa chọn file dữ liệu</span>
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
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={!file || selectedIds.size === 0 || isLoading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận Nhập VĐV ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
