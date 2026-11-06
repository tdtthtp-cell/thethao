import React from 'react';
import { X, Printer, FileDown, Trophy } from 'lucide-react';
import { Match, TournamentConfig } from '../types';
import { exportMatchMinutesToWord } from '../services/export';

interface MatchMinutesModalProps {
  match: Match | null;
  config: TournamentConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const MatchMinutesModal: React.FC<MatchMinutesModalProps> = ({
  match,
  config,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !match) return null;

  const isFootball = config.activeSportId === 'football';
  const maxSets = config.matchSetsRule || 3;

  let winnerName = 'HÒA';
  let homeSetsWon = 0;
  let awaySetsWon = 0;

  if (isFootball) {
    if (match.scores.set1.home > match.scores.set1.away) winnerName = match.home.name;
    else if (match.scores.set1.away > match.scores.set1.home) winnerName = match.away.name;
    else if (match.scores.pen.played) {
      if (match.scores.pen.home > match.scores.pen.away) winnerName = `${match.home.name} (Thắng luân lưu)`;
      else if (match.scores.pen.away > match.scores.pen.home) winnerName = `${match.away.name} (Thắng luân lưu)`;
    }
  } else {
    for (let s = 1; s <= maxSets; s++) {
      const sc = match.scores[`set${s}` as keyof typeof match.scores] as { home: number; away: number };
      if (sc && sc.home > sc.away) homeSetsWon++;
      else if (sc && sc.away > sc.home) awaySetsWon++;
    }
    if (homeSetsWon > awaySetsWon) winnerName = match.home.name;
    else if (awaySetsWon > homeSetsWon) winnerName = match.away.name;
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    exportMatchMinutesToWord(match, config);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 my-6">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Biên Bản Thi Đấu Thể Thao ({match.code})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất Word (.doc)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Biên Bản</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Vietnamese Document Body */}
        <div className="p-6 sm:p-10 bg-white text-slate-900 border border-slate-200 rounded-2xl space-y-6 shadow-xs font-serif leading-relaxed text-sm">
          {/* Official Document Header */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-300 text-center">
            <div>
              <p className="font-semibold uppercase tracking-wider text-xs">{config.schoolName}</p>
              <p className="font-bold text-xs uppercase text-sky-900">{config.deptName}</p>
              <p className="text-xs">***</p>
            </div>
            <div>
              <p className="font-bold text-xs uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="text-xs italic">Độc lập - Tự do - Hạnh phúc</p>
              <p className="text-xs">---------------</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-950">
              BIÊN BẢN THI ĐẤU THỂ THAO
            </h2>
            <p className="text-xs italic text-slate-600">{config.tournamentName}</p>
            <p className="text-base font-bold text-sky-800">
              {match.code}: {match.home.name} — {match.away.name}
            </p>
          </div>

          {/* Details list */}
          <div className="space-y-2 text-xs sm:text-sm">
            <p><strong>1. Môn thi đấu:</strong> {config.activeSportId.toUpperCase()}</p>
            <p><strong>2. Thời gian:</strong> {match.time} ngày {match.date || new Date().toLocaleDateString('vi-VN')}</p>
            <p><strong>3. Địa điểm:</strong> {match.pitch}</p>
            <p><strong>4. Thành phần điều hành:</strong></p>
            <ul className="list-disc list-inside pl-4 text-xs space-y-0.5">
              <li>Trưởng Ban Tổ Chức: {config.organizer}</li>
              <li>Trọng tài chính: {match.refereeName || config.referee}</li>
              <li>Thư ký bàn: {match.secretaryName || config.secretary}</li>
            </ul>
          </div>

          {/* Score Table */}
          <div className="space-y-2">
            <p className="text-xs sm:text-sm font-bold">5. Kết quả chi tiết các hiệp / set đấu:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border border-slate-400 text-xs">
                <thead>
                  <tr className="bg-slate-100 font-bold">
                    <th className="border border-slate-400 p-2 text-left">Đội / Đơn Vị</th>
                    {isFootball ? (
                      <>
                        <th className="border border-slate-400 p-2">Hiệp Chính</th>
                        <th className="border border-slate-400 p-2">Sút Luân Lưu</th>
                      </>
                    ) : (
                      <>
                        {[1, 2, 3, 4, 5].slice(0, maxSets).map((s) => (
                          <th key={s} className="border border-slate-400 p-2">Set {s}</th>
                        ))}
                        <th className="border border-slate-400 p-2">Tổng Set</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-400 p-2 text-left font-bold">{match.home.name}</td>
                    {isFootball ? (
                      <>
                        <td className="border border-slate-400 p-2 font-mono font-bold">{match.scores.set1.home}</td>
                        <td className="border border-slate-400 p-2 font-mono">{match.scores.pen.played ? match.scores.pen.home : '-'}</td>
                      </>
                    ) : (
                      <>
                        {[1, 2, 3, 4, 5].slice(0, maxSets).map((s) => {
                          const sc = match.scores[`set${s}` as keyof typeof match.scores] as { home: number; away: number };
                          return <td key={s} className="border border-slate-400 p-2 font-mono">{sc?.home ?? 0}</td>;
                        })}
                        <td className="border border-slate-400 p-2 font-bold font-mono text-sky-800">{homeSetsWon}</td>
                      </>
                    )}
                  </tr>
                  <tr>
                    <td className="border border-slate-400 p-2 text-left font-bold">{match.away.name}</td>
                    {isFootball ? (
                      <>
                        <td className="border border-slate-400 p-2 font-mono font-bold">{match.scores.set1.away}</td>
                        <td className="border border-slate-400 p-2 font-mono">{match.scores.pen.played ? match.scores.pen.away : '-'}</td>
                      </>
                    ) : (
                      <>
                        {[1, 2, 3, 4, 5].slice(0, maxSets).map((s) => {
                          const sc = match.scores[`set${s}` as keyof typeof match.scores] as { home: number; away: number };
                          return <td key={s} className="border border-slate-400 p-2 font-mono">{sc?.away ?? 0}</td>;
                        })}
                        <td className="border border-slate-400 p-2 font-bold font-mono text-sky-800">{awaySetsWon}</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusion */}
          <div className="pt-2 text-xs sm:text-sm">
            <p>
              <strong>6. Kết luận:</strong> Đội thắng cuộc:{' '}
              <span className="font-extrabold uppercase text-emerald-800 tracking-wider">
                {winnerName}
              </span>
            </p>
            <p className="italic text-xs text-slate-500 mt-1">
              Biên bản thi đấu kết thúc vào cùng ngày. Các bên đã đọc, nhất trí hoàn toàn với kết quả và cùng ký tên.
            </p>
          </div>

          {/* Signature Block */}
          <div className="grid grid-cols-3 gap-4 pt-10 text-center text-xs font-bold">
            <div>
              <p>TRƯỞNG BAN TỔ CHỨC</p>
              <div className="h-16" />
              <p className="font-normal">{config.organizer}</p>
            </div>
            <div>
              <p>TRỌNG TÀI CHÍNH</p>
              <div className="h-16" />
              <p className="font-normal">{match.refereeName || config.referee}</p>
            </div>
            <div>
              <p>THƯ KÝ BÀN</p>
              <div className="h-16" />
              <p className="font-normal">{match.secretaryName || config.secretary}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
