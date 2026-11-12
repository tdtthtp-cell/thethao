export type UserRole = 'admin' | 'referee' | 'secretary' | 'athlete' | 'viewer';

export interface UserProfile {
  role: UserRole;
  username: string;
  displayName: string;
  title: string;
  email?: string;
  avatarUrl?: string;
  authProvider?: 'local' | 'google';
  assignedSports?: string[]; // IDs of sports assigned to this referee/secretary (e.g. ['badminton'])
  assignedCategories?: string[]; // IDs or names of categories assigned (e.g. ['Đơn nam', 'Đôi nam nữ'])
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
  assignedSports?: string[];
  assignedCategories?: string[];
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

export type SportType = 'volleyball' | 'badminton' | 'tabletennis' | 'football' | 'shuttlecock' | string;

export interface SportCategory {
  id: string;
  name: string; // e.g. "Nam", "Nữ", "Đơn nam", "Đơn nữ", "Đôi nam", "Đôi nữ", "Đôi nam nữ"
  gender?: 'male' | 'female' | 'mixed';
  type?: 'singles' | 'doubles' | 'team';
}

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
  categories?: SportCategory[]; // Multiple categories / events per sport
}

export type PointScheme = 'standard' | 'custom';

export type MatchStatus = 'UPCOMING' | 'LIVE' | 'FINISHED';

export type TeamGender = 'male' | 'female' | 'mixed';

export interface Team {
  id: string;
  sportId?: string; // Sport this team participates in
  categoryId?: string; // Event/category (e.g. 'Đơn nam', 'Đôi nam', 'Nam')
  categoryName?: string;
  name: string;
  group: string;
  gender?: TeamGender | string;
  coachName?: string;
  contactPhone?: string;
  color?: string;
  createdBy?: string;
  createdAt?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface Athlete {
  id: string;
  teamId: string;
  teamName: string;
  sportId?: string;
  categoryId?: string;
  name: string;
  group: string;
  jerseyNumber: number;
  position: string;
  dateOfBirth: string;
  nationalIdEncrypted: string;
  phoneEncrypted: string;
  status: 'approved' | 'pending' | 'needs_revision';
  registeredAt: string;
  avatarUrl?: string;
  isCaptain?: boolean;
  goalsOrPoints: number;
  yellowCards: number;
  redCards: number;
  mvpCount: number;
  createdBy?: string;
  createdAt?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
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
  sportId?: string; // which sport this match belongs to (e.g. 'volleyball', 'badminton')
  categoryId?: string; // which category/event (e.g. 'cat_male', 'cat_ms')
  categoryName?: string; // display name (e.g. 'Nam', 'Đơn nam', 'Đôi nam nữ')
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
  createdBy?: string;
  createdAt?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
}

export interface VenueConfig {
  id: string; // 'main' | 'branch' | custom ID
  name: string; // 'Điểm chính', 'Phân hiệu'
  code: string; // 'ĐC', 'PH'
  description?: string;
  isDefault?: boolean;
}

export interface TournamentConfig {
  year: number; // Actual tournament year (e.g. new Date().getFullYear())
  schoolName: string;
  deptName: string;
  tournamentName: string;
  organizer: string;
  referee: string;
  secretary: string;
  activeSportId: string;
  activeCategoryId?: string; // 'ALL' or specific category id / name
  sportType?: SportType;
  matchSetsRule?: number;
  customGroups: string[];
  venues?: VenueConfig[]; // Tournament locations (Điểm chính, Phân hiệu)
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

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'bulk_delete'
  | 'import'
  | 'reorder'
  | 'clear'
  | 'score'
  | 'approve';

export type AuditEntityType = 'team' | 'athlete' | 'match' | 'schedule';

export interface AuditLog {
  id: string;
  timestamp: string; // e.g. "12/11/2026 15:30:20"
  userId?: string;
  userName: string; // e.g. "admin (Ban Tổ Chức)" or "Trần Trọng Tài"
  userRole: UserRole;
  action: AuditAction;
  entityType: AuditEntityType;
  entityName?: string; // e.g. "Lớp 10A1", "Nguyễn Văn A (#10)", "Trận BK1 - 10A1 vs 10A2"
  description: string; // Human-friendly description of what was changed
}
