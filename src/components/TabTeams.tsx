import React, { useState, useMemo } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  LogIn,
  Lock,
  ExternalLink,
  CheckCircle2,
  X,
  Palette,
  Eye,
  Layers,
  LayoutGrid,
  LayoutList,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Athlete, Team, TeamGender, TournamentConfig, UserProfile } from '../types';
import { TeamExcelImportModal } from './TeamExcelImportModal';
import { downloadTeamImportTemplateExcel } from '../services/teamImport';
import {
  getVenueForGroup,
  getVenueInfo,
  sortGroupsByVenue,
  sortTeamsByVenue,
} from '../services/venueService';

interface TabTeamsProps {
  teams: Team[];
  athletes: Athlete[];
  config: TournamentConfig;
  user: UserProfile;
  onOpenLogin?: () => void;
  onSaveTeam: (team: Team) => void;
  onImportMultipleTeams?: (teams: Team[], newGroupsToAdd?: string[], cleanBeforeImport?: boolean) => void;
  onClearAllTeams?: () => void;
  onDeleteTeam: (teamId: string) => void;
  onDeleteMultipleTeams?: (teamIds: string[], deleteAthletesToo?: boolean) => void;
  onNavigateToAthletes: (teamIdOrName?: string) => void;
  onAddAthleteForTeam?: (team: Team) => void;
  onOpenAthleteExcelImport?: (teamIdOrName?: string) => void;
}

export const TabTeams: React.FC<TabTeamsProps> = ({
  teams,
  athletes,
  config,
  user,
  onOpenLogin,
  onSaveTeam,
  onImportMultipleTeams,
  onClearAllTeams,
  onDeleteTeam,
  onDeleteMultipleTeams,
  onNavigateToAthletes,
  onAddAthleteForTeam,
  onOpenAthleteExcelImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<'ALL' | 'main' | 'branch'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | TeamGender>('ALL');

  // Excel team import modal state
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);

  // Bulk selection state
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [deleteAthletesWithTeams, setDeleteAthletesWithTeams] = useState(true);

  // Add / Edit Team Modal state
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState(config.customGroups[0] || 'Khối 10');
  const [newTeamGender, setNewTeamGender] = useState<TeamGender>('male');
  const [newTeamCoach, setNewTeamCoach] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#0284c7');

  const isAdmin = user.role === 'admin';
  const canManage =
    user.role === 'admin' ||
    user.role === 'referee' ||
    user.role === 'secretary' ||
    user.role === 'athlete';

  // Athlete count map per team
  const athleteCountByTeam = useMemo(() => {
    const map = new Map<string, number>();
    athletes.forEach((a) => {
      const current = map.get(a.teamId) || 0;
      map.set(a.teamId, current + 1);
    });
    return map;
  }, [athletes]);

  // Filtered teams with venue order: Điểm chính (K10, K11, K12) first, then Phân hiệu (Khối 10, Khối 11, Khối 12)
  const filteredTeams = useMemo(() => {
    const list = teams.filter((t) => {
      // Sport scope: if team has sportId, must match activeSportId
      if (t.sportId && t.sportId !== config.activeSportId) return false;

      // Category scope: if activeCategoryId is set and team has categoryId, must match
      if (
        config.activeCategoryId &&
        config.activeCategoryId !== 'ALL' &&
        t.categoryId &&
        t.categoryId !== config.activeCategoryId
      ) {
        return false;
      }

      // Venue filter
      const teamVenue = getVenueForGroup(t.group);
      const matchVenue = selectedVenue === 'ALL' || teamVenue === selectedVenue;

      const matchGroup = selectedGroup === 'ALL' || t.group === selectedGroup;
      const matchGender =
        selectedGender === 'ALL' ||
        (selectedGender === 'male' && (!t.gender || t.gender === 'male')) ||
        t.gender === selectedGender;
      const matchSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.coachName && t.coachName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchVenue && matchGroup && matchGender && matchSearch;
    });

    return sortTeamsByVenue(list);
  }, [teams, config.activeSportId, config.activeCategoryId, selectedVenue, selectedGroup, selectedGender, searchQuery]);

  // Summary statistics for current sport
  const currentSportTeams = useMemo(() => {
    return teams.filter((t) => !t.sportId || t.sportId === config.activeSportId);
  }, [teams, config.activeSportId]);

  const teamStats = useMemo(() => {
    const total = currentSportTeams.length;
    const male = currentSportTeams.filter((t) => !t.gender || t.gender === 'male').length;
    const female = currentSportTeams.filter((t) => t.gender === 'female').length;
    const mixed = currentSportTeams.filter((t) => t.gender === 'mixed').length;
    const mainVenueCount = currentSportTeams.filter((t) => getVenueForGroup(t.group) === 'main').length;
    const branchVenueCount = currentSportTeams.filter((t) => getVenueForGroup(t.group) === 'branch').length;
    return { total, male, female, mixed, mainVenueCount, branchVenueCount };
  }, [currentSportTeams]);

  // View mode: 'by_group' (theo bảng / khối), 'table' (bảng tổng hợp gọn gàng), 'grid' (lưới thẻ)
  const [viewMode, setViewMode] = useState<'by_group' | 'table' | 'grid'>('by_group');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Grouped teams sorted by venue: Điểm chính (K10, K11, K12) first, then Phân hiệu
  const teamsByGroup = useMemo(() => {
    const map: Record<string, Team[]> = {};
    const sortedGroups = sortGroupsByVenue(config.customGroups);
    sortedGroups.forEach((g) => {
      map[g] = [];
    });
    filteredTeams.forEach((t) => {
      const g = t.group || 'Khác';
      if (!map[g]) map[g] = [];
      map[g].push(t);
    });
    return map;
  }, [filteredTeams, config.customGroups]);

  const handleToggleGroupCollapse = (grp: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const handleExpandAllGroups = () => {
    setCollapsedGroups({});
  };

  const handleCollapseAllGroups = () => {
    const next: Record<string, boolean> = {};
    Object.keys(teamsByGroup).forEach((g) => {
      next[g] = true;
    });
    setCollapsedGroups(next);
  };

  const handleOpenAddTeamForGroup = (groupName: string) => {
    setEditingTeam(null);
    setNewTeamName('');
    setNewTeamGroup(groupName);
    setNewTeamGender('male');
    setNewTeamCoach('');
    setNewTeamColor('#0284c7');
    setIsAddingTeam(true);
  };

  const handleToggleGroupSelect = (grpTeamIds: string[]) => {
    if (grpTeamIds.length === 0) return;
    const allSelected = grpTeamIds.every((id) => selectedTeamIds.includes(id));
    if (allSelected) {
      const set = new Set(grpTeamIds);
      setSelectedTeamIds((prev) => prev.filter((id) => !set.has(id)));
    } else {
      const set = new Set([...selectedTeamIds, ...grpTeamIds]);
      setSelectedTeamIds(Array.from(set));
    }
  };

  // Bulk selection helpers
  const handleToggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const areAllFilteredTeamsSelected =
    filteredTeams.length > 0 && filteredTeams.every((t) => selectedTeamIds.includes(t.id));

  const handleToggleAllTeams = () => {
    if (areAllFilteredTeamsSelected) {
      const filteredIdSet = new Set(filteredTeams.map((t) => t.id));
      setSelectedTeamIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedTeamIds, ...filteredTeams.map((t) => t.id)]);
      setSelectedTeamIds(Array.from(newIds));
    }
  };

  const affectedAthletesOfSelectedTeams = useMemo(() => {
    const teamSet = new Set(selectedTeamIds);
    return athletes.filter((a) => teamSet.has(a.teamId));
  }, [athletes, selectedTeamIds]);

  const handleConfirmDeleteMultipleTeams = () => {
    if (selectedTeamIds.length === 0) return;
    if (onDeleteMultipleTeams) {
      onDeleteMultipleTeams(selectedTeamIds, deleteAthletesWithTeams);
    } else {
      selectedTeamIds.forEach((id) => onDeleteTeam(id));
    }
    setSelectedTeamIds([]);
    setIsConfirmDeleteModalOpen(false);
  };

  // Add / Edit Modal handlers
  const handleOpenAddTeam = () => {
    setEditingTeam(null);
    setNewTeamName('');
    setNewTeamGroup(config.customGroups[0] || 'Khối 10');
    setNewTeamGender('male');
    setNewTeamCoach('');
    setNewTeamColor('#0284c7');
    setIsAddingTeam(true);
  };

  const handleOpenEditTeam = (team: Team) => {
    setEditingTeam(team);
    setNewTeamName(team.name);
    setNewTeamGroup(team.group);
    setNewTeamGender((team.gender as TeamGender) || 'male');
    setNewTeamCoach(team.coachName || '');
    setNewTeamColor(team.color || (team.gender === 'female' ? '#e11d48' : '#0284c7'));
    setIsAddingTeam(true);
  };

  const handleSaveTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) {
      alert('Vui lòng nhập tên đội / lớp thi đấu (ví dụ: 10A1, 10A2)!');
      return;
    }

    const teamToSave: Team = {
      id: editingTeam ? editingTeam.id : 'T_' + Date.now(),
      sportId: editingTeam?.sportId || config.activeSportId,
      categoryId: editingTeam?.categoryId || (config.activeCategoryId !== 'ALL' ? config.activeCategoryId : undefined),
      name: newTeamName.trim(),
      group: newTeamGroup,
      gender: newTeamGender,
      coachName: newTeamCoach.trim() || 'Giáo viên phụ trách',
      color: newTeamColor,
    };

    onSaveTeam(teamToSave);
    setEditingTeam(null);
    setNewTeamName('');
    setNewTeamCoach('');
    setIsAddingTeam(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Key Actions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[11px] font-bold border border-sky-200 dark:border-sky-800 mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Tên các đội thi đấu trong 1 giải đấu</span>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Danh Sách Đội Thi Đấu</span>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              (10A1, 10A2, 11B1, 12C2...)
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            <strong>Danh sách đội:</strong> tên của các đội thi đấu trong 1 giải đấu (10A1, 10A2...). <strong>Danh sách VĐV:</strong> tên các vận động viên cụ thể trong 1 đội bóng.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Download Template */}
          <button
            type="button"
            onClick={downloadTeamImportTemplateExcel}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Tải cấu trúc file mẫu danh sách đội thi đấu chuẩn (gồm Sheet DanhSachDoi, Sheet DanhSachVDV_Doi_10A1 và HuongDan)"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Mẫu Đội (.xlsx)</span>
          </button>

          {canManage ? (
            <>
              {/* Excel Import for Teams */}
              <button
                type="button"
                onClick={() => setIsExcelImportModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Nhập danh sách các đội thi đấu trong giải từ file Excel (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập Đội Excel</span>
              </button>

              {/* Excel Import for Athletes */}
              {onOpenAthleteExcelImport && (
                <button
                  type="button"
                  onClick={() => onOpenAthleteExcelImport()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Nhập danh sách vận động viên vào các đội từ file Excel (.xlsx, .xls, .csv)"
                >
                  <Users className="w-4 h-4" />
                  <span>Nhập VĐV Excel</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenAddTeam}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Đội Mới</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Đăng nhập để thêm, sửa, xoá đội bóng và nhập Excel"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Để Quản Lý</span>
            </button>
          )}

          {/* Quick link to Athletes List */}
          <button
            type="button"
            onClick={() => onNavigateToAthletes()}
            className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 cursor-pointer"
            title="Chuyển sang danh sách vận động viên từng cá nhân"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Xem Danh Sách VĐV →</span>
          </button>
        </div>
      </div>

      {/* Read-Only Notice Banner for Unauthenticated Viewers */}
      {!canManage && (
        <div className="p-3.5 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200/80 dark:border-sky-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-sky-900 dark:text-sky-200">
            <Lock className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Chế độ xem (Chỉ đọc)</strong>: Bạn chưa đăng nhập nên chỉ có quyền xem danh sách đội bóng. Vui lòng đăng nhập để thêm, sửa, xoá đội và nhập danh sách từ Excel.
            </span>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Ngay</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Overview Metrics by Gender and Category */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Tổng Số Đội (Lớp)</span>
            <Shield className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {teamStats.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {config.customGroups.length} khối / bảng đấu
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>👦 Đội Nam</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {teamStats.male}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Các lớp đăng ký giải nam</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>👧 Đội Nữ</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {teamStats.female}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Các lớp đăng ký giải nữ</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Tổng VĐV Trong Đội</span>
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {athletes.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Đã đăng ký vào các đội</div>
        </div>
      </div>

      {/* 2.5 Venue Filter Toolbar: Điểm chính (K10, K11, K12) vs Phân hiệu (Khối 10, Khối 11, Khối 12) */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <span>Địa điểm thi đấu:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedVenue('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                selectedVenue === 'ALL'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs'
                  : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              Tất cả địa điểm ({teamStats.total})
            </button>

            <button
              type="button"
              onClick={() => setSelectedVenue('main')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                selectedVenue === 'main'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:border-indigo-300'
              }`}
            >
              <span>📍 Điểm chính</span>
              <span className="text-[10px] font-semibold opacity-90">(K10, K11, K12)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-700/30 font-extrabold">
                {teamStats.mainVenueCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedVenue('branch')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                selectedVenue === 'branch'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:border-amber-300'
              }`}
            >
              <span>🏫 Phân hiệu</span>
              <span className="text-[10px] font-semibold opacity-90">(Khối 10, Khối 11, Khối 12)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-700/30 font-extrabold">
                {teamStats.branchVenueCount}
              </span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400">
          * Đội bóng sắp xếp theo thứ tự: Điểm chính (K10, K11, K12) trước, Phân hiệu sau
        </div>
      </div>

      {/* 3. Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên đội/lớp (10A1, 10A2...), GVCN, HLV..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Group / Block Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Khối / Bảng:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
          >
            <option value="ALL">Tất cả khối / bảng</option>
            {config.customGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Gender Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Giới tính:</span>
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value as 'ALL' | TeamGender)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
          >
            <option value="ALL">Tất cả giới tính ({teamStats.total})</option>
            <option value="male">👦 Đội Nam ({teamStats.male})</option>
            <option value="female">👧 Đội Nữ ({teamStats.female})</option>
            {teamStats.mixed > 0 && <option value="mixed">👥 Hỗn Hợp ({teamStats.mixed})</option>}
          </select>
        </div>

        {/* View Mode Switcher and Quick Bulk Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented View Mode */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('by_group')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'by_group'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Xem danh sách đội gom nhóm theo Bảng / Khối thi đấu gọn gàng"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Theo Bảng / Khối</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Xem toàn bộ danh sách đội dạng bảng tổng hợp"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Bảng Tổng Hợp</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Xem danh sách dạng thẻ trực quan"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Lưới Thẻ</span>
            </button>
          </div>

          {filteredTeams.length > 0 && (
            <button
              type="button"
              onClick={handleToggleAllTeams}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              {areAllFilteredTeamsSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                  <span>Bỏ chọn</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chọn tất cả ({filteredTeams.length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 4. Quick Group Selector Chips & Expand/Collapse All (Only when in by_group mode) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1">Lọc nhanh:</span>
          <button
            type="button"
            onClick={() => setSelectedGroup('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedGroup === 'ALL'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
            }`}
          >
            Tất cả bảng ({filteredTeams.length})
          </button>
          {config.customGroups.map((g) => {
            const count = (teamsByGroup[g] || []).length;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  selectedGroup === g
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <span>{g}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedGroup === g ? 'bg-sky-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {viewMode === 'by_group' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleExpandAllGroups}
              className="text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Mở tất cả</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={handleCollapseAllGroups}
              className="text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Thu gọn</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Main View Content */}
      {filteredTeams.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center shadow-2xs">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {searchQuery || selectedGroup !== 'ALL' || selectedGender !== 'ALL'
                ? 'Không tìm thấy đội nào phù hợp với bộ lọc'
                : 'Chưa có đội thi đấu nào được tạo'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có thể nhập danh sách các lớp (10A1, 10A2, 11B1...) trực tiếp từ file Excel hoặc nhấn Thêm Đội Mới.
            </p>
            {canManage ? (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsExcelImportModalOpen(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Nhập Đội Từ File Excel</span>
                </button>
                <button
                  type="button"
                  onClick={downloadTeamImportTemplateExcel}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Tải File Mẫu (10A1, 10A2...)</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng Nhập Để Nhập Danh Sách Đội & VĐV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'by_group' ? (
        /* MODE 1: GROUPED BY TABLE / BLOCK (GỌN GÀNG, THEO TỪNG BẢNG/KHỐI) */
        <div className="space-y-5">
          {Object.entries(teamsByGroup)
            .filter(([groupName]) => {
              if (selectedGroup !== 'ALL' && groupName !== selectedGroup) return false;
              if (selectedVenue !== 'ALL' && getVenueForGroup(groupName) !== selectedVenue) return false;
              return true;
            })
            .map(([groupName, groupTeams]) => {
              const isCollapsed = !!collapsedGroups[groupName];
              const grpTeamIds = groupTeams.map((t) => t.id);
              const isAllInGrpSelected =
                grpTeamIds.length > 0 && grpTeamIds.every((id) => selectedTeamIds.includes(id));
              const maleCount = groupTeams.filter((t) => !t.gender || t.gender === 'male').length;
              const femaleCount = groupTeams.filter((t) => t.gender === 'female').length;
              const totalAthletesInGroup = groupTeams.reduce(
                (sum, t) => sum + (athleteCountByTeam.get(t.id) || 0),
                0
              );
              const venueInfo = getVenueInfo(groupName, config.venues);

              return (
                <div
                  key={groupName}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition"
                >
                  {/* Group Header Bar */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-sky-50/30 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleGroupCollapse(groupName)}
                        className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:border-sky-400 transition cursor-pointer"
                        title={isCollapsed ? 'Mở rộng bảng này' : 'Thu gọn bảng này'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            onClick={() => handleToggleGroupCollapse(groupName)}
                            className="font-extrabold text-base text-slate-900 dark:text-white cursor-pointer hover:text-sky-600 transition"
                          >
                            {groupName}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold border ${venueInfo.badgeColor}`}
                            title={venueInfo.description}
                          >
                            <span>{venueInfo.icon}</span>
                            <span>{venueInfo.name}</span>
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                            {groupTeams.length} đội
                          </span>
                        </div>

                        {/* Unboxed Metadata (Zero-pill discipline) */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          <span>{maleCount} Nam</span>
                          <span aria-hidden="true">·</span>
                          <span>{femaleCount} Nữ</span>
                          <span aria-hidden="true">·</span>
                          <span>{totalAthletesInGroup} VĐV đã đăng ký</span>
                        </div>
                      </div>
                    </div>

                    {/* Group Header Controls */}
                    <div className="flex items-center gap-2">
                      {groupTeams.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleToggleGroupSelect(grpTeamIds)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                          title="Chọn tất cả đội trong bảng này"
                        >
                          {isAllInGrpSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Chọn bảng ({groupTeams.length})</span>
                        </button>
                      )}

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddTeamForGroup(groupName)}
                          className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          title={`Thêm đội mới vào ${groupName}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Thêm vào {groupName}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Group Table / Roster Body */}
                  {!isCollapsed && (
                    <div>
                      {groupTeams.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                          Chưa có đội nào trong bảng {groupName}.{' '}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenAddTeamForGroup(groupName)}
                              className="text-sky-600 font-bold hover:underline ml-1 cursor-pointer"
                            >
                              + Thêm đội vào {groupName} ngay
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/70 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                                <th className="py-3 px-4 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isAllInGrpSelected}
                                    onChange={() => handleToggleGroupSelect(grpTeamIds)}
                                    className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                    title="Chọn toàn bộ đội trong bảng này"
                                  />
                                </th>
                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                                  Tên Đội / Lớp
                                </th>
                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                                  Giới Tính
                                </th>
                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                                  GVCN / Phụ Trách
                                </th>
                                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">
                                  Thành Viên (VĐV)
                                </th>
                                <th className="py-3 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                  Thao Tác
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {groupTeams.map((team, idx) => {
                                const isSelected = selectedTeamIds.includes(team.id);
                                const memberCount = athleteCountByTeam.get(team.id) || 0;

                                return (
                                  <tr
                                    key={team.id}
                                    className={`transition ${
                                      isSelected
                                        ? 'bg-sky-50/60 dark:bg-sky-950/30'
                                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                    }`}
                                  >
                                    <td className="py-3 px-4 w-10 text-center">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleTeam(team.id)}
                                        className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                                        title="Chọn đội này"
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <span className="font-mono text-xs text-slate-400 w-4">
                                          {(idx + 1).toString().padStart(2, '0')}
                                        </span>
                                        <div
                                          className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shrink-0 shadow-2xs"
                                          style={{
                                            backgroundColor:
                                              team.color ||
                                              (team.gender === 'female' ? '#e11d48' : '#0284c7'),
                                          }}
                                          title={`Màu áo: ${team.color || 'Mặc định'}`}
                                        />
                                        <div className="flex flex-col">
                                          <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                                            {team.name}
                                          </span>
                                          {team.lastUpdatedBy && (
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                              Cập nhật: {team.lastUpdatedBy}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      {team.gender === 'female' ? (
                                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                          <span>👧</span>
                                          <span>Nữ</span>
                                        </span>
                                      ) : team.gender === 'mixed' ? (
                                        <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                                          <span>👥</span>
                                          <span>Hỗn hợp</span>
                                        </span>
                                      ) : (
                                        <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                                          <span>👦</span>
                                          <span>Nam</span>
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                      {team.coachName || 'Chưa cập nhật'}
                                    </td>
                                    <td className="py-3 px-4">
                                      <button
                                        type="button"
                                        onClick={() => onNavigateToAthletes(team.name)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 font-bold transition cursor-pointer"
                                        title={`Xem danh sách các vận động viên thuộc đội ${team.name}`}
                                      >
                                        <Users className="w-3.5 h-3.5" />
                                        <span>{memberCount} VĐV</span>
                                        <span className="text-sky-400">→</span>
                                      </button>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {onOpenAthleteExcelImport && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (!canManage) {
                                                onOpenLogin?.();
                                                return;
                                              }
                                              onOpenAthleteExcelImport(team.id);
                                            }}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                                            title={canManage ? `Nhập danh sách VĐV cho ${team.name} từ file Excel` : 'Đăng nhập để nhập VĐV từ Excel'}
                                          >
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {canManage && onAddAthleteForTeam && (
                                          <button
                                            type="button"
                                            onClick={() => onAddAthleteForTeam(team)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                                            title={`Thêm VĐV vào đội ${team.name}`}
                                          >
                                            <UserPlus className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {canManage && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditTeam(team)}
                                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition cursor-pointer"
                                            title="Sửa thông tin đội"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => onDeleteTeam(team.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                                            title="Xóa đội này"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : viewMode === 'table' ? (
        /* MODE 2: UNIFIED DENSE TABLE (BẢNG TỔNG HỢP TOÀN BỘ) */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={areAllFilteredTeamsSelected}
                      onChange={handleToggleAllTeams}
                      className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      title="Chọn tất cả các đội hiển thị"
                    />
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                    Tên Đội / Lớp
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                    Khối / Bảng
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                    Giới Tính
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                    GVCN / HLV
                  </th>
                  <th className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">
                    Số Lượng VĐV
                  </th>
                  <th className="py-3.5 px-4 text-right font-bold text-slate-700 dark:text-slate-300">
                    Thao Tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredTeams.map((team, idx) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  const memberCount = athleteCountByTeam.get(team.id) || 0;

                  return (
                    <tr
                      key={team.id}
                      className={`transition ${
                        isSelected
                          ? 'bg-sky-50/70 dark:bg-sky-950/30'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3.5 px-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTeam(team.id)}
                          className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs text-slate-400 w-5">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <div
                            className="w-3.5 h-3.5 rounded-full border border-white dark:border-slate-800 shrink-0 shadow-2xs"
                            style={{
                              backgroundColor:
                                team.color || (team.gender === 'female' ? '#e11d48' : '#0284c7'),
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-slate-900 dark:text-white">
                              {team.name}
                            </span>
                            {team.lastUpdatedBy && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                Cập nhật: {team.lastUpdatedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {team.group}
                      </td>
                      <td className="py-3.5 px-4">
                        {team.gender === 'female' ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                            <span>👧</span>
                            <span>Nữ</span>
                          </span>
                        ) : team.gender === 'mixed' ? (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                            <span>👥</span>
                            <span>Hỗn hợp</span>
                          </span>
                        ) : (
                          <span className="text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                            <span>👦</span>
                            <span>Nam</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {team.coachName || 'Chưa cập nhật'}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onNavigateToAthletes(team.name)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900 font-bold transition cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{memberCount} VĐV</span>
                          <span className="text-sky-400">→</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onOpenAthleteExcelImport && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canManage) {
                                  onOpenLogin?.();
                                  return;
                                }
                                onOpenAthleteExcelImport(team.id);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                              title={canManage ? `Nhập danh sách VĐV cho ${team.name} từ file Excel` : 'Đăng nhập để nhập VĐV từ Excel'}
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManage && onAddAthleteForTeam && (
                            <button
                              type="button"
                              onClick={() => onAddAthleteForTeam(team)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                              title={`Thêm VĐV vào đội ${team.name}`}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditTeam(team)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition cursor-pointer"
                              title="Sửa thông tin đội"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onDeleteTeam(team.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="Xóa đội này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MODE 3: CARD GRID VIEW (LƯỚI THẺ TRỰC QUAN) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => {
            const isSelected = selectedTeamIds.includes(team.id);
            const memberCount = athleteCountByTeam.get(team.id) || 0;

            return (
              <div
                key={team.id}
                className={`p-5 rounded-3xl border transition shadow-2xs space-y-3 relative group ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Team Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTeam(team.id)}
                      className="w-4 h-4 mt-1 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      title="Chọn đội này để thao tác hàng loạt"
                    />
                    <div>
                      {/* Gender and Group - unboxed text */}
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {team.group}
                        </span>
                        <span aria-hidden="true">·</span>
                        {team.gender === 'female' ? (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            👧 Đội Nữ
                          </span>
                        ) : team.gender === 'mixed' ? (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            👥 Hỗn Hợp
                          </span>
                        ) : (
                          <span className="text-sky-600 dark:text-sky-400 font-semibold">
                            👦 Đội Nam
                          </span>
                        )}
                      </div>

                      {/* Team Name */}
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        {team.name}
                      </h3>

                      <p className="text-xs text-slate-400 mt-0.5">
                        GVCN / HLV:{' '}
                        <strong className="text-slate-600 dark:text-slate-300">
                          {team.coachName || 'Chưa cập nhật'}
                        </strong>
                      </p>
                      {team.lastUpdatedBy && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Cập nhật: {team.lastUpdatedBy}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Jersey Color Indicator */}
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs shrink-0 mt-1"
                    style={{
                      backgroundColor:
                        team.color || (team.gender === 'female' ? '#e11d48' : '#0284c7'),
                    }}
                    title={`Màu áo: ${team.color || 'Mặc định'}`}
                  />
                </div>

                {/* Team Roster Metrics */}
                <div className="flex items-center justify-between text-xs py-2.5 px-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Thành viên đăng ký:</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {memberCount} VĐV
                  </span>
                </div>

                {/* Card Action Links */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigateToAthletes(team.name)}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    title={`Xem danh sách các vận động viên thuộc đội ${team.name}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem VĐV ({memberCount})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {onOpenAthleteExcelImport && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canManage) {
                            onOpenLogin?.();
                            return;
                          }
                          onOpenAthleteExcelImport(team.id);
                        }}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                        title={canManage ? `Nhập danh sách VĐV cho ${team.name} từ file Excel` : 'Đăng nhập để nhập VĐV từ Excel'}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canManage && onAddAthleteForTeam && (
                      <button
                        type="button"
                        onClick={() => onAddAthleteForTeam(team)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                        title={`Thêm VĐV vào đội ${team.name}`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditTeam(team)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-lg transition cursor-pointer"
                        title="Chỉnh sửa thông tin đội"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDeleteTeam(team.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                        title="Xóa đội bóng này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Batch Action Bar for Teams */}
      {selectedTeamIds.length > 0 && (
        <div className="sticky bottom-3 p-4 bg-slate-900/95 text-white dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-extrabold text-xs">
              {selectedTeamIds.length}
            </div>
            <div className="text-xs">
              <span className="font-semibold block">
                Đã chọn <strong className="text-sky-400 font-extrabold">{selectedTeamIds.length}</strong> / {filteredTeams.length} đội
              </span>
              <span className="text-[11px] text-slate-400">
                (Có {affectedAthletesOfSelectedTeams.length} VĐV thuộc các đội được chọn)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <input
                type="checkbox"
                checked={deleteAthletesWithTeams}
                onChange={(e) => setDeleteAthletesWithTeams(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span>Đồng thời xóa {affectedAthletesOfSelectedTeams.length} VĐV thuộc đội</span>
            </label>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa {selectedTeamIds.length} Đội Đã Chọn</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedTeamIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Bulk Delete */}
      {isConfirmDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Xác nhận xóa {selectedTeamIds.length} đội bóng?
              </h3>
              <p className="text-xs text-slate-500">
                Thao tác này sẽ xóa vĩnh viễn các đội đã chọn khỏi giải đấu và đồng bộ hóa cơ sở dữ liệu.
              </p>
              {deleteAthletesWithTeams && affectedAthletesOfSelectedTeams.length > 0 && (
                <div className="mt-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300">
                  ⚠️ <strong>Cảnh báo:</strong> Sẽ đồng thời xóa{' '}
                  <strong>{affectedAthletesOfSelectedTeams.length}</strong> vận động viên thuộc các đội này.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMultipleTeams}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Team Modal */}
      {isAddingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {editingTeam ? 'Chỉnh Sửa Thông Tin Đội' : 'Thêm Đội / Lớp Thi Đấu Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Ví dụ: 10A1, 10A2, 11B1, 12C2,5...</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingTeam(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Tên Đội / Lớp Thi Đấu *
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ví dụ: 10A1, 10A2, 11B1, 12C2,5..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Khối / Bảng Đấu
                  </label>
                  <select
                    value={newTeamGroup}
                    onChange={(e) => setNewTeamGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                  >
                    {config.customGroups.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Giới Tính Đội
                  </label>
                  <select
                    value={newTeamGender}
                    onChange={(e) => setNewTeamGender(e.target.value as TeamGender)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none font-semibold"
                  >
                    <option value="male">👦 Đội Nam</option>
                    <option value="female">👧 Đội Nữ</option>
                    <option value="mixed">👥 Đội Hỗn Hợp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Giáo Viên Chủ Nhiệm / Huấn Luyện Viên
                </label>
                <input
                  type="text"
                  value={newTeamCoach}
                  onChange={(e) => setNewTeamCoach(e.target.value)}
                  placeholder="Ví dụ: Thầy Trần Văn Nam (GVCN)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Màu Áo Nhận Diện
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newTeamColor}
                    onChange={(e) => setNewTeamColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                  />
                  <span className="text-xs font-mono text-slate-500">{newTeamColor}</span>
                  <div className="flex items-center gap-1.5 ml-auto">
                    {[
                      { hex: '#0284c7', label: 'Nam' },
                      { hex: '#e11d48', label: 'Nữ' },
                      { hex: '#16a34a', label: 'Lá' },
                      { hex: '#ea580c', label: 'Cam' },
                      { hex: '#9333ea', label: 'Tím' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewTeamColor(c.hex)}
                        className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer transition hover:scale-110"
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  {editingTeam ? 'Lưu Thay Đổi' : 'Tạo Đội Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel Team Import Modal */}
      <TeamExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        config={config}
        existingTeams={teams}
        existingTeamsCount={teams.length}
        user={user}
        onOpenLogin={onOpenLogin}
        onClearAllTeams={onClearAllTeams}
        onImportTeams={(incomingTeams: Team[], newGroups?: string[], cleanBeforeImport?: boolean) => {
          if (onImportMultipleTeams) {
            onImportMultipleTeams(incomingTeams, newGroups, cleanBeforeImport);
          }
        }}
      />
    </div>
  );
};
