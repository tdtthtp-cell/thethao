import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileDown,
  Printer,
  ShieldCheck,
  KeyRound,
  Download,
  Upload,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Athlete, Match, StandingItem, Team, TournamentConfig } from '../types';
import {
  exportTournamentToExcel,
  exportMatchMinutesToWord,
  exportTournamentBackupJSON,
  exportEncryptedBackupPackage,
  importEncryptedBackupPackage,
} from '../services/export';

interface TabReportsProps {
  config: TournamentConfig;
  teams: Team[];
  athletes: Athlete[];
  matches: Match[];
  standingsByGroup: Record<string, StandingItem[]>;
  onRestoreState: (state: unknown) => void;
}

export const TabReports: React.FC<TabReportsProps> = ({
  config,
  teams,
  athletes,
  matches,
  standingsByGroup,
  onRestoreState,
}) => {
  const [encryptPassword, setEncryptPassword] = useState('');
  const [decryptPassword, setDecryptPassword] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedMatchForWord, setSelectedMatchForWord] = useState<string>(matches[0]?.id || '');

  const handleExportExcel = () => {
    try {
      exportTournamentToExcel(config, teams, athletes, matches, standingsByGroup);
      setNotice({ text: 'Đã xuất file Excel (.xlsx) thành công!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi xuất tệp Excel.', type: 'error' });
    }
  };

  const handleExportWordMinutes = () => {
    const targetMatch = matches.find((m) => m.id === selectedMatchForWord) || matches[0];
    if (!targetMatch) {
      setNotice({ text: 'Chưa có trận đấu nào để xuất biên bản.', type: 'error' });
      return;
    }
    try {
      exportMatchMinutesToWord(targetMatch, config);
      setNotice({ text: `Đã xuất biên bản trận ${targetMatch.code} sang Word (.doc)!`, type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi xuất biên bản Word.', type: 'error' });
    }
  };

  const handleExportJsonBackup = () => {
    const fullData = {
      config,
      teams,
      athletes,
      matches,
      timestamp: new Date().toISOString(),
    };
    exportTournamentBackupJSON(fullData);
    setNotice({ text: 'Đã tải xuống tệp sao lưu JSON.', type: 'success' });
  };

  const handleExportEncryptedPackage = async () => {
    if (!encryptPassword.trim()) {
      alert('Vui lòng nhập mật khẩu bảo vệ để mã hóa AES-256!');
      return;
    }
    const fullData = {
      config,
      teams,
      athletes,
      matches,
      timestamp: new Date().toISOString(),
    };
    try {
      await exportEncryptedBackupPackage(fullData, encryptPassword.trim());
      setEncryptPassword('');
      setNotice({ text: 'Đã mã hóa và xuất gói sao lưu E2EE AES-256 an toàn!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi trong quá trình mã hóa gói sao lưu.', type: 'error' });
    }
  };

  const handleImportEncryptedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!decryptPassword.trim()) {
      alert('Vui lòng nhập mật khẩu giải mã trước khi tải tệp lên!');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const restored = await importEncryptedBackupPackage(content, decryptPassword.trim());
        onRestoreState(restored);
        setDecryptPassword('');
        setNotice({ text: 'Giải mã và khôi phục dữ liệu giải đấu thành công!', type: 'success' });
      } catch (err) {
        console.error(err);
        setNotice({ text: 'Mật khẩu giải mã không đúng hoặc tệp không hợp lệ!', type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-sky-600" />
            Báo Cáo & Xuất Dữ Liệu Hành Chính Chuẩn
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Xuất file Excel (.xlsx) đa bảng tính, biên bản thi đấu Word (.doc) và sao lưu mã hóa AES-256
          </p>
        </div>
      </div>

      {/* Notice Message */}
      {notice && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
            notice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs underline">
            Đóng
          </button>
        </div>
      )}

      {/* Primary Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Excel Workbook */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Xuất Sổ Báo Cáo Excel (.xlsx)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Tạo tệp bảng tính hoàn chỉnh gồm 3 sheet: Bảng Xếp Hạng tổng hợp, Danh Sách Vận Động Viên và Lịch Đấu & Kết Quả.
            </p>
          </div>

          <button
            onClick={handleExportExcel}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Tải Xuống File Excel</span>
          </button>
        </div>

        {/* Card 2: Word Match Minutes */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileDown className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Biên Bản Trận Đấu Word (.doc)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Xuất biên bản thi đấu chính thức theo thể thức văn bản hành chính Việt Nam, có quốc hiệu, đơn vị và phần chữ ký 3 bên.
            </p>

            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Chọn trận đấu cần xuất:</label>
              <select
                value={selectedMatchForWord}
                onChange={(e) => setSelectedMatchForWord(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code}: {m.home.name} vs {m.away.name} ({m.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExportWordMinutes}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <FileDown className="w-4 h-4" />
            <span>Xuất Biên Bản Word</span>
          </button>
        </div>

        {/* Card 3: Print / PDF */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Printer className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              In & Xuất PDF Trực Tiếp
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              In bảng xếp hạng hoặc lịch thi đấu ra giấy A4 hoặc lưu thành tệp PDF với định dạng trang in đã được tối ưu hóa.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Mở Lệnh In / Lưu PDF</span>
          </button>
        </div>
      </div>

      {/* Encrypted Backup & Restore Package (E2EE AES-256) */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Sao Lưu & Khôi Phục Mã Hóa Mật Khẩu (E2EE AES-256)
            </h3>
            <p className="text-xs text-slate-400">
              Xuất hoặc nhập toàn bộ dữ liệu giải đấu được mã hóa bằng thuật toán AES-GCM 256-bit kết hợp PBKDF2
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export encrypted */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-sky-500" />
              Xuất Gói Sao Lưu Mã Hóa
            </div>
            <p className="text-xs text-slate-500">
              Đặt mật khẩu riêng để bảo vệ tệp. Khi nhập lại bắt buộc phải có mật khẩu này để giải mã:
            </p>
            <input
              type="password"
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
              placeholder="Nhập mật khẩu bảo vệ gói sao lưu..."
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
            />
            <button
              onClick={handleExportEncryptedPackage}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Gói Mã Hóa (.enc.json)</span>
            </button>
          </div>

          {/* Import encrypted */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-emerald-500" />
              Khôi Phục Từ Gói Mã Hóa
            </div>
            <p className="text-xs text-slate-500">
              Nhập mật khẩu đã đặt khi xuất tệp, sau đó chọn tệp <code>.enc.json</code> để khôi phục:
            </p>
            <input
              type="password"
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              placeholder="Mật khẩu giải mã..."
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
            />
            <label className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5" />
              <span>Chọn Tệp & Khôi Phục</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportEncryptedFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            onClick={handleExportJsonBackup}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
          >
            Xuất bản sao lưu JSON thông thường (không mã hóa)
          </button>
        </div>
      </div>
    </div>
  );
};
