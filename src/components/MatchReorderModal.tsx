import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Shuffle,
  Clock,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Match, TournamentConfig } from '../types';

interface MatchReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  config: TournamentConfig;
  onSaveReorder: (reorderedMatches: Match[], noticeMsg: string) => void;
}

export const MatchReorderModal: React.FC<MatchReorderModalProps> = ({
  isOpen,
  onClose,
  matches,
  config,
  onSaveReorder,
}) => {
  // Working list of matches for reordering
  const [items, setItems] = useState<Match[]>(() => [...matches]);
  const [filterStage, setFilterStage] = useState<string>('ALL');

  // Options on saving
  const [recodeOption, setRecodeOption] = useState<boolean>(true); // Đánh lại mã Trận 01, Trận 02...
  const [rescheduleTimesOption, setRescheduleTimesOption] = useState<boolean>(false); // Sắp xếp lại giờ
  const [timeStartTime, setTimeStartTime] = useState<string>('08:00');
  const [timeInterval, setTimeInterval] = useState<number>(45);

  // Quick swap state
  const [swapMatchIdA, setSwapMatchIdA] = useState<string>('');
  const [swapMatchIdB, setSwapMatchIdB] = useState<string>('');

  // Sync working list when modal opens or matches change
  React.useEffect(() => {
    if (isOpen) {
      setItems([...matches]);
      if (matches.length >= 2) {
        setSwapMatchIdA(matches[0].id);
        setSwapMatchIdB(matches[1].id);
      }
    }
  }, [isOpen, matches]);

  if (!isOpen) return null;

  // Stages for filtering
  const allStages = Array.from(new Set(matches.map((m) => m.stage).filter(Boolean)));

  // Filtered view vs full items
  const visibleIndices = items
    .map((m, idx) => ({ m, idx }))
    .filter(({ m }) => filterStage === 'ALL' || m.stage === filterStage);

  // Move item up
  const handleMoveUp = (globalIndex: number) => {
    if (globalIndex <= 0) return;
    const next = [...items];
    const temp = next[globalIndex - 1];
    next[globalIndex - 1] = next[globalIndex];
    next[globalIndex] = temp;
    setItems(next);
  };

  // Move item down
  const handleMoveDown = (globalIndex: number) => {
    if (globalIndex >= items.length - 1) return;
    const next = [...items];
    const temp = next[globalIndex + 1];
    next[globalIndex + 1] = next[globalIndex];
    next[globalIndex] = temp;
    setItems(next);
  };

  // Move to top
  const handleMoveToTop = (globalIndex: number) => {
    if (globalIndex <= 0) return;
    const next = [...items];
    const [target] = next.splice(globalIndex, 1);
    next.unshift(target);
    setItems(next);
  };

  // Move to bottom
  const handleMoveToBottom = (globalIndex: number) => {
    if (globalIndex >= items.length - 1) return;
    const next = [...items];
    const [target] = next.splice(globalIndex, 1);
    next.push(target);
    setItems(next);
  };

  // Quick swap two matches
  const handleQuickSwap = () => {
    if (!swapMatchIdA || !swapMatchIdB || swapMatchIdA === swapMatchIdB) {
      alert('Vui lòng chọn 2 trận đấu khác nhau để hoán đổi vị trí!');
      return;
    }

    const idxA = items.findIndex((m) => m.id === swapMatchIdA);
    const idxB = items.findIndex((m) => m.id === swapMatchIdB);
    if (idxA < 0 || idxB < 0) return;

    const next = [...items];
    const temp = next[idxA];
    next[idxA] = next[idxB];
    next[idxB] = temp;
    setItems(next);
  };

  // Reset to original order
  const handleReset = () => {
    setItems([...matches]);
  };

  // Save new order
  const handleSave = () => {
    let finalMatches = items.map((m, idx) => {
      let updatedCode = m.code;
      // Auto recode if enabled (e.g. Trận 01, Trận 02, etc.)
      if (recodeOption) {
        // If it was already a numbered match like "Trận 01", re-index it
        if (/^Trận\s*\d+/i.test(m.code)) {
          updatedCode = `Trận ${(idx + 1).toString().padStart(2, '0')}`;
        }
      }

      return {
        ...m,
        code: updatedCode,
      };
    });

    // Auto reschedule times if enabled
    if (rescheduleTimesOption) {
      const parts = (timeStartTime || '08:00').split(':');
      let minOffset = (parseInt(parts[0], 10) || 8) * 60 + (parseInt(parts[1], 10) || 0);

      finalMatches = finalMatches.map((m) => {
        const h = Math.floor(minOffset / 60);
        const min = minOffset % 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        minOffset += timeInterval || 45;

        return {
          ...m,
          time: timeStr,
        };
      });
    }

    const notice = `Đã cập nhật lại thứ tự ${finalMatches.length} trận đấu thành công!`;
    onSaveReorder(finalMatches, notice);
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-sm">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <span>Điều Chỉnh Thứ Tự Thi Đấu</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                  {items.length} Trận
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Di chuyển vị trí trận đấu, hoán đổi cặp đấu, và tự động cập nhật lại mã trận hoặc giờ thi đấu
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

        {/* Quick Tools Toolbar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter by Stage */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Lọc Bảng / Vòng:</span>
              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg outline-none font-semibold text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">Tất cả bảng & vòng đấu ({items.length})</option>
                {allStages.map((stg) => (
                  <option key={stg} value={stg}>
                    {stg} ({items.filter((m) => m.stage === stg).length} trận)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Swap Form */}
            {items.length >= 2 && (
              <div className="flex flex-wrap items-center gap-2 text-xs bg-white dark:bg-slate-900 p-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Hoán đổi nhanh:</span>
                </span>
                <select
                  value={swapMatchIdA}
                  onChange={(e) => setSwapMatchIdA(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg max-w-[140px] truncate"
                >
                  {items.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      #{idx + 1} {m.code} ({m.home?.name || 'Đội 1'} vs {m.away?.name || 'Đội 2'})
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 font-bold">⇄</span>
                <select
                  value={swapMatchIdB}
                  onChange={(e) => setSwapMatchIdB(e.target.value)}
                  className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg max-w-[140px] truncate"
                >
                  {items.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      #{idx + 1} {m.code} ({m.home?.name || 'Đội 1'} vs {m.away?.name || 'Đội 2'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleQuickSwap}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition cursor-pointer"
                >
                  Đổi Vị Trí
                </button>
              </div>
            )}
          </div>

          {/* Options Checkboxes */}
          <div className="flex flex-wrap items-center gap-5 text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recodeOption}
                onChange={(e) => setRecodeOption(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Tự động đánh lại mã trận theo số thứ tự mới (Trận 01, Trận 02...)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rescheduleTimesOption}
                onChange={(e) => setRescheduleTimesOption(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Tự động cập nhật lại giờ thi đấu nối tiếp
              </span>
            </label>

            {rescheduleTimesOption && (
              <div className="flex items-center gap-2 pl-4 border-l border-slate-300 dark:border-slate-700">
                <input
                  type="time"
                  value={timeStartTime}
                  onChange={(e) => setTimeStartTime(e.target.value)}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
                <select
                  value={timeInterval}
                  onChange={(e) => setTimeInterval(Number(e.target.value))}
                  className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value={30}>30 phút/trận</option>
                  <option value={45}>45 phút/trận</option>
                  <option value={60}>60 phút/trận</option>
                  <option value={90}>90 phút/trận</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Match Reorder List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2">
          {items.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Chưa có trận đấu nào trong giải để đổi thứ tự.
            </div>
          ) : (
            visibleIndices.map(({ m, idx }, displaySeq) => {
              const isFirst = idx === 0;
              const isLast = idx === items.length - 1;

              return (
                <div
                  key={m.id}
                  className="p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition shadow-2xs"
                >
                  {/* Position number & code */}
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200/60 dark:border-indigo-800/60">
                          {recodeOption && /^Trận\s*\d+/i.test(m.code)
                            ? `Trận ${(idx + 1).toString().padStart(2, '0')}`
                            : m.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {m.stage} · {m.pitch}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {m.date ? `${m.date} ` : ''}{m.time}
                        </span>
                      </div>

                      {/* Teams vs */}
                      <div className="mt-1 font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                        <span className="text-sky-600 dark:text-sky-400">{m.home?.name || 'Đội 1'}</span>
                        <span className="text-slate-400 font-normal">vs</span>
                        <span className="text-purple-600 dark:text-purple-400">{m.away?.name || 'Đội 2'}</span>
                        {m.categoryName && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({m.categoryName})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reorder Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveToTop(idx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển lên đầu danh sách"
                    >
                      <ChevronsUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveUp(idx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="Di chuyển lên trên 1 vị trí"
                    >
                      <ArrowUp className="w-4 h-4" />
                      <span className="hidden sm:inline">Lên</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveDown(idx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="Di chuyển xuống dưới 1 vị trí"
                    >
                      <ArrowDown className="w-4 h-4" />
                      <span className="hidden sm:inline">Xuống</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveToBottom(idx)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
                      title="Chuyển xuống cuối danh sách"
                    >
                      <ChevronsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Khôi phục thứ tự ban đầu</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lưu Thứ Tự Thi Đấu Mới</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
