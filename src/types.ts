export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description: string; // Ghi chú
  jiraTaskUrl?: string; // Link task Jira
  jiraSubtaskUrls?: string[]; // Danh sách link subtask Jira (hỗ trợ nhiều subtasks)
  jiraSubtaskUrl?: string; // Tương thích ngược nếu có dữ liệu đơn
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  dueDate?: string; // YYYY-MM-DD
  createdAt: number;
  completedAt?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export type ActiveTab = 'tasks' | 'notes' | 'text_diff' | 'image_viewer' | 'base64' | 'json_studio' | 'mini_tools';

export interface RecentImageUrl {
  url: string;
  label?: string;
  timestamp: number;
}

export interface AppDataBackup {
  version: number;
  exportedAt: string;
  tasks: Task[];
  notes: Note[];
  recentImages: RecentImageUrl[];
  scratchpad: string;
}
