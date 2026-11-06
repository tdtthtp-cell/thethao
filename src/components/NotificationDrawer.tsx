import React, { useState } from 'react';
import { X, Bell, CheckCheck, Trash2, Send, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { NotificationItem } from '../types';
import { requestNotificationPermission, sendSmartNotification } from '../services/notifications';

interface NotificationDrawerProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onAddNotification: (item: NotificationItem) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearAll,
  onAddNotification,
}) => {
  const [filter, setFilter] = useState<'all' | 'score' | 'match_start' | 'system'>('all');
  const [hasPushPermission, setHasPushPermission] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  if (!isOpen) return null;

  const handleRequestPush = async () => {
    const granted = await requestNotificationPermission();
    setHasPushPermission(granted);
    if (granted) {
      const item = sendSmartNotification(
        'Đã bật thông báo đẩy thành công!',
        'Bạn sẽ nhận thông báo thời gian thực về tỉ số và sự kiện trận đấu.',
        'system'
      );
      onAddNotification(item);
    }
  };

  const handleSendTestPush = () => {
    const item = sendSmartNotification(
      'VÀO! Tỉ số mới được cập nhật!',
      'Lớp 10A1 vừa nâng tỉ số lên 2 - 1 trong trận gặp Lớp 10A2!',
      'score'
    );
    onAddNotification(item);
  };

  const filtered = notifications.filter((n) => filter === 'all' || n.type === filter);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Trung Tâm Thông Báo</h3>
              <p className="text-[11px] text-slate-400">Cập nhật thời gian thực & âm thanh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Push Notification Permission Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Thông Báo Đẩy Thông Minh
            </span>
            {hasPushPermission ? (
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                ✓ Đang hoạt động
              </span>
            ) : (
              <button
                onClick={handleRequestPush}
                className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
              >
                + Bật thông báo đẩy
              </button>
            )}
          </div>
          <button
            onClick={handleSendTestPush}
            className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Send className="w-3 h-3" />
            Phát Thử Thông Báo Trực Tiếp
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
            {(['all', 'score', 'match_start', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-2 py-1 rounded-md font-medium transition ${
                  filter === t
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {t === 'all' ? 'Tất cả' : t === 'score' ? 'Tỉ số' : t === 'match_start' ? 'Trận đấu' : 'Hệ thống'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={onMarkAllAsRead}
              className="p-1.5 text-slate-400 hover:text-sky-600"
              title="Đánh dấu đã đọc"
            >
              <CheckCheck className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClearAll}
              className="p-1.5 text-slate-400 hover:text-rose-600"
              title="Xóa tất cả"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Chưa có thông báo nào trong danh mục này.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition ${
                  item.read
                    ? 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                    : 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900 text-slate-800 dark:text-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                    {item.type === 'score' ? (
                      <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : item.type === 'match_start' ? (
                      <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                    <span>{item.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{item.timestamp}</span>
                </div>
                <p className="text-xs mt-1 text-slate-600 dark:text-slate-300 leading-relaxed">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
