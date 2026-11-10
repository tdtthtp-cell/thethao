import React, { useState, useMemo, useId } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ClipboardPaste,
  Shield,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Search,
  Filter,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { Match, Sport, Team, TournamentConfig, VenueConfig } from '../types';
import {
  buildMatchesFromParsed,
  downloadMatchScheduleImportTemplateExcel,
  parseMatchesFromExcel,
  parseMatchesFromPastedText,
  ParsedMatchItem,
  ParseMatchesResult,
} from '../services/matchImport';
import { getVenueForGroup } from '../services/venueService';

interface MatchExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TournamentConfig;
  sports: Sport[];
  existingTeams: Team[];
  onImportMatches: (
    matches: Match[],
    newTeamsToCreate: Team[],
    replaceExisting: boolean,
    noticeMsg: string
  ) => void;
}

export const MatchExcelImportModal: React.FC<MatchExcelImportModalProps> = ({
  isOpen,
  onClose,
  config,
  sports,
  existingTeams,
  onImportMatches,
}) => {
  const fileInputId = useId();

  // Tab: 'file' or 'paste'
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseMatchesResult | null>(null);
  const [previewMatches, setPreviewMatches] = useState<ParsedMatchItem[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Pasted text state
  const [pastedText, setPastedText] = useState('');

  // Options
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [autoCreateNewTeams, setAutoCreateNewTeams] = useState(true);

  // Filters for preview
  const [stageFilter, setStageFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const currentSport = useMemo(() => {
    return sports.find((s) => s.id === config.activeSportId) || sports[0];
  }, [sports, config.activeSportId]);

  const activeCategory = useMemo(() => {
    return currentSport?.categories?.find((c) => c.id === config.activeCategoryId);
  }, [currentSport, config.activeCategoryId]);

  const existingTeamNamesSet = useMemo(() => {
    const set = new Set<string>();
    existingTeams.forEach((t) => {
      if (t.name) set.add(t.name.trim().toLowerCase());
    });
    return set;
  }, [existingTeams]);

  // Filtered preview matches
  const filteredPreview = useMemo(() => {
    return previewMatches.filter((m) => {
      const matchStage = stageFilter === 'ALL' || m.stage === stageFilter;
      const matchSearch =
        !searchFilter.trim() ||
        m.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.homeTeamName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.awayTeamName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.pitch.toLowerCase().includes(searchFilter.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [previewMatches, stageFilter, searchFilter]);

  const selectedMatches = useMemo(() => {
    return previewMatches.filter((m) => selectedRowIds.has(m.id) && m.isValid);
  }, [previewMatches, selectedRowIds]);

  // Identify new teams to create
  const newTeamsToCreateList = useMemo(() => {
    if (!autoCreateNewTeams) return [];
    const newTeamMap = new Map<string, { name: string; group: string }>();

    selectedMatches.forEach((m) => {
      const homeNorm = m.homeTeamName.trim().toLowerCase();
      if (!existingTeamNamesSet.has(homeNorm) && !newTeamMap.has(homeNorm)) {
        newTeamMap.set(homeNorm, { name: m.homeTeamName.trim(), group: m.stage });
      }

      const awayNorm = m.awayTeamName.trim().toLowerCase();
      if (!existingTeamNamesSet.has(awayNorm) && !newTeamMap.has(awayNorm)) {
        newTeamMap.set(awayNorm, { name: m.awayTeamName.trim(), group: m.stage });
      }
    });

    return Array.from(newTeamMap.values()).map((t, idx) => ({
      id: 'T_AUTO_' + Date.now() + '_' + idx,
      sportId: config.activeSportId,
      categoryId: config.activeCategoryId && config.activeCategoryId !== 'ALL' ? config.activeCategoryId : undefined,
      categoryName: activeCategory?.name,
      name: t.name,
      group: t.group || config.customGroups[0] || 'Khối 10',
      gender: 'male' as const,
      coachName: 'GVCN / HLV lớp ' + t.name,
      color: '#0284c7',
    }));
  }, [selectedMatches, autoCreateNewTeams, existingTeamNamesSet, config, activeCategory]);

  const availableStages = useMemo(() => {
    const set = new Set<string>();
    previewMatches.forEach((m) => {
      if (m.stage) set.add(m.stage);
    });
    return Array.from(set);
  }, [previewMatches]);

  const areAllFilteredSelected =
    filteredPreview.length > 0 &&
    filteredPreview.every((m) => selectedRowIds.has(m.id));

  // Early return strictly AFTER all hooks
  if (!isOpen) return null;

  const handleProcessFile = async (f: File) => {
    setFile(f);
    setIsLoading(true);
    try {
      const res = await parseMatchesFromExcel(f, {
        currentSportId: config.activeSportId,
        activeCategoryId: config.activeCategoryId,
        activeCategoryName: activeCategory?.name,
        existingTeams,
        customGroups: config.customGroups,
        venues: config.venues,
        defaultReferee: config.referee,
        defaultSecretary: config.secretary,
      });

      setParseResult(res);
      setPreviewMatches(res.matches);
      setSelectedRowIds(new Set(res.matches.filter((m) => m.isValid).map((m) => m.id)));
    } catch (err: any) {
      console.error(err);
      alert('Không thể đọc file Excel! ' + (err?.message || 'Vui lòng kiểm tra lại định dạng tệp .xlsx / .xls.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      alert('Vui lòng dán dữ liệu lịch thi đấu từ bảng tính Excel vào ô văn bản!');
      return;
    }
    setIsLoading(true);
    try {
      const res = parseMatchesFromPastedText(pastedText, {
        currentSportId: config.activeSportId,
        activeCategoryId: config.activeCategoryId,
        activeCategoryName: activeCategory?.name,
        existingTeams,
        customGroups: config.customGroups,
        venues: config.venues,
        defaultReferee: config.referee,
        defaultSecretary: config.secretary,
      });

      setParseResult(res);
      setPreviewMatches(res.matches);
      setSelectedRowIds(new Set(res.matches.filter((m) => m.isValid).map((m) => m.id)));
    } catch (err: any) {
      console.error(err);
      alert('Lỗi khi phân tích dữ liệu dán: ' + err?.message);
    } finally {
      setIsLoading(false);
    }
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
    if (areAllFilteredSelected) {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        filteredPreview.forEach((m) => next.delete(m.id));
        return next;
      });
    } else {
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        filteredPreview.filter((m) => m.isValid).forEach((m) => next.add(m.id));
        return next;
      });
    }
  };

  const handleDeleteRow = (id: string) => {
    setPreviewMatches((prev) => prev.filter((m) => m.id !== id));
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleConfirmImport = () => {
    if (selectedMatches.length === 0) {
      alert('Vui lòng chọn ít nhất một trận đấu hợp lệ để nhập vào lịch thi đấu!');
      return;
    }

    // Map new teams for quick lookup
    const createdMap = new Map<string, Team>();
    newTeamsToCreateList.forEach((t) => createdMap.set(t.name.trim().toLowerCase(), t));

    const finalMatches = buildMatchesFromParsed(selectedMatches, createdMap, existingTeams);

    const modeText = importMode === 'replace' ? 'thay thế toàn bộ' : 'thêm vào lịch hiện tại';
    const notice = `Đã nhập thành công ${finalMatches.length} trận đấu (${modeText})${
      newTeamsToCreateList.length > 0 ? ` và tự động tạo ${newTeamsToCreateList.length} đội mới` : ''
    }!`;

    onImportMatches(finalMatches, newTeamsToCreateList, importMode === 'replace', notice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Nhập Lịch Thi Đấu Từ File Excel</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  .xlsx / .xls / .csv
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Môn: <strong>{currentSport.name}</strong>
                {activeCategory && <span> · Nội dung: <strong>{activeCategory.name}</strong></span>}
                {' '}· Hỗ trợ tải tệp hoặc dán trực tiếp từ bảng tính
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection & Sample Download */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải File Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Dán Từ Bảng Tính (Clipboard)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => downloadMatchScheduleImportTemplateExcel(sports, config, existingTeams)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs"
            title="Tải mẫu Excel chuẩn có đầy đủ cột và danh sách lớp tham chiếu"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Tải Mẫu Lịch (.xlsx)</span>
          </button>
        </div>

        {/* Upload Zone / Paste Zone */}
        {activeTab === 'file' ? (
          <div className="space-y-3 shrink-0">
            <label
              htmlFor={fileInputId}
              className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-5 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer text-center group"
            >
              <Upload className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {file ? file.name : 'Bấm vào đây để chọn tệp Excel lịch thi đấu (.xlsx, .xls, .csv)'}
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                Các cột nhận diện: Mã trận, Ngày đấu, Giờ đấu, Bảng/Khối, Đội 1, Đội 2, Sân/Địa điểm
              </span>
              <input
                id={fileInputId}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleProcessFile(f);
                }}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-2 shrink-0">
            <textarea
              rows={4}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Sao chép các dòng lịch thi đấu từ Excel/Google Sheets rồi dán vào đây (Ctrl+V)..."
              className="w-full p-3 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleProcessPastedText}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Phân Tích Dữ Liệu Dán</span>
              </button>
            </div>
          </div>
        )}

        {/* Options Row */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700 dark:text-slate-300">Chế độ nhập:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>Thêm vào lịch hiện tại (Append)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-rose-600 dark:text-rose-400 font-semibold">
              <input
                type="radio"
                name="importMode"
                value="replace"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="text-rose-600 focus:ring-rose-500"
              />
              <span>Thay thế toàn bộ lịch thi đấu (Replace)</span>
            </label>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
            <input
              type="checkbox"
              checked={autoCreateNewTeams}
              onChange={(e) => setAutoCreateNewTeams(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <span>Tự động thêm đội mới vào danh sách đội ({newTeamsToCreateList.length} đội mới phát hiện)</span>
          </label>
        </div>

        {/* Preview & Results Section */}
        {previewMatches.length > 0 && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Filter and stats row */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Xem trước: {filteredPreview.length} trận
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                  {selectedMatches.length} trận hợp lệ được chọn
                </span>
                {newTeamsToCreateList.length > 0 && autoCreateNewTeams && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    +{newTeamsToCreateList.length} đội mới
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Tìm đội, sân, mã..."
                    className="pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none w-36 sm:w-44"
                  />
                </div>

                {/* Stage Filter */}
                {availableStages.length > 1 && (
                  <select
                    value={stageFilter}
                    onChange={(e) => setStageFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  >
                    <option value="ALL">Tất cả bảng / vòng</option>
                    {availableStages.map((stg) => (
                      <option key={stg} value={stg}>
                        {stg}
                      </option>
                    ))}
                  </select>
                )}

                {/* Select / Deselect All */}
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                >
                  {areAllFilteredSelected ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bỏ chọn</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                      <span>Chọn tất cả</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-800 rounded-2xl min-h-[160px] max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-semibold sticky top-0 z-10">
                    <th className="p-2.5 w-8 text-center">
                      <span className="sr-only">Chọn</span>
                    </th>
                    <th className="p-2.5">Mã trận</th>
                    <th className="p-2.5">Thời gian</th>
                    <th className="p-2.5">Bảng / Vòng</th>
                    <th className="p-2.5">Đội 1 (Home)</th>
                    <th className="p-2.5 text-center">VS</th>
                    <th className="p-2.5">Đội 2 (Away)</th>
                    <th className="p-2.5">Sân & Địa điểm</th>
                    <th className="p-2.5">Ghi chú</th>
                    <th className="p-2.5 text-right w-10">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPreview.map((m) => {
                    const isSelected = selectedRowIds.has(m.id);
                    const venueType = getVenueForGroup(m.stage);

                    return (
                      <tr
                        key={m.id}
                        className={`transition-colors ${
                          !m.isValid
                            ? 'bg-rose-50/60 dark:bg-rose-950/30'
                            : isSelected
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!m.isValid}
                            onChange={() => handleToggleRow(m.id)}
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                          />
                        </td>
                        <td className="p-2.5 font-bold font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">
                          {m.code}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{m.time}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{m.date}</span>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              venueType === 'main'
                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {m.stage}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{m.homeTeamName}</span>
                            {!m.isHomeTeamExisting ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold" title="Đội này chưa có trong danh sách đội, sẽ tự tạo mới">
                                +Mới
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                                ✓ Đã có
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-center font-extrabold text-slate-400 text-[10px]">
                          VS
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{m.awayTeamName}</span>
                            {!m.isAwayTeamExisting ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold" title="Đội này chưa có trong danh sách đội, sẽ tự tạo mới">
                                +Mới
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                                ✓ Đã có
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300 text-xs">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[130px]">{m.pitch}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-slate-400 text-[11px] truncate max-w-[120px]">
                          {m.isValid ? m.notes || '-' : <span className="text-rose-500 font-bold">{m.errorMessage}</span>}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(m.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Xóa hàng này khỏi danh sách xem trước"
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng / Hủy
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={selectedMatches.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              Xác Nhận Nhập {selectedMatches.length} Trận Đấu Vào Lịch
              {newTeamsToCreateList.length > 0 && autoCreateNewTeams ? ` (+${newTeamsToCreateList.length} Đội Mới)` : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
