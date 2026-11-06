import React, { useState } from 'react';
import {
  Sliders,
  School,
  Shield,
  Palette,
  RotateCcw,
  Plus,
  X,
  Check,
  Trophy,
  Edit2,
  Trash2,
  UserPlus,
} from 'lucide-react';
import {
  Sport,
  TournamentConfig,
  UserAccount,
  UserProfile,
  UserRole,
} from '../types';

interface TabSettingsProps {
  config: TournamentConfig;
  sports: Sport[];
  users: UserAccount[];
  currentUser: UserProfile;
  onUpdateConfig: (newConfig: TournamentConfig) => void;
  onOpenAddSport: () => void;
  onOpenEditSport: (sport: Sport) => void;
  onDeleteSport: (sportId: string) => void;
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onResetDemoData: () => void;
}

export const TabSettings: React.FC<TabSettingsProps> = ({
  config,
  sports,
  users,
  currentUser,
  onUpdateConfig,
  onOpenAddSport,
  onOpenEditSport,
  onDeleteSport,
  onSaveUser,
  onDeleteUser,
  onResetDemoData,
}) => {
  const [newGroupInput, setNewGroupInput] = useState('');
  const [newAccUser, setNewAccUser] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccRole, setNewAccRole] = useState<UserRole>('referee');
  const [newAccPass, setNewAccPass] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetPassInput, setResetPassInput] = useState('');

  const isAdmin = currentUser.role === 'admin';

  const handleChange = (key: keyof TournamentConfig, value: unknown) => {
    onUpdateConfig({
      ...config,
      [key]: value,
    });
  };

  const handleAddGroup = () => {
    const val = newGroupInput.trim();
    if (val && !config.customGroups.includes(val)) {
      onUpdateConfig({
        ...config,
        customGroups: [...config.customGroups, val],
      });
      setNewGroupInput('');
    }
  };

  const handleRemoveGroup = (groupToRemove: string) => {
    onUpdateConfig({
      ...config,
      customGroups: config.customGroups.filter((g) => g !== groupToRemove),
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccUser.trim() || !newAccPass.trim()) return alert('Vui lòng điền đủ tên đăng nhập & mật khẩu!');

    const newAcc: UserAccount = {
      id: 'U_' + Date.now(),
      username: newAccUser.trim(),
      password: newAccPass.trim(),
      displayName: newAccName.trim() || newAccUser.trim(),
      role: newAccRole,
      title: newAccRole === 'admin' ? 'Trưởng BTC' : newAccRole === 'referee' ? 'Trọng tài' : 'Thư ký',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onSaveUser(newAcc);
    setNewAccUser('');
    setNewAccName('');
    setNewAccPass('');
    alert('Đã cấp tài khoản thành công!');
  };

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            Cấu Hình Giải Đấu & Quản Trị Hệ Thống
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Quản lý môn thi đấu (thêm/sửa/xóa), phân quyền người dùng, tiêu chí xếp hạng và đồng bộ thời gian thực
          </p>
        </div>
      </div>

      {/* DYNAMIC SPORTS DISCIPLINE MANAGEMENT */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-sky-600" />
              Danh Sách Môn Thi Đấu (Thêm, Sửa, Xóa)
            </h3>
            <p className="text-xs text-slate-400">
              Ban tổ chức có thể tùy biến các môn thể thao trong giải, số hiệp/set và luật điểm
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={onOpenAddSport}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Môn Thi Đấu Mới</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sports.map((sp) => {
            const isActive = config.activeSportId === sp.id;
            return (
              <div
                key={sp.id}
                className={`p-4 rounded-2xl border transition space-y-3 ${
                  isActive
                    ? 'border-sky-500 bg-sky-50/60 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {sp.name}
                  </span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black">
                      Đang chọn
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div>• Số set: <strong className="text-slate-800 dark:text-slate-200">{sp.maxSets} set</strong></div>
                  <div>• Cách tính: <strong className="text-slate-800 dark:text-slate-200">{sp.pointScheme === 'standard' ? 'Quy chuẩn' : 'Điểm cố định'}</strong></div>
                  {sp.description && <div className="text-[10px] italic line-clamp-2">{sp.description}</div>}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800 text-xs">
                  <button
                    onClick={() => handleChange('activeSportId', sp.id)}
                    className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                  >
                    {isActive ? 'Đang áp dụng' : 'Áp dụng môn này'}
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditSport(sp)}
                        className="p-1.5 text-slate-500 hover:text-sky-600 rounded"
                        title="Sửa môn thi đấu"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {sports.length > 1 && (
                        <button
                          onClick={() => onDeleteSport(sp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Xóa môn thi đấu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* USER MANAGEMENT & ROLE-BASED ACCESS CONTROL */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-600" />
              Phân Quyền Người Dùng & Cấp Mật Khẩu (Admin)
            </h3>
            <p className="text-xs text-slate-400">
              Quản trị viên có toàn quyền cấp tài khoản mới, phân quyền và reset mật khẩu
            </p>
          </div>
        </div>

        {isAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create User Form */}
            <form onSubmit={handleCreateUser} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-sky-500" />
                Cấp Tài Khoản Mới
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tên đăng nhập *</label>
                <input
                  type="text"
                  required
                  value={newAccUser}
                  onChange={(e) => setNewAccUser(e.target.value)}
                  placeholder="VD: trongtai_2"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Họ tên hiển thị</label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="VD: Trọng tài Trần Văn C"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Vai trò phân quyền</label>
                <select
                  value={newAccRole}
                  onChange={(e) => setNewAccRole(e.target.value as UserRole)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                >
                  <option value="admin">Quản Trị Viên (Admin)</option>
                  <option value="referee">Trọng Tài Chính</option>
                  <option value="secretary">Thư Ký Bàn</option>
                  <option value="athlete">Đội Trưởng / VĐV</option>
                  <option value="viewer">Khách Xem</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mật khẩu cấp *</label>
                <input
                  type="password"
                  required
                  value={newAccPass}
                  onChange={(e) => setNewAccPass(e.target.value)}
                  placeholder="Mật khẩu..."
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition"
              >
                Cấp Tài Khoản
              </button>
            </form>

            {/* Users Table */}
            <div className="lg:col-span-2 space-y-2">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase text-[10px] font-semibold">
                      <th className="p-2.5">Tài Khoản</th>
                      <th className="p-2.5">Họ Tên</th>
                      <th className="p-2.5">Vai Trò</th>
                      <th className="p-2.5 text-right">Reset Mật Khẩu / Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold font-mono text-sky-600 dark:text-sky-400">{u.username}</td>
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{u.displayName}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                              : u.role === 'referee'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : u.role === 'secretary'
                              ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          {editingUserId === u.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="text"
                                placeholder="MK mới..."
                                value={resetPassInput}
                                onChange={(e) => setResetPassInput(e.target.value)}
                                className="w-24 px-1.5 py-0.5 text-xs bg-slate-50 dark:bg-slate-900 border rounded"
                              />
                              <button
                                onClick={() => {
                                  if (!resetPassInput.trim()) return alert('Vui lòng nhập mật khẩu!');
                                  onSaveUser({ ...u, password: resetPassInput.trim() });
                                  setEditingUserId(null);
                                  setResetPassInput('');
                                  alert(`Đã đổi mật khẩu cho ${u.username}!`);
                                }}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-bold"
                              >
                                Lưu
                              </button>
                              <button onClick={() => setEditingUserId(null)} className="text-slate-400 p-1">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setEditingUserId(u.id); setResetPassInput(''); }}
                                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                              >
                                Reset MK
                              </button>
                              {u.username !== 'admin' && (
                                <button
                                  onClick={() => onDeleteUser(u.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">
            Bạn cần đăng nhập với vai trò <strong>Quản Trị Viên (Admin)</strong> để quản lý phân quyền và cấp mật khẩu.
          </div>
        )}
      </div>

      {/* UNIT & OFFICIALS INFORMATION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <School className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Thông Tin Đơn Vị & Ban Điều Hành
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Tên Trường / Cơ Sở
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={config.schoolName}
                onChange={(e) => handleChange('schoolName', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Tổ Chuyên Môn / Phòng Ban
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={config.deptName}
                onChange={(e) => handleChange('deptName', e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold uppercase text-slate-400">Danh Sách Cán Bộ Điều Hành</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Trưởng BTC</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={config.organizer}
                    onChange={(e) => handleChange('organizer', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Trọng tài chính</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={config.referee}
                    onChange={(e) => handleChange('referee', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Thư ký bàn</label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={config.secretary}
                    onChange={(e) => handleChange('secretary', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOM GROUPS / BLOCKS MANAGEMENT */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Bảng Đấu & Phân Khối Lớp
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {config.customGroups.map((grp) => (
                <span
                  key={grp}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 font-bold text-xs flex items-center gap-2"
                >
                  {grp}
                  {isAdmin && config.customGroups.length > 1 && (
                    <button
                      onClick={() => handleRemoveGroup(grp)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <input
                type="text"
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                placeholder="Tên bảng mới (VD: Bảng C, Khối 12 Nữ...)"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
              <button
                onClick={handleAddGroup}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm Bảng
              </button>
            </div>
          )}
        </div>
      </div>

      {/* COLOR THEME PRESETS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Palette className="w-4 h-4 text-sky-600" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Tùy Chỉnh Chủ Đề Màu Sắc Cá Nhân Hóa
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: 'blue', label: 'Huỳnh Tấn Phát', color: 'bg-sky-500', hex: '#0284c7' },
            { id: 'emerald', label: 'Sân Cỏ (Emerald)', color: 'bg-emerald-500', hex: '#059669' },
            { id: 'amber', label: 'Hoàng Kim (Amber)', color: 'bg-amber-500', hex: '#d97706' },
            { id: 'rose', label: 'Nhiệt Huyết (Ruby)', color: 'bg-rose-500', hex: '#e11d48' },
            { id: 'violet', label: 'Thể Thao (Violet)', color: 'bg-violet-500', hex: '#7c3aed' },
          ].map((theme) => {
            const isSelected = config.themeColor === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => handleChange('themeColor', theme.id)}
                className={`p-3 rounded-2xl border text-left transition ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-5 h-5 rounded-full ${theme.color} shadow-xs`} />
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-600" />}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">{theme.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DATA RESET */}
      {isAdmin && (
        <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Làm trống toàn bộ dữ liệu mẫu (xóa sạch VĐV, Đội và Lịch đấu mẫu để bắt đầu giải đấu mới).
          </div>
          <button
            onClick={onResetDemoData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Làm Trống Dữ Liệu
          </button>
        </div>
      )}
    </div>
  );
};
