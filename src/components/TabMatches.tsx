import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Play,
  Pause,
  Plus,
  Minus,
  FileText,
  Volume2,
  Trash2,
  Wand2,
  Clock,
  Edit,
  X,
  Sparkles,
  CheckCircle2,
  Users,
  AlertCircle,
  Keyboard,
  GitBranch,
  FileDown,
  Shield,
  Lock,
} from 'lucide-react';
import { Match, Sport, StandingItem, Team, TournamentConfig, UserProfile } from '../types';
import { playRefereeWhistle, playScoreChime } from '../services/sound';
import { sendSmartNotification } from '../services/notifications';
import { exportMatchMinutesToWord, exportScheduleToWord } from '../services/export';
import { ScheduleGeneratorModal } from './ScheduleGeneratorModal';

interface TabMatchesProps {
  matches: Match[];
  teams: Team[];
  sports: Sport[];
  config: TournamentConfig;
  user: UserProfile;
  standingsByGroup?: Record<string, StandingItem[]>;
  onNavigateTab?: (tabId: string) => void;
  onUpdateMatch: (match: Match) => void;
  onAddMatch: (match: Match) => void;
  onDeleteMatch: (id: string) => void;
  onGenerateSchedule: (customTeamsList?: Team[], startDate?: string, startHour?: number, intervalMinutes?: number) => void;
  onApplyMatchesBatch?: (newMatches: Match[], appendMode: boolean, noticeMsg: string) => void;
  onOpenMinutes: (match: Match) => void;
  onOpenEditMatch: (match: Match) => void;
}

export const TabMatches: React.FC<TabMatchesProps> = ({
  matches,
  teams,
  sports,
  config,
  user,
  standingsByGroup = {},
  onNavigateTab,
  onUpdateMatch,
  onAddMatch,
  onDeleteMatch,
  onGenerateSchedule,
  onApplyMatchesBatch,
  onOpenMinutes,
  onOpenEditMatch,
}) => {
  const [filterGroup, setFilterGroup] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [activeScoringMatchId, setActiveScoringMatchId] = useState<string | null>(
    matches.find((m) => m.status === 'LIVE')?.id || null
  );
  const [quickScoreMatch, setQuickScoreMatch] = useState<Match | null>(null);

  const extraStages = useMemo(() => {
    const customSet = new Set(config.customGroups);
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.stage && !customSet.has(m.stage)) {
        set.add(m.stage);
      }
    });
    return Array.from(set);
  }, [matches, config.customGroups]);

  const canScore = user.role === 'admin' || user.role === 'referee' || user.role === 'secretary';
  const isAdmin = user.role === 'admin';

  const currentSport = sports.find((s) => s.id === config.activeSportId) || sports[0];
  const isFootball = currentSport?.code === 'FOOTBALL' || config.activeSportId === 'football';
  const maxSets = currentSport?.maxSets || 3;

  // Timer interval for live matches
  useEffect(() => {
    const timer = setInterval(() => {
      matches.forEach((m) => {
        if (m.status === 'LIVE' && m.timer?.running) {
          const updated: Match = {
            ...m,
            timer: {
              ...m.timer,
              elapsedSeconds: m.timer.elapsedSeconds + 1,
            },
          };
          onUpdateMatch(updated);
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [matches, onUpdateMatch]);

  // Check if current user has permission to manage/score/edit this match
  const canManageMatch = (m: Match): boolean => {
    if (user.role === 'admin') return true;
    if (user.role !== 'referee' && user.role !== 'secretary') return false;

    // Check sport assignment
    if (user.assignedSports && user.assignedSports.length > 0) {
      const matchSport = m.sportId || config.activeSportId;
      if (!user.assignedSports.includes(matchSport)) return false;
    }

    // Check category assignment
    if (user.assignedCategories && user.assignedCategories.length > 0) {
      if (m.categoryId && !user.assignedCategories.includes(m.categoryId)) {
        return false;
      }
    }

    return true;
  };

  const filteredMatches = matches.filter((m) => {
    // 1. Sport filter
    if (m.sportId && m.sportId !== config.activeSportId) return false;

    // 2. Category filter
    if (config.activeCategoryId && config.activeCategoryId !== 'ALL') {
      if (m.categoryId && m.categoryId !== config.activeCategoryId) return false;
    }

    // 3. Stage & Status filter
    const matchGrp = filterGroup === 'ALL' || m.stage === filterGroup;
    const matchStat = filterStatus === 'ALL' || m.status === filterStatus;
    return matchGrp && matchStat;
  });

  const activeMatch = matches.find((m) => m.id === activeScoringMatchId) || filteredMatches[0] || matches[0];
  const canManageActiveMatch = activeMatch ? canManageMatch(activeMatch) : false;

  const handleScoreChange = (
    matchId: string,
    setNum: number | 'pen',
    teamSide: 'home' | 'away',
    delta: number
  ) => {
    const m = matches.find((item) => item.id === matchId);
    if (!m) return;

    const newScores = { ...m.scores };
    if (setNum === 'pen') {
      const current = newScores.pen[teamSide];
      newScores.pen[teamSide] = Math.max(0, current + delta);
      newScores.pen.played = true;
    } else if (setNum === 1) {
      newScores.set1 = { ...newScores.set1, [teamSide]: Math.max(0, newScores.set1[teamSide] + delta) };
    } else if (setNum === 2) {
      newScores.set2 = { ...newScores.set2, [teamSide]: Math.max(0, newScores.set2[teamSide] + delta) };
    } else if (setNum === 3) {
      newScores.set3 = { ...newScores.set3, [teamSide]: Math.max(0, newScores.set3[teamSide] + delta) };
    } else if (setNum === 4) {
      newScores.set4 = { ...newScores.set4, [teamSide]: Math.max(0, newScores.set4[teamSide] + delta) };
    } else if (setNum === 5) {
      newScores.set5 = { ...newScores.set5, [teamSide]: Math.max(0, newScores.set5[teamSide] + delta) };
    }

    if (delta > 0) {
      playScoreChime();
      const scoringTeam = teamSide === 'home' ? m.home.name : m.away.name;
      sendSmartNotification(
        `ĐIỂM SỐ MỚI: ${scoringTeam}`,
        `${scoringTeam} vừa ghi điểm trong ${m.code}!`,
        'score'
      );
    }

    const updated: Match = {
      ...m,
      scores: newScores,
    };
    onUpdateMatch(updated);
  };

  // Direct score setting from keyboard input
  const handleDirectScoreSet = (
    matchId: string,
    setNum: number | 'pen',
    teamSide: 'home' | 'away',
    newVal: number
  ) => {
    const m = matches.find((item) => item.id === matchId);
    if (!m) return;

    const validVal = isNaN(newVal) ? 0 : Math.max(0, Math.floor(newVal));
    const newScores = { ...m.scores };

    if (setNum === 'pen') {
      newScores.pen = {
        ...newScores.pen,
        [teamSide]: validVal,
        played: true,
      };
    } else if (setNum === 1) {
      newScores.set1 = { ...newScores.set1, [teamSide]: validVal };
    } else if (setNum === 2) {
      newScores.set2 = { ...newScores.set2, [teamSide]: validVal };
    } else if (setNum === 3) {
      newScores.set3 = { ...newScores.set3, [teamSide]: validVal };
    } else if (setNum === 4) {
      newScores.set4 = { ...newScores.set4, [teamSide]: validVal };
    } else if (setNum === 5) {
      newScores.set5 = { ...newScores.set5, [teamSide]: validVal };
    }

    const updated: Match = {
      ...m,
      scores: newScores,
    };
    onUpdateMatch(updated);
  };

  const handleToggleTimer = (matchId: string) => {
    const m = matches.find((item) => item.id === matchId);
    if (!m) return;

    const nextRunning = !m.timer.running;
    const nextStatus = nextRunning ? 'LIVE' : m.status;

    if (nextRunning) {
      playRefereeWhistle();
      sendSmartNotification(
        `BẮT ĐẦU TRẬN ĐẤU: ${m.code}`,
        `${m.home.name} vs ${m.away.name} đang tranh tài trên ${m.pitch}!`,
        'match_start'
      );
    }

    const updated: Match = {
      ...m,
      status: nextStatus,
      timer: {
        ...m.timer,
        running: nextRunning,
      },
    };
    onUpdateMatch(updated);
  };

  const handleFinishMatch = (matchId: string) => {
    const m = matches.find((item) => item.id === matchId);
    if (!m) return;

    playRefereeWhistle();
    const updated: Match = {
      ...m,
      status: 'FINISHED',
      timer: {
        ...m.timer,
        running: false,
      },
    };
    onUpdateMatch(updated);
    sendSmartNotification(
      `KẾT THÚC TRẬN ĐẤU: ${m.code}`,
      `Trận đấu giữa ${m.home.name} và ${m.away.name} đã kết thúc!`,
      'score'
    );
  };

  const [isScheduleGeneratorModalOpen, setIsScheduleGeneratorModalOpen] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState<string | null>(null);

  const handleAddNewManualMatch = () => {
    if (teams.length < 2) {
      alert('Chưa có đủ danh sách đội thi đấu (cần ít nhất 2 đội). Ban tổ chức vui lòng thêm danh sách các lớp/đội (10A1, 10A2...) tại mục "Danh Sách Đội" trước khi tạo trận đấu!');
      onNavigateTab?.('teams');
      return;
    }

    const homeTeam: Team = teams[0];
    const awayTeam: Team = teams[1];
    const activeCategory = currentSport?.categories?.find((c) => c.id === config.activeCategoryId);

    const newM: Match = {
      id: 'M_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sportId: config.activeSportId,
      categoryId: config.activeCategoryId && config.activeCategoryId !== 'ALL' ? config.activeCategoryId : undefined,
      categoryName: activeCategory?.name,
      code: `Trận ${(matches.length + 1).toString().padStart(2, '0')}`,
      stage: config.customGroups[0] || 'Khối 10',
      pitch: 'Sân 1',
      date: new Date().toISOString().slice(0, 10),
      time: '08:30',
      home: homeTeam,
      away: awayTeam,
      status: 'UPCOMING',
      timer: { running: false, elapsedSeconds: 0, currentSet: 1 },
      scores: {
        set1: { home: 0, away: 0 },
        set2: { home: 0, away: 0 },
        set3: { home: 0, away: 0 },
        set4: { home: 0, away: 0 },
        set5: { home: 0, away: 0 },
        pen: { home: 0, away: 0, played: false },
      },
      events: [],
      refereeName: config.referee,
      secretaryName: config.secretary,
      notes: activeCategory ? `Nội dung: ${activeCategory.name}` : 'Trận đấu tạo thủ công',
    };
    onAddMatch(newM);
    onOpenEditMatch(newM);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Scheduling Actions */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{currentSport?.icon || '🏆'}</span>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-600" />
              Lịch Thi Đấu & Cập Nhật Tỉ Số Trực Tiếp
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Đang quản lý: <strong className="text-sky-600 dark:text-sky-400">{currentSport?.name || 'Bóng chuyền'}</strong>
            {config.activeCategoryId && config.activeCategoryId !== 'ALL' && (
              <span> · Nội dung: <strong className="text-purple-600 dark:text-purple-400">{currentSport?.categories?.find(c => c.id === config.activeCategoryId)?.name || config.activeCategoryId}</strong></span>
            )}
            {' '}({maxSets} set · {config.year || new Date().getFullYear()})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  handleAddNewManualMatch();
                  setScheduleNotice('Đã tạo một trận đấu mới! Vui lòng kiểm tra và lưu thông tin chi tiết trên biểu mẫu.');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-sky-600" />
                <span>Thêm Trận Thủ Công</span>
              </button>
              <button
                type="button"
                onClick={() => setIsScheduleGeneratorModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>Xếp Lịch & Tạo Vòng Đấu</span>
              </button>
            </>
          )}

          {/* Export Schedule to Word (.doc) */}
          <button
            type="button"
            onClick={() => exportScheduleToWord(config, matches, filterGroup)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Xuất toàn bộ lịch thi đấu ra tệp Microsoft Word (.doc)"
          >
            <FileDown className="w-4 h-4" />
            <span>Xuất Lịch (.doc)</span>
          </button>

          {canScore && (
            <button
              type="button"
              onClick={playRefereeWhistle}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Thổi còi trọng tài"
            >
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Thổi Còi</span>
            </button>
          )}
        </div>
      </div>

      {/* Schedule Feedback Banner */}
      {scheduleNotice && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{scheduleNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setScheduleNotice(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* LIVE SCORING CONSOLE */}
      {activeMatch && canScore && (
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-sky-800/60 shadow-xl space-y-6">
          {!canManageActiveMatch && !isAdmin && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-200 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Chế độ chỉ xem:</strong> Trận đấu này ({activeMatch.code}) không nằm trong môn hoặc nội dung bạn được phân công. Bạn không có quyền thay đổi điểm số hoặc thời gian.
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-sky-500 text-slate-950 text-xs font-black rounded-lg">
                {activeMatch.code}
              </span>
              <span className="text-xs text-slate-300 font-semibold">{activeMatch.stage} · {activeMatch.pitch}</span>
              {activeMatch.categoryName && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/30 font-medium">
                  {activeMatch.categoryName}
                </span>
              )}
              {activeMatch.status === 'LIVE' && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  ĐANG THI ĐẤU
                </span>
              )}
            </div>

            {/* Match Clock Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950/80 rounded-xl border border-white/15">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono text-sm font-bold text-amber-300">
                  {formatTimer(activeMatch.timer?.elapsedSeconds || 0)}
                </span>
              </div>

              <button
                onClick={() => handleToggleTimer(activeMatch.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                  activeMatch.timer?.running
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {activeMatch.timer?.running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{activeMatch.timer?.running ? 'Tạm Dừng' : 'Bấm Giờ'}</span>
              </button>

              <button
                onClick={() => handleFinishMatch(activeMatch.id)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <span>Hoàn Thành Trận</span>
              </button>

              {(isAdmin || canScore) && (
                <button
                  onClick={() => onOpenEditMatch(activeMatch)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa Lịch</span>
                </button>
              )}
            </div>
          </div>

          {/* Touch & Keyboard Score Controller */}
          <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-6">
            {/* Team Home */}
            <div className="md:col-span-3 text-center space-y-3">
              <div className="text-lg sm:text-xl font-extrabold text-white truncate" title={activeMatch.home.name}>
                {activeMatch.home.name}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScoreChange(activeMatch.id, isFootball ? 1 : activeMatch.timer?.currentSet || 1, 'home', -1)}
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
                  title="Giảm 1 điểm"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={
                      isFootball
                        ? activeMatch.scores.set1.home
                        : (activeMatch.scores[`set${activeMatch.timer?.currentSet || 1}` as keyof typeof activeMatch.scores] as { home: number; away: number }).home
                    }
                    onChange={(e) => {
                      const currentSet = isFootball ? 1 : activeMatch.timer?.currentSet || 1;
                      handleDirectScoreSet(activeMatch.id, currentSet, 'home', parseInt(e.target.value, 10));
                    }}
                    className="w-24 py-2 bg-slate-950/95 rounded-2xl border-2 border-sky-400/60 text-amber-300 font-mono text-3xl font-black text-center outline-none focus:ring-4 focus:ring-sky-500/40 focus:border-sky-300 transition cursor-text selection:bg-amber-400 selection:text-slate-950"
                    title="Nhập tỉ số trực tiếp từ bàn phím hoặc dùng phím mũi tên"
                  />
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-sky-400" />
                    <span>Gõ bàn phím</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleScoreChange(activeMatch.id, isFootball ? 1 : activeMatch.timer?.currentSet || 1, 'home', 1)}
                  className="w-11 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 flex items-center justify-center transition font-bold shadow-lg shadow-sky-500/20 cursor-pointer"
                  title="Tăng 1 điểm (+1)"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Center Divider / Set Selector */}
            <div className="md:col-span-1 text-center space-y-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400 block">
                {isFootball ? 'Bàn Thắng' : `Set ${activeMatch.timer?.currentSet || 1}`}
              </span>
              {!isFootball && (
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].slice(0, maxSets).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        const updated: Match = {
                          ...activeMatch,
                          timer: { ...activeMatch.timer, currentSet: s },
                        };
                        onUpdateMatch(updated);
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        (activeMatch.timer?.currentSet || 1) === s
                          ? 'bg-sky-500 text-slate-950 font-black'
                          : 'bg-white/10 text-slate-300 hover:bg-white/20'
                      }`}
                      title={`Chuyển sang Set ${s}`}
                    >
                      S{s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Team Away */}
            <div className="md:col-span-3 text-center space-y-3">
              <div className="text-lg sm:text-xl font-extrabold text-white truncate" title={activeMatch.away.name}>
                {activeMatch.away.name}
              </div>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleScoreChange(activeMatch.id, isFootball ? 1 : activeMatch.timer?.currentSet || 1, 'away', -1)}
                  className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition border border-white/10 cursor-pointer"
                  title="Giảm 1 điểm"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    value={
                      isFootball
                        ? activeMatch.scores.set1.away
                        : (activeMatch.scores[`set${activeMatch.timer?.currentSet || 1}` as keyof typeof activeMatch.scores] as { home: number; away: number }).away
                    }
                    onChange={(e) => {
                      const currentSet = isFootball ? 1 : activeMatch.timer?.currentSet || 1;
                      handleDirectScoreSet(activeMatch.id, currentSet, 'away', parseInt(e.target.value, 10));
                    }}
                    className="w-24 py-2 bg-slate-950/95 rounded-2xl border-2 border-sky-400/60 text-amber-300 font-mono text-3xl font-black text-center outline-none focus:ring-4 focus:ring-sky-500/40 focus:border-sky-300 transition cursor-text selection:bg-amber-400 selection:text-slate-950"
                    title="Nhập tỉ số trực tiếp từ bàn phím hoặc dùng phím mũi tên"
                  />
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-sky-400" />
                    <span>Gõ bàn phím</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleScoreChange(activeMatch.id, isFootball ? 1 : activeMatch.timer?.currentSet || 1, 'away', 1)}
                  className="w-11 h-11 rounded-2xl bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 flex items-center justify-center transition font-bold shadow-lg shadow-sky-500/20 cursor-pointer"
                  title="Tăng 1 điểm (+1)"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Full Set Keyboard Input Matrix */}
          <div className="pt-4 border-t border-white/10 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
              <span className="font-extrabold text-sky-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px] sm:text-xs">
                <Keyboard className="w-4 h-4 text-sky-400" />
                <span>Nhập Tỉ Số Trực Tiếp Các Set Bằng Bàn Phím (Dùng Phím Tab Để Chuyển Ô)</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                Gõ trực tiếp tỉ số từng hiệp/set
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {[1, 2, 3, 4, 5].slice(0, isFootball ? 1 : maxSets).map((s) => {
                const setKey = `set${s}` as keyof typeof activeMatch.scores;
                const setScore = activeMatch.scores[setKey] as { home: number; away: number };
                const isCurrent = (activeMatch.timer?.currentSet || 1) === s;

                return (
                  <div
                    key={s}
                    className={`p-2.5 rounded-2xl border transition ${
                      isCurrent
                        ? 'bg-sky-950/80 border-sky-400 ring-2 ring-sky-400/40'
                        : 'bg-slate-950/60 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
                        Set {s}
                      </span>
                      {!isFootball && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated: Match = {
                              ...activeMatch,
                              timer: { ...activeMatch.timer, currentSet: s },
                            };
                            onUpdateMatch(updated);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                            isCurrent ? 'bg-sky-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {isCurrent ? 'Đang đấu' : 'Chọn set'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex-1 text-center">
                        <span className="block text-[10px] text-slate-400 truncate font-semibold mb-1" title={activeMatch.home.name}>
                          {activeMatch.home.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={setScore?.home ?? 0}
                          onChange={(e) => handleDirectScoreSet(activeMatch.id, s, 'home', parseInt(e.target.value, 10))}
                          className="w-full py-1 text-center font-mono font-black text-lg bg-slate-900 border border-white/20 rounded-xl text-amber-300 outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                          placeholder="0"
                          title={`Điểm Set ${s} - ${activeMatch.home.name}`}
                        />
                      </div>
                      <span className="font-mono text-slate-500 font-bold text-sm pt-4">:</span>
                      <div className="flex-1 text-center">
                        <span className="block text-[10px] text-slate-400 truncate font-semibold mb-1" title={activeMatch.away.name}>
                          {activeMatch.away.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={setScore?.away ?? 0}
                          onChange={(e) => handleDirectScoreSet(activeMatch.id, s, 'away', parseInt(e.target.value, 10))}
                          className="w-full py-1 text-center font-mono font-black text-lg bg-slate-900 border border-white/20 rounded-xl text-amber-300 outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400"
                          placeholder="0"
                          title={`Điểm Set ${s} - ${activeMatch.away.name}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Pen penalty shootout if football */}
              {isFootball && (
                <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-2">
                    <span>Sút Luân Lưu (Pen)</span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex-1 text-center">
                      <span className="block text-[10px] text-slate-400 truncate font-semibold mb-1">
                        {activeMatch.home.name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={activeMatch.scores.pen.home}
                        onChange={(e) => handleDirectScoreSet(activeMatch.id, 'pen', 'home', parseInt(e.target.value, 10))}
                        className="w-full py-1 text-center font-mono font-black text-lg bg-slate-900 border border-white/20 rounded-xl text-amber-300 outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="0"
                        title={`Pen - ${activeMatch.home.name}`}
                      />
                    </div>
                    <span className="font-mono text-slate-500 font-bold text-sm pt-4">:</span>
                    <div className="flex-1 text-center">
                      <span className="block text-[10px] text-slate-400 truncate font-semibold mb-1">
                        {activeMatch.away.name}
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={activeMatch.scores.pen.away}
                        onChange={(e) => handleDirectScoreSet(activeMatch.id, 'pen', 'away', parseInt(e.target.value, 10))}
                        className="w-full py-1 text-center font-mono font-black text-lg bg-slate-900 border border-white/20 rounded-xl text-amber-300 outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="0"
                        title={`Pen - ${activeMatch.away.name}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matches List Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Bảng / Vòng Đấu:</span>
          <select
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
          >
            <option value="ALL">👉 Tất cả bảng & vòng đấu ({matches.length} trận)</option>
            <optgroup label="Vòng Bảng / Khối">
              {config.customGroups.map((g) => (
                <option key={g} value={g}>
                  {g} ({matches.filter((m) => m.stage === g).length} trận)
                </option>
              ))}
            </optgroup>
            {extraStages.length > 0 && (
              <optgroup label="Vòng Loại Trực Tiếp / Vòng Sau">
                {extraStages.map((s: string) => (
                  <option key={s} value={s}>
                    {s} ({matches.filter((m: Match) => m.stage === s).length} trận)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="LIVE">Đang thi đấu</option>
            <option value="UPCOMING">Sắp diễn ra</option>
            <option value="FINISHED">Đã kết thúc</option>
          </select>
        </div>
      </div>

      {/* Matches Cards */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
            Chưa có lịch thi đấu nào cho tiêu chí đã chọn. Nhấn "Tạo Lịch Tự Động" hoặc "Thêm Trận Thủ Công".
          </div>
        ) : (
          filteredMatches.map((m) => {
            let scoreSummary = '';
            let isHomeWin = false, isAwayWin = false;

            if (isFootball) {
              scoreSummary = `${m.scores.set1.home} : ${m.scores.set1.away}`;
              if (m.scores.pen.played) {
                scoreSummary += ` (Pen: ${m.scores.pen.home}-${m.scores.pen.away})`;
              }
              if (m.scores.set1.home > m.scores.set1.away) isHomeWin = true;
              else if (m.scores.set1.away > m.scores.set1.home) isAwayWin = true;
            } else {
              let hSets = 0, aSets = 0;
              for (let s = 1; s <= maxSets; s++) {
                const sc = m.scores[`set${s}` as keyof typeof m.scores] as { home: number; away: number };
                if (sc && sc.home > sc.away) hSets++;
                else if (sc && sc.away > sc.home) aSets++;
              }
              scoreSummary = `${hSets} : ${aSets}`;
              if (hSets > aSets) isHomeWin = true;
              else if (aSets > hSets) isAwayWin = true;
            }

            return (
              <div
                key={m.id}
                className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border transition shadow-2xs space-y-4 ${
                  activeScoringMatchId === m.id
                    ? 'border-sky-500 ring-2 ring-sky-500/20'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {/* Match Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-sky-600 text-white font-bold rounded-lg text-xs">
                      {m.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {m.stage} · {m.pitch}
                    </span>
                    <span className="text-xs text-slate-400">· {m.date || ''} {m.time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Edit Match Schedule Button */}
                    {(isAdmin || (canScore && canManageMatch(m))) && (
                      <button
                        onClick={() => onOpenEditMatch(m)}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        title="Chỉnh sửa lịch đấu & thông tin trận"
                      >
                        <Edit className="w-3.5 h-3.5 text-sky-600" />
                        <span>Sửa Lịch</span>
                      </button>
                    )}

                    {canScore && canManageMatch(m) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setQuickScoreMatch(m)}
                          className="px-3 py-1.5 bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/70 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-sky-200/60 dark:border-sky-800/60"
                          title="Nhập tỉ số tất cả các set bằng bàn phím"
                        >
                          <Keyboard className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span>Nhập Điểm</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveScoringMatchId(m.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            activeScoringMatchId === m.id
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <Play className="w-3 h-3" />
                          <span>Bàn Tỉ Số</span>
                        </button>
                      </>
                    ) : (
                      canScore && !isAdmin && (
                        <span
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/60 text-slate-500 rounded-xl text-[11px] font-medium flex items-center gap-1 border border-slate-200/60 dark:border-slate-800"
                          title="Bạn không được phân công môn hoặc nội dung thi đấu này"
                        >
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Ngoài phân công</span>
                        </span>
                      )
                    )}

                    <button
                      onClick={() => onOpenMinutes(m)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      title="Xem và in biên bản thi đấu trực tiếp"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-600" />
                      <span>Biên Bản</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => exportMatchMinutesToWord(m, config)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200/60 dark:border-blue-800/60 shadow-2xs"
                      title="Tải biên bản thi đấu của trận này bằng file Word (.doc)"
                    >
                      <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Xuất Word (.doc)</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => onDeleteMatch(m.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition"
                        title="Xóa trận đấu này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Scoreboard Row */}
                <div className="grid grid-cols-7 items-center">
                  <div className={`col-span-3 text-right pr-4 font-bold text-sm sm:text-base ${isHomeWin ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {m.home.name}
                  </div>
                  <div className="col-span-1 text-center py-2 px-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Tỉ số</span>
                    <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                      {scoreSummary}
                    </span>
                  </div>
                  <div className={`col-span-3 text-left pl-4 font-bold text-sm sm:text-base ${isAwayWin ? 'text-sky-600 dark:text-sky-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                    {m.away.name}
                  </div>
                </div>

                {/* Set details summary */}
                {!isFootball && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                    {[1, 2, 3, 4, 5].slice(0, maxSets).map((s) => {
                      const sc = m.scores[`set${s}` as keyof typeof m.scores] as { home: number; away: number };
                      return (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 font-mono">
                          Set {s}: {sc?.home ?? 0} - {sc?.away ?? 0}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Auto Schedule & Knockout Rounds Progression Modal */}
      <ScheduleGeneratorModal
        isOpen={isScheduleGeneratorModalOpen}
        onClose={() => setIsScheduleGeneratorModalOpen(false)}
        teams={teams}
        matches={matches}
        config={config}
        standingsByGroup={standingsByGroup}
        onApplyMatches={(newMatches, appendMode, noticeMsg) => {
          if (onApplyMatchesBatch) {
            onApplyMatchesBatch(newMatches, appendMode, noticeMsg);
          } else {
            if (appendMode) {
              newMatches.forEach((m) => onAddMatch(m));
            } else {
              onGenerateSchedule(teams);
            }
          }
          setScheduleNotice(noticeMsg);
        }}
      />

      {/* Dedicated Quick Keyboard Score Entry Modal */}
      {quickScoreMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Nhập Tỉ Số Từ Bàn Phím ({quickScoreMatch.code})
                  </h3>
                  <p className="text-xs text-slate-400">
                    {quickScoreMatch.home.name} vs {quickScoreMatch.away.name} ({quickScoreMatch.stage})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickScoreMatch(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Match Status selector */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1.5">
                  Trạng Thái Trận Đấu
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPCOMING', label: 'Sắp Diễn Ra' },
                    { id: 'LIVE', label: 'Đang Thi Đấu' },
                    { id: 'FINISHED', label: 'Đã Kết Thúc' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => {
                        const updated: Match = {
                          ...quickScoreMatch,
                          status: st.id as Match['status'],
                        };
                        setQuickScoreMatch(updated);
                        onUpdateMatch(updated);
                      }}
                      className={`py-2 px-1 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                        quickScoreMatch.status === st.id
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 ring-2 ring-sky-500/20 font-black'
                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set Scores Table Inputs */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Keyboard className="w-4 h-4 text-sky-600" />
                    <span>Bảng Điểm Từng Set (Nhập Trực Tiếp Từ Bàn Phím)</span>
                  </span>
                  <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">Phím Tab nhảy ô</span>
                </div>

                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].slice(0, isFootball ? 1 : maxSets).map((s) => {
                    const setKey = `set${s}` as 'set1' | 'set2' | 'set3' | 'set4' | 'set5';
                    const setScore = quickScoreMatch.scores[setKey];

                    return (
                      <div
                        key={s}
                        className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-2 sm:gap-3"
                      >
                        <div className="w-14 sm:w-16 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                          Set {s}
                        </div>
                        <div className="flex-1 flex items-center justify-end gap-2">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[90px] sm:max-w-[120px]" title={quickScoreMatch.home.name}>
                            {quickScoreMatch.home.name}
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={setScore?.home ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              const newScores = { ...quickScoreMatch.scores };
                              if (s === 1) newScores.set1 = { ...newScores.set1, home: val };
                              else if (s === 2) newScores.set2 = { ...newScores.set2, home: val };
                              else if (s === 3) newScores.set3 = { ...newScores.set3, home: val };
                              else if (s === 4) newScores.set4 = { ...newScores.set4, home: val };
                              else if (s === 5) newScores.set5 = { ...newScores.set5, home: val };

                              const updated: Match = { ...quickScoreMatch, scores: newScores };
                              setQuickScoreMatch(updated);
                              onUpdateMatch(updated);
                            }}
                            className="w-16 py-1.5 text-center font-mono font-black text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 selection:bg-amber-400 selection:text-slate-950"
                            title={`Điểm Set ${s} - ${quickScoreMatch.home.name}`}
                          />
                        </div>
                        <span className="text-slate-400 font-bold">:</span>
                        <div className="flex-1 flex items-center justify-start gap-2">
                          <input
                            type="number"
                            min="0"
                            value={setScore?.away ?? 0}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              const newScores = { ...quickScoreMatch.scores };
                              if (s === 1) newScores.set1 = { ...newScores.set1, away: val };
                              else if (s === 2) newScores.set2 = { ...newScores.set2, away: val };
                              else if (s === 3) newScores.set3 = { ...newScores.set3, away: val };
                              else if (s === 4) newScores.set4 = { ...newScores.set4, away: val };
                              else if (s === 5) newScores.set5 = { ...newScores.set5, away: val };

                              const updated: Match = { ...quickScoreMatch, scores: newScores };
                              setQuickScoreMatch(updated);
                              onUpdateMatch(updated);
                            }}
                            className="w-16 py-1.5 text-center font-mono font-black text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 selection:bg-amber-400 selection:text-slate-950"
                            title={`Điểm Set ${s} - ${quickScoreMatch.away.name}`}
                          />
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[90px] sm:max-w-[120px]" title={quickScoreMatch.away.name}>
                            {quickScoreMatch.away.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {isFootball && (
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 gap-2 sm:gap-3">
                      <div className="w-14 sm:w-16 text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">
                        Sút Pen
                      </div>
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[90px] sm:max-w-[120px]">
                          {quickScoreMatch.home.name}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={quickScoreMatch.scores.pen.home}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const updated: Match = {
                              ...quickScoreMatch,
                              scores: {
                                ...quickScoreMatch.scores,
                                pen: { ...quickScoreMatch.scores.pen, home: val, played: true },
                              },
                            };
                            setQuickScoreMatch(updated);
                            onUpdateMatch(updated);
                          }}
                          className="w-16 py-1.5 text-center font-mono font-black text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <span className="text-slate-400 font-bold">:</span>
                      <div className="flex-1 flex items-center justify-start gap-2">
                        <input
                          type="number"
                          min="0"
                          value={quickScoreMatch.scores.pen.away}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            const updated: Match = {
                              ...quickScoreMatch,
                              scores: {
                                ...quickScoreMatch.scores,
                                pen: { ...quickScoreMatch.scores.pen, away: val, played: true },
                              },
                            };
                            setQuickScoreMatch(updated);
                            onUpdateMatch(updated);
                          }}
                          className="w-16 py-1.5 text-center font-mono font-black text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[90px] sm:max-w-[120px]">
                          {quickScoreMatch.away.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => exportMatchMinutesToWord(quickScoreMatch, config)}
                  className="px-3.5 py-2 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/70 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200/60 dark:border-blue-800/60"
                  title="Xuất biên bản trận đấu này ra file Word (.doc)"
                >
                  <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Xuất Biên Bản Word (.doc)</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenMinutes(quickScoreMatch)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Mở biên bản thi đấu chính thức để xem và in"
                  >
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span>In Biên Bản</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickScoreMatch(null)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Thoát khỏi cửa sổ nhập điểm"
                  >
                    <X className="w-4 h-4" />
                    <span>Thoát</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickScoreMatch(null)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer font-bold"
                  >
                    Hoàn Tất & Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
