export type UserRole = 'admin' | 'referee' | 'secretary' | 'athlete' | 'viewer';

export interface UserProfile {
  role: UserRole;
  username: string;
  displayName: string;
  title: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
}

export interface UserAccount {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  title: string;
  email?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  createdAt: string;
}

export type RankingCriterionType =
  | 'points'
  | 'head_to_head'
  | 'set_difference'
  | 'sets_won'
  | 'sets_lost'
  | 'point_difference'
  | 'points_scored';

export interface RankingCriterionConfig {
  id: RankingCriterionType;
  label: string;
  enabled: boolean;
  order: number;
}

export type SportType = 'volleyball' | 'badminton' | 'tabletennis' | 'football' | string;

export interface Sport {
  id: string;
  name: string;
  code: string;
  maxSets: number;
  pointScheme: 'standard' | 'custom';
  ptsWin: number;
  ptsDraw: number;
  ptsLoss: number;
  icon?: string;
  description?: string;
}

export type PointScheme = 'standard' | 'custom';

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';

export interface Team {
  id: string;
  name: string;
  group: string;
  coachName?: string;
  contactPhone?: string;
  color?: string;
}

export interface Athlete {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  group: string;
  jerseyNumber: number;
  position: string;
  dateOfBirth: string;
  nationalIdEncrypted: string;
  phoneEncrypted: string;
  status: 'approved' | 'pending' | 'needs_revision';
  registeredAt: string;
  avatarUrl?: string;
  goalsOrPoints: number;
  yellowCards: number;
  redCards: number;
  mvpCount: number;
}

export interface MatchEvent {
  id: string;
  timestamp: string;
  minute: number;
  type: 'goal' | 'point' | 'yellow_card' | 'red_card' | 'set_win' | 'pen' | 'sub' | 'note';
  teamId: string;
  athleteName?: string;
  description: string;
}

export interface MatchSetScores {
  set1: { home: number; away: number };
  set2: { home: number; away: number };
  set3: { home: number; away: number };
  set4: { home: number; away: number };
  set5: { home: number; away: number };
  pen: { home: number; away: number; played: boolean };
}

export interface MatchTimer {
  running: boolean;
  elapsedSeconds: number;
  currentSet: number;
}

export interface Match {
  id: string;
  code: string;
  stage: string;
  pitch: string;
  date: string;
  time: string;
  home: Team;
  away: Team;
  status: MatchStatus;
  timer: MatchTimer;
  scores: MatchSetScores;
  currentServer?: 'home' | 'away';
  events: MatchEvent[];
  refereeName: string;
  secretaryName: string;
  notes?: string;
}

export interface TournamentConfig {
  schoolName: string;
  deptName: string;
  tournamentName: string;
  organizer: string;
  referee: string;
  secretary: string;
  activeSportId: string;
  sportType?: SportType;
  matchSetsRule?: number;
  customGroups: string[];
  rankingCriteria: RankingCriterionConfig[];
  themeColor: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
  e2eeEnabled: boolean;
  e2eePassphraseHash: string;
}

export interface StandingItem {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  setsWon: number;
  setsLost: number;
  ptsFor: number;
  ptsAgainst: number;
  form: ('W' | 'D' | 'L')[];
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'score' | 'match_start' | 'registration' | 'system' | 'standing';
  read: boolean;
}
