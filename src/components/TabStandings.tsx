import React, { useState } from 'react';
import {
  Trophy,
  Filter,
  Printer,
  Sliders,
  ChevronUp,
  ChevronDown,
  Check,
  Medal,
  HelpCircle,
} from 'lucide-react';
import {
  RankingCriterionConfig,
  RankingCriterionType,
  StandingItem,
  TournamentConfig,
  UserProfile,
} from '../types';

interface TabStandingsProps {
  standingsByGroup: Record<string, StandingItem[]>;
  config: TournamentConfig;
  user: UserProfile;
  onUpdateRankingCriteria: (criteria: RankingCriterionConfig[]) => void;
}

export const TabStandings: React.FC<TabStandingsProps> = ({
  standingsByGroup,
  config,
  user,
  onUpdateRankingCriteria,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const isAdmin = user.role === 'admin';

  const groupsToDisplay =
    selectedGroup === 'ALL'
      ? Object.keys(standingsByGroup)
      : Object.keys(standingsByGroup).filter((g) => g === selectedGroup);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleCriterion = (id: RankingCriterionType) => {
    if (!isAdmin) return;
    const updated = config.rankingCriteria.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    onUpdateRankingCriteria(updated);
  };

  const handleMoveCriterion = (index: number, direction: 'up' | 'down') => {
    if (!isAdmin) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= config.rankingCriteria.length) return;

    const list = [...config.rankingCriteria];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    // re-assign order numbers
    const updated = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    onUpdateRankingCriteria(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Bảng Xếp Hạng Giải Đấu Tự Động
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tính toán tự động theo luật thi đấu, đối đầu trực tiếp, hiệu số set và điểm số
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Group Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Tất cả bảng/khối</option>
              {Object.keys(standingsByGroup).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Criteria Config Button */}
          <button
            onClick={() => setShowCriteriaModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            title="Cấu hình thứ tự tiêu chí xếp hạng"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Tiêu Chí Xếp Hạng</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Bảng Điểm</span>
          </button>
        </div>
      </div>

      {/* Group Standings Tables */}
      <div className="space-y-6">
        {groupsToDisplay.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-8 text-center rounded-3xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
            Chưa có bảng đấu nào hoặc chưa có dữ liệu đội thi đấu.
          </div>
        ) : (
          groupsToDisplay.map((grpName) => {
            const items = standingsByGroup[grpName] || [];

            return (
              <div
                key={grpName}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden"
              >
                {/* Table Group Header */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-50 to-slate-50 dark:from-sky-950/40 dark:to-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      Bảng Xếp Hạng: {grpName}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    {items.length} đội tham gia
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/60 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                        <th className="p-3.5 text-center w-12">Hạng</th>
                        <th className="p-3.5">Tên Đội</th>
                        <th className="p-3.5 text-center">Trận</th>
                        <th className="p-3.5 text-center">Thắng</th>
                        <th className="p-3.5 text-center">Hòa</th>
                        <th className="p-3.5 text-center">Thua</th>
                        <th className="p-3.5 text-center">Set (T-B)</th>
                        <th className="p-3.5 text-center">Hiệu Số Set</th>
                        <th className="p-3.5 text-center">Điểm Set</th>
                        <th className="p-3.5 text-center font-black text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30">
                          Tổng Điểm
                        </th>
                        <th className="p-3.5 text-center hidden md:table-cell">Phong Độ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-slate-400 text-xs">
                            Chưa có đội nào trong bảng đấu này.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => {
                          const isTop1 = idx === 0;
                          const isTop2 = idx === 1;
                          const isTop3 = idx === 2;

                          return (
                            <tr
                              key={item.team.id}
                              className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition ${
                                isTop1 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                              }`}
                            >
                              {/* Position */}
                              <td className="p-3.5 text-center font-bold">
                                <div className="flex items-center justify-center">
                                  {isTop1 ? (
                                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs">
                                      1
                                    </span>
                                  ) : isTop2 ? (
                                    <span className="w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-bold flex items-center justify-center text-xs">
                                      2
                                    </span>
                                  ) : isTop3 ? (
                                    <span className="w-6 h-6 rounded-full bg-amber-600/60 text-white font-bold flex items-center justify-center text-xs">
                                      3
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">{idx + 1}</span>
                                  )}
                                </div>
                              </td>

                              {/* Team Name */}
                              <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: item.team.color || '#0284c7' }}
                                  />
                                  <span>{item.team.name}</span>
                                </div>
                              </td>

                              {/* Played, Won, Drawn, Lost */}
                              <td className="p-3.5 text-center font-mono">{item.played}</td>
                              <td className="p-3.5 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                {item.won}
                              </td>
                              <td className="p-3.5 text-center font-mono text-slate-500">
                                {item.drawn}
                              </td>
                              <td className="p-3.5 text-center font-mono text-rose-600 dark:text-rose-400">
                                {item.lost}
                              </td>

                              {/* Sets won/lost */}
                              <td className="p-3.5 text-center font-mono text-slate-700 dark:text-slate-300">
                                {item.setsWon} - {item.setsLost}
                              </td>

                              {/* Set diff */}
                              <td className="p-3.5 text-center font-mono font-bold">
                                <span
                                  className={
                                    item.setsWon - item.setsLost > 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : item.setsWon - item.setsLost < 0
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-400'
                                  }
                                >
                                  {item.setsWon - item.setsLost > 0 ? `+${item.setsWon - item.setsLost}` : item.setsWon - item.setsLost}
                                </span>
                              </td>

                              {/* Points scored / conceded */}
                              <td className="p-3.5 text-center font-mono text-slate-500">
                                {item.ptsFor} : {item.ptsAgainst}
                              </td>

                              {/* Total Points */}
                              <td className="p-3.5 text-center font-mono font-black text-sm text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30">
                                {item.points}
                              </td>

                              {/* Form Guide */}
                              <td className="p-3.5 text-center hidden md:table-cell">
                                <div className="flex items-center justify-center gap-1">
                                  {item.form.length === 0 ? (
                                    <span className="text-slate-400 text-[10px]">Chưa đấu</span>
                                  ) : (
                                    item.form.map((f, fIdx) => (
                                      <span
                                        key={fIdx}
                                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white ${
                                          f === 'W'
                                            ? 'bg-emerald-500'
                                            : f === 'D'
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                      >
                                        {f}
                                      </span>
                                    ))
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
            );
          })
        )}
      </div>

      {/* Criteria Reorder Modal */}
      {showCriteriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Cấu Hình Tiêu Chí Xếp Hạng & Ưu Tiên
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Kéo hoặc di chuyển thứ tự ưu tiên các tiêu chí để hệ thống tự động sắp xếp vị trí bảng đấu:
            </p>

            <div className="space-y-2">
              {config.rankingCriteria.map((criterion, index) => (
                <div
                  key={criterion.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      disabled={!isAdmin}
                      checked={criterion.enabled}
                      onChange={() => handleToggleCriterion(criterion.id)}
                      className="w-4 h-4 rounded text-sky-600 outline-none"
                    />
                    <span className={`font-semibold ${criterion.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                      {criterion.label}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveCriterion(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveCriterion(index, 'down')}
                        disabled={index === config.rankingCriteria.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="px-5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-500 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
