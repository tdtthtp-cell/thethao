import React, { useState } from 'react';
import { X, Trophy } from 'lucide-react';
import { Sport } from '../types';

interface SportModalProps {
  sport?: Sport | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sport: Sport) => void;
}

export const SportModal: React.FC<SportModalProps> = ({
  sport,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState(sport?.name || '');
  const [maxSets, setMaxSets] = useState<number>(sport?.maxSets || 3);
  const [pointScheme, setPointScheme] = useState<Sport['pointScheme']>(sport?.pointScheme || 'standard');
  const [ptsWin, setPtsWin] = useState<number>(sport?.ptsWin || 3);
  const [ptsDraw, setPtsDraw] = useState<number>(sport?.ptsDraw || 0);
  const [ptsLoss, setPtsLoss] = useState<number>(sport?.ptsLoss || 0);
  const [description, setDescription] = useState(sport?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên môn thi đấu!');

    const id = sport?.id || 'SPORT_' + Date.now();
    const code = name.toUpperCase().replace(/\s+/g, '_');

    onSave({
      id,
      name: name.trim(),
      code,
      maxSets: Number(maxSets) || 1,
      pointScheme,
      ptsWin: Number(ptsWin) || 3,
      ptsDraw: Number(ptsDraw) || 0,
      ptsLoss: Number(ptsLoss) || 0,
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {sport ? 'Chỉnh Sửa Môn Thi Đấu' : 'Thêm Môn Thi Đấu Mới'}
              </h3>
              <p className="text-xs text-slate-400">Cấu hình tên môn, số set và cách tính điểm</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Tên Môn Thi Đấu *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Cầu mây, Bóng rổ, Kéo co, Cờ vua..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Số Set Tối Đa
              </label>
              <select
                value={maxSets}
                onChange={(e) => setMaxSets(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value={1}>1 Set / 1 Hiệp chính</option>
                <option value={3}>3 Set (Thắng 2)</option>
                <option value={5}>5 Set (Thắng 3)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                Quy Tắc Điểm
              </label>
              <select
                value={pointScheme}
                onChange={(e) => setPointScheme(e.target.value as Sport['pointScheme'])}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              >
                <option value="standard">Quy chuẩn thể thao</option>
                <option value="custom">Điểm cố định</option>
              </select>
            </div>
          </div>

          {pointScheme === 'custom' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <span>Thắng:</span>
                <input
                  type="number"
                  value={ptsWin}
                  onChange={(e) => setPtsWin(Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-center bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div className="flex items-center gap-1">
                <span>Hòa:</span>
                <input
                  type="number"
                  value={ptsDraw}
                  onChange={(e) => setPtsDraw(Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-center bg-white dark:bg-slate-900 border rounded"
                />
              </div>
              <div className="flex items-center gap-1">
                <span>Thua:</span>
                <input
                  type="number"
                  value={ptsLoss}
                  onChange={(e) => setPtsLoss(Number(e.target.value))}
                  className="w-12 px-1 py-0.5 text-center bg-white dark:bg-slate-900 border rounded"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
              Mô Tả Luật Hoặc Ghi Chú
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Thi đấu 3 ván 21 điểm..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition shadow-xs"
            >
              Lưu Môn Thi Đấu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
