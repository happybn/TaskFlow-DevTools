import { Task, Note, RecentImageUrl, AppDataBackup } from '../types';

const STORAGE_KEYS = {
  TASKS: 'taskflow_tasks_v1',
  NOTES: 'taskflow_notes_v1',
  RECENT_IMAGES: 'taskflow_recent_images_v1',
  THEME: 'taskflow_theme_v1',
  SCRATCHPAD: 'taskflow_scratchpad_v1',
};

const DEFAULT_TASKS: Task[] = [];
const DEFAULT_NOTES: Note[] = [];
const DEFAULT_RECENT_IMAGES: RecentImageUrl[] = [];

export const storage = {
  getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      return data ? JSON.parse(data) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  },

  saveTasks(tasks: Task[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks', e);
    }
  },

  getNotes(): Note[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTES);
      return data ? JSON.parse(data) : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  },

  saveNotes(notes: Note[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to save notes', e);
    }
  },

  getRecentImages(): RecentImageUrl[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECENT_IMAGES);
      return data ? JSON.parse(data) : DEFAULT_RECENT_IMAGES;
    } catch {
      return DEFAULT_RECENT_IMAGES;
    }
  },

  saveRecentImages(images: RecentImageUrl[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.RECENT_IMAGES, JSON.stringify(images));
    } catch (e) {
      console.error('Failed to save recent images', e);
    }
  },

  getScratchpad(): string {
    return localStorage.getItem(STORAGE_KEYS.SCRATCHPAD) || '';
  },

  saveScratchpad(text: string) {
    localStorage.setItem(STORAGE_KEYS.SCRATCHPAD, text);
  },

  clearAllData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.NOTES);
      localStorage.removeItem(STORAGE_KEYS.RECENT_IMAGES);
      localStorage.removeItem(STORAGE_KEYS.SCRATCHPAD);
    } catch (e) {
      console.error('Failed to clear data', e);
    }
  },

  exportBackup(): string {
    const backup: AppDataBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      notes: this.getNotes(),
      recentImages: this.getRecentImages(),
      scratchpad: this.getScratchpad(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString) as AppDataBackup;
      if (!data || !Array.isArray(data.tasks) || !Array.isArray(data.notes)) {
        throw new Error('Dữ liệu sao lưu không đúng định dạng');
      }
      this.saveTasks(data.tasks);
      this.saveNotes(data.notes);
      if (Array.isArray(data.recentImages)) {
        this.saveRecentImages(data.recentImages);
      }
      if (typeof data.scratchpad === 'string') {
        this.saveScratchpad(data.scratchpad);
      }
      return true;
    } catch (err) {
      console.error('Failed to import backup', err);
      return false;
    }
  },
};
