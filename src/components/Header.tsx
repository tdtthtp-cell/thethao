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
} from 'lucide-react';
import { TournamentConfig, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  config: TournamentConfig;
  user: UserProfile;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount: number;
  isDark: boolean;
  onToggleDark: () => void;
  onThemeColorChange: (color: TournamentConfig['themeColor']) => void;
  syncStatus?: 'synced' | 'connecting' | 'error';
  onOpenReports?: () => void;
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

export const Header: React.FC<HeaderProps> = ({
  config,
  user,
  activeTab,
  onTabChange,
  onOpenAuth,
  onOpenNotifications,
  unreadNotificationsCount,
  isDark,
  onToggleDark,
  onThemeColorChange,
  syncStatus = 'synced',
  onOpenReports,
}) => {
  const [showThemePicker, setShowThemePicker] = React.useState(false);

  const getRoleLabel = () => {
    if (user.authProvider === 'google') {
      return user.displayName || user.email || 'Tài khoản Google';
    }
    switch (user.role) {
      case 'admin':
        return user.displayName === 'admin' ? 'Admin: admin' : `Admin: ${user.displayName}`;
      case 'referee':
        return `Trọng tài: ${user.displayName}`;
      case 'secretary':
        return `Thư ký: ${user.displayName}`;
      case 'athlete':
        return user.displayName || 'VĐV / Đội';
      default:
        return 'Đăng Nhập';
    }
  };

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
              </div>
              <h1 className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight truncate max-w-[190px] sm:max-w-xs md:max-w-md">
                {config.tournamentName}
              </h1>
            </div>
          </div>

          {/* Actions & Google / Auth Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Cloud Sync Status Badge */}
            <div
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition ${
                syncStatus === 'synced'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={
                syncStatus === 'synced'
                  ? 'Cơ sở dữ liệu Firestore đang đồng bộ thời gian thực trên tất cả thiết bị'
                  : syncStatus === 'connecting'
                  ? 'Đang kết nối Firestore cloud...'
                  : 'Chế độ lưu trữ thiết bị cục bộ'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-500 animate-pulse'
                    : syncStatus === 'connecting'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-slate-400'
                }`}
              />
              <span className="hidden md:inline">
                {syncStatus === 'synced' ? 'Đồng bộ Firestore' : syncStatus === 'connecting' ? 'Đang kết nối...' : 'Ngoại tuyến'}
              </span>
            </div>

            {/* PWA Install */}
            <PWAInstallButton />

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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

            {/* Theme Picker Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
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
              onClick={onToggleDark}
              className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Giao diện Sáng/Tối"
              aria-label="Đổi giao diện"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Google / Account Switcher Button */}
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition whitespace-nowrap shrink-0 shadow-xs cursor-pointer ${
                user.role === 'viewer'
                  ? 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                  : user.authProvider === 'google'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 hover:bg-blue-100'
                  : user.role === 'admin'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              title={
                user.role === 'viewer'
                  ? 'Đăng nhập bằng tài khoản Google hoặc tài khoản BTC'
                  : `Tài khoản: ${user.displayName} (${user.role})`
              }
            >
              {user.role === 'viewer' ? (
                <>
                  <GoogleIcon />
                  <span className="hidden sm:inline">Đăng Nhập Gmail (Xác Nhận)</span>
                  <span className="sm:hidden">Gmail</span>
                </>
              ) : user.authProvider === 'google' ? (
                <>
                  <GoogleIcon />
                  <span className="hidden sm:inline">Gmail: {user.displayName}</span>
                  <span className="sm:hidden">Gmail</span>
                </>
              ) : user.role === 'admin' ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Admin: {user.displayName}</span>
                  <span className="sm:hidden">admin</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden sm:inline">{getRoleLabel()}</span>
                  <span className="sm:hidden">{user.displayName || 'BTC'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Responsive Dedicated Navigation Bar - Vừa Thân Web */}
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
