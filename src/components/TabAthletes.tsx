import React, { useState, useMemo } from 'react';
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
  Plus,
  Lock,
  X,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Athlete, Team, TournamentConfig, UserProfile } from '../types';
import { decryptText, maskSensitive } from '../services/crypto';

interface TabAthletesProps {
  athletes: Athlete[];
  teams: Team[];
  config: TournamentConfig;
  user: UserProfile;
  onOpenAddAthlete: () => void;
  onOpenEditAthlete: (athlete: Athlete) => void;
  onDeleteAthlete: (athleteId: string) => void;
  onDeleteMultipleAthletes?: (athleteIds: string[]) => void;
  onSaveTeam: (team: Team) => void;
  onDeleteTeam: (teamId: string) => void;
  onDeleteMultipleTeams?: (teamIds: string[], deleteAthletesToo?: boolean) => void;
  onApproveAthlete: (athleteId: string, status: Athlete['status']) => void;
  onApproveMultipleAthletes?: (athleteIds: string[], status: Athlete['status']) => void;
}

export const TabAthletes: React.FC<TabAthletesProps> = ({
  athletes,
  teams,
  config,
  user,
  onOpenAddAthlete,
  onOpenEditAthlete,
  onDeleteAthlete,
  onDeleteMultipleAthletes,
  onSaveTeam,
  onDeleteTeam,
  onDeleteMultipleTeams,
  onApproveAthlete,
  onApproveMultipleAthletes,
}) => {
  const [viewMode, setViewMode] = useState<'athletes' | 'teams'>('athletes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Bulk selection state
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isConfirmDeleteAthletesModalOpen, setIsConfirmDeleteAthletesModalOpen] = useState(false);
  const [isConfirmDeleteTeamsModalOpen, setIsConfirmDeleteTeamsModalOpen] = useState(false);
  const [deleteAthletesWithTeams, setDeleteAthletesWithTeams] = useState(true);

  // E2EE sensitive visibility toggle
  const [revealedIds, setRevealedIds] = useState<Record<string, { idCard: string; phone: string }>>({});
  const [isDecrypting, setIsDecrypting] = useState<string | null>(null);

  // New team modal / inline form state
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamGroup, setNewTeamGroup] = useState(config.customGroups[0] || 'Khối 10');
  const [newTeamCoach, setNewTeamCoach] = useState('');
  const [newTeamColor, setNewTeamColor] = useState('#0284c7');

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

  const handleAddTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return alert('Vui lòng nhập tên đội / lớp thi đấu!');

    const newTeam: Team = {
      id: 'T_' + Date.now(),
      name: newTeamName.trim(),
      group: newTeamGroup,
      coachName: newTeamCoach.trim() || 'Giáo viên phụ trách',
      color: newTeamColor,
    };
    onSaveTeam(newTeam);
    setNewTeamName('');
    setNewTeamCoach('');
    setIsAddingTeam(false);
  };

  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      const matchSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.jerseyNumber.toString().includes(searchQuery);

      const matchGroup = selectedGroup === 'ALL' || a.group === selectedGroup;
      const matchStatus = selectedStatus === 'ALL' || a.status === selectedStatus;

      return matchSearch && matchGroup && matchStatus;
    });
  }, [athletes, searchQuery, selectedGroup, selectedStatus]);

  const filteredTeams = useMemo(() => {
    return teams.filter((t) => {
      const matchGroup = selectedGroup === 'ALL' || t.group === selectedGroup;
      const matchSearch =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.coachName && t.coachName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchGroup && matchSearch;
    });
  }, [teams, selectedGroup, searchQuery]);

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
    setIsConfirmDeleteAthletesModalOpen(false);
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

  // Teams selection helpers
  const handleToggleTeam = (id: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const areAllFilteredTeamsSelected =
    filteredTeams.length > 0 &&
    filteredTeams.every((t) => selectedTeamIds.includes(t.id));

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
    setIsConfirmDeleteTeamsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            Quản Lý Hồ Sơ VĐV & Danh Sách Đội Bóng
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Bảo mật thông tin nhân thân bằng chuẩn mã hóa đầu cuối E2EE AES-256
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('athletes')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'athletes'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Vận Động Viên ({athletes.length})
            </button>
            <button
              onClick={() => setViewMode('teams')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'teams'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Danh Sách Đội ({teams.length})
            </button>
          </div>

          {canRegister && (
            <button
              onClick={viewMode === 'athletes' ? onOpenAddAthlete : () => setIsAddingTeam(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{viewMode === 'athletes' ? 'Đăng Ký VĐV' : 'Thêm Đội Mới'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              viewMode === 'athletes'
                ? 'Tìm theo tên VĐV, lớp, số áo...'
                : 'Tìm theo tên đội / lớp, HLV...'
            }
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
          />
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

        {/* Status Filter for Athletes */}
        {viewMode === 'athletes' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Hồ sơ:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="approved">Đã duyệt</option>
              <option value="pending">Chờ duyệt</option>
              <option value="needs_revision">Cần bổ sung</option>
            </select>
          </div>
        )}

        {/* Quick select/clear all for Teams */}
        {viewMode === 'teams' && filteredTeams.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleAllTeams}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              {areAllFilteredTeamsSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-sky-600" />
                  <span>Bỏ chọn tất cả ({filteredTeams.length} đội)</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Chọn tất cả ({filteredTeams.length} đội)</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: ATHLETES TABLE */}
      {viewMode === 'athletes' && (
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
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                      title="Chọn / Bỏ chọn tất cả VĐV đang hiển thị"
                    />
                  </th>
                  <th className="p-4">Số Áo</th>
                  <th className="p-4">Vận Động Viên</th>
                  <th className="p-4">Đội / Khối</th>
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
                          Ban tổ chức hoặc đại diện các đội vui lòng nhấn nút{' '}
                          <strong>"Đăng Ký VĐV"</strong> phía trên để nhập danh sách vận động viên.
                        </p>
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
                            ? 'bg-sky-50/70 dark:bg-sky-950/40'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAthlete(ath.id)}
                            className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                            title="Chọn VĐV này để thao tác hàng loạt"
                          />
                        </td>
                        <td className="p-4 font-mono font-black text-sky-600 dark:text-sky-400 text-sm">
                          #{ath.jerseyNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">{ath.name}</div>
                          <div className="text-[10px] text-slate-400">Sinh: {ath.dateOfBirth}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
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
                                className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title={
                                  isRevealed
                                    ? 'Ẩn dữ liệu mã hóa'
                                    : 'Giải mã xem trực tiếp (E2EE)'
                                }
                              >
                                {isDecrypting === ath.id ? (
                                  <Lock className="w-3.5 h-3.5 animate-spin text-sky-500" />
                                ) : isRevealed ? (
                                  <EyeOff className="w-3.5 h-3.5 text-sky-600" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {ath.status === 'approved' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Đã duyệt
                            </span>
                          ) : ath.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3" />
                              Chờ duyệt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold border border-rose-200 dark:border-rose-800">
                              <AlertCircle className="w-3 h-3" />
                              Cần bổ sung
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-900 dark:text-white">
                          {ath.goalsOrPoints}
                          {ath.mvpCount > 0 && (
                            <span className="ml-1 text-[10px] text-amber-500">
                              ({ath.mvpCount} MVP)
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && ath.status !== 'approved' && (
                              <button
                                onClick={() => onApproveAthlete(ath.id, 'approved')}
                                className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-500 transition cursor-pointer"
                              >
                                Duyệt
                              </button>
                            )}
                            <button
                              onClick={() => onOpenEditAthlete(ath)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Sửa hồ sơ"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => onDeleteAthlete(ath.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
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

          {/* Floating Batch Action Bar for Athletes */}
          {selectedAthleteIds.length > 0 && (
            <div className="sticky bottom-3 mx-4 my-3 p-3.5 bg-slate-900/95 text-white dark:bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-extrabold text-xs">
                  {selectedAthleteIds.length}
                </div>
                <div className="text-xs">
                  <span className="font-semibold">
                    Đã chọn <strong className="text-sky-400 font-extrabold">{selectedAthleteIds.length}</strong> / {filteredAthletes.length} VĐV
                  </span>
                  <span className="hidden sm:inline text-slate-400 text-[11px] ml-2">
                    (Áp dụng thao tác hàng loạt cho các mục được đánh dấu)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAllAthletes}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
                >
                  {areAllFilteredAthletesSelected ? 'Bỏ chọn tất cả' : 'Chọn toàn bộ'}
                </button>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleBulkApproveAthletes('approved')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Duyệt tất cả VĐV được chọn"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Duyệt nhanh ({selectedAthleteIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmDeleteAthletesModalOpen(true)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa Hàng Loạt ({selectedAthleteIds.length})</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedAthleteIds([])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Hủy chọn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TEAMS LIST */}
      {viewMode === 'teams' && (
        <div className="space-y-4">
          {filteredTeams.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs space-y-3">
              <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                Chưa có đội thi đấu nào được đăng ký
              </p>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                Hệ thống không sử dụng dữ liệu mẫu. Ban tổ chức vui lòng nhấn nút bên dưới để bắt
                đầu đăng ký các đội / lớp thi đấu cho giải.
              </p>
              {canRegister && (
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(true)}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Đội / Lớp Thi Đấu Đầu Tiên</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => {
                const teamAthletes = athletes.filter((a) => a.teamId === team.id);
                const isSelected = selectedTeamIds.includes(team.id);

                return (
                  <div
                    key={team.id}
                    className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border transition space-y-4 relative ${
                      isSelected
                        ? 'border-sky-500 shadow-md ring-2 ring-sky-500/20 bg-sky-50/20 dark:bg-sky-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-sky-300 dark:hover:border-sky-800'
                    }`}
                  >
                    {/* Header of card with selection checkbox */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTeam(team.id)}
                          className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                          title="Chọn đội này để xóa hàng loạt"
                        />
                        <div>
                          <span className="text-[10px] uppercase font-bold text-sky-600 dark:text-sky-400">
                            {team.group}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                            {team.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            GVCN / HLV: {team.coachName || 'Chưa cập nhật'}
                          </p>
                        </div>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border border-white dark:border-slate-900 shadow-xs shrink-0"
                        style={{ backgroundColor: team.color || '#0284c7' }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs py-2 border-t border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Số lượng thành viên:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {teamAthletes.length} VĐV
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => {
                          setSearchQuery(team.name);
                          setViewMode('athletes');
                        }}
                        className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                      >
                        Xem danh sách VĐV
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteTeam(team.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Xóa đội bóng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
                    onClick={() => setIsConfirmDeleteTeamsModalOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Hàng Loạt ({selectedTeamIds.length} đội)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedTeamIds([])}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  title="Hủy chọn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Confirm Bulk Delete Athletes */}
      {isConfirmDeleteAthletesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Xác Nhận Xóa Hàng Loạt Vận Động Viên
                </h3>
                <p className="text-xs text-slate-500">
                  Thao tác này sẽ xóa vĩnh viễn khỏi cơ sở dữ liệu giải đấu.
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <p className="font-bold">
                Bạn sắp xóa {selectedAthleteIds.length} hồ sơ vận động viên đã chọn:
              </p>
              <div className="max-h-36 overflow-y-auto divide-y divide-rose-200/50 dark:divide-rose-900/40 text-[11px] pt-1">
                {athletes
                  .filter((a) => selectedAthleteIds.includes(a.id))
                  .slice(0, 8)
                  .map((a) => (
                    <div key={a.id} className="py-1 flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        #{a.jerseyNumber} {a.name}
                      </span>
                      <span className="text-slate-500 text-[10px]">{a.teamName}</span>
                    </div>
                  ))}
                {selectedAthleteIds.length > 8 && (
                  <div className="py-1 text-slate-500 italic text-[10px]">
                    ... và {selectedAthleteIds.length - 8} vận động viên khác
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteAthletesModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMultipleAthletes}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa ({selectedAthleteIds.length} VĐV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Confirm Bulk Delete Teams */}
      {isConfirmDeleteTeamsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Xác Nhận Xóa Hàng Loạt Đội Thi Đấu
                </h3>
                <p className="text-xs text-slate-500">
                  Thao tác này sẽ gỡ bỏ các đội thi đấu được chỉ định.
                </p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 space-y-2">
              <p className="font-bold">
                Bạn sắp xóa {selectedTeamIds.length} đội thi đấu:
              </p>
              <div className="max-h-32 overflow-y-auto divide-y divide-rose-200/50 dark:divide-rose-900/40 text-[11px]">
                {teams
                  .filter((t) => selectedTeamIds.includes(t.id))
                  .map((t) => (
                    <div key={t.id} className="py-1 flex items-center justify-between">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {t.name} ({t.group})
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {athletes.filter((a) => a.teamId === t.id).length} VĐV
                      </span>
                    </div>
                  ))}
              </div>

              {deleteAthletesWithTeams && (
                <div className="p-2.5 bg-rose-100/70 dark:bg-rose-900/40 rounded-xl text-rose-900 dark:text-rose-100 text-[11px] font-semibold flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>
                    Bao gồm xóa toàn bộ {affectedAthletesOfSelectedTeams.length} vận động viên trực thuộc các đội trên.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmDeleteTeamsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMultipleTeams}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác Nhận Xóa ({selectedTeamIds.length} Đội)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {isAddingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Thêm Đội / Lớp Thi Đấu Mới
            </h3>
            <form onSubmit={handleAddTeamSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Tên Đội / Lớp *
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ví dụ: Lớp 10A4"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Khối / Bảng Đấu
                </label>
                <select
                  value={newTeamGroup}
                  onChange={(e) => setNewTeamGroup(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                >
                  {config.customGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Giáo Viên Phụ Trách / HLV
                </label>
                <input
                  type="text"
                  value={newTeamCoach}
                  onChange={(e) => setNewTeamCoach(e.target.value)}
                  placeholder="Ví dụ: Thầy Hoàng (GVCN)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTeam(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold hover:bg-sky-500 cursor-pointer"
                >
                  Tạo Đội Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
