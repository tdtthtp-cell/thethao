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
} from 'lucide-react';
import { Team, TeamGender, TournamentConfig } from '../types';
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
  onImportTeams: (newTeams: Team[], newGroupsToAdd?: string[]) => void;
}

export const TeamExcelImportModal: React.FC<TeamExcelImportModalProps> = ({
  isOpen,
  onClose,
  config,
  existingTeams,
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

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    await processFile(selected);
  };

  const processFile = async (f: File) => {
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
    onImportTeams(finalTeams, groupsToAdd);
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
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedRowIds.size === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác Nhận Nhập ({selectedRowIds.size} Đội)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
