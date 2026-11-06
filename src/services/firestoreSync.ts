import { getApps, initializeApp } from 'firebase/app';
import {
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
} from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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

// 1. Subscribe to Real-Time Firestore Sync
export function subscribeToFirestore(callbacks: {
  onConfigChange?: (config: TournamentConfig) => void;
  onSportsChange?: (sports: Sport[]) => void;
  onTeamsChange?: (teams: Team[]) => void;
  onAthletesChange?: (athletes: Athlete[]) => void;
  onMatchesChange?: (matches: Match[]) => void;
  onNotificationsChange?: (notifications: NotificationItem[]) => void;
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
    await setDoc(doc(db, CONFIG_COL, 'tournament'), config, { merge: true });
  } catch (err) {
    console.warn('Error syncing config to Firestore:', err);
  }
}

export async function syncSportToFirestore(sport: Sport) {
  try {
    await setDoc(doc(db, SPORTS_COL, sport.id), sport);
  } catch (err) {
    console.warn('Error syncing sport to Firestore:', err);
  }
}

export async function syncTeamToFirestore(team: Team) {
  try {
    await setDoc(doc(db, TEAMS_COL, team.id), team);
  } catch (err) {
    console.warn('Error syncing team to Firestore:', err);
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
    console.warn('Error deleting team from Firestore:', err);
  }
}

export async function deleteMultipleTeamsFromFirestore(teamIds: string[], deleteAthletesToo = true, allAthletes: Athlete[] = []) {
  try {
    const batch = writeBatch(db);
    const teamSet = new Set(teamIds);

    teamIds.forEach((tId) => {
      batch.delete(doc(db, TEAMS_COL, tId));
    });

    if (deleteAthletesToo) {
      allAthletes
        .filter((a) => teamSet.has(a.teamId))
        .forEach((a) => {
          batch.delete(doc(db, ATHLETES_COL, a.id));
        });
    }

    await batch.commit();
  } catch (err) {
    console.warn('Error bulk deleting teams from Firestore:', err);
  }
}

export async function syncAthleteToFirestore(athlete: Athlete) {
  try {
    await setDoc(doc(db, ATHLETES_COL, athlete.id), athlete);
  } catch (err) {
    console.warn('Error syncing athlete to Firestore:', err);
  }
}

export async function deleteAthleteFromFirestore(athleteId: string) {
  try {
    await deleteDoc(doc(db, ATHLETES_COL, athleteId));
  } catch (err) {
    console.warn('Error deleting athlete from Firestore:', err);
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
    console.warn('Error bulk deleting athletes from Firestore:', err);
  }
}

export async function syncMatchToFirestore(match: Match) {
  try {
    await setDoc(doc(db, MATCHES_COL, match.id), match);
  } catch (err) {
    console.warn('Error syncing match to Firestore:', err);
  }
}

export async function syncAllMatchesToFirestore(matches: Match[]) {
  try {
    const batch = writeBatch(db);
    matches.forEach((m) => {
      batch.set(doc(db, MATCHES_COL, m.id), m);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Error syncing matches batch to Firestore:', err);
  }
}

export async function deleteMatchFromFirestore(matchId: string) {
  try {
    await deleteDoc(doc(db, MATCHES_COL, matchId));
  } catch (err) {
    console.warn('Error deleting match from Firestore:', err);
  }
}

export async function syncNotificationToFirestore(notif: NotificationItem) {
  try {
    await setDoc(doc(db, NOTIFICATIONS_COL, notif.id), notif);
  } catch (err) {
    console.warn('Error syncing notification to Firestore:', err);
  }
}
