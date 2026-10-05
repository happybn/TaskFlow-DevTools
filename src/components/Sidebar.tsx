import React from 'react';
import { 
  CheckSquare, 
  FileText, 
  GitCompare,
  KeyRound,
  Image as ImageIcon, 
  Binary, 
  Code2, 
  Wrench, 
  Download, 
  Upload, 
  Moon, 
  Sun,
  LayoutGrid
} from 'lucide-react';
import { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingTasksCount: number;
  notesCount: number;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onExport: () => void;
  onImportClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingTasksCount,
  notesCount,
  theme,
  toggleTheme,
  onExport,
  onImportClick,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'tasks',
      label: 'Công việc',
      icon: <CheckSquare className="w-4 h-4 shrink-0" />,
      badge: pendingTasksCount,
    },
    {
      id: 'notes',
      label: 'Ghi chú',
      icon: <FileText className="w-4 h-4 shrink-0" />,
      badge: notesCount,
    },
    {
      id: 'text_diff',
      label: 'So sánh văn bản',
      icon: <GitCompare className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'password_gen',
      label: 'Tạo mật khẩu',
      icon: <KeyRound className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'image_viewer',
      label: 'Xem ảnh URL',
      icon: <ImageIcon className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'base64',
      label: 'Base64 Tool',
      icon: <Binary className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'json_studio',
      label: 'JSON Studio',
      icon: <Code2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'mini_tools',
      label: 'Tiện ích nhanh',
      icon: <Wrench className="w-4 h-4 shrink-0" />,
    },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col justify-between border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 select-none">
      <div className="flex flex-col">
        {/* Brand Zone */}
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="w-7 h-7 rounded-md bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 flex items-center justify-center font-bold text-sm tracking-wider">
            TF
          </div>
          <span className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
            TaskFlow
          </span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono ml-auto">
            v2.4
          </span>
        </div>

        {/* Navigation Section */}
        <div className="p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-2.5 mb-2">
            Không gian làm việc
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.slice(0, 2).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-950 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] font-mono tabular-nums text-neutral-500 dark:text-neutral-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-2.5 mt-5 mb-2">
            Công cụ hỗ trợ
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.slice(2).map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-950 dark:text-white'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Area: Backup & Theme */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex flex-col gap-2">
        <div className="flex items-center justify-between px-2.5 py-1 text-xs text-neutral-500 dark:text-neutral-400">
          <span>Lưu trữ nội bộ</span>
          <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Đã đồng bộ
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onExport}
            title="Xuất file JSON sao lưu"
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sao lưu</span>
          </button>
          <button
            onClick={onImportClick}
            title="Khôi phục từ file JSON"
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nhập lại</span>
          </button>
        </div>

        <button
          onClick={toggleTheme}
          className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{theme === 'dark' ? 'Chế độ tối' : 'Chế độ sáng'}</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </button>
      </div>
    </aside>
  );
};
