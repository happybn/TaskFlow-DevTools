import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, Task, Note, RecentImageUrl } from './types';
import { storage } from './services/storage';
import { ToastProvider, useToast } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { TaskView } from './components/TaskView/TaskView';
import { NoteView } from './components/NoteView/NoteView';
import { ImageViewer } from './components/Tools/ImageViewer';
import { Base64Tool } from './components/Tools/Base64Tool';
import { JsonTool } from './components/Tools/JsonTool';
import { MiniTools } from './components/Tools/MiniTools';
import { BackupModal } from './components/BackupModal';

function AppContent() {
  const { showToast } = useToast();

  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('tasks');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('taskflow_theme_v1');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Data states
  const [tasks, setTasks] = useState<Task[]>(() => storage.getTasks());
  const [notes, setNotes] = useState<Note[]>(() => storage.getNotes());
  const [recentImages, setRecentImages] = useState<RecentImageUrl[]>(() => storage.getRecentImages());

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('taskflow_theme_v1', theme);
  }, [theme]);

  // Persist tasks on change
  useEffect(() => {
    storage.saveTasks(tasks);
  }, [tasks]);

  // Persist notes on change
  useEffect(() => {
    storage.saveNotes(notes);
  }, [notes]);

  // Persist recent images on change
  useEffect(() => {
    storage.saveRecentImages(recentImages);
  }, [recentImages]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Reload data after backup import
  const handleDataReloaded = () => {
    setTasks(storage.getTasks());
    setNotes(storage.getNotes());
    setRecentImages(storage.getRecentImages());
  };

  // Counts for sidebar badges
  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const notesCount = notes.length;

  // Header quick action button
  const handleQuickAction = () => {
    if (activeTab === 'tasks') {
      // Focus task input or create task
      const inputEl = document.querySelector('input[placeholder*="Nhập task mới"]') as HTMLInputElement | null;
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollIntoView({ behavior: 'smooth' });
      }
    } else if (activeTab === 'notes') {
      // Trigger new note
      const newNote: Note = {
        id: `note-${Date.now()}`,
        title: 'Ghi chú mới',
        content: '',
        isPinned: false,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setNotes((prev) => [newNote, ...prev]);
      showToast('Đã tạo ghi chú mới');
    }
  };

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + 1..6 or Ctrl + 1..6 to switch tabs quickly
      if ((e.altKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const tabList: ActiveTab[] = ['tasks', 'notes', 'image_viewer', 'base64', 'json_studio', 'mini_tools'];
        const index = parseInt(e.key) - 1;
        if (tabList[index]) {
          setActiveTab(tabList[index]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingTasksCount={pendingTasksCount}
          notesCount={notesCount}
          theme={theme}
          toggleTheme={toggleTheme}
          onExport={() => setIsBackupModalOpen(true)}
          onImportClick={() => setIsBackupModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 h-full flex flex-col">
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileMenuOpen(false);
              }}
              pendingTasksCount={pendingTasksCount}
              notesCount={notesCount}
              theme={theme}
              toggleTheme={toggleTheme}
              onExport={() => {
                setIsBackupModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onImportClick={() => {
                setIsBackupModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          activeTab={activeTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onQuickAction={handleQuickAction}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* Tab Content Display */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeTab === 'tasks' && (
            <TaskView
              tasks={tasks}
              setTasks={setTasks}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'notes' && (
            <NoteView
              notes={notes}
              setNotes={setNotes}
              searchQuery={searchQuery}
            />
          )}

          {activeTab === 'image_viewer' && (
            <ImageViewer
              recentImages={recentImages}
              setRecentImages={setRecentImages}
            />
          )}

          {activeTab === 'base64' && <Base64Tool />}

          {activeTab === 'json_studio' && <JsonTool />}

          {activeTab === 'mini_tools' && <MiniTools />}
        </div>
      </main>

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataReloaded={handleDataReloaded}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
