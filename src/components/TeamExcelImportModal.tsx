import React, { useState, useId } from 'react';
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
  Layers,
  RefreshCw,
  Lock,
  LogIn,
} from 'lucide-react';
import { Team, TeamGender, TournamentConfig, UserProfile } from '../types';
import {
  downloadTeamImportTemplateExcel,
  parseTeamsFromExcel,
  ParsedTeamItem,
  ParseTeamsResult,
} from '../services/teamImport';

interface TeamExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TournamentConfig;
  existingTeams: Team[];
  existingTeamsCount?: number;
  user?: UserProfile;
  onOpenLogin?: () => void;
  onClearAllTeams?: () => void;
  onImportTeams: (newTeams: Team[], newGroupsToAdd?: string[], cleanBeforeImport?: boolean) => void;
}

export const TeamExcelImportModal: React.FC<TeamExcelImportModalProps> = ({
  isOpen,
  onClose,
  config,
  existingTeams,
  existingTeamsCount,
  user,
  onOpenLogin,
  onClearAllTeams,
  onImportTeams,
}) => {
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseTeamsResult | null>(null);
  const [previewTeams, setPreviewTeams] = useState<ParsedTeamItem[]>([]);
  const [autoAddGroups, setAutoAddGroups] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | TeamGender>('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Clean data option: clean all existing teams and athletes before importing fresh teams
  const [cleanBeforeImport, setCleanBeforeImport] = useState(false);
  const [showConfirmWipeModal, setShowConfirmWipeModal] = useState(false);

  const effectiveTeamsCount = existingTeamsCount !== undefined ? existingTeamsCount : existingTeams.length;
  const isLoggedIn = Boolean(user && user.role && user.role !== 'viewer');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!isLoggedIn) {
      alert('Bạn phải đăng nhập tài khoản để có quyền nhập danh sách đội bóng từ Excel!');
      onOpenLogin?.();
      return;
    }
    await processFile(selected);
  };

  const processFile = async (f: File) => {
    if (!isLoggedIn) {
      alert('Bạn phải đăng nhập tài khoản để có quyền nhập danh sách đội bóng từ Excel!');
      onOpenLogin?.();
      return;
    }
    setFile(f);
    setIsLoading(true);
    try {
      const res = await parseTeamsFromExcel(f, config.customGroups);
      setParseResult(res);
      setPreviewTeams(res.teams);
      setSelectedRowIds(new Set(res.teams.map((t) => t.id)));
    } catch (err) {
      console.error(err);
      alert('Không thể đọc file Excel! Vui lòng kiểm tra lại định dạng file (.xlsx, .xls, .csv).');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenderChange = (id: string, gender: TeamGender) => {
    setPreviewTeams((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const color = gender === 'female' ? '#e11d48' : gender === 'male' ? '#0284c7' : '#7c3aed';
        return { ...t, gender, color };
      })
    );
  };

  const handleGroupChange = (id: string, group: string) => {
    setPreviewTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, group } : t))
    );
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === filteredPreviewTeams.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredPreviewTeams.map((t) => t.id)));
    }
  };

  const handleDeletePreviewRow = (id: string) => {
    setPreviewTeams((prev) => prev.filter((t) => t.id !== id));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const filteredPreviewTeams = previewTeams.filter((t) => {
    const matchSearch =
      !searchFilter.trim() ||
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.coachName.toLowerCase().includes(searchFilter.toLowerCase());
    const matchGender = genderFilter === 'ALL' || t.gender === genderFilter;
    const matchGroup = groupFilter === 'ALL' || t.group === groupFilter;
    return matchSearch && matchGender && matchGroup;
  });

  const handleConfirmImport = () => {
    if (!isLoggedIn) {
      alert('Bạn phải đăng nhập tài khoản để có quyền nhập danh sách đội bóng từ Excel!');
      onOpenLogin?.();
      return;
    }

    const teamsToImport = previewTeams.filter((t) => selectedRowIds.has(t.id));
    if (teamsToImport.length === 0) {
      alert('Vui lòng chọn ít nhất một đội để nhập vào hệ thống!');
      return;
    }

    const finalTeams: Team[] = teamsToImport.map((t) => ({
      id: t.id,
      name: t.name,
      group: t.group,
      gender: t.gender,
      coachName: t.coachName,
      contactPhone: t.contactPhone,
      color: t.color,
    }));

    const groupsToAdd = autoAddGroups && parseResult ? parseResult.newGroups : [];
    onImportTeams(finalTeams, groupsToAdd, cleanBeforeImport);
    onClose();
  };

  // Compute live breakdown from previewTeams
  const currentTotal = previewTeams.length;
  const currentMale = previewTeams.filter((t) => t.gender === 'male').length;
  const currentFemale = previewTeams.filter((t) => t.gender === 'female').length;
  const currentGroups = Array.from(new Set(previewTeams.map((t) => t.group)));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Nhập Danh Sách Đội Từ Excel</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  Phân Biệt Nam / Nữ
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Tự động nhận diện bảng/khối, đội nam, đội nữ và phân loại dữ liệu chính xác
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Login Requirement Banner if Guest */}
          {!isLoggedIn && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-2xl border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start sm:items-center gap-3 text-amber-900 dark:text-amber-200">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <strong className="block font-bold text-sm text-amber-950 dark:text-amber-100">
                    Yêu cầu đăng nhập để nhập dữ liệu
                  </strong>
                  <span className="text-amber-800 dark:text-amber-300 mt-0.5 block leading-relaxed">
                    Bạn đang ở chế độ xem. Vui lòng đăng nhập tài khoản quản trị để có quyền tải lên và nhập danh sách đội bóng vào hệ thống giải đấu.
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

          {/* Top Download Template Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-sky-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs sm:text-sm">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Chưa có file mẫu chuẩn? Tải ngay file Excel mẫu:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Mẫu gồm các cột: STT, Tên Đội, Khối/Bảng, Giới tính (Nam/Nữ), HLV/GV phụ trách, SĐT, Màu áo.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadTeamImportTemplateExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải File Mẫu (.xlsx)</span>
            </button>
          </div>

          {/* Chế độ làm sạch dữ liệu đội bóng cũ để nhập mới */}
          <div className="p-4 bg-amber-50/80 dark:bg-amber-950/40 rounded-2xl border border-amber-200/90 dark:border-amber-800/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 dark:text-amber-200">
                <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Chế độ làm sạch dữ liệu đội bóng để nhập mới:</span>
              </div>
              {onClearAllTeams && effectiveTeamsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowConfirmWipeModal(true)}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                  title="Xóa trắng toàn bộ danh sách đội và VĐV cũ ngay lập tức"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa sạch ngay {effectiveTeamsCount} đội hiện có</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                  !cleanBeforeImport
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-2 ring-emerald-500/20 text-slate-900 dark:text-white'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="teamCleanMode"
                  checked={!cleanBeforeImport}
                  onChange={() => setCleanBeforeImport(false)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <strong className="block font-bold">Gộp vào danh sách hiện tại (Append)</strong>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Giữ nguyên các đội hiện có, chỉ cập nhật hoặc bổ sung các đội từ file.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer ${
                  cleanBeforeImport
                    ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20 text-rose-900 dark:text-rose-200'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="radio"
                  name="teamCleanMode"
                  checked={cleanBeforeImport}
                  onChange={() => setCleanBeforeImport(true)}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <strong className="block font-bold text-rose-700 dark:text-rose-300">
                    Làm sạch toàn bộ để nhập mới (Clean & Replace)
                  </strong>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    Xóa sạch toàn bộ danh sách đội và VĐV cũ của giải đấu để thiết lập giải mới từ file.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Upload Dropzone */}
          {!file && (
            <label
              htmlFor={fileInputId}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-900/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <p className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-1">
                Nhấp để chọn file Excel hoặc kéo thả file vào đây
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                Hỗ trợ định dạng <strong>.xlsx, .xls, .csv</strong>. Tự động nhận diện nhiều sheet (Nam / Nữ) và phân loại theo khối/bảng.
              </p>
              <input
                id={fileInputId}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* File loaded state */}
          {file && (
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 gap-2">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {file.name}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={fileInputId}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Đổi File Khác</span>
                  </label>
                  <input
                    id={fileInputId}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Statistics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Tổng Số Đội</div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {currentTotal} đội
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold shrink-0 flex items-center justify-center">
                    👦
                  </div>
                  <div>
                    <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">Đội Nam</div>
                    <div className="text-base font-extrabold text-sky-900 dark:text-sky-200">
                      {currentMale} đội
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/80 dark:border-rose-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold shrink-0 flex items-center justify-center">
                    👧
                  </div>
                  <div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Đội Nữ</div>
                    <div className="text-base font-extrabold text-rose-900 dark:text-rose-200">
                      {currentFemale} đội
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold shrink-0 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">Khối / Bảng</div>
                    <div className="text-base font-extrabold text-indigo-900 dark:text-indigo-200">
                      {currentGroups.length} bảng
                    </div>
                  </div>
                </div>
              </div>

              {/* Notice for new groups if any */}
              {parseResult && parseResult.newGroups.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      Phát hiện <strong>{parseResult.newGroups.length}</strong> Bảng/Khối mới:{' '}
                      <strong>{parseResult.newGroups.join(', ')}</strong>
                    </span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer shrink-0 font-bold">
                    <input
                      type="checkbox"
                      checked={autoAddGroups}
                      onChange={(e) => setAutoAddGroups(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>Tự động thêm vào giải</span>
                  </label>
                </div>
              )}

              {/* Filter & Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo tên đội, giáo viên..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Gender Filter */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
                    <button
                      type="button"
                      onClick={() => setGenderFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        genderFilter === 'ALL'
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Tất Cả ({previewTeams.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('male')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                        genderFilter === 'male'
                          ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <span>👦 Nam ({currentMale})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenderFilter('female')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                        genderFilter === 'female'
                          ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <span>👧 Nữ ({currentFemale})</span>
                    </button>
                  </div>

                  {/* Group Filter */}
                  <select
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="ALL">Tất cả Khối / Bảng</option>
                    {currentGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 z-10">
                    <tr>
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredPreviewTeams.length > 0 &&
                            selectedRowIds.size === filteredPreviewTeams.length
                          }
                          onChange={handleToggleSelectAll}
                          className="rounded text-emerald-600"
                        />
                      </th>
                      <th className="p-2.5 w-12 text-center">STT</th>
                      <th className="p-2.5">Tên Đội (Lớp)</th>
                      <th className="p-2.5 w-32">Khối / Bảng</th>
                      <th className="p-2.5 w-32">Giới Tính</th>
                      <th className="p-2.5">Giáo Viên / HLV</th>
                      <th className="p-2.5 w-24">SĐT</th>
                      <th className="p-2.5 w-16 text-center">Màu</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {filteredPreviewTeams.map((item, idx) => {
                      const isSelected = selectedRowIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                            isSelected ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : 'opacity-60'
                          }`}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(item.id)}
                              className="rounded text-emerald-600"
                            />
                          </td>
                          <td className="p-2 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="p-2">
                            <select
                              value={item.group}
                              onChange={(e) => handleGroupChange(item.id, e.target.value)}
                              className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none"
                            >
                              {currentGroups.map((grp) => (
                                <option key={grp} value={grp}>
                                  {grp}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <select
                              value={item.gender}
                              onChange={(e) =>
                                handleGenderChange(item.id, e.target.value as TeamGender)
                              }
                              className={`w-full px-2 py-1 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                                item.gender === 'female'
                                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : item.gender === 'male'
                                  ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                                  : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              }`}
                            >
                              <option value="male">👦 Đội Nam</option>
                              <option value="female">👧 Đội Nữ</option>
                              <option value="mixed">👥 Hỗn Hợp</option>
                            </select>
                          </td>
                          <td className="p-2 text-slate-700 dark:text-slate-300">
                            {item.coachName}
                          </td>
                          <td className="p-2 text-slate-500 font-mono text-[11px]">
                            {item.contactPhone || '-'}
                          </td>
                          <td className="p-2 text-center">
                            <div
                              className="w-4 h-4 rounded-full mx-auto border border-white shadow-xs"
                              style={{ backgroundColor: item.color }}
                              title={item.color}
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeletePreviewRow(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Loại bỏ đội này khỏi danh sách nhập"
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

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Đã chọn <strong>{selectedRowIds.size}</strong> / {previewTeams.length} đội sẵn sàng nhập
                </span>
                <span>
                  (Hệ thống tự động phát hiện và liên kết với lịch thi đấu theo bảng)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {file && (
              <span>
                Sẵn sàng thêm <strong className="text-emerald-600 dark:text-emerald-400">{selectedRowIds.size}</strong> đội vào cơ sở dữ liệu
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Hủy
            </button>

            {file && (
              isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={selectedRowIds.size === 0}
                  className={`px-4 py-2 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer ${
                    cleanBeforeImport
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {cleanBeforeImport ? (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Làm Sạch & Nhập Mới ({selectedRowIds.size} Đội)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác Nhận Nhập ({selectedRowIds.size} Đội)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin?.();
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Đăng Nhập Để Nhập Đội</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Instant Wipe All Existing Teams & Athletes */}
      {showConfirmWipeModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/80 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Xác nhận làm sạch toàn bộ danh sách Đội bóng?
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ <strong>{effectiveTeamsCount}</strong> đội bóng cùng toàn bộ vận động viên thuộc các đội trong giải đấu sẽ bị xóa sạch khỏi hệ thống và cơ sở dữ liệu để bạn có thể tải lên danh sách mới hoàn toàn.
              </p>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              ⚠️ Thao tác này không thể hoàn tác. Lịch thi đấu và cấu hình giải vẫn được giữ nguyên.
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
                  if (onClearAllTeams) {
                    onClearAllTeams();
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
