import React, { useEffect } from 'react';
import { X, Printer, FileDown, Trophy } from 'lucide-react';
import { Match, TournamentConfig } from '../types';
import { exportMatchMinutesToWord, calculateMatchMinutesPoints } from '../services/export';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !match) return null;

  const isFootball = config.activeSportId === 'football';

  const refereeName = match.refereeName || config.referee || 'Bồ Công Lâm';
  const secretaryName = match.secretaryName || config.secretary || 'Trần Thị Thu Hồng';

  const calc = calculateMatchMinutesPoints(match, config);
  const homeResultDisplay = `${calc.homeTournamentPts} điểm`;
  const awayResultDisplay = `${calc.awayTournamentPts} điểm`;
  const winnerName = calc.winnerName;
  const loserName = calc.loserName;

  const handlePrint = () => {
    window.print();
  };

  const handleExportWord = () => {
    exportMatchMinutesToWord(match, config);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 my-6">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2 no-print">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Biên Bản Thi Đấu Thể Thao ({match.code})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportWord}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Xuất file Word (.doc) theo đúng mẫu"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất Word (.doc)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="In biên bản thi đấu ra giấy A4 hoặc PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Biên Bản</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Thoát khỏi biên bản (hoặc nhấn phím Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>

        {/* Printable Official Document Body */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 border border-slate-200 rounded-2xl space-y-5 shadow-xs font-serif leading-relaxed text-sm">
          {/* Official Document Header (EXACTLY matching user image) */}
          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-300 text-center font-serif">
            <div>
              <p className="font-normal uppercase tracking-wider text-xs sm:text-sm text-slate-800">
                {config.schoolName || 'TRƯỜNG THPT HUỲNH TẤN PHÁT'}
              </p>
              <p className="font-bold text-xs sm:text-sm uppercase text-slate-900 mt-1">
                <span className="underline decoration-slate-900 underline-offset-4">
                  {config.deptName || 'BAN TỔ CHỨC HỘI THAO'}
                </span>
              </p>
            </div>
            <div>
              <p className="font-bold text-xs sm:text-sm uppercase text-slate-900">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </p>
              <p className="font-bold text-xs sm:text-sm text-slate-900 mt-1">
                <span className="underline decoration-slate-900 underline-offset-4">
                  Độc lập - Tự do - Hạnh phúc
                </span>
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-950">
              BIÊN BẢN THI ĐẤU THỂ THAO
            </h2>
            <p className="text-xs italic text-slate-600">{config.tournamentName}</p>
            <p className="text-sm sm:text-base font-bold text-blue-900">
              {match.code}: {match.home.name} — {match.away.name} ({match.stage})
            </p>
          </div>

          {/* Match Meta (EXACTLY matching user image) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm font-sans py-2 border-y border-slate-100">
            <div className="space-y-1">
              <p><strong>Thời gian:</strong> {match.time} ngày {match.date || new Date().toISOString().slice(0, 10)}</p>
              <p><strong>Sân thi đấu:</strong> {match.pitch}</p>
            </div>
            <div className="space-y-1 sm:text-right">
              <p><strong>Trọng tài chính:</strong> {refereeName}</p>
              <p><strong>Thư ký bàn:</strong> {secretaryName}</p>
            </div>
          </div>

          {/* Score Table (EXACTLY matching user image) */}
          <div className="space-y-2">
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse border border-slate-300 text-xs sm:text-sm font-sans">
                <thead>
                  <tr className="bg-slate-100/90 font-bold text-slate-800">
                    <th className="border border-slate-300 p-2.5 text-left w-2/5">Đội thi đấu</th>
                    {isFootball ? (
                      <>
                        <th className="border border-slate-300 p-2.5">Hiệp chính</th>
                        <th className="border border-slate-300 p-2.5">Sút luân lưu (Pen)</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-slate-300 p-2.5 w-16">Set 1</th>
                        <th className="border border-slate-300 p-2.5 w-16">Set 2</th>
                        <th className="border border-slate-300 p-2.5 w-16">Set 3</th>
                      </>
                    )}
                    <th className="border border-slate-300 p-2.5 w-1/3">Kết quả chung cuộc</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-left font-bold">{match.home.name}</td>
                    {isFootball ? (
                      <>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set1.home}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.pen?.played ? match.scores.pen.home : '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set1.home}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set2.home}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set3.home}</td>
                      </>
                    )}
                    <td className="border border-slate-300 p-2.5 font-bold font-mono text-blue-900">{homeResultDisplay}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2.5 text-left font-bold">{match.away.name}</td>
                    {isFootball ? (
                      <>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set1.away}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.pen?.played ? match.scores.pen.away : '-'}</td>
                      </>
                    ) : (
                      <>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set1.away}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set2.away}</td>
                        <td className="border border-slate-300 p-2.5 font-mono">{match.scores.set3.away}</td>
                      </>
                    )}
                    <td className="border border-slate-300 p-2.5 font-bold font-mono text-blue-900">{awayResultDisplay}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs italic text-slate-600 dark:text-slate-400 font-sans pt-1">
              {calc.noteText}
            </p>
          </div>

          {/* Conclusion (EXACTLY matching user image) */}
          <div className="pt-2 text-xs sm:text-sm space-y-1 font-serif">
            <p className="font-bold text-slate-900">Kết luận:</p>
            <p>
              Đội thắng cuộc:{' '}
              <span className="font-bold text-emerald-700">
                {winnerName || '(Chờ kết thúc trận)'}
              </span>
            </p>
            <p>
              Đội thua cuộc:{' '}
              <span className="font-bold text-rose-600">
                {loserName || '(Xác định sau khi kết thúc trận)'}
              </span>
            </p>
            <p className="italic text-xs text-slate-600 pt-1">
              Biên bản thi đấu kết thúc vào cùng ngày. Các bên đã đọc, xác nhận kết quả chính xác và nhất trí ký tên dưới đây.
            </p>
          </div>

          {/* Signature Block (EXACTLY matching user image: Trọng tài chính, Thư ký bàn, Đại diện đội bóng (tên đội thua)) */}
          <div className="grid grid-cols-3 gap-3 pt-6 text-center text-xs font-serif">
            <div>
              <p className="font-bold uppercase text-slate-900">TRỌNG TÀI CHÍNH</p>
              <p className="italic text-[11px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900">{refereeName}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">THƯ KÝ BÀN</p>
              <p className="italic text-[11px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900">{secretaryName}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN ĐỘI BÓNG</p>
              <p className="font-bold text-[11px] text-rose-600 mt-0.5">
                {loserName ? `(Đội ${loserName} - Đội thua)` : '(Tên đội thua xác định sau trận)'}
              </p>
              <p className="italic text-[11px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</p>
              <div className="h-16" />
            </div>
          </div>
        </div>

        {/* Bottom Action Footer (no-print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 no-print">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Biên bản trận đấu: <span className="font-bold text-slate-700 dark:text-slate-200">{match.code} ({match.home.name} vs {match.away.name})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportWord}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Tải tệp Word (.doc) về máy"
            >
              <FileDown className="w-4 h-4" />
              <span>Xuất Word (.doc)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="In biên bản thi đấu ra giấy A4 hoặc PDF"
            >
              <Printer className="w-4 h-4" />
              <span>In Biên Bản</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Thoát khỏi biên bản"
            >
              <X className="w-4 h-4" />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
