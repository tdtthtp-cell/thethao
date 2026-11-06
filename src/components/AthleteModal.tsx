import React, { useState } from 'react';
import { X, Lock, ShieldCheck, UserPlus } from 'lucide-react';
import { Athlete, Team, UserProfile } from '../types';
import { encryptText } from '../services/crypto';

interface AthleteModalProps {
  athlete?: Athlete | null;
  teams: Team[];
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (athlete: Athlete) => void;
}

export const AthleteModal: React.FC<AthleteModalProps> = ({
  athlete,
  teams,
  user,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(athlete?.name || '');
  const [teamId, setTeamId] = useState(athlete?.teamId || (teams[0]?.id || ''));
  const [jerseyNumber, setJerseyNumber] = useState<number>(athlete?.jerseyNumber || 10);
  const [position, setPosition] = useState(athlete?.position || 'Tiền đạo / Chủ công');
  const [dateOfBirth, setDateOfBirth] = useState(athlete?.dateOfBirth || '2010-01-01');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<Athlete['status']>(athlete?.status || (user.role === 'admin' ? 'approved' : 'pending'));
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập họ và tên vận động viên!');

    setIsSubmitting(true);
    const selectedTeam = teams.find((t) => t.id === teamId) || teams[0];

    // Encrypt sensitive fields with E2EE
    const encNationalId = nationalId ? await encryptText(nationalId) : (athlete?.nationalIdEncrypted || 'e2ee:aXRtc3BvcnRfZW5j');
    const encPhone = phone ? await encryptText(phone) : (athlete?.phoneEncrypted || 'e2ee:aXRtc3BvcnRfZW5j');

    const athleteData: Athlete = {
      id: athlete?.id || 'A_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      teamId: selectedTeam ? selectedTeam.id : 'T_DEFAULT',
      teamName: selectedTeam ? selectedTeam.name : 'Đội Tự Do',
      group: selectedTeam ? selectedTeam.group : 'Khối 10',
      jerseyNumber: Number(jerseyNumber) || 1,
      position: position.trim() || 'Vận động viên',
      dateOfBirth: dateOfBirth || '2010-01-01',
      nationalIdEncrypted: encNationalId,
      phoneEncrypted: encPhone,
      status: user.role === 'admin' ? status : 'pending',
      registeredAt: athlete?.registeredAt || new Date().toISOString().slice(0, 10),
      goalsOrPoints: athlete?.goalsOrPoints || 0,
      yellowCards: athlete?.yellowCards || 0,
      redCards: athlete?.redCards || 0,
      mvpCount: athlete?.mvpCount || 0,
    };

    setIsSubmitting(false);
    onSave(athleteData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {athlete ? 'Chỉnh Sửa Hồ Sơ VĐV' : 'Đăng Ký Vận Động Viên Mới'}
              </h3>
              <p className="text-xs text-slate-400">Hồ sơ được bảo mật bằng mã hóa đầu cuối E2EE AES-256</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* E2EE Info Callout */}
        <div className="p-3 bg-sky-50/60 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800 flex items-center gap-2.5 text-xs text-sky-800 dark:text-sky-300">
          <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0" />
          <div>
            <strong>Mã hóa đầu cuối chủ động:</strong> Số CCCD và Số điện thoại được mã hóa trực tiếp trên thiết bị bằng AES-256 trước khi lưu trữ.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Họ và Tên VĐV *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn Hoàng"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Đội / Lớp Thi Đấu</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.group})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Số Áo Thi Đấu</label>
              <input
                type="number"
                min="0"
                max="99"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Vị Trí / Hạng Cân</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="VD: Chủ công, Hậu vệ, Tiền đạo"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Ngày Tháng Năm Sinh</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Sensitive E2EE fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500 mb-1">
                <Lock className="w-3 h-3 text-sky-500" />
                Số CCCD / Mã Định Danh
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder={athlete ? 'Đã mã hóa (nhập để đổi)' : '07920800xxxx'}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-semibold uppercase text-slate-500 mb-1">
                <Lock className="w-3 h-3 text-sky-500" />
                Số Điện Thoại Liên Hệ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={athlete ? 'Đã mã hóa (nhập để đổi)' : '0901234567'}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>

          {/* Admin Approval Switch */}
          {user.role === 'admin' && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Trạng Thái Phê Duyệt Hồ Sơ (BTC)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'approved', label: 'Đã Duyệt', color: 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
                  { id: 'pending', label: 'Chờ Duyệt', color: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
                  { id: 'needs_revision', label: 'Cần Bổ Sung', color: 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/40' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id as Athlete['status'])}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition ${
                      status === s.id ? s.color : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              {isSubmitting ? 'Đang mã hóa...' : athlete ? 'Cập Nhật Hồ Sơ' : 'Lưu Đăng Ký'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
