import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Search,
  Filter,
  Shield,
  Users,
  Calendar,
  Trash2,
  Edit,
  Plus,
  FileSpreadsheet,
  ArrowUpDown,
  CheckCircle2,
  User,
  Clock,
  Sparkles,
  Download,
} from 'lucide-react';
import { AuditLog, AuditAction, AuditEntityType, UserProfile } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
  user: UserProfile;
  onClearLogs?: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  user,
  onClearLogs,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<'ALL' | AuditEntityType>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | AuditAction>('ALL');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const isAdmin = user.role === 'admin';

  // Sort logs by timestamp descending (newest first)
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      return (b.timestamp || '').localeCompare(a.timestamp || '');
    });
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return sortedLogs.filter((log) => {
      const matchEntity = entityFilter === 'ALL' || log.entityType === entityFilter;
      const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchSearch =
        !searchTerm.trim() ||
        (log.userName && log.userName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.entityName && log.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.description && log.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.timestamp && log.timestamp.includes(searchTerm));
      return matchEntity && matchAction && matchSearch;
    });
  }, [sortedLogs, entityFilter, actionFilter, searchTerm]);

  if (!isOpen) return null;

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            <Plus className="w-3 h-3" /> Thêm mới
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300">
            <Edit className="w-3 h-3" /> Chỉnh sửa
          </span>
        );
      case 'delete':
      case 'bulk_delete':
      case 'clear':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
            <Trash2 className="w-3 h-3" /> {action === 'clear' ? 'Làm sạch' : 'Xóa'}
          </span>
        );
      case 'import':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
            <FileSpreadsheet className="w-3 h-3" /> Nhập Excel
          </span>
        );
      case 'reorder':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
            <ArrowUpDown className="w-3 h-3" /> Đổi thứ tự
          </span>
        );
      case 'score':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
            <Sparkles className="w-3 h-3" /> Cập nhật điểm
          </span>
        );
      case 'approve':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300">
            <CheckCircle2 className="w-3 h-3" /> Duyệt hồ sơ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
            {action}
          </span>
        );
    }
  };

  const getEntityIcon = (type: AuditEntityType) => {
    switch (type) {
      case 'team':
        return <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />;
      case 'athlete':
        return <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'match':
      case 'schedule':
        return <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <History className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getEntityLabel = (type: AuditEntityType) => {
    switch (type) {
      case 'team':
        return 'Đội bóng';
      case 'athlete':
        return 'VĐV';
      case 'match':
        return 'Trận đấu';
      case 'schedule':
        return 'Lịch thi đấu';
      default:
        return type;
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['STT', 'Thời Gian', 'Người Thực Hiện', 'Vai Trò', 'Hành Động', 'Đối Tượng', 'Tên Đối Tượng', 'Mô Tả Chi Tiết'];
    const rows = filteredLogs.map((log, idx) => [
      idx + 1,
      `"${log.timestamp}"`,
      `"${log.userName || ''}"`,
      `"${log.userRole || ''}"`,
      `"${log.action}"`,
      `"${getEntityLabel(log.entityType)}"`,
      `"${log.entityName || ''}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nhat_ky_quan_ly_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 flex items-center justify-center text-white shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                  Nhật Ký Quản Lý & Lịch Sử Thao Tác
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Audit Trail
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Ghi nhận chi tiết ai đã thêm, sửa, xoá đội bóng, vận động viên và lịch thi đấu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Xuất nhật ký thành file Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Xuất CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-slate-50/40 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo người thực hiện, tên đội, VĐV, trận đấu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
            >
              <option value="ALL">Tất cả đối tượng</option>
              <option value="team">🛡️ Đội bóng</option>
              <option value="athlete">👥 Vận động viên</option>
              <option value="match">📅 Trận đấu</option>
              <option value="schedule">⚡ Lịch thi đấu</option>
            </select>

            {/* Action Filter */}
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="create">+ Thêm mới</option>
              <option value="update">✎ Chỉnh sửa</option>
              <option value="delete">🗑 Xóa</option>
              <option value="import">📊 Nhập Excel</option>
              <option value="reorder">↕ Đổi thứ tự</option>
              <option value="score">⚽ Cập nhật điểm</option>
              <option value="approve">✓ Duyệt hồ sơ</option>
              <option value="clear">⚠️ Làm sạch</option>
            </select>

            {isAdmin && onClearLogs && logs.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Làm sạch lịch sử nhật ký"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa nhật ký</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                Chưa có thao tác nào được ghi nhận
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Khi người dùng đăng nhập và thực hiện thêm, sửa, xoá đội bóng, vận động viên hoặc lịch đấu, nhật ký sẽ tự động lưu vết tại đây.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-xs">
                  <tr>
                    <th className="p-3 w-36 whitespace-nowrap">Thời Gian</th>
                    <th className="p-3 w-48">Người Thực Hiện</th>
                    <th className="p-3 w-28">Hành Động</th>
                    <th className="p-3 w-28">Đối Tượng</th>
                    <th className="p-3">Chi Tiết Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                            <User className="w-3 h-3" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {log.userName || 'Người dùng nội bộ'}
                            </div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              Vai trò: {log.userRole || 'admin'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                          {getEntityIcon(log.entityType)}
                          <span>{getEntityLabel(log.entityType)}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {log.description}
                        </div>
                        {log.entityName && (
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {log.entityName}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            Hiển thị <strong>{filteredLogs.length}</strong> / {logs.length} bản ghi nhật ký thao tác
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* Clear Logs Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/80 p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 text-rose-600" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Xóa toàn bộ nhật ký hoạt động?
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ {logs.length} bản ghi lịch sử thao tác của các thành viên sẽ bị xóa. Thao tác này chỉ dành cho người quản trị cấp cao.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearLogs) onClearLogs();
                  setShowClearConfirm(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
