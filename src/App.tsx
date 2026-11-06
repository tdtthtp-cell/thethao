import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Athlete,
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
import { initAuth } from './services/firebaseAuth';
import {
  subscribeToFirestore,
  testFirestoreConnection,
  syncConfigToFirestore,
  syncSportToFirestore,
  syncTeamToFirestore,
  deleteTeamFromFirestore,
  deleteMultipleTeamsFromFirestore,
  syncAthleteToFirestore,
  deleteAthleteFromFirestore,
  deleteMultipleAthletesFromFirestore,
  syncMatchToFirestore,
  syncAllMatchesToFirestore,
  deleteMatchFromFirestore,
  syncUserToFirestore,
  deleteUserFromFirestore,
} from './services/firestoreSync';
import { subscribeToSync, broadcastTournamentUpdate } from './services/notifications';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal } from './components/AuthModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AthleteModal } from './components/AthleteModal';
import { SportModal } from './components/SportModal';
import { MatchEditModal } from './components/MatchEditModal';
import { MatchMinutesModal } from './components/MatchMinutesModal';

import { TabOverview } from './components/TabOverview';
import { TabAthletes } from './components/TabAthletes';
import { TabMatches } from './components/TabMatches';
import { TabStandings } from './components/TabStandings';
import { TabReports } from './components/TabReports';
import { TabSettings } from './components/TabSettings';

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

  // Navigation & session state
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEFAULT_GUEST_USER);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'connecting' | 'error'>('connecting');

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [isMatchEditModalOpen, setIsMatchEditModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [isMinutesModalOpen, setIsMinutesModalOpen] = useState(false);
  const [selectedMinutesMatch, setSelectedMinutesMatch] = useState<Match | null>(null);

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
    setInitialLoaded(true);

    // Dark mode check
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  // Listen for Google Auth state
  useEffect(() => {
    const unsub = initAuth((user) => {
      if (user && user.email) {
        setCurrentUser({
          role: 'admin',
          username: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          title: 'Ban Tổ Chức (Xác thực tài khoản Google)',
          email: user.email,
          avatarUrl: user.photoURL || undefined,
          authProvider: 'google',
        });
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
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
    });
  }, [config, sports, teams, athletes, matches, users, notifications, initialLoaded]);

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
      const groupTeams = teams.filter((t) => t.group === grp);
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
      const groupMatches = matches.filter(
        (m) => m.stage === grp && (m.status === 'FINISHED' || m.status === 'LIVE')
      );

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
      const activeTeams = customTeamsList || teams;
      const effectiveTeams = [...activeTeams];

      // Strictly require at least 2 teams entered by BTC
      if (effectiveTeams.length < 2) {
        alert('Chưa có đủ danh sách đội thi đấu (yêu cầu tối thiểu 2 đội). Ban tổ chức vui lòng nhập danh sách đội tại mục "Đăng Ký VĐV / Đội" trước khi xếp lịch!');
        setActiveTab('athletes');
        return;
      }

      const newGeneratedMatches: Match[] = [];
      let matchCount = 1;
      const baseDate = startDate || new Date().toISOString().slice(0, 10);
      let minuteOffset = startHour * 60;

      config.customGroups.forEach((grp) => {
        const grpTeams = effectiveTeams.filter((t) => t.group === grp);
        if (grpTeams.length < 2) return;

        // Round robin pairing
        for (let i = 0; i < grpTeams.length; i++) {
          for (let j = i + 1; j < grpTeams.length; j++) {
            const h = Math.floor(minuteOffset / 60);
            const m = minuteOffset % 60;
            const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

            newGeneratedMatches.push({
              id: 'M_' + Date.now() + '_' + matchCount,
              code: `Trận ${matchCount.toString().padStart(2, '0')}`,
              stage: grp,
              pitch: matchCount % 2 === 1 ? 'Sân 1 (Chính)' : 'Sân 2',
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
              notes: `Vòng bảng ${grp}`,
            });

            matchCount++;
            minuteOffset += intervalMinutes;
          }
        }
      });

      setMatches(newGeneratedMatches);
      syncAllMatchesToFirestore(newGeneratedMatches);
      effectiveTeams.forEach((t) => syncTeamToFirestore(t));
      broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: newGeneratedMatches, teams: effectiveTeams });
    },
    [teams, config]
  );

  // Handlers for Match updates
  const handleUpdateMatch = (updated: Match) => {
    setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    syncMatchToFirestore(updated);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', {
      matches: matches.map((m) => (m.id === updated.id ? updated : m)),
    });
  };

  const handleAddMatch = (newM: Match) => {
    setMatches((prev) => [...prev, newM]);
    syncMatchToFirestore(newM);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', { matches: [...matches, newM] });
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa trận đấu này?')) return;
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    deleteMatchFromFirestore(matchId);
    broadcastTournamentUpdate('TOURNAMENT_STATE_UPDATE', {
      matches: matches.filter((m) => m.id !== matchId),
    });
  };

  // Handlers for Athletes & Teams
  const handleSaveAthlete = (ath: Athlete) => {
    setAthletes((prev) => {
      const idx = prev.findIndex((a) => a.id === ath.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = ath;
        return next;
      }
      return [ath, ...prev];
    });
    syncAthleteToFirestore(ath);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ vận động viên này?')) return;
    setAthletes((prev) => prev.filter((a) => a.id !== athleteId));
    deleteAthleteFromFirestore(athleteId);
    broadcastTournamentUpdate('ATHLETES_UPDATED', { deletedId: athleteId });
  };

  const handleDeleteMultipleAthletes = (athleteIds: string[]) => {
    if (athleteIds.length === 0) return;
    setAthletes((prev) => prev.filter((a) => !athleteIds.includes(a.id)));
    deleteMultipleAthletesFromFirestore(athleteIds);
    broadcastTournamentUpdate('ATHLETES_UPDATED', { deletedCount: athleteIds.length });
  };

  const handleApproveAthlete = (athleteId: string, status: Athlete['status']) => {
    setAthletes((prev) =>
      prev.map((a) => {
        if (a.id === athleteId) {
          const updated = { ...a, status };
          syncAthleteToFirestore(updated);
          return updated;
        }
        return a;
      })
    );
    broadcastTournamentUpdate('ATHLETES_UPDATED', { athleteId, status });
  };

  const handleApproveMultipleAthletes = (athleteIds: string[], status: Athlete['status']) => {
    if (athleteIds.length === 0) return;
    const idSet = new Set(athleteIds);
    setAthletes((prev) =>
      prev.map((a) => {
        if (idSet.has(a.id)) {
          const updated = { ...a, status };
          syncAthleteToFirestore(updated);
          return updated;
        }
        return a;
      })
    );
    broadcastTournamentUpdate('ATHLETES_UPDATED', { updatedCount: athleteIds.length, status });
  };

  const handleSaveTeam = (team: Team) => {
    setTeams((prev) => {
      const idx = prev.findIndex((t) => t.id === team.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = team;
        return next;
      }
      return [...prev, team];
    });
    syncTeamToFirestore(team);
    broadcastTournamentUpdate('TEAMS_UPDATED', { teamId: team.id });
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!confirm('Bạn có chắc muốn xóa đội này cùng các VĐV liên quan?')) return;
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setAthletes((prev) => prev.filter((a) => a.teamId !== teamId));
    deleteTeamFromFirestore(teamId, true, athletes);
    broadcastTournamentUpdate('TEAMS_UPDATED', { deletedTeamId: teamId });
  };

  const handleDeleteMultipleTeams = (teamIds: string[], deleteAthletesToo = true) => {
    if (teamIds.length === 0) return;
    setTeams((prev) => prev.filter((t) => !teamIds.includes(t.id)));
    if (deleteAthletesToo) {
      setAthletes((prev) => prev.filter((a) => !teamIds.includes(a.teamId)));
    }
    deleteMultipleTeamsFromFirestore(teamIds, deleteAthletesToo, athletes);
    broadcastTournamentUpdate('TEAMS_UPDATED', { deletedCount: teamIds.length });
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Offline Toast Banner */}
      <OfflineIndicator />

      {/* Primary Sticky Header */}
      <Header
        config={config}
        user={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        unreadNotificationsCount={unreadNotifCount}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onThemeColorChange={(col) => {
          handleUpdateConfig((prev) => ({ ...prev, themeColor: col }));
        }}
        syncStatus={syncStatus}
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

        {activeTab === 'athletes' && (
          <TabAthletes
            athletes={athletes}
            teams={teams}
            config={config}
            user={currentUser}
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
            onSaveTeam={handleSaveTeam}
            onDeleteTeam={handleDeleteTeam}
            onDeleteMultipleTeams={handleDeleteMultipleTeams}
            onApproveAthlete={handleApproveAthlete}
            onApproveMultipleAthletes={handleApproveMultipleAthletes}
          />
        )}

        {activeTab === 'matches' && (
          <TabMatches
            matches={matches}
            teams={teams}
            sports={sports}
            config={config}
            user={currentUser}
            onNavigateTab={setActiveTab}
            onUpdateMatch={handleUpdateMatch}
            onAddMatch={handleAddMatch}
            onDeleteMatch={handleDeleteMatch}
            onGenerateSchedule={handleGenerateSchedule}
            onOpenMinutes={(m) => {
              setSelectedMinutesMatch(m);
              setIsMinutesModalOpen(true);
            }}
            onOpenEditMatch={(m) => {
              setEditingMatch(m);
              setIsMatchEditModalOpen(true);
            }}
          />
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
      <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* MODALS */}
      {/* 1. Auth & Role Switcher Modal */}
      {isAuthOpen && (
        <AuthModal
          currentUser={currentUser}
          users={users}
          onLogin={setCurrentUser}
          onLogout={() => setCurrentUser(DEFAULT_GUEST_USER)}
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
      />

      {/* 6. Administrative Match Minutes Modal */}
      <MatchMinutesModal
        match={selectedMinutesMatch}
        config={config}
        isOpen={isMinutesModalOpen}
        onClose={() => setIsMinutesModalOpen(false)}
      />
    </div>
  );
}
