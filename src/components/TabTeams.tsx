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
  ExternalLink,
  CheckCircle2,
  X,
  Palette,
  Eye,
  Layers,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Athlete, Team, TeamGender, TournamentConfig, UserProfile } from '../types';
import { TeamExcelImportModal } from './TeamExcelImportModal';
import { downloadTeamImportTemplateExcel } from '../services/teamImport';

interface TabTeamsProps {
  teams: Team[];
  athletes: Athlete[];
  config: TournamentConfig;
  user: UserProfile;
  onOpenLogin?: () => void;
  onSaveTeam: (team: Team) => void;
  onImportMultipleTeams?: (teams: Team[], newGroupsToAdd?: string[]) => void;
  onDeleteTeam: (teamId: string) => void;
  onDeleteMultipleTeams?: (teamIds: string[], deleteAthletesToo?: boolean) => void;
  onNavigateToAthletes: (teamIdOrName?: string) => void;
  onAddAthleteForTeam?: (team: Team) => void;
}

export const TabTeams: React.FC<TabTeamsProps> = ({
  teams,
  athletes,
  config,
  user,
  onOpenLogin,
  onSaveTeam,
  onImportMultipleTeams,
  onDeleteTeam,
  onDeleteMultipleTeams,
  onNavigateToAthletes,
  onAddAthleteForTeam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
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

      const matchGroup = selectedGroup === 'ALL' || t.group === selectedGroup;
      const matchGender =
        selectedGender === 'ALL' ||
        (selectedGender === 'male' && (!t.gender || t.gender === 'male')) ||
        t.gender === selectedGender;
      const matchSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.coachName && t.coachName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchGroup && matchGender && matchSearch;
    });
  }, [teams, config.activeSportId, config.activeCategoryId, selectedGroup, selectedGender, searchQuery]);

  // Summary statistics for current sport
  const currentSportTeams = useMemo(() => {
    return teams.filter((t) => !t.sportId || t.sportId === config.activeSportId);
  }, [teams, config.activeSportId]);

  const teamStats = useMemo(() => {
    const total = currentSportTeams.length;
    const male = currentSportTeams.filter((t) => !t.gender || t.gender === 'male').length;
    const female = currentSportTeams.filter((t) => t.gender === 'female').length;
    const mixed = currentSportTeams.filter((t) => t.gender === 'mixed').length;
    return { total, male, female, mixed };
  }, [currentSportTeams]);

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
          {canManage && (
            <>
              {/* Excel Import */}
              <button
                type="button"
                onClick={() => setIsExcelImportModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Nhập danh sách các đội thi đấu trong giải từ file Excel (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập Đội Excel</span>
              </button>

              {/* Download Template */}
              <button
                type="button"
                onClick={downloadTeamImportTemplateExcel}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Tải cấu trúc file mẫu danh sách đội thi đấu chuẩn (gồm Sheet DanhSachDoi, Sheet DanhSachVDV_Doi_10A1 và HuongDan)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mẫu Danh Sách Đội (.xlsx)</span>
              </button>

              {/* Add New Team */}
              <button
                type="button"
                onClick={handleOpenAddTeam}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Đội Mới</span>
              </button>
            </>
          )}

          {!canManage && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Quản Lý Đội</span>
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

        {/* Bulk select toggle */}
        {filteredTeams.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAllTeams}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              {areAllFilteredTeamsSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                  <span>Bỏ chọn tất cả</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chọn tất cả ({filteredTeams.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 4. Teams Cards Grid */}
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
            {canManage && (
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
                  <span>Tải File Mẫu Mẫu (10A1, 10A2...)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
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
                      {/* Gender Badge and Group */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {team.group}
                        </span>

                        {team.gender === 'female' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                            <span>👧</span>
                            <span>Đội Nữ</span>
                          </span>
                        ) : team.gender === 'mixed' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                            <span>👥</span>
                            <span>Hỗn Hợp</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
                            <span>👦</span>
                            <span>Đội Nam</span>
                          </span>
                        )}
                      </div>

                      {/* Team Name */}
                      <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        {team.name}
                      </h3>

                      <p className="text-xs text-slate-400 mt-0.5">
                        GVCN / HLV: <strong className="text-slate-600 dark:text-slate-300">{team.coachName || 'Chưa cập nhật'}</strong>
                      </p>
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
                    {canManage && onAddAthleteForTeam && (
                      <button
                        type="button"
                        onClick={() => onAddAthleteForTeam(team)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
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
        onImportTeams={(incomingTeams: Team[], newGroups?: string[]) => {
          if (onImportMultipleTeams) {
            onImportMultipleTeams(incomingTeams, newGroups);
          }
        }}
      />
    </div>
  );
};
