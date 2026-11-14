import React, { useState } from 'react';
import {
  Trophy,
  Filter,
  Printer,
  Sliders,
  ChevronUp,
  ChevronDown,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Check,
  X,
  Lock,
  ArrowUpDown,
} from 'lucide-react';
import {
  RankingCriterionConfig,
  RankingCriterionRule,
  RankingCriterionType,
  SetPointRules,
  StandingItem,
  TournamentConfig,
  UserProfile,
} from '../types';
import {
  DEFAULT_RANKING_CRITERIA,
  DEFAULT_SET_POINT_RULES,
  getEffectiveSetPointRules,
} from '../services/initialData';

export const RANKING_RULE_OPTIONS: {
  value: RankingCriterionRule;
  label: string;
  defaultDirection: 'desc' | 'asc';
  hint: string;
}[] = [
  {
    value: 'points',
    label: 'Tổng điểm số đạt được (Points)',
    defaultDirection: 'desc',
    hint: 'So sánh tổng điểm tích lũy qua các trận',
  },
  {
    value: 'head_to_head',
    label: 'Thành tích đối đầu trực tiếp (Head-to-Head)',
    defaultDirection: 'desc',
    hint: 'Xét kết quả trận đối đầu trực tiếp giữa 2 đội bằng điểm',
  },
  {
    value: 'matches_won',
    label: 'Số trận thắng (Matches Won)',
    defaultDirection: 'desc',
    hint: 'Đội có tổng số trận thắng nhiều hơn xếp trên',
  },
  {
    value: 'set_difference',
    label: 'Hiệu số set thắng / thua (Set Difference)',
    defaultDirection: 'desc',
    hint: 'Lấy tổng set thắng trừ tổng set thua',
  },
  {
    value: 'set_ratio',
    label: 'Tỉ số set thắng / thua (Set Ratio)',
    defaultDirection: 'desc',
    hint: 'Lấy tổng set thắng chia cho tổng set thua',
  },
  {
    value: 'sets_won',
    label: 'Tổng số set thắng (Sets Won)',
    defaultDirection: 'desc',
    hint: 'So sánh tổng số set thắng của mỗi đội',
  },
  {
    value: 'sets_lost',
    label: 'Số set thua (Sets Lost)',
    defaultDirection: 'asc',
    hint: 'Đội để thua ít set hơn sẽ xếp trên',
  },
  {
    value: 'point_difference',
    label: 'Hiệu số điểm nhỏ / bàn thắng bại (Point Difference)',
    defaultDirection: 'desc',
    hint: 'Tổng điểm ghi được trừ đi tổng điểm bị ghi trong các set',
  },
  {
    value: 'point_ratio',
    label: 'Tỉ số điểm thắng / thua (Point Ratio)',
    defaultDirection: 'desc',
    hint: 'Tổng điểm ghi được chia cho tổng điểm bị ghi',
  },
  {
    value: 'points_scored',
    label: 'Tổng điểm ghi được trong các set (Points Scored)',
    defaultDirection: 'desc',
    hint: 'Đội ghi được nhiều điểm nhỏ (hoặc bàn thắng) hơn xếp trên',
  },
  {
    value: 'points_conceded',
    label: 'Tổng điểm bị thua / bàn thua (Points Conceded)',
    defaultDirection: 'asc',
    hint: 'Đội để mất ít điểm (hoặc ít bàn thua) hơn xếp trên',
  },
  {
    value: 'matches_lost',
    label: 'Số trận thua (Matches Lost)',
    defaultDirection: 'asc',
    hint: 'Đội có số trận thua ít hơn xếp trên',
  },
  {
    value: 'custom',
    label: 'Tiêu chí bổ sung / Quy định riêng của BTC',
    defaultDirection: 'desc',
    hint: 'Tiêu chí phụ theo điều lệ riêng (VD: Fair-play, bốc thăm)',
  },
];

export const getRuleForCriterion = (c: RankingCriterionConfig): RankingCriterionRule => {
  if (c.rule) return c.rule;
  const known = RANKING_RULE_OPTIONS.find((r) => r.value === c.id);
  return known ? known.value : 'custom';
};

export const getDirectionForCriterion = (c: RankingCriterionConfig): 'desc' | 'asc' => {
  if (c.direction) return c.direction;
  const rule = getRuleForCriterion(c);
  if (rule === 'sets_lost' || rule === 'points_conceded' || rule === 'matches_lost') {
    return 'asc';
  }
  return 'desc';
};

interface TabStandingsProps {
  standingsByGroup: Record<string, StandingItem[]>;
  config: TournamentConfig;
  user: UserProfile;
  onUpdateRankingCriteria: (criteria: RankingCriterionConfig[], auditNote?: string) => void;
  onUpdateSetPointRules?: (rules: SetPointRules, auditNote?: string) => void;
  onOpenLogin?: () => void;
}

export const TabStandings: React.FC<TabStandingsProps> = ({
  standingsByGroup,
  config,
  user,
  onUpdateRankingCriteria,
  onUpdateSetPointRules,
  onOpenLogin,
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const effectivePointRules = getEffectiveSetPointRules(null, config);

  const handlePointRuleChange = (patch: Partial<SetPointRules>, note?: string) => {
    if (!requireAuth()) return;
    const next: SetPointRules = {
      ...DEFAULT_SET_POINT_RULES,
      ...effectivePointRules,
      ...patch,
    };
    if (onUpdateSetPointRules) {
      onUpdateSetPointRules(next, note);
    }
  };

  // Editing state for an existing criterion
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editRule, setEditRule] = useState<RankingCriterionRule>('points');
  const [editDirection, setEditDirection] = useState<'desc' | 'asc'>('desc');
  const [editDescription, setEditDescription] = useState('');

  // Adding state for a new criterion
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newRule, setNewRule] = useState<RankingCriterionRule>('matches_won');
  const [newDirection, setNewDirection] = useState<'desc' | 'asc'>('desc');
  const [newDescription, setNewDescription] = useState('');

  // Allow any logged-in organizer/staff (admin, referee, secretary) to manage ranking criteria
  const canManageCriteria = Boolean(user && user.role && user.role !== 'viewer');

  const requireAuth = (): boolean => {
    if (canManageCriteria) return true;
    if (onOpenLogin) onOpenLogin();
    return false;
  };

  const groupsToDisplay =
    selectedGroup === 'ALL'
      ? Object.keys(standingsByGroup)
      : Object.keys(standingsByGroup).filter((g) => g === selectedGroup);

  const handlePrint = () => {
    window.print();
  };

  const normalizeCriteriaOrder = (list: RankingCriterionConfig[]): RankingCriterionConfig[] =>
    list.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

  const handleToggleCriterion = (id: RankingCriterionType) => {
    if (!requireAuth()) return;
    const target = config.rankingCriteria.find((c) => c.id === id);
    const updated = config.rankingCriteria.map((c) =>
      c.id === id ? { ...c, enabled: !c.enabled } : c
    );
    onUpdateRankingCriteria(
      updated,
      `${target?.enabled ? 'Tắt' : 'Bật'} tiêu chí xếp hạng: "${target?.label || id}"`
    );
  };

  const handleMoveCriterion = (index: number, direction: 'up' | 'down') => {
    if (!requireAuth()) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= config.rankingCriteria.length) return;

    const list = [...config.rankingCriteria];
    const movedItem = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = movedItem;

    const updated = normalizeCriteriaOrder(list);
    onUpdateRankingCriteria(
      updated,
      `Thay đổi thứ tự ưu tiên tiêu chí "${movedItem.label}" lên vị trí số ${targetIdx + 1}`
    );
  };

  const handleStartEdit = (criterion: RankingCriterionConfig) => {
    if (!requireAuth()) return;
    setEditingId(criterion.id);
    // Strip leading "1. ", "2. " if present so the user edits the clean title
    const cleanTitle = criterion.label.replace(/^\d+\.\s*/, '');
    setEditLabel(cleanTitle);
    setEditRule(getRuleForCriterion(criterion));
    setEditDirection(getDirectionForCriterion(criterion));
    setEditDescription(criterion.description || '');
  };

  const handleSaveEdit = (id: string) => {
    if (!requireAuth()) return;
    const trimmedLabel = editLabel.trim();
    if (!trimmedLabel) return;

    const updated = config.rankingCriteria.map((c) =>
      c.id === id
        ? {
            ...c,
            label: trimmedLabel,
            rule: editRule,
            direction: editDirection,
            description: editDescription.trim() || undefined,
          }
        : c
    );
    onUpdateRankingCriteria(updated, `Chỉnh sửa tiêu chí xếp hạng: "${trimmedLabel}"`);
    setEditingId(null);
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth()) return;

    const ruleMeta = RANKING_RULE_OPTIONS.find((r) => r.value === newRule);
    const finalLabel = newLabel.trim() || ruleMeta?.label || 'Tiêu chí xếp hạng mới';
    const newItem: RankingCriterionConfig = {
      id: `crit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      label: finalLabel,
      rule: newRule,
      direction: newDirection,
      description: newDescription.trim() || ruleMeta?.hint,
      enabled: true,
      order: config.rankingCriteria.length + 1,
    };

    const updated = normalizeCriteriaOrder([...config.rankingCriteria, newItem]);
    onUpdateRankingCriteria(updated, `Thêm mới tiêu chí xếp hạng: "${finalLabel}"`);

    setNewLabel('');
    setNewDescription('');
    setShowAddForm(false);
  };

  const handleDeleteCriterion = (criterion: RankingCriterionConfig) => {
    if (!requireAuth()) return;
    if (config.rankingCriteria.length <= 1) return;

    const filtered = config.rankingCriteria.filter((c) => c.id !== criterion.id);
    const updated = normalizeCriteriaOrder(filtered);
    onUpdateRankingCriteria(updated, `Xóa tiêu chí xếp hạng: "${criterion.label}"`);
    if (editingId === criterion.id) {
      setEditingId(null);
    }
  };

  const handleRestoreDefaults = () => {
    if (!requireAuth()) return;
    onUpdateRankingCriteria(
      DEFAULT_RANKING_CRITERIA,
      'Khôi phục bộ tiêu chí xếp hạng về mặc định chuẩn giải đấu'
    );
    setEditingId(null);
    setShowAddForm(false);
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
            className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/60 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Cấu hình, thêm và chỉnh sửa tiêu chí xếp hạng"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>Tiêu Chí Xếp Hạng ({config.rankingCriteria.filter((c) => c.enabled).length})</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Bảng Điểm</span>
          </button>
        </div>
      </div>

      {/* Active Point Rules & Ranking Criteria Summary Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">
              Quy định tính điểm trận đấu (BTC):
            </span>
            {effectivePointRules.mode === 'set_score' ? (
              <>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                  Thắng 2-0 / 3-0: +{effectivePointRules.winClearPts}đ
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold text-[11px]">
                  Thắng 2-1 / 3-2: +{effectivePointRules.winClosePts}đ
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                  Thua 1-2 / 2-3: +{effectivePointRules.lossClosePts}đ
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                  Thua 0-2 / 0-3: +{effectivePointRules.lossClearPts}đ
                </span>
              </>
            ) : (
              <>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                  Thắng trận: +{effectivePointRules.fixedWinPts}đ
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                  Hòa: +{effectivePointRules.fixedDrawPts}đ
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px]">
                  Thua trận: +{effectivePointRules.fixedLossPts}đ
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCriteriaModal(true)}
            className="text-sky-600 dark:text-sky-400 hover:underline font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
            <span>Tùy chỉnh điểm & tiêu chí</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold text-slate-500 dark:text-slate-400 mr-1">
            Thứ tự ưu tiên xếp hạng:
          </span>
          {config.rankingCriteria
            .filter((c) => c.enabled)
            .map((c, idx) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-[11px]"
              >
                <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span>{c.label.replace(/^\d+\.\s*/, '')}</span>
              </span>
            ))}
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
                                  {item.setsWon - item.setsLost > 0
                                    ? `+${item.setsWon - item.setsLost}`
                                    : item.setsWon - item.setsLost}
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

      {/* Criteria Configuration, Add & Edit Modal */}
      {showCriteriaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Cấu Hình Tiêu Chí Xếp Hạng & Ưu Tiên
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ban tổ chức có thể thêm tiêu chí mới, chỉnh sửa tên/quy tắc tính, bật/tắt và sắp xếp thứ tự ưu tiên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCriteriaModal(false);
                  setEditingId(null);
                  setShowAddForm(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Guest Warning Banner if not logged in */}
            {!canManageCriteria && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Bạn đang ở chế độ <strong>Khách xem</strong>. Vui lòng đăng nhập tài khoản Ban Tổ Chức để thêm, chỉnh sửa hoặc đổi thứ tự tiêu chí xếp hạng.
                  </span>
                </div>
                {onOpenLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCriteriaModal(false);
                      onOpenLogin();
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Đăng Nhập Ngay
                  </button>
                )}
              </div>
            )}

            {/* 1. Match Point Calculation Rules (Quy định cách tính điểm trận đấu của BTC) */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shrink-0 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    1. Quy Định Cách Tính Điểm Trận Đấu (Do Ban Tổ Chức Quy Định)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tùy chỉnh điểm thưởng cho từng trận thắng/thua theo tỉ số Set (2-0, 3-0 hoặc 2-1, 3-2) hoặc điểm cố định
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handlePointRuleChange(
                        {
                          mode: 'set_score',
                          winClearPts: 3,
                          winClosePts: 2,
                          lossClosePts: 1,
                          lossClearPts: 0,
                        },
                        'Áp dụng quy tắc điểm Bóng chuyền chuẩn trường học (Thắng 2-0/3-0: 3đ, Thắng 2-1/3-2: 2đ, Thua 1-2/2-3: 1đ, Thua 0-2/0-3: 0đ)'
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      effectivePointRules.mode === 'set_score'
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Theo tỉ số Set (3-2-1-0)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePointRuleChange(
                        {
                          mode: 'fixed',
                          fixedWinPts: 2,
                          fixedDrawPts: 1,
                          fixedLossPts: 1,
                        },
                        'Áp dụng quy tắc điểm cố định (Thắng 2đ, Thua 1đ)'
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      effectivePointRules.mode === 'fixed' && effectivePointRules.fixedWinPts === 2
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Cố định (Thắng 2đ - Thua 1đ)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handlePointRuleChange(
                        {
                          mode: 'fixed',
                          fixedWinPts: 3,
                          fixedDrawPts: 1,
                          fixedLossPts: 0,
                        },
                        'Áp dụng quy tắc điểm cố định (Thắng 3đ, Hòa 1đ, Thua 0đ)'
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                      effectivePointRules.mode === 'fixed' && effectivePointRules.fixedWinPts === 3
                        ? 'bg-sky-600 text-white border-sky-600'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Cố định (Thắng 3đ - Thua 0đ)
                  </button>
                </div>
              </div>

              {effectivePointRules.mode === 'set_score' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                    <div className="font-extrabold text-emerald-700 dark:text-emerald-400 text-[11px]">
                      Thắng 2-0 hoặc 3-0 (3-1)
                    </div>
                    <div className="text-[10px] text-slate-400">Thắng cách biệt (3 set / 5 set)</div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="number"
                        disabled={!canManageCriteria}
                        value={effectivePointRules.winClearPts}
                        onChange={(e) =>
                          handlePointRuleChange(
                            { winClearPts: Number(e.target.value) || 0 },
                            `Đổi điểm Thắng 2-0/3-0 thành ${e.target.value} điểm`
                          )
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                      />
                      <span className="text-[11px] font-bold text-slate-500">điểm</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-sky-200 dark:border-sky-900/60 space-y-1">
                    <div className="font-extrabold text-sky-700 dark:text-sky-400 text-[11px]">
                      Thắng 2-1 hoặc 3-2
                    </div>
                    <div className="text-[10px] text-slate-400">Thắng sát nút (3 set / 5 set)</div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="number"
                        disabled={!canManageCriteria}
                        value={effectivePointRules.winClosePts}
                        onChange={(e) =>
                          handlePointRuleChange(
                            { winClosePts: Number(e.target.value) || 0 },
                            `Đổi điểm Thắng 2-1/3-2 thành ${e.target.value} điểm`
                          )
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                      />
                      <span className="text-[11px] font-bold text-slate-500">điểm</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-amber-200 dark:border-amber-900/60 space-y-1">
                    <div className="font-extrabold text-amber-700 dark:text-amber-400 text-[11px]">
                      Thua 1-2 hoặc 2-3
                    </div>
                    <div className="text-[10px] text-slate-400">Thua sát nút được cộng điểm</div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="number"
                        disabled={!canManageCriteria}
                        value={effectivePointRules.lossClosePts}
                        onChange={(e) =>
                          handlePointRuleChange(
                            { lossClosePts: Number(e.target.value) || 0 },
                            `Đổi điểm Thua 1-2/2-3 thành ${e.target.value} điểm`
                          )
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                      />
                      <span className="text-[11px] font-bold text-slate-500">điểm</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-1">
                    <div className="font-extrabold text-rose-700 dark:text-rose-400 text-[11px]">
                      Thua 0-2 hoặc 0-3 (1-3)
                    </div>
                    <div className="text-[10px] text-slate-400">Thua cách biệt</div>
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="number"
                        disabled={!canManageCriteria}
                        value={effectivePointRules.lossClearPts}
                        onChange={(e) =>
                          handlePointRuleChange(
                            { lossClearPts: Number(e.target.value) || 0 },
                            `Đổi điểm Thua 0-2/0-3 thành ${e.target.value} điểm`
                          )
                        }
                        className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                      />
                      <span className="text-[11px] font-bold text-slate-500">điểm</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">Mọi trận Thắng:</span>
                    <input
                      type="number"
                      disabled={!canManageCriteria}
                      value={effectivePointRules.fixedWinPts}
                      onChange={(e) =>
                        handlePointRuleChange(
                          { fixedWinPts: Number(e.target.value) || 0 },
                          `Đổi điểm Thắng cố định thành ${e.target.value} điểm`
                        )
                      }
                      className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    />
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-amber-700 dark:text-amber-400">Trận Hòa:</span>
                    <input
                      type="number"
                      disabled={!canManageCriteria}
                      value={effectivePointRules.fixedDrawPts}
                      onChange={(e) =>
                        handlePointRuleChange(
                          { fixedDrawPts: Number(e.target.value) || 0 },
                          `Đổi điểm Hòa cố định thành ${e.target.value} điểm`
                        )
                      }
                      className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    />
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-bold text-rose-700 dark:text-rose-400">Mọi trận Thua:</span>
                    <input
                      type="number"
                      disabled={!canManageCriteria}
                      value={effectivePointRules.fixedLossPts}
                      onChange={(e) =>
                        handlePointRuleChange(
                          { fixedLossPts: Number(e.target.value) || 0 },
                          `Đổi điểm Thua cố định thành ${e.target.value} điểm`
                        )
                      }
                      className="w-16 px-2 py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Top Action Toolbar for Ranking Criteria */}
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                2. Thứ Tự Ưu Tiên Các Tiêu Chí Xếp Hạng (Đang bật{' '}
                <span className="text-sky-600 dark:text-sky-400">
                  {config.rankingCriteria.filter((c) => c.enabled).length}
                </span>{' '}
                / {config.rankingCriteria.length} tiêu chí)
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Khôi phục bộ tiêu chí chuẩn mặc định"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi Phục Mặc Định</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!requireAuth()) return;
                    setShowAddForm((prev) => !prev);
                    setEditingId(null);
                  }}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Tiêu Chí Mới</span>
                </button>
              </div>
            </div>

            {/* Add New Criterion Form */}
            {showAddForm && canManageCriteria && (
              <form
                onSubmit={handleAddCriterion}
                className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/80 space-y-3 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    Thêm Tiêu Chí Xếp Hạng Mới
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Quy tắc tính toán *
                    </label>
                    <select
                      value={newRule}
                      onChange={(e) => {
                        const r = e.target.value as RankingCriterionRule;
                        setNewRule(r);
                        const meta = RANKING_RULE_OPTIONS.find((opt) => opt.value === r);
                        if (meta) {
                          setNewDirection(meta.defaultDirection);
                          if (!newLabel.trim()) {
                            setNewLabel(meta.label);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-semibold"
                    >
                      {RANKING_RULE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Chiều ưu tiên xếp hạng *
                    </label>
                    <select
                      value={newDirection}
                      onChange={(e) => setNewDirection(e.target.value as 'desc' | 'asc')}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-semibold"
                    >
                      <option value="desc">Cao hơn xếp trên (Giảm dần)</option>
                      <option value="asc">Ít hơn / Thấp hơn xếp trên (Tăng dần)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Tên hiển thị tiêu chí *
                    </label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="VD: Số trận thắng (Matches Won)..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      Ghi chú / Mô tả cách tính (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="VD: Ưu tiên đội thắng nhiều trận hơn..."
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu & Thêm Vào Danh Sách</span>
                  </button>
                </div>
              </form>
            )}

            {/* Criteria List (Scrollable) */}
            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
              {config.rankingCriteria.map((criterion, index) => {
                const isEditing = editingId === criterion.id;
                const rule = getRuleForCriterion(criterion);
                const direction = getDirectionForCriterion(criterion);
                const ruleMeta = RANKING_RULE_OPTIONS.find((r) => r.value === rule);
                const cleanLabel = criterion.label.replace(/^\d+\.\s*/, '');

                return (
                  <div
                    key={criterion.id}
                    className={`p-3.5 rounded-2xl border transition text-xs ${
                      isEditing
                        ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-400 dark:border-sky-700 ring-2 ring-sky-500/20'
                        : criterion.enabled
                        ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 opacity-70'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase text-sky-600 dark:text-sky-400">
                            Chỉnh sửa tiêu chí ưu tiên #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                          >
                            Hủy
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Tên hiển thị tiêu chí *
                            </label>
                            <input
                              type="text"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Quy tắc tính toán *
                            </label>
                            <select
                              value={editRule}
                              onChange={(e) => setEditRule(e.target.value as RankingCriterionRule)}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-semibold"
                            >
                              {RANKING_RULE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Chiều ưu tiên
                            </label>
                            <select
                              value={editDirection}
                              onChange={(e) => setEditDirection(e.target.value as 'desc' | 'asc')}
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-semibold"
                            >
                              <option value="desc">Cao hơn xếp trên (Giảm dần)</option>
                              <option value="asc">Ít hơn / Thấp hơn xếp trên (Tăng dần)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                              Mô tả / Ghi chú
                            </label>
                            <input
                              type="text"
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Mô tả chi tiết cách xét..."
                              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(criterion.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Lưu Thay Đổi</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={criterion.enabled}
                            onChange={() => handleToggleCriterion(criterion.id)}
                            className="mt-1 w-4 h-4 rounded text-sky-600 outline-none cursor-pointer shrink-0"
                            title={criterion.enabled ? 'Đang bật (nhấn để tắt)' : 'Đang tắt (nhấn để bật)'}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-black text-[10px]">
                                Ưu tiên #{index + 1}
                              </span>
                              <span
                                className={`font-bold text-xs sm:text-sm ${
                                  criterion.enabled
                                    ? 'text-slate-900 dark:text-white'
                                    : 'text-slate-400 line-through'
                                }`}
                              >
                                {cleanLabel}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                                <ArrowUpDown className="w-3 h-3 text-sky-500" />
                                {direction === 'asc' ? 'Ít hơn xếp trên' : 'Cao hơn xếp trên'}
                              </span>
                              <span>
                                • Quy tắc: <strong>{ruleMeta?.label.split(' (')[0] || 'Tùy chỉnh'}</strong>
                              </span>
                              {criterion.description && (
                                <span className="text-slate-400 italic">({criterion.description})</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveCriterion(index, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Tăng độ ưu tiên (Lên trên)"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveCriterion(index, 'down')}
                            disabled={index === config.rankingCriteria.length - 1}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Giảm độ ưu tiên (Xuống dưới)"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(criterion)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer"
                            title="Chỉnh sửa tiêu chí này"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {config.rankingCriteria.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCriterion(criterion)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                              title="Xóa tiêu chí này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">
                Mọi thay đổi được lưu tự động và áp dụng tức thì cho toàn bộ Bảng Xếp Hạng.
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowCriteriaModal(false);
                  setEditingId(null);
                  setShowAddForm(false);
                }}
                className="px-5 py-2 bg-sky-600 text-white font-bold rounded-xl text-xs hover:bg-sky-500 transition cursor-pointer shadow-xs"
              >
                Hoàn Tất & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
