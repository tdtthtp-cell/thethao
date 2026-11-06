import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Wand2,
  Trophy,
  GitBranch,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Shuffle,
  Users,
  ArrowRight,
  Plus,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Match, StandingItem, Team, TournamentConfig } from '../types';

interface ScheduleGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  matches: Match[];
  config: TournamentConfig;
  standingsByGroup: Record<string, StandingItem[]>;
  onApplyMatches: (newMatches: Match[], appendMode: boolean, noticeMsg: string) => void;
}

export const ScheduleGeneratorModal: React.FC<ScheduleGeneratorModalProps> = ({
  isOpen,
  onClose,
  teams,
  matches,
  config,
  standingsByGroup,
  onApplyMatches,
}) => {
  const [activeTab, setActiveTab] = useState<'group_stage' | 'knockout_stage'>('group_stage');

  // --- TAB 1: GROUP STAGE CONFIG ---
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [roundRobinLegs, setRoundRobinLegs] = useState<1 | 2>(1); // 1 lượt hoặc 2 lượt
  const [groupAppendMode, setGroupAppendMode] = useState<boolean>(true); // Giữ nguyên các trận khác
  const [groupStartDate, setGroupStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [groupStartTime, setGroupStartTime] = useState<string>('08:00');
  const [groupInterval, setGroupInterval] = useState<number>(45);
  const [groupPitchOption, setGroupPitchOption] = useState<'single' | 'alternating' | 'custom'>('alternating');
  const [customPitchName, setCustomPitchName] = useState<string>('Sân 1 (Chính)');

  // --- TAB 2: KNOCKOUT / ADVANCED ROUND CONFIG ---
  const [roundPreset, setRoundPreset] = useState<
    'quarter' | 'semi' | 'final_and_third' | 'playoff' | 'custom'
  >('semi');
  const [customRoundTitle, setCustomRoundTitle] = useState<string>('Bán Kết');
  const [advRule, setAdvRule] = useState<'top1' | 'top2' | 'prev_winners' | 'manual'>('top2');
  const [prevRoundSource, setPrevRoundSource] = useState<string>('Vòng bảng');
  const [pairingMethod, setPairingMethod] = useState<'cross' | 'random' | 'manual'>('cross');
  const [selectedManualTeamIds, setSelectedManualTeamIds] = useState<string[]>([]);
  const [manualPairings, setManualPairings] = useState<{ homeId: string; awayId: string }[]>([]);

  // Knockout Schedule Settings
  const [koStartDate, setKoStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [koStartTime, setKoStartTime] = useState<string>('08:00');
  const [koInterval, setKoInterval] = useState<number>(60);
  const [koPitch, setKoPitch] = useState<string>('Sân 1 (Chính)');

  if (!isOpen) return null;

  // Filter teams for Group stage
  const availableGroups = config.customGroups || [];
  const targetGroups = selectedGroup === 'ALL' ? availableGroups : [selectedGroup];

  // Helper to calculate total teams in selected group
  const teamsInSelection = teams.filter(
    (t) => selectedGroup === 'ALL' || t.group === selectedGroup
  );

  // --- GENERATE PREVIEWS FOR GROUP STAGE ---
  const previewGroupMatches: {
    home: Team;
    away: Team;
    group: string;
    stage: string;
    time: string;
    date: string;
    pitch: string;
  }[] = [];

  const startHour = parseInt(groupStartTime.split(':')[0], 10) || 8;
  const startMinute = parseInt(groupStartTime.split(':')[1], 10) || 0;
  let currentMinuteOffset = startHour * 60 + startMinute;
  let matchIndex = matches.length + 1;

  targetGroups.forEach((grp) => {
    const grpTeams = teams.filter((t) => t.group === grp);
    if (grpTeams.length < 2) return;

    // Leg 1
    for (let i = 0; i < grpTeams.length; i++) {
      for (let j = i + 1; j < grpTeams.length; j++) {
        const h = Math.floor(currentMinuteOffset / 60);
        const m = currentMinuteOffset % 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const pitch =
          groupPitchOption === 'alternating'
            ? matchIndex % 2 === 1
              ? 'Sân 1'
              : 'Sân 2'
            : groupPitchOption === 'single'
            ? 'Sân 1'
            : customPitchName;

        previewGroupMatches.push({
          home: grpTeams[i],
          away: grpTeams[j],
          group: grp,
          stage: grp,
          date: groupStartDate,
          time: timeStr,
          pitch,
        });

        matchIndex++;
        currentMinuteOffset += groupInterval;
      }
    }

    // Leg 2 (if double round robin)
    if (roundRobinLegs === 2) {
      for (let i = 0; i < grpTeams.length; i++) {
        for (let j = i + 1; j < grpTeams.length; j++) {
          const h = Math.floor(currentMinuteOffset / 60);
          const m = currentMinuteOffset % 60;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const pitch =
            groupPitchOption === 'alternating'
              ? matchIndex % 2 === 1
                ? 'Sân 1'
                : 'Sân 2'
              : groupPitchOption === 'single'
              ? 'Sân 1'
              : customPitchName;

          previewGroupMatches.push({
            home: grpTeams[j], // Inverted home/away
            away: grpTeams[i],
            group: grp,
            stage: grp,
            date: groupStartDate,
            time: timeStr,
            pitch,
          });

          matchIndex++;
          currentMinuteOffset += groupInterval;
        }
      }
    }
  });

  // --- QUALIFIED TEAMS FOR KNOCKOUT STAGE ---
  // Top 1 from each group
  const top1Teams: { team: Team; group: string; rankText: string }[] = [];
  // Top 2 from each group
  const top2Teams: { team: Team; group: string; rankText: string }[] = [];

  availableGroups.forEach((grp) => {
    const standings = standingsByGroup[grp] || [];
    if (standings.length > 0) {
      top1Teams.push({
        team: standings[0].team,
        group: grp,
        rankText: `Nhất ${grp}`,
      });
      top2Teams.push({
        team: standings[0].team,
        group: grp,
        rankText: `Nhất ${grp}`,
      });
    }
    if (standings.length > 1) {
      top2Teams.push({
        team: standings[1].team,
        group: grp,
        rankText: `Nhì ${grp}`,
      });
    }
  });

  // Previous winners from finished knockout matches
  const prevFinishedMatches = matches.filter(
    (m) => m.status === 'FINISHED' || m.scores.set1.home > 0 || m.scores.set1.away > 0
  );

  const prevWinners: { team: Team; matchCode: string; rankText: string }[] = [];
  const prevLosers: { team: Team; matchCode: string; rankText: string }[] = [];

  prevFinishedMatches.forEach((m) => {
    // Determine winner based on set scores or penalties
    let homeSets = 0;
    let awaySets = 0;
    for (let s = 1; s <= 5; s++) {
      const sc = m.scores[`set${s}` as keyof typeof m.scores] as { home: number; away: number };
      if (sc && (sc.home > 0 || sc.away > 0)) {
        if (sc.home > sc.away) homeSets++;
        else if (sc.away > sc.home) awaySets++;
      }
    }
    if (m.scores.pen.played) {
      if (m.scores.pen.home > m.scores.pen.away) homeSets++;
      else if (m.scores.pen.away > m.scores.pen.home) awaySets++;
    }

    if (homeSets > awaySets) {
      prevWinners.push({ team: m.home, matchCode: m.code, rankText: `Thắng ${m.code}` });
      prevLosers.push({ team: m.away, matchCode: m.code, rankText: `Thua ${m.code}` });
    } else if (awaySets > homeSets) {
      prevWinners.push({ team: m.away, matchCode: m.code, rankText: `Thắng ${m.code}` });
      prevLosers.push({ team: m.home, matchCode: m.code, rankText: `Thua ${m.code}` });
    }
  });

  // Determine which pool of qualified teams to use
  let qualifiedPool: { team: Team; rankText: string }[] = [];
  if (advRule === 'top1') {
    qualifiedPool = top1Teams.map((i) => ({ team: i.team, rankText: i.rankText }));
  } else if (advRule === 'top2') {
    qualifiedPool = top2Teams.map((i) => ({ team: i.team, rankText: i.rankText }));
  } else if (advRule === 'prev_winners') {
    qualifiedPool = prevWinners.map((i) => ({ team: i.team, rankText: i.rankText }));
  } else {
    // Manual
    qualifiedPool = teams
      .filter((t) => selectedManualTeamIds.includes(t.id))
      .map((t) => ({ team: t, rankText: t.group }));
  }

  // Generate Knockout Pairings based on pairingMethod
  const generatedKnockoutPairs: {
    home: Team;
    away: Team;
    label: string;
    stageTitle: string;
  }[] = [];

  const roundTitle =
    roundPreset === 'quarter'
      ? 'Tứ Kết'
      : roundPreset === 'semi'
      ? 'Bán Kết'
      : roundPreset === 'final_and_third'
      ? 'Chung Kết & Tranh Hạng Ba'
      : roundPreset === 'playoff'
      ? 'Vòng 2 / Play-off'
      : customRoundTitle || 'Vòng Đấu';

  if (advRule === 'top2' && pairingMethod === 'cross' && availableGroups.length >= 2) {
    // Cross pairing: Nhất bảng A gặp Nhì bảng B, Nhất bảng B gặp Nhì bảng A, v.v.
    const groupA = availableGroups[0];
    const groupB = availableGroups[1];
    const standingsA = standingsByGroup[groupA] || [];
    const standingsB = standingsByGroup[groupB] || [];

    if (standingsA.length >= 2 && standingsB.length >= 2) {
      generatedKnockoutPairs.push({
        home: standingsA[0].team,
        away: standingsB[1].team,
        label: `Trận 1: Nhất ${groupA} (${standingsA[0].team.name}) vs Nhì ${groupB} (${standingsB[1].team.name})`,
        stageTitle: roundTitle,
      });
      generatedKnockoutPairs.push({
        home: standingsB[0].team,
        away: standingsA[1].team,
        label: `Trận 2: Nhất ${groupB} (${standingsB[0].team.name}) vs Nhì ${groupA} (${standingsA[1].team.name})`,
        stageTitle: roundTitle,
      });
    }

    // If 4 groups (A, B, C, D): A vs B, C vs D
    if (availableGroups.length >= 4) {
      const groupC = availableGroups[2];
      const groupD = availableGroups[3];
      const standingsC = standingsByGroup[groupC] || [];
      const standingsD = standingsByGroup[groupD] || [];

      if (standingsC.length >= 2 && standingsD.length >= 2) {
        generatedKnockoutPairs.push({
          home: standingsC[0].team,
          away: standingsD[1].team,
          label: `Trận 3: Nhất ${groupC} vs Nhì ${groupD}`,
          stageTitle: roundTitle,
        });
        generatedKnockoutPairs.push({
          home: standingsD[0].team,
          away: standingsC[1].team,
          label: `Trận 4: Nhất ${groupD} vs Nhì ${groupC}`,
          stageTitle: roundTitle,
        });
      }
    }
  } else if (roundPreset === 'final_and_third' && advRule === 'prev_winners' && prevWinners.length >= 2) {
    // Final
    generatedKnockoutPairs.push({
      home: prevWinners[0].team,
      away: prevWinners[1].team,
      label: `Chung Kết: ${prevWinners[0].team.name} vs ${prevWinners[1].team.name}`,
      stageTitle: 'Chung Kết',
    });
    // 3rd place match if losers available
    if (prevLosers.length >= 2) {
      generatedKnockoutPairs.push({
        home: prevLosers[0].team,
        away: prevLosers[1].team,
        label: `Tranh Hạng Ba: ${prevLosers[0].team.name} vs ${prevLosers[1].team.name}`,
        stageTitle: 'Tranh Hạng Ba',
      });
    }
  } else {
    // Default sequential or random pairing
    const pool = [...qualifiedPool];
    if (pairingMethod === 'random') {
      // Random shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    for (let i = 0; i < pool.length - 1; i += 2) {
      const homeItem = pool[i];
      const awayItem = pool[i + 1];
      const pairNum = Math.floor(i / 2) + 1;
      generatedKnockoutPairs.push({
        home: homeItem.team,
        away: awayItem.team,
        label: `Cặp ${pairNum}: ${homeItem.team.name} (${homeItem.rankText}) vs ${awayItem.team.name} (${awayItem.rankText})`,
        stageTitle: roundTitle,
      });
    }
  }

  // --- SUBMISSION HANDLERS ---
  const handleApplyGroupSchedule = () => {
    if (previewGroupMatches.length === 0) {
      alert('Không có đủ đội trong bảng/khối để tạo lịch! Cần tối thiểu 2 đội.');
      return;
    }

    const startHr = parseInt(groupStartTime.split(':')[0], 10) || 8;
    const startMin = parseInt(groupStartTime.split(':')[1], 10) || 0;
    let minOffset = startHr * 60 + startMin;
    let seq = (groupAppendMode ? matches.length : 0) + 1;

    const newMatches: Match[] = previewGroupMatches.map((item, idx) => {
      const h = Math.floor(minOffset / 60);
      const m = minOffset % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      minOffset += groupInterval;

      return {
        id: 'M_' + Date.now() + '_' + (seq + idx),
        code: `Trận ${(seq + idx).toString().padStart(2, '0')}`,
        stage: item.stage,
        pitch: item.pitch,
        date: groupStartDate,
        time: timeStr,
        home: item.home,
        away: item.away,
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
        notes: `Vòng bảng ${item.group} (${roundRobinLegs === 1 ? '1 lượt' : 'Lượt về'})`,
      };
    });

    const notice = `Đã tạo ${newMatches.length} trận đấu vòng bảng ${
      selectedGroup === 'ALL' ? 'cho tất cả các bảng' : `bảng ${selectedGroup}`
    }!`;
    onApplyMatches(newMatches, groupAppendMode, notice);
    onClose();
  };

  const handleApplyKnockoutSchedule = () => {
    if (generatedKnockoutPairs.length === 0) {
      alert(
        'Chưa có đủ cặp đấu để tạo vòng này! Vui lòng kiểm tra lại điều lệ chọn đội hoặc chọn đủ các đội.'
      );
      return;
    }

    const startHr = parseInt(koStartTime.split(':')[0], 10) || 8;
    const startMin = parseInt(koStartTime.split(':')[1], 10) || 0;
    let minOffset = startHr * 60 + startMin;
    let seq = matches.length + 1;

    const newMatches: Match[] = generatedKnockoutPairs.map((pair, idx) => {
      const h = Math.floor(minOffset / 60);
      const m = minOffset % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      minOffset += koInterval;

      // Match code prefix
      let prefix = 'Trận';
      if (pair.stageTitle.includes('Bán Kết')) prefix = `BK ${idx + 1}`;
      else if (pair.stageTitle.includes('Tứ Kết')) prefix = `TK ${idx + 1}`;
      else if (pair.stageTitle.includes('Chung Kết')) prefix = 'CK';
      else if (pair.stageTitle.includes('Hạng Ba')) prefix = 'Hạng 3';
      else prefix = `Trận ${(seq + idx).toString().padStart(2, '0')}`;

      return {
        id: 'M_KO_' + Date.now() + '_' + (seq + idx),
        code: prefix,
        stage: pair.stageTitle,
        pitch: koPitch,
        date: koStartDate,
        time: timeStr,
        home: pair.home,
        away: pair.away,
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
        notes: `${pair.stageTitle}: ${pair.label}`,
      };
    });

    const notice = `Đã tạo ${newMatches.length} trận đấu cho vòng ${roundTitle} thành công!`;
    onApplyMatches(newMatches, true, notice); // Always append knockout rounds
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tạo Lịch Thi Đấu Tự Động & Phân Nhánh Vòng Đấu</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold">
                  Bản Mới 2026
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Xếp lịch theo bảng (Group/Khối) và tạo các vòng sau (Tứ kết, Bán kết, Chung kết) theo điều lệ chọn 1 hoặc 2 đội
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('group_stage')}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'group_stage'
                ? 'border-sky-600 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>1. Lịch Vòng Bảng (Theo Bảng / Khối)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('knockout_stage')}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'knockout_stage'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>2. Tạo Vòng Đấu Tiếp Theo (Knockout / Play-off)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* ===================== TAB 1: GROUP STAGE ===================== */}
          {activeTab === 'group_stage' && (
            <div className="space-y-5">
              {/* Target Group Selector */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>Chọn Bảng / Khối Cần Xếp Lịch</span>
                  </label>
                  <span className="text-xs text-slate-400">
                    Đã nhập: <strong className="text-sky-600 dark:text-sky-400">{teamsInSelection.length} đội</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Phạm vi bảng thi đấu:
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    >
                      <option value="ALL">👉 Tất cả các bảng ({availableGroups.join(', ')})</option>
                      {availableGroups.map((g) => (
                        <option key={g} value={g}>
                          Chỉ xếp lịch cho bảng: {g} ({teams.filter((t) => t.group === g).length} đội)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Thể thức vòng tròn:
                    </label>
                    <select
                      value={roundRobinLegs}
                      onChange={(e) => setRoundRobinLegs(Number(e.target.value) as 1 | 2)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                    >
                      <option value={1}>Vòng tròn 1 lượt (Mỗi cặp gặp nhau 1 trận)</option>
                      <option value={2}>Vòng tròn 2 lượt (Lượt đi & Lượt về)</option>
                    </select>
                  </div>
                </div>

                {/* Append or Replace */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={groupAppendMode}
                      onChange={(e) => setGroupAppendMode(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Tạo nối tiếp vào lịch hiện tại (Không làm mất các trận đã xếp trước đó)
                    </span>
                  </label>
                </div>
              </div>

              {/* Time and Venue Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Ngày Bắt Đầu</span>
                  </label>
                  <input
                    type="date"
                    value={groupStartDate}
                    onChange={(e) => setGroupStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Giờ Bắt Đầu</span>
                  </label>
                  <input
                    type="time"
                    value={groupStartTime}
                    onChange={(e) => setGroupStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Giãn Cách Trận
                  </label>
                  <select
                    value={groupInterval}
                    onChange={(e) => setGroupInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value={30}>30 phút/trận</option>
                    <option value={45}>45 phút/trận</option>
                    <option value={60}>60 phút/trận</option>
                    <option value={90}>90 phút/trận</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Phân Bổ Sân</span>
                  </label>
                  <select
                    value={groupPitchOption}
                    onChange={(e) => setGroupPitchOption(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="alternating">Luân phiên Sân 1 & 2</option>
                    <option value="single">Chỉ 1 Sân (Sân 1)</option>
                    <option value="custom">Sân tùy chỉnh...</option>
                  </select>
                  {groupPitchOption === 'custom' && (
                    <input
                      type="text"
                      value={customPitchName}
                      onChange={(e) => setCustomPitchName(e.target.value)}
                      placeholder="Tên sân..."
                      className="mt-1.5 w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    Xem Trước Lịch Đấu Sinh Ra ({previewGroupMatches.length} trận)
                  </span>
                  <span className="text-slate-400 font-normal">
                    {teamsInSelection.length < 2 && (
                      <span className="text-rose-500 font-bold">Cần tối thiểu 2 đội để xếp lịch</span>
                    )}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {previewGroupMatches.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Chưa có đủ đội bóng trong bảng này để tạo cặp đấu. Ban tổ chức vui lòng nhập danh sách đội tại tab "Đăng Ký VĐV / Đội" trước!
                    </div>
                  ) : (
                    previewGroupMatches.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {p.home.name}
                            </span>{' '}
                            <span className="text-slate-400 font-normal">vs</span>{' '}
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {p.away.name}
                            </span>
                            <span className="ml-2 text-[10px] text-slate-400 font-semibold">
                              ({p.stage})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                          <span>{p.time}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-sans">
                            {p.pitch}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={previewGroupMatches.length === 0}
                  onClick={handleApplyGroupSchedule}
                  className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Xác Nhận Xếp Lịch Vòng Bảng ({previewGroupMatches.length} Trận)</span>
                </button>
              </div>
            </div>
          )}

          {/* ===================== TAB 2: KNOCKOUT / ADVANCED ROUNDS ===================== */}
          {activeTab === 'knockout_stage' && (
            <div className="space-y-5">
              {/* Step 1: Choose Round Type */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-indigo-600" />
                  <span>Bước 1: Chọn Vòng Đấu Cần Tạo</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'semi', label: 'Bán Kết (2 trận)', desc: 'Top 4 đội' },
                    { id: 'quarter', label: 'Tứ Kết (4 trận)', desc: 'Top 8 đội' },
                    { id: 'final_and_third', label: 'Chung Kết & Tranh Hạng 3', desc: 'Trận tranh ngôi vương' },
                    { id: 'playoff', label: 'Vòng 2 / Play-off', desc: 'Vòng đấu phụ' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRoundPreset(item.id as any)}
                      className={`p-3 text-left rounded-xl border text-xs transition cursor-pointer ${
                        roundPreset === item.id
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-bold">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Qualification Rule */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span>Bước 2: Điều Lệ Tuyển Chọn Đội Vào Vòng</span>
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    Đủ điều kiện: {qualifiedPool.length} đội
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdvRule('top2')}
                    className={`p-3 text-left rounded-xl border text-xs transition cursor-pointer ${
                      advRule === 'top2'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Chọn 2 Đội/Bảng</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                        Top 2
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Lấy đội Nhất & Nhì của từng bảng dựa theo Bảng xếp hạng
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvRule('top1')}
                    className={`p-3 text-left rounded-xl border text-xs transition cursor-pointer ${
                      advRule === 'top1'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <span>Chọn 1 Đội/Bảng</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                        Top 1
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Chỉ lấy đội Nhất bảng của từng bảng vào thẳng Bán kết/Chung kết
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvRule('prev_winners')}
                    className={`p-3 text-left rounded-xl border text-xs transition cursor-pointer ${
                      advRule === 'prev_winners'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold">Đội Thắng Vòng Trước</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Thắng Tứ kết vào Bán kết; Thắng Bán kết vào Chung kết ({prevWinners.length} đội đã thắng)
                    </div>
                  </button>
                </div>

                {/* Qualified Teams Display */}
                <div className="pt-2">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Danh sách các đội được xét duyệt vào vòng:
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    {qualifiedPool.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">
                        Chưa có đội nào đạt điều kiện. Vui lòng cập nhật tỉ số các trận vòng bảng để hệ thống xác định đội Nhất/Nhì!
                      </span>
                    ) : (
                      qualifiedPool.map((q, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <strong>{q.team.name}</strong>
                          <span className="text-[10px] text-slate-400 font-normal">({q.rankText})</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Step 3: Pairing Scheme */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Shuffle className="w-4 h-4 text-sky-600" />
                  <span>Bước 3: Phương Thức Ghép Cặp Thi Đấu</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPairingMethod('cross')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      pairingMethod === 'cross'
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    Ghép Cặp Chéo Chuẩn (Nhất bảng A vs Nhì bảng B...)
                  </button>

                  <button
                    type="button"
                    onClick={() => setPairingMethod('random')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      pairingMethod === 'random'
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600'
                    }`}
                  >
                    🎲 Bốc Thăm Ngẫu Nhiên
                  </button>
                </div>
              </div>

              {/* Step 4: Schedule Time & Pitch */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Ngày Thi Đấu
                  </label>
                  <input
                    type="date"
                    value={koStartDate}
                    onChange={(e) => setKoStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Giờ Bắt Đầu
                  </label>
                  <input
                    type="time"
                    value={koStartTime}
                    onChange={(e) => setKoStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Giãn Cách Trận
                  </label>
                  <select
                    value={koInterval}
                    onChange={(e) => setKoInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value={45}>45 phút/trận</option>
                    <option value={60}>60 phút/trận</option>
                    <option value={90}>90 phút/trận</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Sân Thi Đấu
                  </label>
                  <input
                    type="text"
                    value={koPitch}
                    onChange={(e) => setKoPitch(e.target.value)}
                    placeholder="Sân 1..."
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              {/* Step 5: Knockout Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Các Cặp Đấu Vòng {roundTitle} Sẽ Được Tạo ({generatedKnockoutPairs.length} trận)
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {generatedKnockoutPairs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Chưa đủ thông tin để ghép cặp vòng này. Vui lòng chọn điều lệ phù hợp hoặc bổ sung đội!
                    </div>
                  ) : (
                    generatedKnockoutPairs.map((pair, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{pair.home.name}</span>
                              <span className="text-slate-400 font-normal">vs</span>
                              <span>{pair.away.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{pair.label}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-[10px] font-bold">
                            {pair.stageTitle}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  disabled={generatedKnockoutPairs.length === 0}
                  onClick={handleApplyKnockoutSchedule}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Trophy className="w-4 h-4" />
                  <span>
                    Xác Nhận & Thêm Vòng {roundTitle} ({generatedKnockoutPairs.length} Trận)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
