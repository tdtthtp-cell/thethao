import React from 'react';
import {
  Trophy,
  Users,
  Calendar,
  ShieldCheck,
  Play,
  ArrowRight,
  Medal,
  Award,
  Zap,
} from 'lucide-react';
import { Athlete, Match, Sport, Team, TournamentConfig } from '../types';

interface TabOverviewProps {
  config: TournamentConfig;
  sports: Sport[];
  teams: Team[];
  athletes: Athlete[];
  matches: Match[];
  onNavigateTab: (tabId: string) => void;
  onOpenMatchMinutes: (match: Match) => void;
}

export const TabOverview: React.FC<TabOverviewProps> = ({
  config,
  sports,
  teams,
  athletes,
  matches,
  onNavigateTab,
  onOpenMatchMinutes,
}) => {
  const currentSport = sports.find((s) => s.id === config.activeSportId) || sports[0];
  const liveMatches = matches.filter((m) => m.status === 'LIVE');
  const upcomingMatches = matches.filter((m) => m.status === 'UPCOMING');
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED');

  // Top Scorers / MVP Athletes
  const topScorers = [...athletes]
    .sort((a, b) => b.goalsOrPoints - a.goalsOrPoints)
    .slice(0, 5);

  const topMvps = [...athletes]
    .sort((a, b) => b.mvpCount - a.mvpCount)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero Tournament Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-sky-900/40">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300 backdrop-blur-md border border-sky-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Hệ thống bảo mật mã hóa đầu cuối E2EE AES-256</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            {config.tournamentName}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Chào mừng đến với hệ thống quản lý thi đấu thể thao trường <strong>{config.schoolName}</strong> ({config.deptName}). Theo dõi lịch đấu, cập nhật tỉ số trực tiếp thời gian thực, bảng xếp hạng tự động và xuất báo cáo chuẩn hành chính.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigateTab('matches')}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-500 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Xem Lịch Đấu & Tỉ Số</span>
            </button>
            <button
              onClick={() => onNavigateTab('standings')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/20 transition backdrop-blur-xs"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Bảng Xếp Hạng</span>
            </button>
            <button
              onClick={() => onNavigateTab('athletes')}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/20 transition backdrop-blur-xs"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Đăng Ký VĐV</span>
            </button>
          </div>
        </div>

        {/* Decorative Trophy Icon Background */}
        <div className="absolute -right-8 -bottom-10 pointer-events-none opacity-10">
          <Trophy className="w-80 h-80 text-white" />
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đội Tham Gia</span>
            <span className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {teams.length}
          </div>
          <p className="text-[11px] text-slate-400">{config.customGroups.length} khối / bảng thi đấu</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Vận Động Viên</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Medal className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {athletes.length}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {athletes.filter((a) => a.status === 'approved').length} hồ sơ đã duyệt
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trận Đã Đấu</span>
            <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {finishedMatches.length} / {matches.length}
          </div>
          <p className="text-[11px] text-slate-400">
            {liveMatches.length > 0 ? `${liveMatches.length} trận đang diễn ra` : 'Không có trận LIVE'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Môn Thi Đấu</span>
            <span className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/60 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white truncate">
            {currentSport?.name || 'Bóng chuyền'}
          </div>
          <p className="text-[11px] text-slate-400">Tối đa {currentSport?.maxSets || 3} set</p>
        </div>
      </div>

      {/* LIVE MATCH HIGHLIGHT (If any match is ongoing) */}
      {liveMatches.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                Trực Tiếp Trên Sân (LIVE)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('matches')}
              className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1"
            >
              <span>Vào Bàn Tỉ Số</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveMatches.map((m) => (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-rose-200 dark:border-rose-900/80 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{m.code} · {m.stage}</span>
                  <span>{m.pitch}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <div className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[160px]">
                    {m.home.name}
                  </div>
                  <div className="px-4 py-1.5 bg-slate-900 text-amber-300 font-mono text-xl sm:text-2xl font-black rounded-xl">
                    {m.scores.set1.home} : {m.scores.set1.away}
                  </div>
                  <div className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-[120px] sm:max-w-[160px] text-right">
                    {m.away.name}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Trọng tài: {m.refereeName || config.referee}</span>
                  <button
                    onClick={() => onOpenMatchMinutes(m)}
                    className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
                  >
                    Xem biên bản
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UPCOMING MATCHES & TOP SCORERS / MVP SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming matches */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Lịch Thi Đấu Tiếp Theo
            </h3>
            <button
              onClick={() => onNavigateTab('matches')}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả ({matches.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {upcomingMatches.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Hiện không có trận đấu nào sắp tới. Bạn có thể xếp lịch mới tại tab "Lịch Đấu".
              </p>
            ) : (
              upcomingMatches.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/80 hover:border-sky-300 dark:hover:border-sky-800 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                        {m.code}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {m.home.name} vs {m.away.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {m.stage} · {m.pitch} · {m.date || ''} {m.time}
                    </p>
                  </div>

                  <button
                    onClick={() => onNavigateTab('matches')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  >
                    Chi tiết
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Scorers & MVPs Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Cầu Thủ Xuất Sắc & Vua Phá Lưới
            </h3>
          </div>

          <div className="space-y-3">
            {topScorers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có số liệu vận động viên.</p>
            ) : (
              topScorers.map((ath, idx) => (
                <div
                  key={ath.id}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-xs'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-600/60 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {ath.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {ath.teamName} · Áo số {ath.jerseyNumber}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-black text-sky-600 dark:text-sky-400">
                      {ath.goalsOrPoints} điểm
                    </span>
                    {ath.mvpCount > 0 && (
                      <span className="block text-[9px] text-amber-500 font-bold">
                        {ath.mvpCount}x MVP
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
