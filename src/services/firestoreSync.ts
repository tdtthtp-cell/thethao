import { getApps, initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Athlete,
  Match,
  NotificationItem,
  Sport,
  Team,
  TournamentConfig,
  UserAccount,
} from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with ignoreUndefinedProperties: true to prevent "Unsupported field value: undefined" errors
let firestoreDb: ReturnType<typeof getFirestore>;
try {
  firestoreDb = initializeFirestore(
    app,
    { ignoreUndefinedProperties: true },
    firebaseConfig.firestoreDatabaseId || undefined
  );
} catch {
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;

/**
 * Deeply removes undefined properties from an object/array so Firestore setDoc / writeBatch will never fail
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const res: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        res[key] = cleanForFirestore(val);
      }
    }
    return res as T;
  }
  return data;
}

// Test connection on boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('Firestore client is offline or connecting.');
    }
    return false;
  }
}

// Collections
const CONFIG_COL = 'config';
const SPORTS_COL = 'sports';
const TEAMS_COL = 'teams';
const ATHLETES_COL = 'athletes';
const MATCHES_COL = 'matches';
const NOTIFICATIONS_COL = 'notifications';
const USERS_COL = 'users';

const DEFAULT_ADMIN_USER: UserAccount = {
  id: 'U_ADMIN',
  username: 'admin',
  password: 'admin230876',
  displayName: 'admin',
  role: 'admin',
  title: 'Ban Tổ Chức (Toàn quyền quản trị)',
  email: 'admin@huynhtanphat.edu.vn',
  securityQuestion: 'Trường THPT bạn công tác là gì?',
  securityAnswer: 'Huỳnh Tấn Phát',
  createdAt: '2026-10-01',
};

// 1. Subscribe to Real-Time Firestore Sync
export function subscribeToFirestore(callbacks: {
  onConfigChange?: (config: TournamentConfig) => void;
  onSportsChange?: (sports: Sport[]) => void;
  onTeamsChange?: (teams: Team[]) => void;
  onAthletesChange?: (athletes: Athlete[]) => void;
  onMatchesChange?: (matches: Match[]) => void;
  onNotificationsChange?: (notifications: NotificationItem[]) => void;
  onUsersChange?: (users: UserAccount[]) => void;
  onSyncStatusChange?: (status: 'synced' | 'connecting' | 'error') => void;
}): () => void {
  const unsubs: Unsubscribe[] = [];

  try {
    if (callbacks.onSyncStatusChange) callbacks.onSyncStatusChange('connecting');

    // Config listener
    const unsubConfig = onSnapshot(
      doc(db, CONFIG_COL, 'tournament'),
      (snap) => {
        if (snap.exists() && callbacks.onConfigChange) {
          callbacks.onConfigChange(snap.data() as TournamentConfig);
        }
        if (callbacks.onSyncStatusChange) callbacks.onSyncStatusChange('synced');
      },
      (err) => {
        console.warn('Firestore config listener warning:', err);
        if (callbacks.onSyncStatusChange) callbacks.onSyncStatusChange('error');
      }
    );
    unsubs.push(unsubConfig);

    // Sports listener
    const unsubSports = onSnapshot(
      collection(db, SPORTS_COL),
      (snap) => {
        if (!snap.empty && callbacks.onSportsChange) {
          const sports = snap.docs.map((d) => d.data() as Sport);
          callbacks.onSportsChange(sports);
        }
      },
      (err) => console.warn('Firestore sports listener warning:', err)
    );
    unsubs.push(unsubSports);

    // Teams listener
    const unsubTeams = onSnapshot(
      collection(db, TEAMS_COL),
      (snap) => {
        if (callbacks.onTeamsChange) {
          const teams = snap.docs.map((d) => d.data() as Team);
          callbacks.onTeamsChange(teams);
        }
      },
      (err) => console.warn('Firestore teams listener warning:', err)
    );
    unsubs.push(unsubTeams);

    // Athletes listener
    const unsubAthletes = onSnapshot(
      collection(db, ATHLETES_COL),
      (snap) => {
        if (callbacks.onAthletesChange) {
          const athletes = snap.docs.map((d) => d.data() as Athlete);
          callbacks.onAthletesChange(athletes);
        }
      },
      (err) => console.warn('Firestore athletes listener warning:', err)
    );
    unsubs.push(unsubAthletes);

    // Matches listener (Sub-second live scoring across all devices)
    const unsubMatches = onSnapshot(
      collection(db, MATCHES_COL),
      (snap) => {
        if (callbacks.onMatchesChange) {
          const matches = snap.docs.map((d) => d.data() as Match);
          callbacks.onMatchesChange(matches);
        }
      },
      (err) => console.warn('Firestore matches listener warning:', err)
    );
    unsubs.push(unsubMatches);

    // Notifications listener
    const unsubNotifs = onSnapshot(
      collection(db, NOTIFICATIONS_COL),
      (snap) => {
        if (callbacks.onNotificationsChange) {
          const notifs = snap.docs.map((d) => d.data() as NotificationItem);
          callbacks.onNotificationsChange(notifs);
        }
      },
      (err) => console.warn('Firestore notifications listener warning:', err)
    );
    unsubs.push(unsubNotifs);

    // Users listener (Synchronizes user accounts across devices)
    const unsubUsers = onSnapshot(
      collection(db, USERS_COL),
      async (snap) => {
        if (callbacks.onUsersChange) {
          if (snap.empty) {
            // Seed the initial admin account to Firestore
            try {
              await setDoc(doc(db, USERS_COL, DEFAULT_ADMIN_USER.id), DEFAULT_ADMIN_USER);
            } catch (e) {
              console.warn('Error seeding admin user to Firestore:', e);
            }
            callbacks.onUsersChange([DEFAULT_ADMIN_USER]);
          } else {
            const rawUsers = snap.docs.map((d) => d.data() as UserAccount);
            // Only filter out legacy mock IDs from early prototypes
            const LEGACY_MOCK_USER_IDS = new Set(['U_REF_1', 'U_SEC_1', 'U_CAPT_1']);
            const cleanUsers = rawUsers
              .filter((u) => !LEGACY_MOCK_USER_IDS.has(u.id))
              .map((u) => (u.username === 'admin' ? { ...u, displayName: 'admin' } : u));

            // Ensure admin is always present
            const hasAdmin = cleanUsers.some((u) => u.username === 'admin');
            const finalUsers = hasAdmin ? cleanUsers : [DEFAULT_ADMIN_USER, ...cleanUsers];
            callbacks.onUsersChange(finalUsers);
          }
        }
      },
      (err) => console.warn('Firestore users listener warning:', err)
    );
    unsubs.push(unsubUsers);
  } catch (err) {
    console.error('Error attaching Firestore listeners:', err);
    if (callbacks.onSyncStatusChange) callbacks.onSyncStatusChange('error');
  }

  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch (e) {
        // ignore cleanup error
      }
    });
  };
}

// 2. Remote Mutation Handlers
export async function syncConfigToFirestore(config: TournamentConfig) {
  try {
    const cleaned = cleanForFirestore(config);
    await setDoc(doc(db, CONFIG_COL, 'tournament'), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing config to Firestore:', err);
    throw err;
  }
}

export async function syncSportToFirestore(sport: Sport) {
  try {
    const cleaned = cleanForFirestore(sport);
    await setDoc(doc(db, SPORTS_COL, sport.id), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing sport to Firestore:', err);
    throw err;
  }
}

export async function syncTeamToFirestore(team: Team) {
  try {
    const cleaned = cleanForFirestore(team);
    await setDoc(doc(db, TEAMS_COL, team.id), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing team to Firestore:', err);
    throw err;
  }
}

export async function syncMultipleTeamsToFirestore(teams: Team[]) {
  if (!teams || teams.length === 0) return;
  try {
    const batch = writeBatch(db);
    teams.forEach((t) => {
      const cleaned = cleanForFirestore(t);
      batch.set(doc(db, TEAMS_COL, t.id), cleaned, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error syncing multiple teams to Firestore:', err);
    throw err;
  }
}

export async function deleteTeamFromFirestore(teamId: string, deleteAthletesToo = true, allAthletes: Athlete[] = []) {
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, TEAMS_COL, teamId));

    if (deleteAthletesToo) {
      allAthletes
        .filter((a) => a.teamId === teamId)
        .forEach((a) => {
          batch.delete(doc(db, ATHLETES_COL, a.id));
        });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error deleting team from Firestore:', err);
    throw err;
  }
}

export async function deleteMultipleTeamsFromFirestore(teamIds: string[], deleteAthletesToo = true, allAthletes: Athlete[] = []) {
  try {
    const batch = writeBatch(db);
    teamIds.forEach((tId) => {
      batch.delete(doc(db, TEAMS_COL, tId));
    });

    if (deleteAthletesToo) {
      const teamSet = new Set(teamIds);
      allAthletes
        .filter((a) => teamSet.has(a.teamId))
        .forEach((a) => {
          batch.delete(doc(db, ATHLETES_COL, a.id));
        });
    }

    await batch.commit();
  } catch (err) {
    console.error('Error bulk deleting teams from Firestore:', err);
    throw err;
  }
}

export async function syncAthleteToFirestore(athlete: Athlete) {
  try {
    const cleaned = cleanForFirestore(athlete);
    await setDoc(doc(db, ATHLETES_COL, athlete.id), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing athlete to Firestore:', err);
    throw err;
  }
}

export async function syncMultipleAthletesToFirestore(athletes: Athlete[]) {
  if (!athletes || athletes.length === 0) return;
  try {
    const batch = writeBatch(db);
    athletes.forEach((ath) => {
      const cleaned = cleanForFirestore(ath);
      batch.set(doc(db, ATHLETES_COL, ath.id), cleaned, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error batch syncing athletes to Firestore:', err);
    throw err;
  }
}

export async function deleteAthleteFromFirestore(athleteId: string) {
  try {
    await deleteDoc(doc(db, ATHLETES_COL, athleteId));
  } catch (err) {
    console.error('Error deleting athlete from Firestore:', err);
    throw err;
  }
}

export async function deleteMultipleAthletesFromFirestore(athleteIds: string[]) {
  try {
    const batch = writeBatch(db);
    athleteIds.forEach((id) => {
      batch.delete(doc(db, ATHLETES_COL, id));
    });
    await batch.commit();
  } catch (err) {
    console.error('Error bulk deleting athletes from Firestore:', err);
    throw err;
  }
}

export async function syncMatchToFirestore(match: Match) {
  try {
    const cleaned = cleanForFirestore(match);
    await setDoc(doc(db, MATCHES_COL, match.id), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing match to Firestore:', err);
    throw err;
  }
}

export async function syncAllMatchesToFirestore(matches: Match[]) {
  if (!matches || matches.length === 0) return;
  try {
    const batch = writeBatch(db);
    matches.forEach((m) => {
      const cleaned = cleanForFirestore(m);
      batch.set(doc(db, MATCHES_COL, m.id), cleaned, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error syncing matches batch to Firestore:', err);
    throw err;
  }
}

export async function deleteMatchFromFirestore(matchId: string) {
  try {
    await deleteDoc(doc(db, MATCHES_COL, matchId));
  } catch (err) {
    console.error('Error deleting match from Firestore:', err);
    throw err;
  }
}

export async function syncNotificationToFirestore(notif: NotificationItem) {
  try {
    const cleaned = cleanForFirestore(notif);
    await setDoc(doc(db, NOTIFICATIONS_COL, notif.id), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing notification to Firestore:', err);
    throw err;
  }
}

export async function syncUserToFirestore(user: UserAccount) {
  try {
    const cleaned = cleanForFirestore(user);
    await setDoc(doc(db, USERS_COL, user.id), cleaned, { merge: true });
  } catch (err) {
    console.error('Error syncing user account to Firestore:', err);
    throw err;
  }
}

export async function deleteUserFromFirestore(userId: string) {
  try {
    await deleteDoc(doc(db, USERS_COL, userId));
  } catch (err) {
    console.error('Error deleting user account from Firestore:', err);
    throw err;
  }
}
