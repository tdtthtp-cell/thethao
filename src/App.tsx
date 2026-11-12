import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Athlete,
  AuditAction,
  AuditEntityType,
  AuditLog,
  Match,
  NotificationItem,
  RankingCriterionConfig,
  Sport,
  StandingItem,
  Team,
  TournamentConfig,
  UserAccount,
  UserProfile,
} from './types';
import {
  DEFAULT_CONFIG,
  DEFAULT_GUEST_USER,
  INITIAL_SPORTS,
  INITIAL_TEAMS,
  INITIAL_USER_ACCOUNTS,
  loadTournamentState,
  saveTournamentState,
} from './services/initialData';
import { getVenueForGroup, sortGroupsByVenue } from './services/venueService';
import { logoutGoogle } from './services/firebaseAuth';
import {
  subscribeToFirestore,
  testFirestoreConnection,
  syncConfigToFirestore,
  syncSportToFirestore,
  syncTeamToFirestore,
  syncMultipleTeamsToFirestore,
  deleteTeamFromFirestore,
  deleteMultipleTeamsFromFirestore,
  syncAthleteToFirestore,
  syncMultipleAthletesToFirestore,
  deleteAthleteFromFirestore,
  deleteMultipleAthletesFromFirestore,
  syncMatchToFirestore,
  syncAllMatchesToFirestore,
  deleteMatchFromFirestore,
  deleteMultipleMatchesFromFirestore,
  syncUserToFirestore,
  deleteUserFromFirestore,
  syncAuditLogToFirestore,
  clearAllAuditLogsFromFirestore,
} from './services/firestoreSync';
import { subscribeToSync, broadcastTournamentUpdate } from './services/notifications';
import { playScoreChime } from './services/sound';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal } from './components/AuthModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AthleteModal } from './components/AthleteModal';
import { AthleteExcelImportModal } from './components/AthleteExcelImportModal';
import { MatchExcelImportModal } from './components/MatchExcelImportModal';
import { SportModal } from './components/SportModal';
import { MatchEditModal } from './components/MatchEditModal';
import { MatchMinutesModal } from './components/MatchMinutesModal';
import { ReportsModal } from './components/ReportsModal';
import { AuditLogModal } from './components/AuditLogModal';

import { TabOverview } from './components/TabOverview';
import { TabTeams } from './components/TabTeams';
import { TabAthletes } from './components/TabAthletes';
import { TabMatches } from './components/TabMatches';
import { TabStandings } from './components/TabStandings';
import { TabReports } from './components/TabReports';
import { TabSettings } from './components/TabSettings';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  const [initialLoaded, setInitialLoaded] = useState(false);

  // App core state
  const [config, setConfig] = useState<TournamentConfig>(DEFAULT_CONFIG);
  const [sports, setSports] = useState<Sport[]>(INITIAL_SPORTS);
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USER_ACCOUNTS);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    return loadTournamentState().auditLogs || [];
  });

  // Navigation & session state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [athleteTeamFilter, setAthleteTeamFilter] = useState<string>('ALL');
  const [isDark, setIsDark] = useState<boolean>(false);
  // User session state: Preserves logged in status across reloads (defaults to DEFAULT_GUEST_USER if not logged in)
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('sport_tournament_active_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.role && parsed.role !== 'viewer') {
            return parsed;
          }
        }
      }
    } catch {
      // ignore parse error
    }
    return DEFAULT_GUEST_USER;
  });

  const handleLogin = (profile: UserProfile) => {
    setCurrentUser(profile);
    try {
      localStorage.setItem('sport_tournament_active_user', JSON.stringify(profile));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('sport_tournament_active_user');
      sessionStorage.removeItem('sport_tournament_active_user');
      logoutGoogle();
    } catch {
      // ignore
    }
    setCurrentUser(DEFAULT_GUEST_USER);
  };
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'error'>('connecting');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
  const [selectedMinutesMatch, setSelectedMinutesMatch] = useState<Match | null>(null);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isAthleteExcelImportOpen, setIsAthleteExcelImportOpen] = useState(false);
  const [athleteExcelImportTeam, setAthleteExcelImportTeam] = useState<string | undefined>(undefined);
  const [isMatchExcelImportOpen, setIsMatchExcelImportOpen] = useState(false);

  const handleOpenAthleteExcelImport = (teamIdOrName?: string) => {
    if (!currentUser || currentUser.role === 'viewer') {
      setIsAuthOpen(true);
      return;
    }
    setAthleteExcelImportTeam(teamIdOrName);
    setIsAthleteExcelImportOpen(true);
  };

  // Helper: Format author signature and timestamp
  const getAuthorStamp = useCallback(() => {
    const authorName = currentUser.displayName
      ? `${currentUser.displayName}${currentUser.title ? ` (${currentUser.title})` : ''}`
      : currentUser.username
      ? `${currentUser.username} (${currentUser.role})`
      : 'Ban Quản Trị';
    const now = new Date();
    const nowFormatted =
      now.toLocaleDateString('vi-VN') +
      ' ' +
      now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      authorName,
      nowFormatted,
      userRole: currentUser.role,
      userId: currentUser.username || currentUser.email || 'user',
    };
  }, [currentUser]);

  // Helper: Log audit trail to local state and Firestore
  const logAuditAction = useCallback(
    (
      action: AuditAction,
      entityType: AuditEntityType,
      entityName: string | undefined,
      description: string
    ) => {
      const { authorName, nowFormatted, userRole, userId } = getAuthorStamp();
      const newLog: AuditLog = {
        id: 'LOG_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: nowFormatted,
        userId,
        userName: authorName,
        userRole,
        action,
        entityType,
        entityName,
        description,
      };
      setAuditLogs((prev) => [newLog, ...prev]);
      syncAuditLogToFirestore(newLog);
      broadcastTournamentUpdate('AUDIT_LOG_ADDED', newLog);
      return { authorName, nowFormatted, newLog };
    },
    [getAuthorStamp]
  );

  // Helper: Enforce authentication on all management operations
  const checkAuthOrPrompt = useCallback(() => {
    if (!currentUser || currentUser.role === 'viewer') {
      setIsAuthOpen(true);
      return false;
    }
    return true;
  }, [currentUser]);

  // Handler: Clear all audit history (Admin only)
  const handleClearAllAuditLogs = async () => {
    if (!checkAuthOrPrompt()) return;
    if (currentUser.role !== 'admin') {
      alert('Chỉ Ban Quản Trị (Admin) mới có quyền xoá nhật ký thao tác!');
      return;
    }
    const logIds = auditLogs.map((l) => l.id);
    setAuditLogs([]);
    try {
      await clearAllAuditLogsFromFirestore(logIds);
    } catch (err) {
      console.error('Error clearing audit logs:', err);
    }
  };

  // 1. Initial State Load
  useEffect(() => {
    const loaded = loadTournamentState();
    setConfig(loaded.config);
    setSports(loaded.sports);
    setTeams(loaded.teams);
    setAthletes(loaded.athletes);
    setMatches(loaded.matches);
    setUsers(loaded.users);
    setNotifications(loaded.notifications);
    if (loaded.auditLogs) setAuditLogs(loaded.auditLogs);
    setInitialLoaded(true);

    // Dark mode check
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  // 2. Realtime Firestore synchronization across all devices
  useEffect(() => {
    testFirestoreConnection();

    const unsubscribeFirestore = subscribeToFirestore({
      onConfigChange: (remoteConfig) => {
        if (remoteConfig) setConfig((prev) => ({ ...prev, ...remoteConfig }));
      },
      onSportsChange: (remoteSports) => {
        if (remoteSports && remoteSports.length > 0) setSports(remoteSports);
      },
      onTeamsChange: (remoteTeams) => {
        if (remoteTeams) setTeams(remoteTeams);
      },
      onAthletesChange: (remoteAthletes) => {
        if (remoteAthletes) setAthletes(remoteAthletes);
      },
      onMatchesChange: (remoteMatches) => {
        if (remoteMatches) setMatches(remoteMatches);
      },
      onNotificationsChange: (remoteNotifs) => {
        if (remoteNotifs) setNotifications(remoteNotifs);
      },
      onUsersChange: (remoteUsers) => {
        if (remoteUsers && remoteUsers.length > 0) setUsers(remoteUsers);
      },
      onAuditLogsChange: (remoteLogs) => {
        if (remoteLogs) setAuditLogs(remoteLogs);
      },
      onSyncStatusChange: (status) => {
        setSyncStatus(status);
      },
    });

    return () => {
      unsubscribeFirestore();
    };
  }, []);

  // 2. Persist state to LocalStorage
  useEffect(() => {
    if (!initialLoaded) return;
    saveTournamentState({
      config,
      sports,
      teams,
      athletes,
      matches,
      users,
      notifications,
      auditLogs,
    });
  }, [config, sports, teams, athletes, matches, users, notifications, auditLogs, initialLoaded]);

  // 3. Multi-Tab Realtime Broadcast Synchronization
  useEffect(() => {
    const unsubscribe = subscribeToSync((msg) => {
      if (msg.type === 'TOURNAMENT_STATE_UPDATE') {
        const payload = msg.payload as {
          config?: TournamentConfig;
          sports?: Sport[];
          teams?: Team[];
          athletes?: Athlete[];
          matches?: Match[];
        };
        if (payload.config) setConfig(payload.config);
        if (payload.sports) setSports(payload.sports);
        if (payload.teams) setTeams(payload.teams);
        if (payload.athletes) setAthletes(payload.athletes);
        if (payload.matches) setMatches(payload.matches);
      } else if (msg.type === 'NOTIFICATION_ADDED') {
        const item = msg.payload as NotificationItem;
        setNotifications((prev) => [item, ...prev]);
      } else if (msg.type === 'AUDIT_LOG_ADDED') {
        const item = msg.payload as AuditLog;
        setAuditLogs((prev) => [item, ...prev]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 4. Handle Theme Color & Dark Mode Class on root document
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // 5. Automatic Standings Computation with Multi-Criteria Tie-Breakers
  const standingsByGroup = useMemo(() => {
    const currentSport = sports.find((s) => s.id === config.activeSportId) || sports[0];
    const ptsWin = currentSport?.ptsWin ?? 3;
    const ptsDraw = currentSport?.ptsDraw ?? 1;
    const ptsLoss = currentSport?.ptsLoss ?? 0;
    const isFootball = config.activeSportId === 'football';
    const maxSets = currentSport?.maxSets || 3;

    const result: Record<string, StandingItem[]> = {};

    // Group teams
    config.customGroups.forEach((grp) => {
      const groupTeams = teams.filter((t) => {
        if (t.group !== grp) return false;
        if (t.sportId && t.sportId !== config.activeSportId) return false;
        if (
          config.activeCategoryId &&
          config.activeCategoryId !== 'ALL' &&
          t.categoryId &&
          t.categoryId !== config.activeCategoryId
        ) {
          return false;
        }
        return true;
      });
      const teamStats: Record<string, StandingItem> = {};

      groupTeams.forEach((t) => {
        teamStats[t.id] = {
          team: t,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0,
          setsWon: 0,
          setsLost: 0,
          ptsFor: 0,
          ptsAgainst: 0,
          form: [],
        };
      });

      // Filter matches in this group that have scores recorded or finished
      const groupMatches = matches.filter((m) => {
        if (m.stage !== grp) return false;
        if (m.status !== 'FINISHED' && m.status !== 'LIVE') return false;
        if (m.sportId && m.sportId !== config.activeSportId) return false;
        if (
          config.activeCategoryId &&
          config.activeCategoryId !== 'ALL' &&
          m.categoryId &&
          m.categoryId !== config.activeCategoryId
        ) {
          return false;
        }
        return true;
      });

      groupMatches.forEach((m) => {
        const hStats = teamStats[m.home.id];
        const aStats = teamStats[m.away.id];
        if (!hStats || !aStats) return;

        hStats.played += 1;
        aStats.played += 1;

        if (isFootball) {
          const hGoals = m.scores.set1.home;
          const aGoals = m.scores.set1.away;
          hStats.ptsFor += hGoals;
          hStats.ptsAgainst += aGoals;
          aStats.ptsFor += aGoals;
          aStats.ptsAgainst += hGoals;

          if (hGoals > aGoals) {
            hStats.won += 1;
            hStats.points += ptsWin;
            hStats.form.push('W');
            aStats.lost += 1;
            aStats.points += ptsLoss;
            aStats.form.push('L');
          } else if (aGoals > hGoals) {
            aStats.won += 1;
            aStats.points += ptsWin;
            aStats.form.push('W');
            hStats.lost += 1;
            hStats.points += ptsLoss;
            hStats.form.push('L');
          } else {
            // Draw
            hStats.drawn += 1;
            aStats.drawn += 1;
            hStats.points += ptsDraw;
            aStats.points += ptsDraw;
            hStats.form.push('D');
            aStats.form.push('D');
          }
        } else {
          // Set-based sport (Volleyball, Badminton, Table Tennis)
          let hSets = 0;
          let aSets = 0;
          let hPointsTotal = 0;
          let aPointsTotal = 0;

          for (let s = 1; s <= maxSets; s++) {
            const sc = m.scores[`set${s}` as keyof typeof m.scores] as { home: number; away: number };
            if (sc && (sc.home > 0 || sc.away > 0)) {
              hPointsTotal += sc.home;
              aPointsTotal += sc.away;
              if (sc.home > sc.away) hSets++;
              else if (sc.away > sc.home) aSets++;
            }
          }

          hStats.setsWon += hSets;
          hStats.setsLost += aSets;
          hStats.ptsFor += hPointsTotal;
          hStats.ptsAgainst += aPointsTotal;

          aStats.setsWon += aSets;
          aStats.setsLost += hSets;
          aStats.ptsFor += aPointsTotal;
          aStats.ptsAgainst += hPointsTotal;

          if (hSets > aSets) {
            hStats.won += 1;
            hStats.points += ptsWin;
            hStats.form.push('W');
            aStats.lost += 1;
            aStats.points += ptsLoss;
            aStats.form.push('L');
          } else if (aSets > hSets) {
            aStats.won += 1;
            aStats.points += ptsWin;
            aStats.form.push('W');
            hStats.lost += 1;
            hStats.points += ptsLoss;
            hStats.form.push('L');
          } else if (hSets === aSets && (hSets > 0 || aSets > 0)) {
            hStats.drawn += 1;
            aStats.drawn += 1;
            hStats.points += ptsDraw;
            aStats.points += ptsDraw;
            hStats.form.push('D');
            aStats.form.push('D');
          }
        }
      });

      // Sort items based on enabled ranking criteria
      const sorted = Object.values(teamStats).sort((a, b) => {
        const criteria = config.rankingCriteria.filter((c) => c.enabled);

        for (const crit of criteria) {
          if (crit.id === 'points') {
            if (b.points !== a.points) return b.points - a.points;
          } else if (crit.id === 'set_difference') {
            const diffA = a.setsWon - a.setsLost;
            const diffB = b.setsWon - b.setsLost;
            if (diffB !== diffA) return diffB - diffA;
          } else if (crit.id === 'sets_won') {
            if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
          } else if (crit.id === 'point_difference') {
            const diffA = a.ptsFor - a.ptsAgainst;
            const diffB = b.ptsFor - b.ptsAgainst;
            if (diffB !== diffA) return diffB - diffA;
          } else if (crit.id === 'points_scored') {
            if (b.ptsFor !== a.ptsFor) return b.ptsFor - a.ptsFor;
          } else if (crit.id === 'sets_lost') {
            if (a.setsLost !== b.setsLost) return a.setsLost - b.setsLost; // fewer is better
          }
        }
        return a.team.name.localeCompare(b.team.name);
      });

      result[grp] = sorted;
    });

    return result;
  }, [config, sports, teams, matches]);

  // Handlers for Match Schedule Generator
  const handleGenerateSchedule = useCallback(
    (customTeamsList?: Team[], startDate?: string, startHour: number = 8, intervalMinutes: number = 45) => {
      if (!checkAuthOrPrompt()) return;

      const activeTeams = customTeamsList || teams;
      const effectiveTeams = [...activeTeams];

      // Strictly require at least 2 teams entered by BTC
      if (effectiveTeams.length < 2) {
        alert('Chưa có đủ danh sách đội thi đấu (yêu cầu tối thiểu 2 đội). Ban tổ chức vui lòng nhập danh sách các lớp/đội (10A1, 10A2...) tại mục "Danh Sách Đội" trước khi xếp lịch!');
        setActiveTab('teams');
        return;
      }

      // Collect all groups from both config.customGroups AND all effectiveTeams
      const groupSet = new Set<string>();
      (config.customGroups || []).forEach((g) => {
        if (g && g.trim()) groupSet.add(g.trim());
      });
      effectiveTeams.forEach((t) => {
        if (t.group && t.group.trim()) groupSet.add(t.group.trim());
      });
      const allDiscoveredGroups = Array.from(groupSet);
      const sortedGroups = sortGroupsByVenue(allDiscoveredGroups);

      // If new groups discovered, also persist to config
      const newlyDiscovered = allDiscoveredGroups.filter((g) => !(config.customGroups || []).includes(g));
      if (newlyDiscovered.length > 0) {
        const updatedConfig = { ...config, customGroups: allDiscoveredGroups };
        setConfig(updatedConfig);
        syncConfigToFirestore(updatedConfig);
      }

      const { authorName, nowFormatted } = getAuthorStamp();
      const newGeneratedMatches: Match[] = [];
      let matchCount = 1;
      const baseDate = startDate || new Date().toISOString().slice(0, 10);
      let minuteOffset = startHour * 60;

      sortedGroups.forEach((grp) => {
        const grpTeams = effectiveTeams.filter((t) => t.group === grp);
        if (grpTeams.length < 2) return;
        const venue = getVenueForGroup(grp);
        const venueLabel = venue === 'branch' ? 'Phân hiệu' : 'Điểm chính';

        // Round robin pairing
        for (let i = 0; i < grpTeams.length; i++) {
          for (let j = i + 1; j < grpTeams.length; j++) {
            const h = Math.floor(minuteOffset / 60);
            const m = minuteOffset % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            newGeneratedMatches.push({
              id: 'M_' + Date.now() + '_' + matchCount,
              sportId: config.activeSportId,
              categoryId: config.activeCategoryId && config.activeCategoryId !== 'ALL' ? config.activeCategoryId : undefined,
              code: `Trận ${matchCount.toString().padStart(2, '0')}`,
              stage: grp,
              pitch: matchCount % 2 === 1 ? `Sân 1 (${venueLabel})` : `Sân 2 (${venueLabel})`,
              date: baseDate,
              time: timeStr,
              home: grpTeams[i],
              away: grpTeams[j],
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
              notes: `Vòng bảng ${grp} (${venueLabel})`,
              createdBy: authorName,
              createdAt: nowFormatted,
              lastUpdatedBy: authorName,
              lastUpdatedAt: nowFormatted,
            });

            matchCount++;
            minuteOffset += intervalMinutes;
          }
        }
      });

      if (newGeneratedMatches.length === 0) {
        alert(
          `Không tìm thấy bảng/khối nào có từ 2 đội trở lên để xếp lịch vòng tròn (Tổng số đội: ${effectiveTeams.length}). Vui lòng kiểm tra lại cột Bảng/Khối của các đội!`
        );
        return;
      }

      setMatches(newGeneratedMatches);
      syncAllMatchesToFirestore(newGeneratedMatches);
      effectiveTeams.forEach((t) => syncTeamToFirestore(t));
      broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: newGeneratedMatches, teams: effectiveTeams });

      logAuditAction(
        'create',
        'schedule',
        `${newGeneratedMatches.length} trận đấu`,
        `Tự động xếp lịch thi đấu vòng tròn ${newGeneratedMatches.length} trận cho ${sortedGroups.length} bảng/khối`
      );
    },
    [teams, config, checkAuthOrPrompt, getAuthorStamp, logAuditAction]
  );

  const handleApplyMatchesBatch = (
    newGeneratedMatches: Match[],
    appendMode: boolean,
    noticeMsg: string
  ) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const stampedMatches = newGeneratedMatches.map((m) => ({
      ...m,
      createdBy: m.createdBy || authorName,
      createdAt: m.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    }));

    let finalMatches: Match[];
    if (appendMode) {
      finalMatches = [...matches, ...stampedMatches];
    } else {
      finalMatches = stampedMatches;
    }

    // Auto discover new groups and sync to config
    const matchGroups = stampedMatches.map((m) => m.stage).filter(Boolean);
    const newGroups = matchGroups.filter((g) => !(config.customGroups || []).includes(g));
    if (newGroups.length > 0) {
      const updatedConfig = {
        ...config,
        customGroups: Array.from(new Set([...config.customGroups, ...newGroups])),
      };
      setConfig(updatedConfig);
      syncConfigToFirestore(updatedConfig);
    }

    setMatches(finalMatches);
    syncAllMatchesToFirestore(finalMatches);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: finalMatches });
    playScoreChime();

    logAuditAction(
      'create',
      'schedule',
      `${stampedMatches.length} trận đấu`,
      noticeMsg || `Áp dụng danh sách ${stampedMatches.length} trận đấu vào lịch thi đấu (${appendMode ? 'nối thêm' : 'tạo mới'})`
    );
  };

  const handleReorderMatches = (reorderedMatches: Match[], noticeMsg?: string) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const stampedMatches = reorderedMatches.map((m) => ({
      ...m,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    }));

    setMatches(stampedMatches);
    syncAllMatchesToFirestore(stampedMatches);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: stampedMatches });
    playScoreChime();

    logAuditAction(
      'reorder',
      'schedule',
      `${reorderedMatches.length} trận đấu`,
      noticeMsg || `Đã thay đổi thứ tự các trận đấu trong lịch thi đấu`
    );
  };

  // Handlers for Match updates
  const handleUpdateMatch = (updated: Match) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const stampedMatch: Match = {
      ...updated,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    };

    const prevMatch = matches.find((m) => m.id === updated.id);
    const isScoreChanged =
      prevMatch && JSON.stringify(prevMatch.scores) !== JSON.stringify(updated.scores);

    setMatches((prev) => prev.map((m) => (m.id === stampedMatch.id ? stampedMatch : m)));
    syncMatchToFirestore(stampedMatch);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', {
      matches: matches.map((m) => (m.id === stampedMatch.id ? stampedMatch : m)),
    });

    logAuditAction(
      isScoreChanged ? 'score' : 'update',
      'match',
      `${stampedMatch.code} (${stampedMatch.home.name} vs ${stampedMatch.away.name})`,
      isScoreChanged
        ? `Cập nhật điểm số/tỉ số trận ${stampedMatch.code}`
        : `Chỉnh sửa thông tin lịch đấu/sân/thời gian trận ${stampedMatch.code}`
    );
  };

  const handleAddMatch = (newM: Match) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const stampedMatch: Match = {
      ...newM,
      createdBy: newM.createdBy || authorName,
      createdAt: newM.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    };

    setMatches((prev) => [...prev, stampedMatch]);
    syncMatchToFirestore(stampedMatch);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: [...matches, stampedMatch] });

    logAuditAction(
      'create',
      'match',
      `${stampedMatch.code} (${stampedMatch.home.name} vs ${stampedMatch.away.name})`,
      `Thêm thủ công trận đấu ${stampedMatch.code}`
    );
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!checkAuthOrPrompt()) return;

    const targetMatch = matches.find((m) => m.id === matchId);
    setMatches((prev) => {
      const next = prev.filter((m) => m.id !== matchId);
      broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: next });
      return next;
    });
    try {
      await deleteMatchFromFirestore(matchId);
    } catch (err) {
      console.error('Error deleting match from Firestore:', err);
    }

    logAuditAction(
      'delete',
      'match',
      targetMatch ? `${targetMatch.code} (${targetMatch.home.name} vs ${targetMatch.away.name})` : matchId,
      `Xoá trận đấu khỏi lịch thi đấu`
    );
  };

  const handleDeleteMultipleMatches = async (matchIds: string[]) => {
    if (!checkAuthOrPrompt()) return;
    if (!matchIds || matchIds.length === 0) return;

    const idSet = new Set(matchIds);
    setMatches((prev) => {
      const next = prev.filter((m) => !idSet.has(m.id));
      broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: next });
      return next;
    });
    try {
      await deleteMultipleMatchesFromFirestore(matchIds);
    } catch (err) {
      console.error('Error bulk deleting matches from Firestore:', err);
    }

    logAuditAction(
      'bulk_delete',
      'match',
      `${matchIds.length} trận đấu`,
      `Xoá hàng loạt ${matchIds.length} trận đấu khỏi lịch thi đấu`
    );
  };

  const handleImportMatchesFromExcel = (
    newMatches: Match[],
    newTeamsToCreate: Team[],
    replaceExisting: boolean,
    noticeMsg: string
  ) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();

    // 1. If any new teams were auto-discovered in the Excel schedule, register them with author stamp
    if (newTeamsToCreate && newTeamsToCreate.length > 0) {
      const stampedNewTeams = newTeamsToCreate.map((t) => ({
        ...t,
        createdBy: t.createdBy || authorName,
        createdAt: t.createdAt || nowFormatted,
        lastUpdatedBy: authorName,
        lastUpdatedAt: nowFormatted,
      }));

      setTeams((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const existingNames = new Set(prev.map((t) => t.name.toLowerCase()));
        const teamsToAdd = stampedNewTeams.filter(
          (t) => !existingIds.has(t.id) && !existingNames.has(t.name.toLowerCase())
        );
        const merged = [...prev, ...teamsToAdd];
        if (teamsToAdd.length > 0) {
          syncMultipleTeamsToFirestore(teamsToAdd);
        }
        return merged;
      });
    }

    // 2. Set matches with author stamp (replace or append)
    const stampedMatches = newMatches.map((m) => ({
      ...m,
      createdBy: m.createdBy || authorName,
      createdAt: m.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    }));

    setMatches((prev) => {
      let finalMatches: Match[];
      if (replaceExisting) {
        // Keep matches from other sports, replace matches of active sport
        const otherSportsMatches = prev.filter(
          (m) => m.sportId && m.sportId !== config.activeSportId
        );
        finalMatches = [...otherSportsMatches, ...stampedMatches];
      } else {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueNew = stampedMatches.filter((m) => !existingIds.has(m.id));
        finalMatches = [...prev, ...uniqueNew];
      }
      syncAllMatchesToFirestore(finalMatches);
      broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: finalMatches });
      return finalMatches;
    });

    logAuditAction(
      'import',
      'schedule',
      `${stampedMatches.length} trận đấu`,
      noticeMsg || `Nhập ${stampedMatches.length} trận đấu từ file Excel (${replaceExisting ? 'thay thế' : 'nối tiếp'})`
    );

    // Add smart notification
    const newNotif: NotificationItem = {
      id: 'N_' + Date.now(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      title: 'Nhập Lịch Thi Đấu Từ Excel',
      message: noticeMsg,
      type: 'system',
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handlers for Athletes & Teams
  const handleSaveAthlete = async (ath: Athlete) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const isExisting = athletes.some((a) => a.id === ath.id);
    const stampedAthlete: Athlete = {
      ...ath,
      createdBy: ath.createdBy || authorName,
      createdAt: ath.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    };

    setAthletes((prev) => {
      const idx = prev.findIndex((a) => a.id === stampedAthlete.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = stampedAthlete;
        return next;
      }
      return [stampedAthlete, ...prev];
    });

    try {
      await syncAthleteToFirestore(stampedAthlete);
      const notif: NotificationItem = {
        id: 'N_' + Date.now(),
        type: 'system',
        title: 'Đã lưu vận động viên vào CSDL',
        message: `VĐV ${stampedAthlete.name} (#${stampedAthlete.jerseyNumber} - ${stampedAthlete.teamName}) đã được đồng bộ vào cơ sở dữ liệu đám mây.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
    } catch (err) {
      console.error('Lỗi khi lưu VĐV vào Firestore:', err);
    }

    broadcastTournamentUpdate('ATHLETES_UPDATED', { athleteId: stampedAthlete.id });

    logAuditAction(
      isExisting ? 'update' : 'create',
      'athlete',
      `${stampedAthlete.name} (#${stampedAthlete.jerseyNumber} - ${stampedAthlete.teamName})`,
      isExisting
        ? `Cập nhật thông tin VĐV ${stampedAthlete.name} (Đội ${stampedAthlete.teamName})`
        : `Đăng ký mới VĐV ${stampedAthlete.name} vào đội ${stampedAthlete.teamName}`
    );
  };

  const handleDeleteAthlete = (athleteId: string) => {
    if (!checkAuthOrPrompt()) return;

    const targetAth = athletes.find((a) => a.id === athleteId);
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ vận động viên này?')) return;
    setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    deleteAthleteFromFirestore(athleteId);
    broadcastTournamentUpdate('ATHLETES_UPDATED', { deletedId: athleteId });

    logAuditAction(
      'delete',
      'athlete',
      targetAth ? `${targetAth.name} (#${targetAth.jerseyNumber} - ${targetAth.teamName})` : athleteId,
      `Xoá hồ sơ vận động viên khỏi hệ thống`
    );
  };

  const handleDeleteMultipleAthletes = (athleteIds: string[]) => {
    if (!checkAuthOrPrompt()) return;
    if (athleteIds.length === 0) return;

    setAthletes((prev) => prev.filter((a) => !athleteIds.includes(a.id)));
    deleteMultipleAthletesFromFirestore(athleteIds);
    broadcastTournamentUpdate('ATHLETES_UPDATED', { deletedCount: athleteIds.length });

    logAuditAction(
      'bulk_delete',
      'athlete',
      `${athleteIds.length} VĐV`,
      `Xoá hàng loạt ${athleteIds.length} vận động viên khỏi hệ thống`
    );
  };

  const handleApproveAthlete = (athleteId: string, status: Athlete['status']) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const targetAth = athletes.find((a) => a.id === athleteId);

    setAthletes((prev) =>
      prev.map((a) => {
        if (a.id === athleteId) {
          const updated: Athlete = {
            ...a,
            status,
            lastUpdatedBy: authorName,
            lastUpdatedAt: nowFormatted,
          };
          syncAthleteToFirestore(updated);
          return updated;
        }
        return a;
      })
    );
    broadcastTournamentUpdate('ATHLETES_UPDATED', { athleteId, status });

    logAuditAction(
      'approve',
      'athlete',
      targetAth ? `${targetAth.name} (${targetAth.teamName})` : athleteId,
      `Duyệt hồ sơ VĐV sang trạng thái "${status === 'approved' ? 'Đã duyệt' : status === 'needs_revision' ? 'Yêu cầu sửa' : 'Chờ duyệt'}"`
    );
  };

  const handleApproveMultipleAthletes = (athleteIds: string[], status: Athlete['status']) => {
    if (!checkAuthOrPrompt()) return;
    if (athleteIds.length === 0) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const idSet = new Set(athleteIds);

    setAthletes((prev) =>
      prev.map((a) => {
        if (idSet.has(a.id)) {
          const updated: Athlete = {
            ...a,
            status,
            lastUpdatedBy: authorName,
            lastUpdatedAt: nowFormatted,
          };
          syncAthleteToFirestore(updated);
          return updated;
        }
        return a;
      })
    );
    broadcastTournamentUpdate('ATHLETES_UPDATED', { updatedCount: athleteIds.length, status });

    logAuditAction(
      'approve',
      'athlete',
      `${athleteIds.length} VĐV`,
      `Duyệt hàng loạt ${athleteIds.length} VĐV sang trạng thái "${status === 'approved' ? 'Đã duyệt' : status === 'needs_revision' ? 'Yêu cầu sửa' : 'Chờ duyệt'}"`
    );
  };

  const handleClearAllAthletes = async () => {
    if (!checkAuthOrPrompt()) return;
    if (athletes.length === 0) return;

    const oldIds = athletes.map((a) => a.id);
    setAthletes([]);
    try {
      await deleteMultipleAthletesFromFirestore(oldIds);
    } catch (err) {
      console.error('Error wiping athletes:', err);
    }
    broadcastTournamentUpdate('ATHLETES_UPDATED', { clearedCount: oldIds.length });

    logAuditAction(
      'clear',
      'athlete',
      `Toàn bộ ${oldIds.length} VĐV`,
      `Đã làm sạch toàn bộ danh sách vận động viên khỏi hệ thống và CSDL đám mây`
    );

    const notif: NotificationItem = {
      id: 'N_' + Date.now(),
      type: 'system',
      title: 'Đã làm sạch dữ liệu vận động viên',
      message: `Đã xóa sạch toàn bộ ${oldIds.length} vận động viên khỏi hệ thống và CSDL đám mây.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleClearAllTeams = async () => {
    if (!checkAuthOrPrompt()) return;
    if (teams.length === 0) return;

    const teamIds = teams.map((t) => t.id);
    const athleteIds = athletes.map((a) => a.id);
    setTeams([]);
    setAthletes([]);
    try {
      await deleteMultipleTeamsFromFirestore(teamIds, true, athletes);
      if (athleteIds.length > 0) {
        await deleteMultipleAthletesFromFirestore(athleteIds);
      }
    } catch (err) {
      console.error('Error wiping teams & athletes:', err);
    }
    broadcastTournamentUpdate('TEAMS_UPDATED', { clearedCount: teamIds.length });

    logAuditAction(
      'clear',
      'team',
      `Toàn bộ ${teamIds.length} đội`,
      `Đã làm sạch toàn bộ danh sách đội bóng và các VĐV liên quan`
    );

    const notif: NotificationItem = {
      id: 'N_' + Date.now(),
      type: 'system',
      title: 'Đã làm sạch dữ liệu đội bóng',
      message: `Đã xóa sạch toàn bộ ${teamIds.length} đội bóng và các VĐV liên quan khỏi hệ thống và CSDL đám mây.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleClearAllMatches = async () => {
    if (!checkAuthOrPrompt()) return;

    const targetMatches = matches.filter(
      (m) => !m.sportId || m.sportId === config.activeSportId
    );
    if (targetMatches.length === 0) return;
    const targetIds = targetMatches.map((m) => m.id);
    const remainingMatches = matches.filter(
      (m) => m.sportId && m.sportId !== config.activeSportId
    );
    setMatches(remainingMatches);
    try {
      await deleteMultipleMatchesFromFirestore(targetIds);
    } catch (err) {
      console.error('Error wiping matches:', err);
    }
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: remainingMatches });

    logAuditAction(
      'clear',
      'schedule',
      `Toàn bộ ${targetIds.length} trận đấu`,
      `Đã làm sạch toàn bộ lịch thi đấu của môn hiện tại`
    );

    const notif: NotificationItem = {
      id: 'N_' + Date.now(),
      type: 'system',
      title: 'Đã làm sạch lịch thi đấu',
      message: `Đã xóa sạch toàn bộ ${targetIds.length} trận đấu của môn hiện tại khỏi lịch thi đấu.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleImportMultipleAthletes = async (
    incomingAthletes: Athlete[],
    cleanMode: 'none' | 'all' | 'target_teams' = 'none'
  ) => {
    if (!checkAuthOrPrompt()) return;
    if (incomingAthletes.length === 0) return;

    const { authorName, nowFormatted } = getAuthorStamp();

    // 1. Identify any new teams or groups present in the incoming athletes
    const existingTeamNames = new Set(teams.map((t) => t.name.toLowerCase()));
    const existingTeamIds = new Set(teams.map((t) => t.id));
    const newTeamsToCreate: Team[] = [];
    const discoveredGroups = new Set<string>();

    incomingAthletes.forEach((ath) => {
      const tName = ath.teamName?.trim();
      if (tName && !existingTeamNames.has(tName.toLowerCase()) && !existingTeamIds.has(ath.teamId)) {
        existingTeamNames.add(tName.toLowerCase());
        existingTeamIds.add(ath.teamId);

        let group = ath.group || 'Khối 10';
        if (!group) {
          const gMatch = tName.match(/^(10|11|12)/);
          group = gMatch ? `Khối ${gMatch[1]}` : 'Khối 10';
        }
        discoveredGroups.add(group);

        newTeamsToCreate.push({
          id: ath.teamId || `T_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: tName,
          group,
          gender: group.toLowerCase().includes('nữ') ? 'female' : 'male',
          color: group.toLowerCase().includes('nữ') ? '#e11d48' : '#0284c7',
          coachName: 'Giáo viên phụ trách',
          contactPhone: '',
          createdBy: authorName,
          createdAt: nowFormatted,
          lastUpdatedBy: authorName,
          lastUpdatedAt: nowFormatted,
        });
      }
    });

    if (newTeamsToCreate.length > 0) {
      setTeams((prev) => [...prev, ...newTeamsToCreate]);
      syncMultipleTeamsToFirestore(newTeamsToCreate);
      broadcastTournamentUpdate('TEAMS_UPDATED', { importedCount: newTeamsToCreate.length });

      // Update groups in config if new groups found
      const newGroups = Array.from(discoveredGroups).filter((g) => !config.customGroups.includes(g));
      if (newGroups.length > 0) {
        const updatedConfig = { ...config, customGroups: [...config.customGroups, ...newGroups] };
        setConfig(updatedConfig);
        syncConfigToFirestore(updatedConfig);
      }
    }

    // Stamp incoming athletes with author signature
    const stampedIncomingAthletes = incomingAthletes.map((a) => ({
      ...a,
      createdBy: a.createdBy || authorName,
      createdAt: a.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    }));

    // 2. Handle clean modes before saving incoming athletes
    let finalAthletes: Athlete[];
    if (cleanMode === 'all') {
      const oldIds = athletes.map((a) => a.id);
      if (oldIds.length > 0) {
        deleteMultipleAthletesFromFirestore(oldIds).catch((err) =>
          console.error('Lỗi khi xóa VĐV cũ:', err)
        );
      }
      finalAthletes = stampedIncomingAthletes;
    } else if (cleanMode === 'target_teams') {
      const importedTeamNames = new Set(
        stampedIncomingAthletes.map((a) => (a.teamName || '').trim().toLowerCase())
      );
      const importedTeamIds = new Set(stampedIncomingAthletes.map((a) => a.teamId));

      const athletesToDelete = athletes.filter(
        (a) =>
          importedTeamIds.has(a.teamId) ||
          importedTeamNames.has((a.teamName || '').trim().toLowerCase())
      );
      const toDeleteIds = athletesToDelete.map((a) => a.id);
      if (toDeleteIds.length > 0) {
        deleteMultipleAthletesFromFirestore(toDeleteIds).catch((err) =>
          console.error('Lỗi khi xóa VĐV của các đội nhập mới:', err)
        );
      }

      const toDeleteSet = new Set(toDeleteIds);
      const remaining = athletes.filter((a) => !toDeleteSet.has(a.id));
      finalAthletes = [...remaining, ...stampedIncomingAthletes];
    } else {
      // Append / Merge
      const existingMap = new Map(athletes.map((a) => [a.id, a]));
      stampedIncomingAthletes.forEach((a) => existingMap.set(a.id, a));
      finalAthletes = Array.from(existingMap.values());
    }

    setAthletes(finalAthletes);
    syncMultipleAthletesToFirestore(stampedIncomingAthletes);
    broadcastTournamentUpdate('ATHLETES_UPDATED', { importedCount: stampedIncomingAthletes.length });

    logAuditAction(
      'import',
      'athlete',
      `${stampedIncomingAthletes.length} VĐV`,
      `Nhập danh sách ${stampedIncomingAthletes.length} VĐV từ file Excel (chế độ: ${
        cleanMode === 'all' ? 'làm sạch tất cả' : cleanMode === 'target_teams' ? 'làm sạch đội liên quan' : 'nối tiếp'
      })`
    );

    const cleanModeLabel =
      cleanMode === 'all'
        ? ' (đã làm sạch toàn bộ VĐV cũ)'
        : cleanMode === 'target_teams'
        ? ' (đã làm sạch VĐV cũ của các đội liên quan)'
        : '';

    const notif: NotificationItem = {
      id: 'N_' + Date.now(),
      type: 'system',
      title: 'Nhập danh sách VĐV từ Excel thành công',
      message: `Đã nhập thành công ${stampedIncomingAthletes.length} vận động viên vào các đội${cleanModeLabel}${
        newTeamsToCreate.length > 0 ? ` (tự động tạo ${newTeamsToCreate.length} đội mới)` : ''
      }.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleSaveTeam = async (team: Team) => {
    if (!checkAuthOrPrompt()) return;

    const { authorName, nowFormatted } = getAuthorStamp();
    const isExisting = teams.some((t) => t.id === team.id);
    const stampedTeam: Team = {
      ...team,
      createdBy: team.createdBy || authorName,
      createdAt: team.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    };

    setTeams((prev) => {
      const idx = prev.findIndex((t) => t.id === stampedTeam.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = stampedTeam;
        return next;
      }
      return [...prev, stampedTeam];
    });

    // Check if new group
    if (stampedTeam.group && !config.customGroups.includes(stampedTeam.group)) {
      const updatedConfig = { ...config, customGroups: [...config.customGroups, stampedTeam.group] };
      setConfig(updatedConfig);
      syncConfigToFirestore(updatedConfig);
    }

    try {
      await syncTeamToFirestore(stampedTeam);
      const notif: NotificationItem = {
        id: 'N_' + Date.now(),
        type: 'system',
        title: 'Đã lưu đội vào CSDL',
        message: `Đội "${stampedTeam.name}" (${stampedTeam.group}) đã được đồng bộ vào cơ sở dữ liệu đám mây.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
    } catch (err) {
      console.error('Lỗi khi lưu đội vào Firestore:', err);
    }

    broadcastTournamentUpdate('TEAMS_UPDATED', { teamId: stampedTeam.id });

    logAuditAction(
      isExisting ? 'update' : 'create',
      'team',
      stampedTeam.name,
      isExisting ? `Cập nhật thông tin đội ${stampedTeam.name} (${stampedTeam.group})` : `Thêm mới đội ${stampedTeam.name} vào ${stampedTeam.group}`
    );
  };

  const handleImportMultipleTeams = async (
    incomingTeams: Team[],
    newGroupsToAdd?: string[],
    cleanBeforeImport = false
  ) => {
    if (!checkAuthOrPrompt()) return;
    if (incomingTeams.length === 0) return;

    const { authorName, nowFormatted } = getAuthorStamp();

    // 1. Update config if new groups discovered in Excel
    if (newGroupsToAdd && newGroupsToAdd.length > 0) {
      const updatedGroups = Array.from(new Set([...config.customGroups, ...newGroupsToAdd]));
      const newConfig = { ...config, customGroups: updatedGroups };
      setConfig(newConfig);
      syncConfigToFirestore(newConfig);
    }

    const stampedTeams = incomingTeams.map((t) => ({
      ...t,
      createdBy: t.createdBy || authorName,
      createdAt: t.createdAt || nowFormatted,
      lastUpdatedBy: authorName,
      lastUpdatedAt: nowFormatted,
    }));

    if (cleanBeforeImport) {
      // Wipe old teams and old athletes from Firestore
      const oldTeamIds = teams.map((t) => t.id);
      const oldAthleteIds = athletes.map((a) => a.id);
      if (oldTeamIds.length > 0) {
        deleteMultipleTeamsFromFirestore(oldTeamIds, true, athletes).catch((err) =>
          console.error('Lỗi khi xóa đội cũ:', err)
        );
      }
      if (oldAthleteIds.length > 0) {
        deleteMultipleAthletesFromFirestore(oldAthleteIds).catch((err) =>
          console.error('Lỗi khi xóa VĐV cũ:', err)
        );
      }
      setAthletes([]);
      setTeams(stampedTeams);
    } else {
      // Merge teams into state
      setTeams((prev) => {
        const next = [...prev];
        stampedTeams.forEach((newT) => {
          const existingIdx = next.findIndex(
            (t) =>
              t.id === newT.id ||
              (t.name.toLowerCase() === newT.name.toLowerCase() &&
                t.group === newT.group &&
                (t.gender || 'male') === (newT.gender || 'male'))
          );
          if (existingIdx >= 0) {
            next[existingIdx] = { ...next[existingIdx], ...newT };
          } else {
            next.push(newT);
          }
        });
        return next;
      });
    }

    // 3. Batch sync to Firestore
    syncMultipleTeamsToFirestore(stampedTeams);

    // 4. Realtime broadcast notification
    broadcastTournamentUpdate('TEAMS_UPDATED', { importedCount: stampedTeams.length });

    logAuditAction(
      'import',
      'team',
      `${stampedTeams.length} đội`,
      cleanBeforeImport
        ? `Làm sạch dữ liệu và nhập mới ${stampedTeams.length} đội từ file Excel`
        : `Nhập bổ sung ${stampedTeams.length} đội từ file Excel`
    );

    // 5. In-app notification
    const maleCount = stampedTeams.filter((t) => t.gender === 'male').length;
    const femaleCount = stampedTeams.filter((t) => t.gender === 'female').length;
    const notif: NotificationItem = {
      id: 'N_' + Date.now(),
      type: 'system',
      title: 'Nhập danh sách đội từ Excel thành công',
      message: `Đã nhập thành công ${stampedTeams.length} đội (${maleCount} đội Nam, ${femaleCount} đội Nữ) theo bảng/khối${
        cleanBeforeImport ? ' (đã làm sạch toàn bộ danh sách đội và VĐV cũ)' : ''
      }.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!checkAuthOrPrompt()) return;

    const targetTeam = teams.find((t) => t.id === teamId);
    if (!confirm('Bạn có chắc muốn xóa đội này cùng các VĐV liên quan?')) return;
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setAthletes((prev) => prev.filter((a) => a.teamId !== teamId));
    deleteTeamFromFirestore(teamId, true, athletes);
    broadcastTournamentUpdate('TEAMS_UPDATED', { deletedTeamId: teamId });

    logAuditAction(
      'delete',
      'team',
      targetTeam?.name || teamId,
      `Xoá đội ${targetTeam?.name || teamId} và các vận động viên liên quan`
    );
  };

  const handleDeleteMultipleTeams = (teamIds: string[], deleteAthletesToo = true) => {
    if (!checkAuthOrPrompt()) return;
    if (teamIds.length === 0) return;

    setTeams((prev) => prev.filter((t) => !teamIds.includes(t.id)));
    if (deleteAthletesToo) {
      setAthletes((prev) => prev.filter((a) => !teamIds.includes(a.teamId)));
    }
    deleteMultipleTeamsFromFirestore(teamIds, deleteAthletesToo, athletes);
    broadcastTournamentUpdate('TEAMS_UPDATED', { deletedCount: teamIds.length });

    logAuditAction(
      'bulk_delete',
      'team',
      `${teamIds.length} đội`,
      `Xoá hàng loạt ${teamIds.length} đội bóng`
    );
  };

  // Handlers for Sports
  const handleSaveSport = (sport: Sport) => {
    setSports((prev) => {
      const idx = prev.findIndex((s) => s.id === sport.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = sport;
        return next;
      }
      return [...prev, sport];
    });
    syncSportToFirestore(sport);
  };

  const handleDeleteSport = (sportId: string) => {
    if (sports.length <= 1) {
      alert('Phải giữ lại ít nhất 1 môn thi đấu!');
      return;
    }
    if (!confirm('Bạn có chắc muốn xóa môn thi đấu này?')) return;
    setSports((prev) => prev.filter((s) => s.id !== sportId));
    if (config.activeSportId === sportId) {
      const remaining = sports.filter((s) => s.id !== sportId);
      const nextConf = { ...config, activeSportId: remaining[0].id };
      setConfig(nextConf);
      syncConfigToFirestore(nextConf);
    }
  };

  const handleUpdateConfig = (newCfg: TournamentConfig | ((prev: TournamentConfig) => TournamentConfig)) => {
    setConfig((prev) => {
      const next = typeof newCfg === 'function' ? newCfg(prev) : newCfg;
      syncConfigToFirestore(next);
      return next;
    });
  };

  // Handlers for Users
  const handleSaveUser = (userAcc: UserAccount) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === userAcc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = userAcc;
        return next;
      }
      return [...prev, userAcc];
    });
    syncUserToFirestore(userAcc);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteUserFromFirestore(userId);
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    if (!confirm('Bạn có chắc chắn muốn làm trống dữ liệu thi đấu (xóa sạch VĐV, Đội và Lịch đấu)?')) return;
    setTeams([]);
    setAthletes([]);
    setMatches([]);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { teams: [], athletes: [], matches: [] });
    alert('Đã xóa dữ liệu thành công!');
  };

  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  const handleTabChange = useCallback((tabId: string) => {
    if (tabId === 'reports') {
      setIsReportsModalOpen(true);
      return;
    }
    setActiveTab(tabId);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Offline Toast Banner */}
      <OfflineIndicator />

      {/* Primary Sticky Header */}
      <Header
        config={config}
        user={currentUser}
        sports={sports}
        onSelectSport={(sportId) => {
          handleUpdateConfig((prev) => ({
            ...prev,
            activeSportId: sportId,
            activeCategoryId: 'ALL',
          }));
        }}
        onSelectCategory={(catId) => {
          handleUpdateConfig((prev) => ({
            ...prev,
            activeCategoryId: catId,
          }));
        }}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenReports={() => setIsReportsModalOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAuditLogs={() => setIsAuditLogOpen(true)}
        auditLogsCount={auditLogs.length}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        unreadNotificationsCount={unreadNotifCount}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onThemeColorChange={(col) => {
          handleUpdateConfig((prev) => ({ ...prev, themeColor: col }));
        }}
        syncStatus={syncStatus}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-12">
        {activeTab === 'overview' && (
          <TabOverview
            config={config}
            sports={sports}
            teams={teams}
            athletes={athletes}
            matches={matches}
            onNavigateTab={setActiveTab}
            onOpenMatchMinutes={(m) => {
              setSelectedMinutesMatch(m);
              setIsMinutesModalOpen(true);
            }}
          />
        )}

        {activeTab === 'teams' && (
          <TabTeams
            teams={teams}
            athletes={athletes}
            config={config}
            user={currentUser}
            onOpenLogin={() => setIsAuthOpen(true)}
            onSaveTeam={handleSaveTeam}
            onImportMultipleTeams={handleImportMultipleTeams}
            onClearAllTeams={handleClearAllTeams}
            onDeleteTeam={handleDeleteTeam}
            onDeleteMultipleTeams={handleDeleteMultipleTeams}
            onNavigateToAthletes={(teamNameOrId) => {
              if (teamNameOrId) {
                const found = teams.find(
                  (t) => t.name.toLowerCase() === teamNameOrId.toLowerCase() || t.id === teamNameOrId
                );
                setAthleteTeamFilter(found ? found.id : teamNameOrId);
              } else {
                setAthleteTeamFilter('ALL');
              }
              setActiveTab('athletes');
            }}
            onOpenAthleteExcelImport={handleOpenAthleteExcelImport}
            onAddAthleteForTeam={(team) => {
              setEditingAthlete({
                id: '',
                name: '',
                teamId: team.id,
                teamName: team.name,
                group: team.group,
                jerseyNumber: 10,
                position: 'Tiền đạo / Chủ công',
                dateOfBirth: '2010-01-01',
                nationalIdEncrypted: '',
                phoneEncrypted: '',
                status: currentUser.role === 'admin' ? 'approved' : 'pending',
                registeredAt: new Date().toISOString().slice(0, 10),
                goalsOrPoints: 0,
                yellowCards: 0,
                redCards: 0,
                mvpCount: 0,
              });
              setIsAthleteModalOpen(true);
            }}
          />
        )}

        {activeTab === 'athletes' && (
          <TabAthletes
            athletes={athletes}
            teams={teams}
            config={config}
            user={currentUser}
            initialTeamFilter={athleteTeamFilter}
            onNavigateToTeams={() => setActiveTab('teams')}
            onOpenLogin={() => setIsAuthOpen(true)}
            onOpenAthleteExcelImport={handleOpenAthleteExcelImport}
            onOpenAddAthlete={() => {
              setEditingAthlete(null);
              setIsAthleteModalOpen(true);
            }}
            onOpenEditAthlete={(ath) => {
              setEditingAthlete(ath);
              setIsAthleteModalOpen(true);
            }}
            onDeleteAthlete={handleDeleteAthlete}
            onDeleteMultipleAthletes={handleDeleteMultipleAthletes}
            onApproveAthlete={handleApproveAthlete}
            onApproveMultipleAthletes={handleApproveMultipleAthletes}
            onImportMultipleAthletes={handleImportMultipleAthletes}
            onAddAthleteForTeam={(team) => {
              setEditingAthlete({
                id: '',
                name: '',
                teamId: team.id,
                teamName: team.name,
                group: team.group,
                jerseyNumber: 10,
                position: 'Tiền đạo / Chủ công',
                dateOfBirth: '2010-01-01',
                nationalIdEncrypted: '',
                phoneEncrypted: '',
                status: currentUser.role === 'admin' ? 'approved' : 'pending',
                registeredAt: new Date().toISOString().slice(0, 10),
                goalsOrPoints: 0,
                yellowCards: 0,
                redCards: 0,
                mvpCount: 0,
              });
              setIsAthleteModalOpen(true);
            }}
          />
        )}

        {activeTab === 'matches' && (
          <ErrorBoundary fallbackTitle="Đã xảy ra lỗi khi tải Lịch thi đấu" onReset={() => setActiveTab('matches')}>
            <TabMatches
              matches={matches}
              teams={teams}
              sports={sports}
              config={config}
              user={currentUser}
              standingsByGroup={standingsByGroup}
              onNavigateTab={setActiveTab}
              onOpenLogin={() => setIsAuthOpen(true)}
              onUpdateMatch={handleUpdateMatch}
              onAddMatch={handleAddMatch}
              onDeleteMatch={handleDeleteMatch}
              onDeleteMultipleMatches={handleDeleteMultipleMatches}
              onOpenMatchExcelImport={() => setIsMatchExcelImportOpen(true)}
              onGenerateSchedule={handleGenerateSchedule}
              onApplyMatchesBatch={handleApplyMatchesBatch}
              onReorderMatches={handleReorderMatches}
              onOpenMinutes={(m) => {
                setSelectedMinutesMatch(m);
                setIsMinutesModalOpen(true);
              }}
              onOpenEditMatch={(m) => {
                setEditingMatch(m);
                setIsMatchEditModalOpen(true);
              }}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'standings' && (
          <TabStandings
            standingsByGroup={standingsByGroup}
            config={config}
            user={currentUser}
            onUpdateRankingCriteria={(crit) => {
              handleUpdateConfig((prev) => ({ ...prev, rankingCriteria: crit }));
            }}
          />
        )}

        {activeTab === 'reports' && (
          <TabReports
            config={config}
            teams={teams}
            athletes={athletes}
            matches={matches}
            standingsByGroup={standingsByGroup}
            onOpenReportsModal={() => setIsReportsModalOpen(true)}
            onRestoreState={(restored) => {
              const res = restored as {
                config?: TournamentConfig;
                teams?: Team[];
                athletes?: Athlete[];
                matches?: Match[];
              };
              if (res.config) {
                setConfig(res.config);
                syncConfigToFirestore(res.config);
              }
              if (res.teams) {
                setTeams(res.teams);
                res.teams.forEach((t) => syncTeamToFirestore(t));
              }
              if (res.athletes) {
                setAthletes(res.athletes);
                res.athletes.forEach((a) => syncAthleteToFirestore(a));
              }
              if (res.matches) {
                setMatches(res.matches);
                syncAllMatchesToFirestore(res.matches);
              }
            }}
          />
        )}

        {activeTab === 'settings' && (
          <TabSettings
            config={config}
            sports={sports}
            users={users}
            currentUser={currentUser}
            onUpdateConfig={handleUpdateConfig}
            onOpenAddSport={() => {
              setEditingSport(null);
              setIsSportModalOpen(true);
            }}
            onOpenEditSport={(sp) => {
              setEditingSport(sp);
              setIsSportModalOpen(true);
            }}
            onDeleteSport={handleDeleteSport}
            onSaveUser={handleSaveUser}
            onDeleteUser={handleDeleteUser}
            onResetDemoData={handleResetDemoData}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenReports={() => setIsReportsModalOpen(true)}
      />

      {/* MODALS */}
      {/* 1. Auth & Role Switcher Modal */}
      {isAuthOpen && (
        <AuthModal
          currentUser={currentUser}
          users={users}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onClose={() => setIsAuthOpen(false)}
          onSaveUser={handleSaveUser}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* 2. Notification Center Drawer */}
      <NotificationDrawer
        notifications={notifications}
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearAll={() => setNotifications([])}
        onAddNotification={(item) => setNotifications((prev) => [item, ...prev])}
      />

      {/* 3. Athlete Registration & Edit Modal */}
      <AthleteModal
        athlete={editingAthlete}
        teams={teams}
        user={currentUser}
        isOpen={isAthleteModalOpen}
        onClose={() => setIsAthleteModalOpen(false)}
        onSave={handleSaveAthlete}
        onOpenAthleteExcelImport={handleOpenAthleteExcelImport}
      />

      {/* 4. Sport Discipline Modal */}
      <SportModal
        sport={editingSport}
        isOpen={isSportModalOpen}
        onClose={() => setIsSportModalOpen(false)}
        onSave={handleSaveSport}
      />

      {/* 5. Match Schedule Edit Modal */}
      <MatchEditModal
        match={editingMatch}
        teams={teams}
        config={config}
        isOpen={isMatchEditModalOpen}
        onClose={() => setIsMatchEditModalOpen(false)}
        onSave={handleUpdateMatch}
        onDelete={handleDeleteMatch}
      />

      {/* 6. Administrative Match Minutes Modal */}
      <MatchMinutesModal
        match={selectedMinutesMatch}
        config={config}
        isOpen={isMinutesModalOpen}
        onClose={() => setIsMinutesModalOpen(false)}
      />

      {/* 7. Consolidated Reports & Export Modal (Báo Cáo, In Ấn & Xuất File Toàn Diện) */}
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        config={config}
        teams={teams}
        athletes={athletes}
        matches={matches}
        standingsByGroup={standingsByGroup}
        onRestoreState={(restored) => {
          const res = restored as {
            config?: TournamentConfig;
            teams?: Team[];
            athletes?: Athlete[];
            matches?: Match[];
          };
          if (res.config) {
            setConfig(res.config);
            syncConfigToFirestore(res.config);
          }
          if (res.teams) {
            setTeams(res.teams);
            res.teams.forEach((t) => syncTeamToFirestore(t));
          }
          if (res.athletes) {
            setAthletes(res.athletes);
            res.athletes.forEach((a) => syncAthleteToFirestore(a));
          }
          if (res.matches) {
            setMatches(res.matches);
            syncAllMatchesToFirestore(res.matches);
          }
        }}
      />

      {/* 8. Athlete Excel Import Modal (Root-level to ensure accessibility from any tab or modal) */}
      <AthleteExcelImportModal
        isOpen={isAthleteExcelImportOpen}
        onClose={() => setIsAthleteExcelImportOpen(false)}
        teams={teams}
        initialTeamFilter={athleteExcelImportTeam}
        existingAthletesCount={athletes.length}
        user={currentUser}
        onOpenLogin={() => setIsAuthOpen(true)}
        onConfirmImport={handleImportMultipleAthletes}
        onClearAllAthletes={handleClearAllAthletes}
      />

      {/* 9. Match Schedule Excel Import Modal */}
      <MatchExcelImportModal
        isOpen={isMatchExcelImportOpen}
        onClose={() => setIsMatchExcelImportOpen(false)}
        config={config}
        sports={sports}
        existingTeams={teams}
        existingMatchesCount={matches.filter((m) => !m.sportId || m.sportId === config.activeSportId).length}
        onImportMatches={handleImportMatchesFromExcel}
        onClearAllMatches={handleClearAllMatches}
      />

      {/* 10. Audit History & Activity Logs Modal (Nhật ký truy vết thao tác) */}
      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
        logs={auditLogs}
        user={currentUser}
        onClearLogs={handleClearAllAuditLogs}
      />
    </div>
  );
};
