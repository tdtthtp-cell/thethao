import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Lock,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
  LogIn,
  Shield,
  ExternalLink,
  FileSpreadsheet,
  Download,
  LayoutList,
  Table as TableIcon,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Check,
  Plus,
} from 'lucide-react';
import { Athlete, Team, TournamentConfig, UserProfile } from '../types';
import { decryptText, maskSensitive } from '../services/crypto';
import { AthleteExcelImportModal } from './AthleteExcelImportModal';
import { downloadAthleteImportTemplateExcel } from '../services/teamImport';

interface TabAthletesProps {
  athletes: Athlete[];
  teams: Team[];
  config: TournamentConfig;
  user: UserProfile;
  initialTeamFilter?: string;
  onNavigateToTeams?: () => void;
  onOpenLogin?: () => void;
  onOpenAddAthlete: () => void;
  onOpenEditAthlete: (athlete: Athlete) => void;
  onDeleteAthlete: (athleteId: string) => void;
  onDeleteMultipleAthletes?: (athleteIds: string[]) => void;
  onApproveAthlete: (athleteId: string, status: Athlete['status']) => void;
  onApproveMultipleAthletes?: (athleteIds: string[], status: Athlete['status']) => void;
  onImportMultipleAthletes?: (athletes: Athlete[]) => void;
  onAddAthleteForTeam?: (team: Team) => void;
}

export const TabAthletes: React.FC<TabAthletesProps> = ({
  athletes,
  teams,
  config,
  user,
  initialTeamFilter,
  onNavigateToTeams,
  onOpenLogin,
  onOpenAddAthlete,
  onOpenEditAthlete,
  onDeleteAthlete,
  onDeleteMultipleAthletes,
  onApproveAthlete,
  onApproveMultipleAthletes,
  onImportMultipleAthletes,
  onAddAthleteForTeam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>(initialTeamFilter || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Excel Athlete Import Modal state
  const [isAthleteImportModalOpen, setIsAthleteImportModalOpen] = useState(false);

  // Update filter when initialTeamFilter changes
  useEffect(() => {
    if (initialTeamFilter) {
      setSelectedTeamFilter(initialTeamFilter);
    }
  }, [initialTeamFilter]);

  // Bulk selection state
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

  // E2EE sensitive visibility toggle
  const [revealedIds, setRevealedIds] = useState<Record<string, { idCard: string; phone: string }>>({});
  const [isDecrypting, setIsDecrypting] = useState<string | null>(null);

  const isAdmin = user.role === 'admin';
  const canRegister =
    user.role === 'admin' ||
    user.role === 'referee' ||
    user.role === 'secretary' ||
    user.role === 'athlete';

  const handleToggleReveal = async (athlete: Athlete) => {
    if (!isAdmin) {
      alert('Chỉ Ban Tổ Chức (Admin) mới có quyền giải mã dữ liệu định danh cá nhân E2EE.');
      return;
    }

    if (revealedIds[athlete.id]) {
      // Hide
      const updated = { ...revealedIds };
      delete updated[athlete.id];
      setRevealedIds(updated);
    } else {
      // Decrypt
      setIsDecrypting(athlete.id);
      const decId = await decryptText(athlete.nationalIdEncrypted);
      const decPh = await decryptText(athlete.phoneEncrypted);
      setRevealedIds((prev) => ({
        ...prev,
        [athlete.id]: { idCard: decId, phone: decPh },
      }));
      setIsDecrypting(null);
    }
  };

  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.jerseyNumber.toString().includes(searchQuery);

      const matchGroup = selectedGroup === 'ALL' || a.group === selectedGroup;
      const matchTeam =
        selectedTeamFilter === 'ALL' ||
        a.teamId === selectedTeamFilter ||
        a.teamName.toLowerCase() === selectedTeamFilter.toLowerCase();
      const matchStatus = selectedStatus === 'ALL' || a.status === selectedStatus;

      return matchSearch && matchGroup && matchTeam && matchStatus;
    });
  }, [athletes, searchQuery, selectedGroup, selectedTeamFilter, selectedStatus]);

  // Athletes selection helpers
  const handleToggleAthlete = (id: string) => {
    setSelectedAthleteIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const areAllFilteredAthletesSelected =
    filteredAthletes.length > 0 &&
    filteredAthletes.every((a) => selectedAthleteIds.includes(a.id));

  const handleToggleAllAthletes = () => {
    if (areAllFilteredAthletesSelected) {
      const filteredIdSet = new Set(filteredAthletes.map((a) => a.id));
      setSelectedAthleteIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedAthleteIds, ...filteredAthletes.map((a) => a.id)]);
      setSelectedAthleteIds(Array.from(newIds));
    }
  };

  const handleConfirmDeleteMultipleAthletes = () => {
    if (selectedAthleteIds.length === 0) return;
    if (onDeleteMultipleAthletes) {
      onDeleteMultipleAthletes(selectedAthleteIds);
    } else {
      selectedAthleteIds.forEach((id) => onDeleteAthlete(id));
    }
    setSelectedAthleteIds([]);
    setIsConfirmDeleteModalOpen(false);
  };

  const handleBulkApproveAthletes = (status: Athlete['status']) => {
    if (selectedAthleteIds.length === 0) return;
    if (onApproveMultipleAthletes) {
      onApproveMultipleAthletes(selectedAthleteIds, status);
    } else {
      selectedAthleteIds.forEach((id) => onApproveAthlete(id, status));
    }
    setSelectedAthleteIds([]);
  };

  // View mode: 'by_team' (nhóm theo từng đội gọn gàng), 'by_group' (nhóm theo bảng/khối), 'table' (danh sách tổng)
  const [viewMode, setViewMode] = useState<'by_team' | 'by_group' | 'table'>('by_team');
  const [collapsedTeams, setCollapsedTeams] = useState<Record<string, boolean>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Grouped by Team
  const athletesByTeam = useMemo(() => {
    const map: Record<string, { team: Team; list: Athlete[] }> = {};

    // Initialize all teams that match selectedGroup or selectedTeamFilter
    teams.forEach((t) => {
      if (selectedGroup !== 'ALL' && t.group !== selectedGroup) return;
      if (
        selectedTeamFilter !== 'ALL' &&
        t.id !== selectedTeamFilter &&
        t.name.toLowerCase() !== selectedTeamFilter.toLowerCase()
      ) {
        return;
      }
      map[t.id] = { team: t, list: [] };
    });

    // Populate filtered athletes
    filteredAthletes.forEach((ath) => {
      if (!map[ath.teamId]) {
        map[ath.teamId] = {
          team: {
            id: ath.teamId,
            name: ath.teamName,
            group: ath.group,
            color: '#0284c7',
          },
          list: [],
        };
      }
      map[ath.teamId].list.push(ath);
    });

    return map;
  }, [teams, filteredAthletes, selectedGroup, selectedTeamFilter]);

  // Grouped by Group/Block
  const athletesByGroup = useMemo(() => {
    const map: Record<string, Athlete[]> = {};
    config.customGroups.forEach((g) => {
      map[g] = [];
    });
    filteredAthletes.forEach((ath) => {
      const g = ath.group || 'Khác';
      if (!map[g]) map[g] = [];
      map[g].push(ath);
    });
    return map;
  }, [filteredAthletes, config.customGroups]);

  const handleToggleTeamCollapse = (teamId: string) => {
    setCollapsedTeams((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const handleExpandAllTeams = () => setCollapsedTeams({});
  const handleCollapseAllTeams = () => {
    const next: Record<string, boolean> = {};
    Object.keys(athletesByTeam).forEach((id) => {
      next[id] = true;
    });
    setCollapsedTeams(next);
  };

  const handleToggleGroupCollapse = (grp: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [grp]: !prev[grp] }));
  };

  const handleToggleTeamAthletesSelect = (teamAthletesIds: string[]) => {
    if (teamAthletesIds.length === 0) return;
    const allSelected = teamAthletesIds.every((id) => selectedAthleteIds.includes(id));
    if (allSelected) {
      const set = new Set(teamAthletesIds);
      setSelectedAthleteIds((prev) => prev.filter((id) => !set.has(id)));
    } else {
      const set = new Set([...selectedAthleteIds, ...teamAthletesIds]);
      setSelectedAthleteIds(Array.from(set));
    }
  };

  const stats = useMemo(() => {
    const total = athletes.length;
    const approved = athletes.filter((a) => a.status === 'approved').length;
    const pending = athletes.filter((a) => a.status === 'pending').length;
    return { total, approved, pending };
  }, [athletes]);

  return (
    <div className="space-y-6">
      {/* 1. Header and Action Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold border border-indigo-200 dark:border-indigo-800 mb-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Tên các vận động viên cụ thể trong 1 đội</span>
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Danh Sách Vận Động Viên (Trong Đội)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            <strong>Danh sách VĐV:</strong> tên các vận động viên cụ thể trong 1 đội bóng (10A1, 10A2...). <strong>Danh sách đội:</strong> tên các đội thi đấu trong giải đấu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Quick link to Teams List */}
          {onNavigateToTeams && (
            <button
              type="button"
              onClick={onNavigateToTeams}
              className="px-3.5 py-2 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-sky-200 dark:border-sky-800 cursor-pointer"
              title="Chuyển sang màn hình quản lý danh sách đội thi đấu trong giải (10A1, 10A2...)"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Quản Lý Đội Thi Đấu →</span>
            </button>
          )}

          {canRegister && (
            <>
              {/* Import Athletes from Excel */}
              <button
                type="button"
                onClick={() => setIsAthleteImportModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Nhập danh sách VĐV của đội từ file Excel (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Nhập VĐV Excel</span>
              </button>

              {/* Download Athlete Template */}
              <button
                type="button"
                onClick={() => {
                  const targetTeam = teams.find((t) => t.id === selectedTeamFilter);
                  downloadAthleteImportTemplateExcel(targetTeam?.name || (teams[0]?.name || '10A1'));
                }}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Tải cấu trúc file mẫu danh sách vận động viên trong 1 đội (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Mẫu VĐV Đội (.xlsx)</span>
              </button>

              <button
                onClick={onOpenAddAthlete}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Đăng Ký VĐV</span>
              </button>
            </>
          )}

          {!canRegister && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập Để Thêm VĐV</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Quick Login Banner */}
      {!canRegister ? (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 dark:from-slate-900 dark:via-blue-950/40 dark:to-indigo-950/30 rounded-3xl border border-sky-200 dark:border-sky-900/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>Khu Vực Đăng Ký Vận Động Viên</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold">
                  Yêu Cầu Đăng Nhập
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                Bạn đang truy cập với tư cách <strong>Khách xem</strong>. Huấn luyện viên, Đội trưởng hoặc Ban tổ chức vui lòng đăng nhập để nộp hồ sơ vận động viên vào các đội.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập Ngay</span>
          </button>
        </div>
      ) : (
        <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Đã xác thực tài khoản: <strong>{user.displayName || user.username}</strong> ({user.title})
            </span>
          </div>
          {onOpenLogin && (
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-emerald-700 dark:text-emerald-300 hover:underline font-semibold text-[11px] cursor-pointer"
            >
              Chuyển đổi tài khoản khác →
            </button>
          )}
        </div>
      )}

      {/* 3. Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên VĐV, số áo, tên đội / lớp..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Team / Class Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Đội / Lớp:</span>
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold max-w-[160px]"
          >
            <option value="ALL">Tất cả đội ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.group})
              </option>
            ))}
          </select>
        </div>

        {/* Group Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Bảng/Khối:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
          >
            <option value="ALL">Tất cả bảng</option>
            {config.customGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Hồ sơ:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
          >
            <option value="ALL">Tất cả ({stats.total})</option>
            <option value="approved">Đã duyệt ({stats.approved})</option>
            <option value="pending">Chờ duyệt ({stats.pending})</option>
            <option value="needs_revision">Cần bổ sung</option>
          </select>
        </div>
      </div>

      {/* View Mode Switcher and Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* View Mode Switcher */}
        <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setViewMode('by_team')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'by_team'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>Theo Đội Thi Đấu</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('by_group')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'by_group'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Theo Bảng / Khối</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Danh Sách Tổng</span>
          </button>
        </div>

        {/* Expand / Collapse all when in grouped view */}
        {viewMode !== 'table' && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleExpandAllTeams}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Mở tất cả</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={handleCollapseAllTeams}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Minimize2 className="w-3 h-3" />
              <span>Thu gọn</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Team Chips Bar (when in by_team mode) */}
      {viewMode === 'by_team' && teams.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 text-[11px] font-semibold shrink-0">Chọn nhanh đội:</span>
          <button
            type="button"
            onClick={() => setSelectedTeamFilter('ALL')}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer ${
              selectedTeamFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tất cả ({teams.length} đội)
          </button>
          {teams.map((t) => {
            const count = athletes.filter((a) => a.teamId === t.id || a.teamName.toLowerCase() === t.name.toLowerCase()).length;
            const isSelected = selectedTeamFilter === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTeamFilter(isSelected ? 'ALL' : t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-400'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: t.color || '#6366f1' }}
                />
                <span>{t.name}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Filter Tags */}
      {selectedTeamFilter !== 'ALL' && viewMode !== 'by_team' && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Đang lọc theo đội:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-800">
            <Shield className="w-3 h-3" />
            <span>{teams.find((t) => t.id === selectedTeamFilter)?.name || selectedTeamFilter}</span>
            <button
              onClick={() => setSelectedTeamFilter('ALL')}
              className="hover:text-rose-600 transition ml-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* VIEW MODE 1: THEO ĐỘI THI ĐẤU (BY TEAM ACCORDION) */}
      {viewMode === 'by_team' && (
        <div className="space-y-4">
          {Object.keys(athletesByTeam).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">Không có đội nào phù hợp bộ lọc</p>
              {onNavigateToTeams && (
                <button
                  type="button"
                  onClick={onNavigateToTeams}
                  className="mt-3 text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                >
                  ← Đến trang Quản lý Danh Sách Đội (10A1, 10A2...)
                </button>
              )}
            </div>
          ) : (
            Object.values(athletesByTeam).map(({ team, list }) => {
              const isCollapsed = !!collapsedTeams[team.id];
              const approvedCount = list.filter((a) => a.status === 'approved').length;
              const pendingCount = list.filter((a) => a.status === 'pending').length;
              const teamAthIds = list.map((a) => a.id);
              const allTeamAthSelected = teamAthIds.length > 0 && teamAthIds.every((id) => selectedAthleteIds.includes(id));

              return (
                <div
                  key={team.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Team Card Header */}
                  <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTeamCollapse(team.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                        title={isCollapsed ? 'Mở rộng đội' : 'Thu gọn đội'}
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {list.length > 0 && (
                        <input
                          type="checkbox"
                          checked={allTeamAthSelected}
                          onChange={() => handleToggleTeamAthletesSelect(teamAthIds)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          title="Chọn tất cả VĐV trong đội này"
                        />
                      )}

                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: team.color || '#6366f1' }}
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                            {team.name}
                          </h3>
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            · {team.group}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span><strong>{list.length}</strong> VĐV</span>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{approvedCount} đã duyệt</span>
                          {pendingCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">{pendingCount} chờ duyệt</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Team Header Actions */}
                    <div className="flex items-center gap-2 ml-auto">
                      {canRegister && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTeamFilter(team.id);
                              setIsAthleteImportModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            title={`Nhập danh sách VĐV cho ${team.name} từ file Excel`}
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Nhập Excel</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onAddAthleteForTeam) {
                                onAddAthleteForTeam(team);
                              } else {
                                onOpenAddAthlete();
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Thêm VĐV</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Team Athletes Table (when not collapsed) */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      {list.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">
                          <Users className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">
                            Chưa có vận động viên nào trong đội {team.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Bấm nút <strong>"+ Thêm VĐV"</strong> phía trên để bổ sung thành viên cho đội này.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                              <th className="p-3 w-10 text-center"></th>
                              <th className="p-3 w-16">Số Áo</th>
                              <th className="p-3">Vận Động Viên</th>
                              <th className="p-3">Vị Trí</th>
                              <th className="p-3">Bảo Mật E2EE (CCCD / ĐT)</th>
                              <th className="p-3">Trạng Thái</th>
                              <th className="p-3">Bàn Thắng/Điểm</th>
                              <th className="p-3 text-right">Thao Tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                            {list.map((ath) => {
                              const isSelected = selectedAthleteIds.includes(ath.id);
                              const isRevealed = !!revealedIds[ath.id];
                              const revealedData = revealedIds[ath.id];

                              return (
                                <tr
                                  key={ath.id}
                                  className={`transition ${
                                    isSelected
                                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                                      : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                  }`}
                                >
                                  <td className="p-3 w-10 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleAthlete(ath.id)}
                                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      title="Chọn VĐV này"
                                    />
                                  </td>
                                  <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                    #{ath.jerseyNumber}
                                  </td>
                                  <td className="p-3">
                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                      <span>{ath.name}</span>
                                      {ath.isCaptain && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                          C
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400">Sinh: {ath.dateOfBirth}</div>
                                  </td>
                                  <td className="p-3 text-slate-600 dark:text-slate-300">{ath.position}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                                          {isRevealed
                                            ? revealedData.idCard
                                            : maskSensitive(ath.nationalIdEncrypted)}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-400">
                                          {isRevealed
                                            ? revealedData.phone
                                            : maskSensitive(ath.phoneEncrypted)}
                                        </div>
                                      </div>
                                      {isAdmin && (
                                        <button
                                          onClick={() => handleToggleReveal(ath)}
                                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                          title={isRevealed ? 'Ẩn thông tin E2EE' : 'Giải mã định danh E2EE'}
                                        >
                                          {isDecrypting === ath.id ? (
                                            <span className="text-[10px] animate-pulse">...</span>
                                          ) : isRevealed ? (
                                            <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
                                          ) : (
                                            <Eye className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {ath.status === 'approved' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Đã duyệt
                                      </span>
                                    )}
                                    {ath.status === 'pending' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        <Clock className="w-3 h-3" />
                                        Chờ duyệt
                                      </span>
                                    )}
                                    {ath.status === 'needs_revision' && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                        <AlertCircle className="w-3 h-3" />
                                        Cần bổ sung
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {ath.goalsOrPoints}
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      {isAdmin && ath.status !== 'approved' && (
                                        <button
                                          onClick={() => onApproveAthlete(ath.id, 'approved')}
                                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                          title="Duyệt VĐV"
                                        >
                                          Duyệt
                                        </button>
                                      )}
                                      {canRegister && (
                                        <button
                                          onClick={() => onOpenEditAthlete(ath)}
                                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                                          title="Sửa hồ sơ"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {isAdmin && (
                                        <button
                                          onClick={() => onDeleteAthlete(ath.id)}
                                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                          title="Xóa VĐV"
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
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: THEO BẢNG / KHỐI (BY GROUP ACCORDION) */}
      {viewMode === 'by_group' && (
        <div className="space-y-4">
          {Object.entries(athletesByGroup).map(([groupName, groupAthletes]) => {
            const isCollapsed = !!collapsedGroups[groupName];
            const groupTeams = teams.filter((t) => t.group === groupName);
            const approvedCount = groupAthletes.filter((a) => a.status === 'approved').length;

            return (
              <div
                key={groupName}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden transition-all"
              >
                {/* Group Header */}
                <div
                  onClick={() => handleToggleGroupCollapse(groupName)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-900 transition"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                          {groupName}
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          ({groupTeams.length} đội)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span><strong>{groupAthletes.length}</strong> VĐV</span>
                        <span>·</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{approvedCount} đã duyệt</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    {groupAthletes.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        <Users className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          Chưa có vận động viên nào trong {groupName}
                        </p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                            <th className="p-3 w-10 text-center"></th>
                            <th className="p-3 w-16">Số Áo</th>
                            <th className="p-3">Vận Động Viên</th>
                            <th className="p-3">Đội Thi Đấu</th>
                            <th className="p-3">Vị Trí</th>
                            <th className="p-3">Bảo Mật E2EE</th>
                            <th className="p-3">Trạng Thái</th>
                            <th className="p-3">Bàn Thắng/Điểm</th>
                            <th className="p-3 text-right">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {groupAthletes.map((ath) => {
                            const isSelected = selectedAthleteIds.includes(ath.id);
                            const isRevealed = !!revealedIds[ath.id];
                            const revealedData = revealedIds[ath.id];

                            return (
                              <tr
                                key={ath.id}
                                className={`transition ${
                                  isSelected
                                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                                }`}
                              >
                                <td className="p-3 w-10 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleAthlete(ath.id)}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="p-3 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                  #{ath.jerseyNumber}
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{ath.name}</span>
                                    {ath.isCaptain && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                        C
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Sinh: {ath.dateOfBirth}</div>
                                </td>
                                <td className="p-3">
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {ath.teamName}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-600 dark:text-slate-300">{ath.position}</td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                                        {isRevealed
                                          ? revealedData.idCard
                                          : maskSensitive(ath.nationalIdEncrypted)}
                                      </div>
                                    </div>
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleToggleReveal(ath)}
                                        className="p-1 rounded text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                      >
                                        {isRevealed ? (
                                          <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                          <Eye className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  {ath.status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Đã duyệt
                                    </span>
                                  )}
                                  {ath.status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      <Clock className="w-3 h-3" />
                                      Chờ duyệt
                                    </span>
                                  )}
                                  {ath.status === 'needs_revision' && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                      <AlertCircle className="w-3 h-3" />
                                      Cần bổ sung
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {ath.goalsOrPoints}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isAdmin && ath.status !== 'approved' && (
                                      <button
                                        onClick={() => onApproveAthlete(ath.id, 'approved')}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                      >
                                        Duyệt
                                      </button>
                                    )}
                                    {canRegister && (
                                      <button
                                        onClick={() => onOpenEditAthlete(ath)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    {isAdmin && (
                                      <button
                                        onClick={() => onDeleteAthlete(ath.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
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
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: DANH SÁCH TỔNG (COMPREHENSIVE FLAT TABLE) */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={areAllFilteredAthletesSelected}
                      onChange={handleToggleAllAthletes}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Chọn / Bỏ chọn tất cả VĐV đang hiển thị"
                    />
                  </th>
                  <th className="p-4">Số Áo</th>
                  <th className="p-4">Vận Động Viên</th>
                  <th className="p-4">Đội / Lớp Thi Đấu</th>
                  <th className="p-4">Vị Trí</th>
                  <th className="p-4">Bảo Mật E2EE (CCCD / ĐT)</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4">Bàn Thắng/Điểm</th>
                  <th className="p-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400 text-xs">
                      <div className="max-w-md mx-auto space-y-2">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <p className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                          Chưa có vận động viên nào trong danh sách
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          Vui lòng nhấn nút <strong>"Đăng Ký VĐV Mới"</strong> phía trên để thêm vận động viên vào đội. Hoặc chuyển sang tab <strong>Danh Sách Đội</strong> để tạo các lớp/đội trước.
                        </p>
                        {onNavigateToTeams && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={onNavigateToTeams}
                              className="text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                            >
                              ← Đến trang Quản lý Danh Sách Đội (10A1, 10A2...)
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAthletes.map((ath) => {
                    const isSelected = selectedAthleteIds.includes(ath.id);
                    const isRevealed = !!revealedIds[ath.id];
                    const revealedData = revealedIds[ath.id];

                    return (
                      <tr
                        key={ath.id}
                        className={`transition ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAthlete(ath.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Chọn VĐV này để thao tác hàng loạt"
                          />
                        </td>
                        <td className="p-4 font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm">
                          #{ath.jerseyNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{ath.name}</span>
                            {ath.isCaptain && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                C
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">Sinh: {ath.dateOfBirth}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {ath.teamName}
                          </span>
                          <span className="block text-[10px] text-slate-400">{ath.group}</span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{ath.position}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="text-[11px] font-mono text-slate-700 dark:text-slate-300">
                                {isRevealed
                                  ? revealedData.idCard
                                  : maskSensitive(ath.nationalIdEncrypted)}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {isRevealed
                                  ? revealedData.phone
                                  : maskSensitive(ath.phoneEncrypted)}
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                onClick={() => handleToggleReveal(ath)}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title={isRevealed ? 'Ẩn thông tin E2EE' : 'Giải mã định danh E2EE'}
                              >
                                {isDecrypting === ath.id ? (
                                  <span className="text-[10px] animate-pulse">...</span>
                                ) : isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {ath.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã duyệt
                            </span>
                          )}
                          {ath.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              Chờ duyệt
                            </span>
                          )}
                          {ath.status === 'needs_revision' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <AlertCircle className="w-3 h-3" />
                              Cần bổ sung
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {ath.goalsOrPoints}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isAdmin && ath.status !== 'approved' && (
                              <button
                                onClick={() => onApproveAthlete(ath.id, 'approved')}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
                                title="Duyệt VĐV"
                              >
                                Duyệt
                              </button>
                            )}
                            {canRegister && (
                              <button
                                onClick={() => onOpenEditAthlete(ath)}
                                className="p-1 text-slate-400 hover:text-indigo-600 rounded transition cursor-pointer"
                                title="Sửa hồ sơ"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => onDeleteAthlete(ath.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                                title="Xóa VĐV"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Floating Bulk Actions Bar */}
      {selectedAthleteIds.length > 0 && (
        <div className="sticky bottom-3 p-4 bg-slate-900/95 text-white dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-extrabold text-xs">
              {selectedAthleteIds.length}
            </div>
            <div className="text-xs">
              <span className="font-semibold block">
                Đã chọn <strong className="text-indigo-400 font-extrabold">{selectedAthleteIds.length}</strong> / {filteredAthletes.length} VĐV
              </span>
              <span className="text-[11px] text-slate-400">Chọn thao tác xử lý đồng thời</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => handleBulkApproveAthletes('approved')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Duyệt ({selectedAthleteIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkApproveAthletes('needs_revision')}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Y/C Bổ Sung</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmDeleteModalOpen(true)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa ({selectedAthleteIds.length})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedAthleteIds([])}
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
                Xác nhận xóa {selectedAthleteIds.length} vận động viên?
              </h3>
              <p className="text-xs text-slate-500">
                Thao tác này sẽ xóa vĩnh viễn hồ sơ của các vận động viên đã chọn khỏi hệ thống giải đấu.
              </p>
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
                onClick={handleConfirmDeleteMultipleAthletes}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Athlete Import Modal */}
      <AthleteExcelImportModal
        isOpen={isAthleteImportModalOpen}
        onClose={() => setIsAthleteImportModalOpen(false)}
        teams={teams}
        initialTeamFilter={selectedTeamFilter}
        onConfirmImport={(imported) => {
          if (onImportMultipleAthletes) {
            onImportMultipleAthletes(imported);
          }
        }}
      />
    </div>
  );
};
