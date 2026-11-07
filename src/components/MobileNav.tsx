import React from 'react';
import { Home, Shield, Users, Calendar, Trophy, FileSpreadsheet, Sliders } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onOpenReports?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange, onOpenReports }) => {
  const tabs = [
    { id: 'overview', label: 'Tổng Quan', icon: Home },
    { id: 'teams', label: 'Đội', icon: Shield },
    { id: 'athletes', label: 'VĐV', icon: Users },
    { id: 'matches', label: 'Lịch Đấu', icon: Calendar },
    { id: 'standings', label: 'Xếp Hạng', icon: Trophy },
    { id: 'reports', label: 'Báo Cáo', icon: FileSpreadsheet },
    { id: 'settings', label: 'Cấu Hình', icon: Sliders },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg no-print">
      <div className="grid grid-cols-7 items-center h-16 max-w-lg mx-auto px-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'reports' && onOpenReports) {
                  onOpenReports();
                } else {
                  onTabChange(tab.id);
                }
              }}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 transition-colors ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[50px]">{tab.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-sky-600 dark:bg-sky-400 mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
