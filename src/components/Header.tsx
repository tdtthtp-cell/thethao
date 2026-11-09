import React from 'react';
import {
  Trophy,
  Shield,
  Bell,
  Sun,
  Moon,
  Lock,
  UserCheck,
  Palette,
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  Flame,
  LogIn,
  LogOut,
} from 'lucide-react';
import { TournamentConfig, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  config: TournamentConfig;
  user: UserProfile;
  sports: import('../types').Sport[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onSelectSport: (sportId: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  isDark: boolean;
  onToggleDark: () => void;
  onThemeColorChange: (color: TournamentConfig['themeColor']) => void;
  syncStatus?: 'synced' | 'connecting' | 'error';
  onOpenReports?: () => void;
  onLogout?: () => void;
}

const GoogleIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

const getSportEmoji = (id: string, code: string = ''): string => {
  const s = (id + ' ' + code).toLowerCase();
  if (s.includes('volley') || s.includes('chuyen')) return '🏐';
  if (s.includes('foot') || (s.includes('da') && !s.includes('cau'))) return '⚽';
  if (s.includes('badminton') || s.includes('cau long')) return '🏸';
  if (s.includes('table') || s.includes('ban')) return '🏓';
  if (s.includes('shuttle') || s.includes('da cau')) return '👟';
  if (s.includes('tug') || s.includes('keo co')) return '🪢';
  return '🏆';
};

export const Header: React.FC<HeaderProps> = ({
  config,
  user,
  sports,
  activeTab,
  onTabChange,
  onSelectSport,
  onSelectCategory,
  onOpenAuth,
  onOpenNotifications,
  unreadNotificationsCount,
  isDark,
  onToggleDark,
  onThemeColorChange,
  syncStatus = 'synced',
  onOpenReports,
  onLogout,
}) => {
  const [showThemePicker, setShowThemePicker] = React.useState(false);

  const activeSport = sports.find((s) => s.id === config.activeSportId) || sports[0];
  const activeCategoryId = config.activeCategoryId || 'ALL';

  const isAssignedToCurrentSport =
    !user.assignedSports ||
    user.assignedSports.length === 0 ||
    user.role === 'admin' ||
    user.assignedSports.includes(activeSport?.id || '');

  const userAssignedCategoriesText =
    user.assignedCategories && user.assignedCategories.length > 0
      ? user.assignedCategories.join(', ')
      : 'Tất cả nội dung';

  const navLinks = [
    { id: 'overview', label: 'Tổng Quan', icon: LayoutDashboard },
    { id: 'teams', label: 'Danh Sách Đội', icon: Shield },
    { id: 'athletes', label: 'Vận Động Viên', icon: Users },
    { id: 'matches', label: 'Lịch Đấu & Tỉ Số', icon: Calendar },
    { id: 'standings', label: 'Bảng Xếp Hạng', icon: BarChart3 },
    { id: 'reports', label: 'Báo Cáo & Xuất File', icon: FileText },
    { id: 'settings', label: 'Cấu Hình & Phân Quyền', icon: Settings },
  ];

  const colorThemes = [
    { id: 'blue', label: 'Xanh Lam (Mặc định)', bg: 'bg-sky-500' },
    { id: 'emerald', label: 'Xanh Lá (Emerald)', bg: 'bg-emerald-500' },
    { id: 'amber', label: 'Vàng Cam (Amber)', bg: 'bg-amber-500' },
    { id: 'rose', label: 'Hồng Đỏ (Rose)', bg: 'bg-rose-500' },
    { id: 'violet', label: 'Tím Đậm (Violet)', bg: 'bg-violet-500' },
  ];

  const isLoggedIn = user.role !== 'viewer';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors shadow-xs no-print">
      {/* 1. Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          {/* Brand & School Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span>{config.schoolName}</span>
                <span aria-hidden="true">·</span>
                <span>{config.deptName}</span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-bold">
                  Năm {config.year || new Date().getFullYear()}
                </span>
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate max-w-[190px] sm:max-w-xs md:max-w-md">
                {config.tournamentName}
              </h1>
            </div>
          </div>

          {/* Actions: Grouped Inward Utility Cluster + Explicit Login/Logout Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* PWA Install */}
            <PWAInstallButton />

            {/* Inward Compact Utility Cluster: Flame Sync, Notifications, Theme Color, Dark/Light Mode */}
            <div className="flex items-center gap-0.5 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              {/* Nút 'Đồng bộ Firestore' đổi thành biểu tượng ngọn lửa */}
              <button
                type="button"
                onClick={onOpenAuth}
                className={`p-2 rounded-xl transition cursor-pointer relative ${
                  syncStatus === 'synced'
                    ? 'text-amber-500 hover:text-amber-600 dark:text-amber-400'
                    : syncStatus === 'connecting'
                    ? 'text-amber-400 animate-pulse'
                    : 'text-slate-400 hover:text-slate-500'
                }`}
                title={
                  syncStatus === 'synced'
                    ? 'Cơ sở dữ liệu Firestore đang đồng bộ thời gian thực (Biểu tượng ngọn lửa)'
                    : syncStatus === 'connecting'
                    ? 'Đang kết nối Firestore cloud...'
                    : 'Chế độ ngoại tuyến'
                }
                aria-label="Đồng bộ Firestore"
              >
                <Flame
                  className={`w-4 h-4 ${
                    syncStatus === 'synced'
                      ? 'fill-amber-500 text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]'
                      : syncStatus === 'connecting'
                      ? 'fill-amber-400/40 text-amber-400 animate-bounce'
                      : 'text-slate-400'
                  }`}
                />
                {syncStatus === 'synced' && (
                  <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-slate-900" />
                )}
              </button>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                title="Thông báo thời gian thực"
                aria-label="Thông báo"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Theme Color Picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                  title="Đổi chủ đề màu sắc"
                  aria-label="Chủ đề màu sắc"
                >
                  <Palette className="w-4 h-4 text-sky-500" />
                </button>

                {showThemePicker && (
                  <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 space-y-1">
                    <div className="text-[11px] font-bold text-slate-400 px-2 py-1 uppercase">Chọn chủ đề</div>
                    {colorThemes.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          onThemeColorChange(col.id as any);
                          setShowThemePicker(false);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                      >
                        <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                        <span>{col.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dark / Light Toggle */}
              <button
                type="button"
                onClick={onToggleDark}
                className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
                title="Giao diện Sáng/Tối"
                aria-label="Đổi giao diện"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Auth Buttons: "Đăng nhập: [Tên]" + Dedicated "Đăng xuất" button next to it */}
            {!isLoggedIn ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition whitespace-nowrap shadow-2xs cursor-pointer"
                title="Đăng nhập vào hệ thống giải đấu"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-600" />
                <span>Đăng nhập</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition whitespace-nowrap shadow-2xs cursor-pointer max-w-[210px] truncate ${
                    user.authProvider === 'google'
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100'
                      : user.role === 'admin'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-100'
                  }`}
                  title={`Tài khoản đang đăng nhập: ${user.displayName || user.username} (${user.role})`}
                >
                  {user.authProvider === 'google' ? (
                    <GoogleIcon />
                  ) : user.role === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  )}
                  <span className="truncate">
                    Đăng nhập: {user.displayName || user.username}
                  </span>
                </button>

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex items-center gap-1 px-2.5 py-2 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-2xs cursor-pointer shrink-0"
                    title="Đăng xuất khỏi phiên làm việc hiện tại"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Multi-Sport & Category Bar (Thi Đấu Nhiều Môn & Quản Lý Riêng Biệt) */}
      <div className="border-t border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 via-sky-50/30 to-slate-50 dark:from-slate-950 dark:via-sky-950/20 dark:to-slate-950 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Sports Selector */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
              <span>Môn đấu:</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {sports.map((sp) => {
                const isSelected = sp.id === activeSport?.id;
                const emoji = getSportEmoji(sp.id, sp.code);
                const isAssigned =
                  (user.role === 'referee' || user.role === 'secretary') &&
                  user.assignedSports &&
                  user.assignedSports.includes(sp.id);

                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => onSelectSport(sp.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
                    }`}
                    title={`Chuyển sang quản lý môn ${sp.name}`}
                  >
                    <span>{emoji}</span>
                    <span>{sp.name}</span>
                    {isAssigned && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Nhiệm vụ của bạn" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Event / Category Selector within Active Sport */}
          {activeSport?.categories && activeSport.categories.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth text-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider shrink-0">
                Nội dung:
              </span>
              <button
                type="button"
                onClick={() => onSelectCategory('ALL')}
                className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                  activeCategoryId === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                Tất cả ({activeSport.categories.length})
              </button>
              {activeSport.categories.map((cat) => {
                const isCatActive = activeCategoryId === cat.id || activeCategoryId === cat.name;
                const isCatAssigned =
                  (user.role === 'referee' || user.role === 'secretary') &&
                  user.assignedCategories &&
                  (user.assignedCategories.includes(cat.id) || user.assignedCategories.includes(cat.name));

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => onSelectCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                      isCatActive
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : isCatAssigned
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span>{cat.name}</span>
                    {isCatAssigned && (
                      <span className="text-[10px] text-emerald-600 font-extrabold" title="Phân công cho bạn">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Referee / Secretary Assignment Scope Notice */}
        {(user.role === 'referee' || user.role === 'secretary') && (
          <div className="max-w-7xl mx-auto mt-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong>Phân công nhiệm vụ:</strong> Môn{' '}
                <strong className="text-sky-600 dark:text-sky-400">
                  {user.assignedSports && user.assignedSports.length > 0
                    ? sports.filter((s) => user.assignedSports?.includes(s.id)).map((s) => s.name).join(', ')
                    : 'Tất cả các môn'}
                </strong>{' '}
                — Nội dung:{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">{userAssignedCategoriesText}</strong>
              </span>
            </div>
            {!isAssignedToCurrentSport && user.assignedSports && user.assignedSports.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectSport(user.assignedSports![0])}
                className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-bold cursor-pointer"
              >
                ← Trở về môn được phân công ({sports.find((s) => s.id === user.assignedSports![0])?.name})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Responsive Dedicated Navigation Bar - Vừa Thân Web */}
      <div className="border-t border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 no-scrollbar scroll-smooth"
            aria-label="Tabs điều hướng giải đấu"
          >
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  onClick={() => {
                    if (link.id === 'reports' && onOpenReports) {
                      onOpenReports();
                    } else {
                      onTabChange(link.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
