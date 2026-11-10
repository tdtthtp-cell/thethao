import React, { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { Sport, SportCategory } from '../types';

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
  const [name, setName] = useState(sport?.name || '');
  const [maxSets, setMaxSets] = useState<number>(sport?.maxSets || 3);
  const [pointScheme, setPointScheme] = useState<Sport['pointScheme']>(sport?.pointScheme || 'standard');
  const [ptsWin, setPtsWin] = useState<number>(sport?.ptsWin || 3);
  const [ptsDraw, setPtsDraw] = useState<number>(sport?.ptsDraw || 0);
  const [ptsLoss, setPtsLoss] = useState<number>(sport?.ptsLoss || 0);
  const [description, setDescription] = useState(sport?.description || '');
  const [categories, setCategories] = useState<SportCategory[]>(
    sport?.categories || [
      { id: 'cat_male', name: 'Nam', gender: 'male' },
      { id: 'cat_female', name: 'Nữ', gender: 'female' },
    ]
  );
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(sport?.name || '');
      setMaxSets(sport?.maxSets || 3);
      setPointScheme(sport?.pointScheme || 'standard');
      setPtsWin(sport?.ptsWin || 3);
      setPtsDraw(sport?.ptsDraw || 0);
      setPtsLoss(sport?.ptsLoss || 0);
      setDescription(sport?.description || '');
      setCategories(
        sport?.categories || [
          { id: 'cat_male', name: 'Nam', gender: 'male' },
          { id: 'cat_female', name: 'Nữ', gender: 'female' },
        ]
      );
      setNewCatName('');
    }
  }, [isOpen, sport]);

  const applyCategoryPreset = (preset: 'team_gender' | 'racket' | 'tug') => {
    if (preset === 'team_gender') {
      setCategories([
        { id: 'vb_male', name: 'Nam', gender: 'male', type: 'team' },
        { id: 'vb_female', name: 'Nữ', gender: 'female', type: 'team' },
      ]);
    } else if (preset === 'racket') {
      setCategories([
        { id: 'cat_ms', name: 'Đơn nam', gender: 'male', type: 'singles' },
        { id: 'cat_ws', name: 'Đơn nữ', gender: 'female', type: 'singles' },
        { id: 'cat_md', name: 'Đôi nam', gender: 'male', type: 'doubles' },
        { id: 'cat_wd', name: 'Đôi nữ', gender: 'female', type: 'doubles' },
        { id: 'cat_xd', name: 'Đôi nam nữ', gender: 'mixed', type: 'doubles' },
      ]);
    } else if (preset === 'tug') {
      setCategories([
        { id: 'cat_tm', name: 'Đội nam', gender: 'male', type: 'team' },
        { id: 'cat_tw', name: 'Đội nữ', gender: 'female', type: 'team' },
        { id: 'cat_tx', name: 'Đội nam nữ', gender: 'mixed', type: 'team' },
      ]);
    }
  };

  const handleAddCategory = () => {
    const val = newCatName.trim();
    if (!val) return;
    if (categories.some((c) => c.name.toLowerCase() === val.toLowerCase())) {
      alert('Nội dung này đã tồn tại trong môn đấu!');
      return;
    }
    const id = 'CAT_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    let gender: 'male' | 'female' | 'mixed' = 'mixed';
    if (val.toLowerCase().includes('nữ') && !val.toLowerCase().includes('nam nữ')) gender = 'female';
    else if (val.toLowerCase().includes('nam') && !val.toLowerCase().includes('nam nữ')) gender = 'male';

    setCategories([...categories, { id, name: val, gender }]);
    setNewCatName('');
  };

  const handleRemoveCategory = (catId: string) => {
    if (categories.length <= 1) {
      alert('Một môn thi đấu phải có ít nhất 1 nội dung thi đấu!');
      return;
    }
    setCategories(categories.filter((c) => c.id !== catId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên môn thi đấu!');
    if (categories.length === 0) return alert('Vui lòng tạo ít nhất 1 nội dung thi đấu cho môn!');

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
      categories,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 my-6">
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
              <p className="text-xs text-slate-400">Cấu hình tên môn, các nội dung thi đấu và quy tắc điểm</p>
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
              placeholder="VD: Bóng chuyền, Cầu lông, Bóng đá, Bóng bàn, Đá cầu..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl outline-none font-bold"
            />
          </div>

          {/* Categories Management (Nội Dung Thi Đấu) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Các Nội Dung Thi Đấu ({categories.length})
              </label>
              <span className="text-[10px] text-slate-400">Quản lý riêng biệt</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="text-slate-400 text-[10px] self-center mr-1">Mẫu nhanh:</span>
              <button
                type="button"
                onClick={() => applyCategoryPreset('team_gender')}
                className="px-2 py-0.5 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 text-sky-800 dark:text-sky-200 font-semibold cursor-pointer"
                title="Bóng chuyền, Bóng đá: Nam, Nữ"
              >
                Nam, Nữ
              </button>
              <button
                type="button"
                onClick={() => applyCategoryPreset('racket')}
                className="px-2 py-0.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold cursor-pointer"
                title="Cầu lông, Bóng bàn: Đơn nam, đơn nữ, đôi nam, đôi nữ, đôi nam nữ"
              >
                Đơn & Đôi (5 nội dung)
              </button>
              <button
                type="button"
                onClick={() => applyCategoryPreset('tug')}
                className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold cursor-pointer"
                title="Kéo co: Đội nam, đội nữ, đội nam nữ"
              >
                Kéo co (3 nội dung)
              </button>
            </div>

            {/* Category list chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <span>{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(cat.id)}
                    className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title={`Xóa nội dung ${cat.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add custom category */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  }
                }}
                placeholder="Thêm nội dung khác (VD: Chạy 100m, Tiếp sức...)"
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl outline-none"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                + Thêm
              </button>
            </div>
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
                <option value={1}>1 Set / 1 Hiệp chính (Bóng đá)</option>
                <option value={3}>3 Set / Thắng 2 (Bóng chuyền, Cầu lông, Bóng bàn)</option>
                <option value={5}>5 Set / Thắng 3 (Bóng chuyền nâng cao)</option>
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
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition shadow-xs cursor-pointer"
            >
              Lưu Môn Thi Đấu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
