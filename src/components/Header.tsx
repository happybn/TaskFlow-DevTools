import React from 'react';
import { Search, Plus, Menu, X, Sparkles, Command } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onQuickAction: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const TAB_TITLES: Record<ActiveTab, { title: string; subtitle: string; actionLabel?: string }> = {
  tasks: {
    title: 'Công việc',
    subtitle: 'Quản lý tiến độ & trạng thái theo thời gian thực',
    actionLabel: '+ Task mới',
  },
  notes: {
    title: 'Ghi chú',
    subtitle: 'Ý tưởng, snippets và tài liệu cá nhân',
    actionLabel: '+ Ghi chú mới',
  },
  text_diff: {
    title: 'Text Diff · So sánh văn bản',
    subtitle: 'Đối chiếu khác biệt từng từ, tự động bôi vàng nổi bật chỗ khác nhau',
  },
  password_gen: {
    title: 'Password generator · Tạo mật khẩu',
    subtitle: 'Tạo mật khẩu mạnh ngẫu nhiên bảo mật cao với Web Crypto API',
  },
  image_viewer: {
    title: 'Soi & Xem ảnh bằng URL',
    subtitle: 'Zoom, xoay, lật và kiểm tra kích thước pixel thực tế',
  },
  base64: {
    title: 'Base64 Tool',
    subtitle: 'Chuyển đổi Text UTF-8 Tiếng Việt & File ảnh Data URI hai chiều',
  },
  json_studio: {
    title: 'JSON Studio',
    subtitle: 'Format, kiểm tra cú pháp, Minify và chuyển đổi YAML / CSV',
  },
  mini_tools: {
    title: 'Tiện ích nhanh',
    subtitle: 'Epoch timestamp GMT+7, URL decoder và nháp tạm thời',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  searchQuery,
  setSearchQuery,
  onQuickAction,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const currentTabInfo = TAB_TITLES[activeTab];

  return (
    <header className="h-14 shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/70 backdrop-blur-sm z-10">
      {/* Zone 1: Mobile toggle & Breadcrumb Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-1.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400 dark:text-neutral-500 hidden sm:inline">Workspace</span>
          <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">/</span>
          <h1 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
            {currentTabInfo.title}
          </h1>
        </div>
      </div>

      {/* Zone 2: Fast live search & shortcuts */}
      <div className="flex items-center gap-3">
        {(activeTab === 'tasks' || activeTab === 'notes') && (
          <div className="relative w-44 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'tasks' ? 'Tìm task, thẻ, hạn...' : 'Tìm trong ghi chú...'}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Zone 3: Primary Action */}
        {currentTabInfo.actionLabel ? (
          <button
            onClick={onQuickAction}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white/90 transition-colors shrink-0 shadow-sm"
          >
            <span>{currentTabInfo.actionLabel}</span>
          </button>
        ) : (
          <div className="text-xs text-neutral-400 hidden lg:block font-mono">
            Phản hồi tức thì &middot; Không độ trễ
          </div>
        )}
      </div>
    </header>
  );
};
