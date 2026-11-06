import React, { useState } from 'react';
import { X, Edit3, AlertCircle, Hash } from 'lucide-react';
import { Match, MatchSetScores, MatchStatus, Team, TournamentConfig } from '../types';

interface MatchEditModalProps {
  match: Match | null;
  teams: Team[];
  config: TournamentConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMatch: Match) => void;
}

export const MatchEditModal: React.FC<MatchEditModalProps> = ({
  match,
  teams,
  config,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !match) return null;

  const [code, setCode] = useState(match.code);
  const [stage, setStage] = useState(match.stage);
  const [pitch, setPitch] = useState(match.pitch);
  const [date, setDate] = useState(match.date || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(match.time || '08:00');

  const [homeId, setHomeId] = useState(match.home.id);
  const [homeName, setHomeName] = useState(match.home.name);
  const [awayId, setAwayId] = useState(match.away.id);
  const [awayName, setAwayName] = useState(match.away.name);

  const [status, setStatus] = useState<MatchStatus>(match.status);
  const [scores, setScores] = useState<MatchSetScores>(
    match.scores || {
      set1: { home: 0, away: 0 },
      set2: { home: 0, away: 0 },
      set3: { home: 0, away: 0 },
      set4: { home: 0, away: 0 },
      set5: { home: 0, away: 0 },
      pen: { home: 0, away: 0, played: false },
    }
  );
  const [refereeName, setRefereeName] = useState(match.refereeName || config.referee);
  const [secretaryName, setSecretaryName] = useState(match.secretaryName || config.secretary);
  const [notes, setNotes] = useState(match.notes || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const hasTeamsDropdown = teams.length >= 2;
  const isFootball = config.activeSportId === 'football';
  const maxSets = config.matchSetsRule || 3;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const finalHomeName = hasTeamsDropdown
      ? (teams.find((t) => t.id === homeId)?.name || homeName).trim()
      : homeName.trim();
    const finalAwayName = hasTeamsDropdown
      ? (teams.find((t) => t.id === awayId)?.name || awayName).trim()
      : awayName.trim();

    if (!finalHomeName || !finalAwayName) {
      setValidationError('Vui lòng nhập đầy đủ tên cho Đội Nhà và Đội Khách!');
      return;
    }

    if (finalHomeName.toLowerCase() === finalAwayName.toLowerCase()) {
      setValidationError('Đội nhà và đội khách không thể là cùng một đội!');
      return;
    }

    const homeTeam: Team =
      (hasTeamsDropdown ? teams.find((t) => t.id === homeId) : null) || {
        id: match.home.id || 'T_' + Date.now() + '_home',
        name: finalHomeName,
        group: stage,
        color: '#0284c7',
      };

    const awayTeam: Team =
      (hasTeamsDropdown ? teams.find((t) => t.id === awayId) : null) || {
        id: match.away.id || 'T_' + Date.now() + '_away',
        name: finalAwayName,
        group: stage,
        color: '#059669',
      };

    const updated: Match = {
      ...match,
      code: code.trim(),
      stage,
      pitch: pitch.trim(),
      date,
      time,
      home: homeTeam,
      away: awayTeam,
      status,
      scores,
      refereeName: refereeName.trim(),
      secretaryName: secretaryName.trim(),
      notes: notes.trim(),
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {match.code ? `Thông Tin Trận Đấu (${match.code})` : 'Tạo Trận Đấu Mới'}
              </h3>
              <p className="text-xs text-slate-400">
                Chỉnh sửa ngày giờ, sân thi đấu, cán bộ điều hành và hai đội tham gia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {validationError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Mã Trận Đấu *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Bảng / Khối Đấu
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              >
                {config.customGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Ngày Thi Đấu
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Giờ Thi Đấu
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Sân Đấu
              </label>
              <input
                type="text"
                required
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="VD: Sân 1, Sân NTĐ"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Đội Nhà (Home) *
              </label>
              {hasTeamsDropdown ? (
                <select
                  value={homeId}
                  onChange={(e) => {
                    setHomeId(e.target.value);
                    const sel = teams.find((t) => t.id === e.target.value);
                    if (sel) setHomeName(sel.name);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.group})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={homeName}
                  onChange={(e) => setHomeName(e.target.value)}
                  placeholder="Ví dụ: Lớp 10A1"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Đội Khách (Away) *
              </label>
              {hasTeamsDropdown ? (
                <select
                  value={awayId}
                  onChange={(e) => {
                    setAwayId(e.target.value);
                    const sel = teams.find((t) => t.id === e.target.value);
                    if (sel) setAwayName(sel.name);
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.group})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  value={awayName}
                  onChange={(e) => setAwayName(e.target.value)}
                  placeholder="Ví dụ: Lớp 10A2"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Trọng Tài Chính
              </label>
              <input
                type="text"
                value={refereeName}
                onChange={(e) => setRefereeName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Thư Ký Bàn
              </label>
              <input
                type="text"
                value={secretaryName}
                onChange={(e) => setSecretaryName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Trạng Thái Trận Đấu
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'UPCOMING', label: 'Sắp Diễn Ra', color: 'border-slate-300 text-slate-600' },
                {
                  id: 'LIVE',
                  label: 'Đang Thi Đấu (LIVE)',
                  color: 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/40',
                },
                {
                  id: 'FINISHED',
                  label: 'Đã Kết Thúc',
                  color: 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
                },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStatus(s.id as MatchStatus)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center transition min-h-[44px] ${
                    status === s.id
                      ? `${s.color} ring-2 ring-sky-500/20 font-black`
                      : 'border-slate-200 dark:border-slate-800 text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keyboard Set Scores Input Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-sky-600" />
                <span>Tỉ Số Các Set Đấu (Nhập Trực Tiếp Từ Bàn Phím)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {homeName || 'Đội Nhà'} vs {awayName || 'Đội Khách'}
              </span>
            </div>

            <div className="space-y-2">
              {isFootball ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Hiệp Chính (Bàn Thắng)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={scores.set1.home}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setScores((prev) => ({
                            ...prev,
                            set1: { ...prev.set1, home: val },
                          }));
                        }}
                        className="w-16 px-2 py-1.5 text-center font-mono font-bold text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                        title="Điểm Đội Nhà"
                      />
                      <span className="font-bold text-slate-400">-</span>
                      <input
                        type="number"
                        min="0"
                        value={scores.set1.away}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setScores((prev) => ({
                            ...prev,
                            set1: { ...prev.set1, away: val },
                          }));
                        }}
                        className="w-16 px-2 py-1.5 text-center font-mono font-bold text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                        title="Điểm Đội Khách"
                      />
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="block text-[11px] font-semibold text-slate-500 mb-1">Sút Luân Lưu (Pen)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={scores.pen.home}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setScores((prev) => ({
                            ...prev,
                            pen: { ...prev.pen, home: val, played: true },
                          }));
                        }}
                        className="w-16 px-2 py-1.5 text-center font-mono font-bold text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                        title="Pen Đội Nhà"
                      />
                      <span className="font-bold text-slate-400">-</span>
                      <input
                        type="number"
                        min="0"
                        value={scores.pen.away}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setScores((prev) => ({
                            ...prev,
                            pen: { ...prev.pen, away: val, played: true },
                          }));
                        }}
                        className="w-16 px-2 py-1.5 text-center font-mono font-bold text-base bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                        title="Pen Đội Khách"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[1, 2, 3, 4, 5].slice(0, Math.max(3, maxSets)).map((s) => {
                    const setKey = `set${s}` as keyof typeof scores;
                    const setScore = scores[setKey] as { home: number; away: number };
                    return (
                      <div
                        key={s}
                        className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                          <span>Set {s}</span>
                          <span className="text-[10px] text-slate-400">
                            {setScore.home > setScore.away
                              ? `Thắng: ${homeName || 'Nhà'}`
                              : setScore.away > setScore.home
                              ? `Thắng: ${awayName || 'Khách'}`
                              : 'Chưa có'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                          <input
                            type="number"
                            min="0"
                            value={setScore.home}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setScores((prev) => ({
                                ...prev,
                                [setKey]: { ...(prev[setKey] as { home: number; away: number }), home: val },
                              }));
                            }}
                            className="w-full py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder="0"
                            title={`Điểm Set ${s} - ${homeName || 'Đội Nhà'}`}
                          />
                          <span className="font-bold text-slate-400 text-xs">:</span>
                          <input
                            type="number"
                            min="0"
                            value={setScore.away}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setScores((prev) => ({
                                ...prev,
                                [setKey]: { ...(prev[setKey] as { home: number; away: number }), away: val },
                              }));
                            }}
                            className="w-full py-1 text-center font-mono font-black text-sm bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-sky-500"
                            placeholder="0"
                            title={`Điểm Set ${s} - ${awayName || 'Đội Khách'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Ghi Chú Trận Đấu
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú về điều kiện thi đấu, vòng thi đấu..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl min-h-[44px]"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition shadow-xs min-h-[44px]"
            >
              Lưu Trận Đấu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
