import React, { useState } from 'react';
import {
  X,
  FileText,
  Printer,
  FileDown,
  FileSpreadsheet,
  Trophy,
  Calendar,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  Filter,
  Download,
  Upload,
  Lock,
} from 'lucide-react';
import { Athlete, Match, StandingItem, Team, TournamentConfig } from '../types';
import {
  exportTournamentToExcel,
  exportMatchMinutesToWord,
  exportStandingsToWord,
  exportScheduleToWord,
  exportTournamentBackupJSON,
  exportEncryptedBackupPackage,
  importEncryptedBackupPackage,
} from '../services/export';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TournamentConfig;
  teams: Team[];
  athletes: Athlete[];
  matches: Match[];
  standingsByGroup: Record<string, StandingItem[]>;
  onRestoreState?: (state: unknown) => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  config,
  teams,
  athletes,
  matches,
  standingsByGroup,
  onRestoreState,
}) => {
  const [activeTab, setActiveTab] = useState<'standings' | 'schedule' | 'minutes' | 'backup'>('standings');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[0]?.id || '');
  const [encryptPassword, setEncryptPassword] = useState('');
  const [decryptPassword, setDecryptPassword] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const currentMatch = matches.find((m) => m.id === selectedMatchId) || matches[0];

  // Unique stages for schedule filter
  const allStages = Array.from(new Set(matches.map((m) => m.stage).filter(Boolean)));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadStandingsWord = () => {
    try {
      exportStandingsToWord(config, standingsByGroup, selectedGroup);
      setNotice({ text: 'Đã xuất file Word Bảng Xếp Hạng (.doc) thành công!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi xuất file Word Bảng Xếp Hạng.', type: 'error' });
    }
  };

  const handleDownloadScheduleWord = () => {
    try {
      exportScheduleToWord(config, matches, selectedStage);
      setNotice({ text: 'Đã xuất file Word Lịch Thi Đấu (.doc) thành công!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi xuất file Word Lịch Thi Đấu.', type: 'error' });
    }
  };

  const handleDownloadMatchMinutesWord = (targetMatch?: Match) => {
    const m = targetMatch || currentMatch;
    if (!m) {
      setNotice({ text: 'Vui lòng chọn một trận đấu để xuất biên bản!', type: 'error' });
      return;
    }
    try {
      exportMatchMinutesToWord(m, config);
      setNotice({ text: `Đã xuất biên bản trận ${m.code} ra file Word (.doc)!`, type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi xuất biên bản Word.', type: 'error' });
    }
  };

  const handleExportExcel = () => {
    try {
      exportTournamentToExcel(config, teams, athletes, matches, standingsByGroup);
      setNotice({ text: 'Đã xuất file bảng tính Excel (.xlsx) thành công!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi xuất file Excel.', type: 'error' });
    }
  };

  const handleExportJson = () => {
    const fullData = { config, teams, athletes, matches, timestamp: new Date().toISOString() };
    exportTournamentBackupJSON(fullData);
    setNotice({ text: 'Đã tải tệp sao lưu JSON.', type: 'success' });
  };

  const handleExportEncrypted = async () => {
    if (!encryptPassword.trim()) {
      alert('Vui lòng nhập mật khẩu bảo vệ để mã hóa AES-256!');
      return;
    }
    try {
      const fullData = { config, teams, athletes, matches, timestamp: new Date().toISOString() };
      await exportEncryptedBackupPackage(fullData, encryptPassword.trim());
      setEncryptPassword('');
      setNotice({ text: 'Đã mã hóa và tải về gói sao lưu an toàn AES-256!', type: 'success' });
    } catch (e) {
      console.error(e);
      setNotice({ text: 'Lỗi khi mã hóa sao lưu.', type: 'error' });
    }
  };

  const handleImportEncrypted = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!decryptPassword.trim()) {
      alert('Vui lòng nhập mật khẩu giải mã trước khi chọn file!');
      return;
    }
    try {
      const text = await file.text();
      const restored = (await importEncryptedBackupPackage(text, decryptPassword.trim())) as any;
      if (restored && onRestoreState) {
        onRestoreState(restored);
        setNotice({ text: 'Khôi phục dữ liệu từ tệp mã hóa thành công!', type: 'success' });
        setDecryptPassword('');
      }
    } catch (err) {
      console.error(err);
      alert('Giải mã thất bại! Sai mật khẩu hoặc tệp sao lưu bị lỗi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Báo Cáo & Xuất Văn Bản Giải Đấu</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                  Hỗ Trợ File Word & In Ấn
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Xuất file Word (.doc) và in ấn Bảng xếp hạng, Lịch thi đấu, Biên bản thi đấu chuẩn thể thao học sinh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 no-print bg-slate-50/30 dark:bg-slate-900/30">
          <button
            type="button"
            onClick={() => { setActiveTab('standings'); setNotice(null); }}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'standings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>1. In / Xuất Bảng Xếp Hạng</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('schedule'); setNotice(null); }}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-500" />
            <span>2. In / Xuất Lịch Thi Đấu</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('minutes'); setNotice(null); }}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'minutes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-indigo-500" />
            <span>3. In / Xuất Biên Bản Thi Đấu</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('backup'); setNotice(null); }}
            className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>4. Excel & Sao Lưu Dữ Liệu</span>
          </button>
        </div>

        {/* Notice feedback banner */}
        {notice && (
          <div className="mx-5 mt-4 p-3 rounded-2xl flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="p-1 hover:text-slate-600">✕</button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* ==================== TAB 1: BẢNG XẾP HẠNG ==================== */}
          {activeTab === 'standings' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Chọn bảng xuất:</span>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                  >
                    <option value="ALL">Tất cả các bảng / khối</option>
                    {config.customGroups.map((g) => (
                      <option key={g} value={g}>Bảng: {g}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadStandingsWord}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Xuất File Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Ấn (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 p-4 space-y-4">
                <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs uppercase text-slate-400 font-semibold">{config.schoolName} - {config.deptName}</div>
                  <h4 className="text-sm font-extrabold uppercase text-slate-900 dark:text-white mt-0.5">
                    BẢNG XẾP HẠNG {config.tournamentName}
                  </h4>
                </div>

                {Object.entries(
                  selectedGroup === 'ALL'
                    ? standingsByGroup
                    : { [selectedGroup]: standingsByGroup[selectedGroup] || [] }
                ).map(([grp, items]) => (
                  <div key={grp} className="space-y-2">
                    <div className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>Bảng / Khối: {grp}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                            <th className="p-2 text-center w-10">Hạng</th>
                            <th className="p-2">Tên Đội</th>
                            <th className="p-2 text-center">Trận</th>
                            <th className="p-2 text-center">Thắng</th>
                            <th className="p-2 text-center">Hòa</th>
                            <th className="p-2 text-center">Thua</th>
                            <th className="p-2 text-center">Điểm Set</th>
                            <th className="p-2 text-center">Hiệu Số</th>
                            <th className="p-2 text-center font-bold">Tổng Điểm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {items.length === 0 ? (
                            <tr><td colSpan={9} className="p-4 text-center text-slate-400 text-xs">Chưa có dữ liệu thi đấu</td></tr>
                          ) : (
                            items.map((item, idx) => (
                              <tr key={item.team.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                <td className="p-2 text-center font-bold font-mono text-slate-500">{idx + 1}</td>
                                <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{item.team.name}</td>
                                <td className="p-2 text-center font-mono">{item.played}</td>
                                <td className="p-2 text-center font-mono text-emerald-600 font-bold">{item.won}</td>
                                <td className="p-2 text-center font-mono text-amber-600">{item.drawn}</td>
                                <td className="p-2 text-center font-mono text-rose-500">{item.lost}</td>
                                <td className="p-2 text-center font-mono">{item.ptsFor} - {item.ptsAgainst}</td>
                                <td className="p-2 text-center font-mono">{item.ptsFor - item.ptsAgainst}</td>
                                <td className="p-2 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{item.points}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: LỊCH THI ĐẤU ==================== */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Lọc theo vòng/bảng:</span>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                  >
                    <option value="ALL">Tất cả các trận ({matches.length})</option>
                    {allStages.map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadScheduleWord}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Xuất File Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Lịch Thi Đấu</span>
                  </button>
                </div>
              </div>

              {/* Matches table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase text-[10px] font-bold">
                      <th className="p-2.5 text-center w-12">Mã</th>
                      <th className="p-2.5">Vòng / Bảng</th>
                      <th className="p-2.5">Thời Gian</th>
                      <th className="p-2.5">Sân</th>
                      <th className="p-2.5 text-right">Đội Nhà</th>
                      <th className="p-2.5 text-center w-20">Tỉ Số</th>
                      <th className="p-2.5">Đội Khách</th>
                      <th className="p-2.5 text-center">Trạng Thái</th>
                      <th className="p-2.5 text-right">Biên Bản Word</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(selectedStage === 'ALL' ? matches : matches.filter((m) => m.stage === selectedStage)).map((m) => {
                      let scoreDisplay = '-';
                      if (m.status === 'FINISHED' || m.status === 'LIVE') {
                        scoreDisplay = `${m.scores.set1.home} - ${m.scores.set1.away}`;
                      }
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 text-center font-mono font-bold text-blue-600">{m.code}</td>
                          <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{m.stage}</td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">{m.date || ''} {m.time}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-400">{m.pitch}</td>
                          <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-200">{m.home.name}</td>
                          <td className="p-2.5 text-center font-mono font-black text-amber-600 bg-slate-50 dark:bg-slate-950/60">{scoreDisplay}</td>
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{m.away.name}</td>
                          <td className="p-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'FINISHED'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : m.status === 'LIVE'
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                            }`}>
                              {m.status === 'FINISHED' ? 'Đã xong' : m.status === 'LIVE' ? 'Đang đấu' : 'Sắp diễn ra'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleDownloadMatchMinutesWord(m)}
                              className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ml-auto cursor-pointer border border-blue-200 dark:border-blue-800"
                              title="Tải biên bản Word của trận đấu này"
                            >
                              <FileDown className="w-3 h-3 text-blue-600" />
                              <span>Word (.doc)</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: BIÊN BẢN THI ĐẤU ==================== */}
          {activeTab === 'minutes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs flex-1 min-w-[260px]">
                  <ClipboardList className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Chọn trận đấu:</span>
                  <select
                    value={selectedMatchId}
                    onChange={(e) => setSelectedMatchId(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                  >
                    {matches.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.code}: {m.home.name} vs {m.away.name} ({m.stage} - {m.time})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadMatchMinutesWord()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" />
                    <span>Xuất File Word (.doc)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Biên Bản</span>
                  </button>
                </div>
              </div>

              {/* Match minutes preview sheet */}
              {currentMatch ? (
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 font-serif text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  <div className="grid grid-cols-2 gap-2 text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="uppercase font-bold">{config.schoolName}</div>
                      <div className="font-semibold text-xs">{config.deptName}</div>
                    </div>
                    <div>
                      <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
                    </div>
                  </div>

                  <div className="text-center py-2">
                    <h3 className="font-bold text-base uppercase text-blue-900 dark:text-blue-300">
                      BIÊN BẢN THI ĐẤU CHÍNH THỨC
                    </h3>
                    <div className="text-xs text-slate-500 font-sans mt-0.5">
                      {currentMatch.code}: <strong>{currentMatch.home.name}</strong> vs <strong>{currentMatch.away.name}</strong> ({currentMatch.stage})
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                    <div>
                      <div><strong>Thời gian:</strong> {currentMatch.time} ngày {currentMatch.date || new Date().toLocaleDateString('vi-VN')}</div>
                      <div><strong>Sân thi đấu:</strong> {currentMatch.pitch}</div>
                    </div>
                    <div>
                      <div><strong>Trọng tài chính:</strong> {currentMatch.refereeName || config.referee}</div>
                      <div><strong>Thư ký bàn:</strong> {currentMatch.secretaryName || config.secretary}</div>
                    </div>
                  </div>

                  {/* Scores table */}
                  <div className="pt-2 font-sans">
                    <table className="w-full text-xs border border-slate-300 dark:border-slate-700 text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <th className="p-2 text-left border border-slate-300 dark:border-slate-700">Đội thi đấu</th>
                          <th className="p-2 border border-slate-300 dark:border-slate-700">Set 1</th>
                          <th className="p-2 border border-slate-300 dark:border-slate-700">Set 2</th>
                          <th className="p-2 border border-slate-300 dark:border-slate-700">Set 3</th>
                          <th className="p-2 border border-slate-300 dark:border-slate-700">Kết quả chung cuộc</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 text-left font-bold border border-slate-300 dark:border-slate-700">{currentMatch.home.name}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-mono">{currentMatch.scores.set1.home}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-mono">{currentMatch.scores.set2.home}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-mono">{currentMatch.scores.set3.home}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold font-mono">
                            {currentMatch.scores.set1.home + currentMatch.scores.set2.home + currentMatch.scores.set3.home} điểm
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 text-left font-bold border border-slate-300 dark:border-slate-700">{currentMatch.away.name}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-mono">{currentMatch.scores.set1.away}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-mono">{currentMatch.scores.set2.away}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-mono">{currentMatch.scores.set3.away}</td>
                          <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold font-mono">
                            {currentMatch.scores.set1.away + currentMatch.scores.set2.away + currentMatch.scores.set3.away} điểm
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-8 text-xs font-sans">
                    <div>
                      <div className="font-bold">ĐẠI DIỆN ĐỘI BÓNG</div>
                      <div className="h-14"></div>
                      <div className="text-slate-400 italic">(Ký, họ tên)</div>
                    </div>
                    <div>
                      <div className="font-bold">THƯ KÝ BÀN</div>
                      <div className="h-14"></div>
                      <div className="font-semibold">{currentMatch.secretaryName || config.secretary}</div>
                    </div>
                    <div>
                      <div className="font-bold">TRỌNG TÀI CHÍNH</div>
                      <div className="h-14"></div>
                      <div className="font-semibold">{currentMatch.refereeName || config.referee}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">Chưa có trận đấu nào trong giải</div>
              )}
            </div>
          )}

          {/* ==================== TAB 4: EXCEL & SAO LƯU ==================== */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Excel Workbook */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Xuất Sổ Bảng Tính Excel (.xlsx)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bao gồm 3 trang tính: Bảng xếp hạng chi tiết, Danh sách vận động viên và Lịch thi đấu kèm tỉ số.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Về File Excel (.xlsx)</span>
                  </button>
                </div>

                {/* JSON Backup */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>Sao Lưu Dữ Liệu Nhanh (JSON)</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lưu trữ toàn bộ cấu hình, danh sách đội, vận động viên và lịch thi đấu thành một tệp văn bản nhẹ.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải Tệp JSON Backup</span>
                  </button>
                </div>
              </div>

              {/* AES-256 E2EE Backup and Restore */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Sao Lưu & Khôi Phục Mã Hóa Đầu Cuối (E2EE AES-256)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-500">Đặt mật khẩu mã hóa gói:</label>
                    <input
                      type="password"
                      value={encryptPassword}
                      onChange={(e) => setEncryptPassword(e.target.value)}
                      placeholder="Nhập mật khẩu bảo vệ..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleExportEncrypted}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Xuất Gói Mã Hóa AES-256</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-500">Mật khẩu để giải mã khôi phục:</label>
                    <input
                      type="password"
                      value={decryptPassword}
                      onChange={(e) => setDecryptPassword(e.target.value)}
                      placeholder="Mật khẩu đã đặt lúc sao lưu..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none"
                    />
                    <label className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Chọn Tệp .enc.json Để Khôi Phục</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportEncrypted}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 no-print">
          <div className="text-[11px] text-slate-400">
            Hệ thống hỗ trợ xuất định dạng Word (.doc) tương thích 100% với Microsoft Word & Google Docs.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
