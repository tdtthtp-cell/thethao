import {
  Athlete,
  Match,
  RankingCriterionConfig,
  Sport,
  Team,
  TournamentConfig,
  NotificationItem,
  UserAccount,
  UserProfile,
} from '../types';

export const DEFAULT_RANKING_CRITERIA: RankingCriterionConfig[] = [
  { id: 'points', label: '1. Tổng điểm số đạt được (Points)', enabled: true, order: 1 },
  { id: 'head_to_head', label: '2. Thành tích đối đầu trực tiếp (Head-to-Head)', enabled: true, order: 2 },
  { id: 'set_difference', label: '3. Hiệu số set thắng / thua (Set Difference)', enabled: true, order: 3 },
  { id: 'sets_won', label: '4. Tổng số set thắng (Sets Won)', enabled: true, order: 4 },
  { id: 'point_difference', label: '5. Hiệu số điểm trong các set đấu (Point Difference)', enabled: true, order: 5 },
  { id: 'points_scored', label: '6. Tổng điểm ghi được trong set đấu (Total Points Scored)', enabled: true, order: 6 },
  { id: 'sets_lost', label: '7. Số set thua (ít hơn xếp trên)', enabled: false, order: 7 },
];

const CURRENT_YEAR = new Date().getFullYear();

export const INITIAL_SPORTS: Sport[] = [
  {
    id: 'volleyball',
    name: 'Bóng chuyền',
    code: 'VOLLEYBALL',
    maxSets: 3,
    pointScheme: 'standard',
    ptsWin: 3,
    ptsDraw: 0,
    ptsLoss: 0,
    icon: 'volleyball',
    description: 'Đấu 3 set (thắng 2) hoặc 5 set (thắng 3). Thắng cách biệt +3đ, suýt soát +2đ/1đ.',
    categories: [
      { id: 'vb_male', name: 'Nam', gender: 'male', type: 'team' },
      { id: 'vb_female', name: 'Nữ', gender: 'female', type: 'team' },
    ],
  },
  {
    id: 'football',
    name: 'Bóng đá',
    code: 'FOOTBALL',
    maxSets: 1,
    pointScheme: 'standard',
    ptsWin: 3,
    ptsDraw: 1,
    ptsLoss: 0,
    icon: 'football',
    description: '1 hiệp chính, hòa có thể sút luân lưu. Thắng hiệp chính +3đ, hòa 1đ, thắng Pen 1đ.',
    categories: [
      { id: 'fb_male', name: 'Nam', gender: 'male', type: 'team' },
      { id: 'fb_female', name: 'Nữ', gender: 'female', type: 'team' },
    ],
  },
  {
    id: 'badminton',
    name: 'Cầu lông',
    code: 'BADMINTON',
    maxSets: 3,
    pointScheme: 'standard',
    ptsWin: 3,
    ptsDraw: 0,
    ptsLoss: 0,
    icon: 'badminton',
    description: 'Thi đấu 3 ván 21 điểm, thắng 2 ván.',
    categories: [
      { id: 'bm_ms', name: 'Đơn nam', gender: 'male', type: 'singles' },
      { id: 'bm_ws', name: 'Đơn nữ', gender: 'female', type: 'singles' },
      { id: 'bm_md', name: 'Đôi nam', gender: 'male', type: 'doubles' },
      { id: 'bm_wd', name: 'Đôi nữ', gender: 'female', type: 'doubles' },
      { id: 'bm_xd', name: 'Đôi nam nữ', gender: 'mixed', type: 'doubles' },
    ],
  },
  {
    id: 'tabletennis',
    name: 'Bóng bàn',
    code: 'TABLETENNIS',
    maxSets: 3,
    pointScheme: 'standard',
    ptsWin: 3,
    ptsDraw: 0,
    ptsLoss: 0,
    icon: 'tabletennis',
    description: 'Thi đấu 3 ván 11 điểm, thắng 2 ván.',
    categories: [
      { id: 'tt_ms', name: 'Đơn nam', gender: 'male', type: 'singles' },
      { id: 'tt_ws', name: 'Đơn nữ', gender: 'female', type: 'singles' },
      { id: 'tt_md', name: 'Đôi nam', gender: 'male', type: 'doubles' },
      { id: 'tt_wd', name: 'Đôi nữ', gender: 'female', type: 'doubles' },
      { id: 'tt_xd', name: 'Đôi nam nữ', gender: 'mixed', type: 'doubles' },
    ],
  },
  {
    id: 'shuttlecock',
    name: 'Đá cầu',
    code: 'SHUTTLECOCK',
    maxSets: 3,
    pointScheme: 'standard',
    ptsWin: 3,
    ptsDraw: 0,
    ptsLoss: 0,
    icon: 'activity',
    description: 'Thi đấu 3 ván 21 điểm, thắng 2 ván.',
    categories: [
      { id: 'sc_ms', name: 'Đơn nam', gender: 'male', type: 'singles' },
      { id: 'sc_ws', name: 'Đơn nữ', gender: 'female', type: 'singles' },
      { id: 'sc_md', name: 'Đôi nam', gender: 'male', type: 'doubles' },
      { id: 'sc_wd', name: 'Đôi nữ', gender: 'female', type: 'doubles' },
      { id: 'sc_xd', name: 'Đôi nam nữ', gender: 'mixed', type: 'doubles' },
    ],
  },
  {
    id: 'tugofwar',
    name: 'Kéo co',
    code: 'TUGOFWAR',
    maxSets: 3,
    pointScheme: 'standard',
    ptsWin: 3,
    ptsDraw: 0,
    ptsLoss: 0,
    icon: 'users',
    description: 'Thi đấu 3 hiệp kéo, đội thắng 2 hiệp giành chiến thắng chung cuộc.',
    categories: [
      { id: 'tug_m', name: 'Đội nam', gender: 'male', type: 'team' },
      { id: 'tug_w', name: 'Đội nữ', gender: 'female', type: 'team' },
      { id: 'tug_x', name: 'Đội nam nữ', gender: 'mixed', type: 'team' },
    ],
  },
];

export const DEFAULT_GUEST_USER: UserProfile = {
  role: 'viewer',
  username: '',
  displayName: 'Khách xem',
  title: 'Chưa đăng nhập',
};

export const DEFAULT_CONFIG: TournamentConfig = {
  year: CURRENT_YEAR,
  schoolName: 'THPT HUỲNH TẤN PHÁT',
  deptName: 'TỔ VẬT LÝ - GDTC',
  tournamentName: `GIẢI THỂ THAO HỌC SINH NĂM ${CURRENT_YEAR}`,
  organizer: 'admin',
  referee: 'Thầy Bồ Công Lâm (Trọng tài chính)',
  secretary: 'Cô Trần Thị Thu Hồng (Thư ký bàn)',
  activeSportId: 'volleyball',
  activeCategoryId: 'ALL',
  customGroups: ['Khối 10', 'Khối 11', 'Khối 12'],
  rankingCriteria: DEFAULT_RANKING_CRITERIA,
  themeColor: 'blue',
  e2eeEnabled: true,
  e2eePassphraseHash: `default_hash_sport${CURRENT_YEAR}`,
};

export const INITIAL_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'U_ADMIN',
    username: 'admin',
    password: 'admin230876',
    displayName: 'admin',
    role: 'admin',
    title: 'Ban Tổ Chức (Toàn quyền quản trị)',
    email: 'admin@huynhtanphat.edu.vn',
    securityQuestion: 'Trường THPT bạn công tác là gì?',
    securityAnswer: 'Huỳnh Tấn Phát',
    createdAt: `${CURRENT_YEAR}-10-01`,
  },
  {
    id: 'U_REF_BADMINTON',
    username: 'tt_caulong',
    password: '123456',
    displayName: 'Thầy Nguyễn Văn Nam',
    role: 'referee',
    title: 'Trọng tài Cầu Lông (Đơn & Đôi nam)',
    assignedSports: ['badminton'],
    assignedCategories: ['Đơn nam', 'Đôi nam'],
    createdAt: `${CURRENT_YEAR}-10-05`,
  },
  {
    id: 'U_SEC_VOLLEYBALL',
    username: 'tk_bongchuyen',
    password: '123456',
    displayName: 'Cô Trần Thị Thu Hồng',
    role: 'secretary',
    title: 'Thư ký Bóng Chuyền',
    assignedSports: ['volleyball'],
    assignedCategories: ['Nam', 'Nữ'],
    createdAt: `${CURRENT_YEAR}-10-05`,
  },
];

export const INITIAL_TEAMS: Team[] = [];

export const INITIAL_ATHLETES: Athlete[] = [];

export const INITIAL_MATCHES: Match[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'N_INIT_1',
    timestamp: '08:00',
    title: 'Hệ Thống Sẵn Sàng Tiếp Nhận Dữ Liệu',
    message: 'Hệ thống đã sẵn sàng. Ban tổ chức vui lòng nhập danh sách đội và vận động viên để bắt đầu xếp lịch thi đấu.',
    type: 'system',
    read: false,
  },
];

const LOCAL_STORAGE_KEY = 'SPORTS_TOURNAMENT_APP_V4_REAL_DATA';

// IDs of any former mock data to purge permanently
const LEGACY_MOCK_TEAM_IDS = new Set(['T_10A1', 'T_10A2', 'T_10A3', 'T_11A1', 'T_11A2', 'T_12A1']);
const LEGACY_MOCK_ATHLETE_IDS = new Set(['A_101', 'A_102', 'A_103', 'A_104', 'A_105']);
const LEGACY_MOCK_MATCH_IDS = new Set(['M_101', 'M_102', 'M_103', 'M_104']);
const LEGACY_MOCK_USER_IDS = new Set(['U_REF_1', 'U_SEC_1', 'U_CAPT_1']);

export function loadTournamentState() {
  if (typeof window === 'undefined') {
    return {
      config: DEFAULT_CONFIG,
      sports: INITIAL_SPORTS,
      teams: INITIAL_TEAMS,
      athletes: INITIAL_ATHLETES,
      matches: INITIAL_MATCHES,
      users: INITIAL_USER_ACCOUNTS,
      notifications: INITIAL_NOTIFICATIONS,
    };
  }

  try {
    // Also remove old version keys if they existed with mock data
    try {
      localStorage.removeItem('SPORTS_TOURNAMENT_APP_V1');
      localStorage.removeItem('SPORTS_TOURNAMENT_APP_V2');
      localStorage.removeItem('SPORTS_TOURNAMENT_APP_V3');
    } catch {
      // ignore
    }

    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawTeams: Team[] = Array.isArray(parsed.teams) ? parsed.teams : [];
      const cleanTeams = rawTeams.filter((t) => !LEGACY_MOCK_TEAM_IDS.has(t.id));

      const rawAthletes: Athlete[] = Array.isArray(parsed.athletes) ? parsed.athletes : [];
      const cleanAthletes = rawAthletes.filter((a) => !LEGACY_MOCK_ATHLETE_IDS.has(a.id));

      const rawMatches: Match[] = Array.isArray(parsed.matches) ? parsed.matches : [];
      const cleanMatches = rawMatches.filter((m) => !LEGACY_MOCK_MATCH_IDS.has(m.id));

      const rawUsers: UserAccount[] = Array.isArray(parsed.users) ? parsed.users : [];
      const cleanUsers = rawUsers
        .filter((u) => !LEGACY_MOCK_USER_IDS.has(u.id))
        .map((u: UserAccount) =>
          u.username === 'admin' ? { ...u, displayName: 'admin' } : u
        );

      return {
        config: {
          ...DEFAULT_CONFIG,
          ...(parsed.config || {}),
          rankingCriteria: Array.isArray(parsed.config?.rankingCriteria)
            ? parsed.config.rankingCriteria
            : DEFAULT_RANKING_CRITERIA,
        },
        sports: Array.isArray(parsed.sports) && parsed.sports.length > 0 ? parsed.sports : INITIAL_SPORTS,
        teams: cleanTeams,
        athletes: cleanAthletes,
        matches: cleanMatches,
        users: cleanUsers.length > 0 ? cleanUsers : INITIAL_USER_ACCOUNTS,
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : INITIAL_NOTIFICATIONS,
      };
    }
  } catch (e) {
    console.error('Error loading stored data:', e);
  }

  return {
    config: DEFAULT_CONFIG,
    sports: INITIAL_SPORTS,
    teams: INITIAL_TEAMS,
    athletes: INITIAL_ATHLETES,
    matches: INITIAL_MATCHES,
    users: INITIAL_USER_ACCOUNTS,
    notifications: INITIAL_NOTIFICATIONS,
  };
}

export function saveTournamentState(state: {
  config: TournamentConfig;
  sports: Sport[];
  teams: Team[];
  athletes: Athlete[];
  matches: Match[];
  users: UserAccount[];
  notifications: NotificationItem[];
}) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving tournament state:', e);
  }
}
