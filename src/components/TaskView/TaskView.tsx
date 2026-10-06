import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Kanban, 
  List, 
  MoreVertical, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Link2, 
  FileText, 
  Copy,
  PlusCircle,
  X,
  Layers,
  Pencil,
  Clock,
  ListPlus,
  Check,
  CornerDownLeft
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { useToast } from '../../context/ToastContext';

interface TaskViewProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  searchQuery: string;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; textClass: string; dotClass: string }> = {
  todo: {
    label: 'Cần làm',
    textClass: 'text-neutral-500 dark:text-neutral-400',
    dotClass: 'bg-neutral-400',
  },
  in_progress: {
    label: 'Đang làm',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  review: {
    label: 'Đang chờ',
    textClass: 'text-sky-600 dark:text-sky-400',
    dotClass: 'bg-sky-500',
  },
  done: {
    label: 'Hoàn thành',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Thấp', color: 'text-neutral-400' },
  medium: { label: 'Vừa', color: 'text-blue-500 dark:text-blue-400' },
  high: { label: 'Cao', color: 'text-amber-500 dark:text-amber-400' },
  urgent: { label: 'Gấp', color: 'text-rose-500 dark:text-rose-400' },
};

// Helper: Extract clean Jira Issue Key for display
function getJiraKey(urlOrKey?: string): string {
  if (!urlOrKey) return '';
  const trimmed = urlOrKey.trim();
  const browseMatch = trimmed.match(/\/browse\/([A-Za-z0-9_]+-\d+)/i);
  if (browseMatch) return browseMatch[1].toUpperCase();
  const keyMatch = trimmed.match(/([A-Za-z0-9_]+-\d+)/i);
  if (keyMatch) return keyMatch[1].toUpperCase();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      return u.pathname.split('/').filter(Boolean).pop() || 'Jira';
    } catch {
      return 'Jira';
    }
  }
  return trimmed;
}

// Helper: Ensure valid http URL for browser clicking
function toClickableUrl(urlOrKey?: string): string {
  if (!urlOrKey) return '';
  const trimmed = urlOrKey.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

// Helper: Safely get the subtasks array strictly for this specific task
function getTaskSubtasks(task?: Partial<Task> | null): string[] {
  if (!task) return [];
  if (Array.isArray(task.jiraSubtaskUrls) && task.jiraSubtaskUrls.length > 0) {
    return [...task.jiraSubtaskUrls.map((s) => s.trim()).filter(Boolean)];
  }
  if (task.jiraSubtaskUrl && task.jiraSubtaskUrl.trim()) {
    return [task.jiraSubtaskUrl.trim()];
  }
  return [];
}

export const TaskView: React.FC<TaskViewProps> = ({ tasks, setTasks, searchQuery }) => {
  const { showToast } = useToast();
  
  // State
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  
  // Quick Add Form state (Only used when adding a brand new task)
  const [quickTitle, setQuickTitle] = useState('');
  const [quickJiraTaskUrl, setQuickJiraTaskUrl] = useState('');
  const [quickJiraSubtasksText, setQuickJiraSubtasksText] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickStatus, setQuickStatus] = useState<TaskStatus>('todo');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('medium');
  const [quickDueDate, setQuickDueDate] = useState('');
  const [quickTag, setQuickTag] = useState('');
  const [isExpandingAdd, setIsExpandingAdd] = useState(false);

  // Edit modal / drawer (Deep cloned per task)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Inline subtask popover state
  const [inlineAddingTaskId, setInlineAddingTaskId] = useState<string | null>(null);
  const [inlineSubtaskText, setInlineSubtaskText] = useState('');

  // Inline Note Editor state (Quick inline editing without opening full modal)
  const [inlineEditingNoteTaskId, setInlineEditingNoteTaskId] = useState<string | null>(null);
  const [inlineNoteText, setInlineNoteText] = useState('');

  // Filter tasks (matches Title, Description, Jira Task URL, Jira Subtasks URLs, Tags)
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = (task.description || '').toLowerCase().includes(q);
        const matchesJiraTask = (task.jiraTaskUrl || '').toLowerCase().includes(q);
        const subtasks = getTaskSubtasks(task);
        const matchesJiraSubtask = subtasks.some((s) => s.toLowerCase().includes(q));
        const matchesTag = task.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesJiraTask && !matchesJiraSubtask && !matchesTag) {
          return false;
        }
      }
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, rate };
  }, [tasks]);

  // Open edit modal with 100% deep isolation
  const openEditModal = (task: Task) => {
    setEditingTask({
      ...task,
      jiraSubtaskUrls: getTaskSubtasks(task),
      jiraSubtaskUrl: undefined,
      tags: [...(task.tags || [])],
    });
    setNewSubtaskInput('');
  };

  // Add brand new task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      showToast('Vui lòng nhập tiêu đề công việc trước khi thêm', 'error');
      return;
    }

    const subtaskUrls = quickJiraSubtasksText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: quickTitle.trim(),
      jiraTaskUrl: quickJiraTaskUrl.trim() || undefined,
      jiraSubtaskUrls: [...subtaskUrls],
      description: quickDescription.trim(),
      status: quickStatus,
      priority: quickPriority,
      tags: quickTag ? quickTag.split(',').map((t) => t.trim()).filter(Boolean) : [],
      dueDate: quickDueDate || undefined,
      createdAt: Date.now(),
    };

    setTasks((prev) => [newTask, ...prev]);

    setQuickTitle('');
    setQuickJiraTaskUrl('');
    setQuickJiraSubtasksText('');
    setQuickDescription('');
    setQuickDueDate('');
    setQuickTag('');
    setIsExpandingAdd(false);
    showToast('Đã thêm công việc mới');
  };

  const toggleTaskDone = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'done';
          const newStatus = isDone ? 'todo' : 'done';
          return {
            ...t,
            status: newStatus,
            completedAt: isDone ? undefined : Date.now(),
          };
        }
        return t;
      })
    );
  };

  const updateTaskStatus = (id: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: newStatus,
              completedAt: newStatus === 'done' ? Date.now() : undefined,
            }
          : t
      )
    );
    showToast(`Đã chuyển sang: ${STATUS_CONFIG[newStatus].label}`);
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast('Đã xóa công việc', 'info');
  };

  const clearCompleted = () => {
    const remaining = tasks.filter((t) => t.status !== 'done');
    const removedCount = tasks.length - remaining.length;
    if (removedCount === 0) {
      showToast('Không có task nào đã hoàn thành');
      return;
    }
    setTasks(remaining);
    showToast(`Đã dọn dẹp ${removedCount} công việc đã hoàn thành`);
  };

  const copyToClipboard = (text: string, label: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast(`Đã chép ${label}`);
  };

  // Add subtask directly to a specific task
  const handleAddInlineSubtask = (taskId: string, e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!inlineSubtaskText.trim()) {
      setInlineAddingTaskId(null);
      return;
    }
    const splitUrls = inlineSubtaskText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (splitUrls.length === 0) {
      setInlineAddingTaskId(null);
      return;
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const currentList = getTaskSubtasks(t);
          return {
            ...t,
            jiraSubtaskUrls: [...currentList, ...splitUrls],
            jiraSubtaskUrl: undefined,
          };
        }
        return t;
      })
    );

    setInlineAddingTaskId(null);
    setInlineSubtaskText('');
    showToast(`Đã lưu thêm ${splitUrls.length} subtask`);
  };

  // Remove a subtask directly from a specific task
  const handleRemoveSubtaskFromTask = (taskId: string, indexToRemove: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const currentList = getTaskSubtasks(t);
          const updated = currentList.filter((_, idx) => idx !== indexToRemove);
          return {
            ...t,
            jiraSubtaskUrls: updated,
            jiraSubtaskUrl: undefined,
          };
        }
        return t;
      })
    );
    showToast('Đã xóa subtask khỏi task này');
  };

  // --- Inline Note Quick Edit Handlers ---
  const handleStartInlineNote = (task: Task, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInlineEditingNoteTaskId(task.id);
    setInlineNoteText(task.description || '');
  };

  const handleSaveInlineNote = (taskId: string, e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const trimmed = inlineNoteText.trim();
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, description: trimmed } : t))
    );
    setInlineEditingNoteTaskId(null);
    setInlineNoteText('');
    showToast('Đã lưu ghi chú thành công');
  };

  const handleCancelInlineNote = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    setInlineEditingNoteTaskId(null);
    setInlineNoteText('');
  };

  // Subtask management inside Edit Modal
  const handleAddSubtaskToEditing = () => {
    if (!editingTask || !newSubtaskInput.trim()) return;
    const splitUrls = newSubtaskInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const currentList = getTaskSubtasks(editingTask);
    setEditingTask({
      ...editingTask,
      jiraSubtaskUrls: [...currentList, ...splitUrls],
      jiraSubtaskUrl: undefined,
    });
    setNewSubtaskInput('');
    showToast(`Đã thêm ${splitUrls.length} subtask`);
  };

  const handleRemoveSubtaskFromEditing = (index: number) => {
    if (!editingTask) return;
    const currentList = getTaskSubtasks(editingTask);
    const updated = currentList.filter((_, idx) => idx !== index);
    setEditingTask({
      ...editingTask,
      jiraSubtaskUrls: updated,
      jiraSubtaskUrl: undefined,
    });
  };

  const handleUpdateSubtaskInEditing = (index: number, val: string) => {
    if (!editingTask) return;
    const currentList = [...getTaskSubtasks(editingTask)];
    currentList[index] = val;
    setEditingTask({
      ...editingTask,
      jiraSubtaskUrls: currentList,
      jiraSubtaskUrl: undefined,
    });
  };

  // Quick insertion helpers for Modal Note
  const insertTimestampToModal = () => {
    if (!editingTask) return;
    const now = new Date();
    const timeStr = `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}] `;
    const current = editingTask.description || '';
    setEditingTask({
      ...editingTask,
      description: current ? `${current}\n${timeStr}` : timeStr,
    });
  };

  const insertBulletToModal = () => {
    if (!editingTask) return;
    const current = editingTask.description || '';
    setEditingTask({
      ...editingTask,
      description: current ? `${current}\n• ` : '• ',
    });
  };

  // Save changes from Edit Modal
  const handleSaveEditModal = () => {
    if (!editingTask) return;

    const currentSubtasks = getTaskSubtasks(editingTask);
    const pendingFromInput = newSubtaskInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const mergedSubtasks = [...currentSubtasks, ...pendingFromInput];

    const updatedTask: Task = {
      ...editingTask,
      title: editingTask.title.trim() || 'Công việc chưa đặt tên',
      jiraTaskUrl: editingTask.jiraTaskUrl?.trim() || undefined,
      jiraSubtaskUrls: mergedSubtasks,
      jiraSubtaskUrl: undefined,
      description: editingTask.description?.trim() || '',
    };

    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setEditingTask(null);
    setNewSubtaskInput('');
    showToast(`Đã lưu thay đổi công việc`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-y-auto">
      {/* Top Banner */}
      <div className="px-4 md:px-8 pt-6 pb-4 border-b border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/30">
        {/* Metric Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <span>Tổng cộng: <strong className="text-neutral-900 dark:text-neutral-100 tabular-nums">{stats.total}</strong></span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>Đang làm: <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{stats.inProgress}</strong></span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>Hoàn thành: <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.done}</strong></span>
            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>Tiến độ: <strong className="text-neutral-900 dark:text-neutral-100 tabular-nums">{stats.rate}%</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {stats.done > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors px-2 py-1"
              >
                Dọn task đã xong
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setViewMode('list')}
                title="Dạng danh sách"
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                title="Dạng bảng Kanban"
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddTask} className="mb-4">
          <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700/80 rounded-md p-1.5 focus-within:border-neutral-500 transition-colors">
            <Plus className="w-4 h-4 text-neutral-400 ml-1.5 shrink-0" />
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder="Nhập tiêu đề task mới và nhấn Enter... (VD: Tích hợp thanh toán QR)"
              className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none px-1"
            />
            
            {/* Quick status select */}
            <select
              value={quickStatus}
              onChange={(e) => setQuickStatus(e.target.value as TaskStatus)}
              className="bg-neutral-100 dark:bg-neutral-800 border-0 rounded text-[11px] font-medium text-neutral-700 dark:text-neutral-300 py-1 px-2 focus:outline-none"
            >
              <option value="todo">Cần làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="review">Đang chờ</option>
              <option value="done">Hoàn thành</option>
            </select>

            {/* Quick priority select */}
            <select
              value={quickPriority}
              onChange={(e) => setQuickPriority(e.target.value as TaskPriority)}
              className="bg-neutral-100 dark:bg-neutral-800 border-0 rounded text-[11px] font-medium text-neutral-700 dark:text-neutral-300 py-1 px-2 focus:outline-none"
            >
              <option value="low">Thấp</option>
              <option value="medium">Vừa</option>
              <option value="high">Cao</option>
              <option value="urgent">Gấp</option>
            </select>

            <button
              type="button"
              onClick={() => setIsExpandingAdd(!isExpandingAdd)}
              title="Thêm link Jira, subtasks hoặc ghi chú cho task mới này"
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                isExpandingAdd || quickJiraTaskUrl || quickJiraSubtasksText || quickDescription
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-medium'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Jira & Ghi chú</span>
            </button>

            <button
              type="submit"
              className="px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium text-xs rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all"
            >
              Thêm
            </button>
          </div>

          {/* Expanded Add Bar */}
          {isExpandingAdd && (
            <div className="mt-2 p-3 text-xs bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-md flex flex-col gap-2.5 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2.5 py-1.5">
                  <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <input
                    type="text"
                    value={quickJiraTaskUrl}
                    onChange={(e) => setQuickJiraTaskUrl(e.target.value)}
                    placeholder="Link task Jira chính (VD: https://jira.../browse/PROJ-101 hoặc PROJ-101)"
                    className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2.5 py-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <input
                    type="text"
                    value={quickJiraSubtasksText}
                    onChange={(e) => setQuickJiraSubtasksText(e.target.value)}
                    placeholder="Các subtask của task này (phân cách bằng dấu phẩy: PROJ-102, PROJ-103)"
                    className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div className="flex items-start gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2.5 py-1.5">
                <FileText className="w-3.5 h-3.5 text-neutral-400 mt-1 shrink-0" />
                <textarea
                  rows={2}
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  placeholder="Ghi chú chi tiết, các điểm cần kiểm tra..."
                  className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-y min-h-[50px] leading-relaxed"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Hạn chót:</span>
                  <input
                    type="date"
                    value={quickDueDate}
                    onChange={(e) => setQuickDueDate(e.target.value)}
                    className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <Tag className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Thẻ:</span>
                  <input
                    type="text"
                    value={quickTag}
                    onChange={(e) => setQuickTag(e.target.value)}
                    placeholder="Dev, Bug, Backend..."
                    className="flex-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-0.5 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Filter Segmented Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700/60">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Tất cả ({tasks.length})
            </button>
            <button
              onClick={() => setStatusFilter('todo')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'todo'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Cần làm ({tasks.filter((t) => t.status === 'todo').length})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'in_progress'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Đang làm ({tasks.filter((t) => t.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setStatusFilter('review')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'review'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Đang chờ ({tasks.filter((t) => t.status === 'review').length})
            </button>
            <button
              onClick={() => setStatusFilter('done')}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'done'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              Hoàn thành ({tasks.filter((t) => t.status === 'done').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-xs">Mức ưu tiên:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none"
            >
              <option value="all">Tất cả mức</option>
              <option value="urgent">Chỉ Gấp</option>
              <option value="high">Chỉ Mức Cao</option>
              <option value="medium">Chỉ Mức Vừa</option>
              <option value="low">Chỉ Mức Thấp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: List or Kanban */}
      <div className="px-4 md:px-8 py-6 flex-1 min-h-0">
        {filteredTasks.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-lg">
            <CheckCircle2 className="w-8 h-8 text-neutral-400 mb-2 stroke-[1.5]" />
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Không có công việc nào phù hợp
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm">
              {searchQuery
                ? `Không tìm thấy task nào với từ khóa "${searchQuery}". Hãy thử tìm mã Jira hoặc cụm từ khác.`
                : 'Bạn đang không có task nào trong bộ lọc này. Hãy thêm task mới ở thanh phía trên.'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* High-density Fast List */
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/80">
            {filteredTasks.map((task) => {
              const isDone = task.status === 'done';
              const priorityInfo = PRIORITY_CONFIG[task.priority];
              const isOverdue = task.dueDate && !isDone && new Date(task.dueDate).getTime() < new Date().setHours(0,0,0,0);
              const jiraTaskKey = getJiraKey(task.jiraTaskUrl);
              const taskSubtasks = getTaskSubtasks(task);
              const isEditingThisNote = inlineEditingNoteTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`group flex items-start justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors ${
                    isDone ? 'opacity-60 bg-neutral-50/50 dark:bg-neutral-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1 mr-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTaskDone(task.id)}
                      className="mt-0.5 shrink-0 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="w-4 h-4 hover:stroke-neutral-600 dark:hover:stroke-neutral-300" />
                      )}
                    </button>

                    {/* Task Title & Details */}
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Tiêu đề */}
                        <span
                          onClick={() => openEditModal(task)}
                          className={`text-xs font-semibold cursor-pointer truncate ${
                            isDone
                              ? 'line-through text-neutral-400 dark:text-neutral-500'
                              : 'text-neutral-900 dark:text-neutral-100 hover:underline'
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* 2. Link task Jira chính */}
                        {task.jiraTaskUrl && (
                          <a
                            href={toClickableUrl(task.jiraTaskUrl)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900 transition-colors shrink-0"
                            title={`Mở task Jira chính: ${task.jiraTaskUrl}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Jira: {jiraTaskKey}</span>
                          </a>
                        )}

                        {/* 3. Danh sách Link subtask */}
                        {taskSubtasks.map((subUrl, idx) => {
                          const subKey = getJiraKey(subUrl);
                          return (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-900 group/sub"
                            >
                              <a
                                href={toClickableUrl(subUrl)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 hover:underline"
                                title={`Mở subtask Jira: ${subUrl}`}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Sub: {subKey}</span>
                              </a>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveSubtaskFromTask(task.id, idx, e)}
                                title="Xóa subtask này khỏi task"
                                className="text-neutral-400 hover:text-rose-500 ml-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          );
                        })}

                        {/* Nút thêm nhanh subtask */}
                        {inlineAddingTaskId !== task.id ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInlineAddingTaskId(task.id);
                              setInlineSubtaskText('');
                            }}
                            className="inline-flex items-center gap-0.5 text-[10px] text-neutral-400 hover:text-sky-500 transition-colors opacity-0 group-hover:opacity-100 px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Thêm subtask cho task này"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Subtask</span>
                          </button>
                        ) : (
                          <form
                            onSubmit={(e) => handleAddInlineSubtask(task.id, e)}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded px-1.5 py-0.5 shadow-sm"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={inlineSubtaskText}
                              onChange={(e) => setInlineSubtaskText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setInlineAddingTaskId(null);
                                }
                              }}
                              placeholder="Mã hoặc link subtask..."
                              className="text-[11px] font-mono bg-transparent text-neutral-900 dark:text-white focus:outline-none w-36"
                            />
                            <button
                              type="submit"
                              className="text-[10px] px-1.5 py-0.5 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-medium hover:bg-neutral-800"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineAddingTaskId(null)}
                              className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </form>
                        )}

                        {/* Nút thêm nhanh ghi chú nếu chưa có ghi chú */}
                        {!task.description && !isEditingThisNote && (
                          <button
                            type="button"
                            onClick={(e) => handleStartInlineNote(task, e)}
                            className="inline-flex items-center gap-0.5 text-[10px] text-neutral-400 hover:text-amber-500 transition-colors opacity-0 group-hover:opacity-100 px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            title="Thêm nhanh ghi chú cho task này"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ghi chú</span>
                          </button>
                        )}
                      </div>

                      {/* 4. Sửa nhanh Ghi chú trực tiếp (Inline Note Editor) */}
                      {isEditingThisNote ? (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="mt-2 p-2 bg-neutral-50 dark:bg-neutral-800/90 border border-amber-300 dark:border-amber-700 rounded-md shadow-xs flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5" />
                              Sửa nhanh ghi chú
                            </span>
                            <span className="text-[10px] text-neutral-400 font-normal">
                              Ctrl + Enter để lưu nhanh · Esc để hủy
                            </span>
                          </div>

                          <textarea
                            autoFocus
                            rows={3}
                            value={inlineNoteText}
                            onChange={(e) => setInlineNoteText(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                handleSaveInlineNote(task.id, e);
                              } else if (e.key === 'Escape') {
                                handleCancelInlineNote(e);
                              }
                            }}
                            placeholder="Nhập ghi chú chi tiết cho task này..."
                            className="w-full text-xs p-2 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none resize-y min-h-[60px] leading-relaxed font-sans"
                          />

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelInlineNote}
                              className="px-2.5 py-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                            >
                              Hủy (Esc)
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleSaveInlineNote(task.id, e)}
                              className="flex items-center gap-1 px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Lưu ghi chú</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Hiển thị ghi chú kèm nút sửa inline một chạm */
                        task.description && (
                          <div className="group/note mt-1.5 flex items-start gap-1.5 bg-neutral-50/80 dark:bg-neutral-800/40 p-1.5 rounded border border-neutral-200/60 dark:border-neutral-700/50">
                            <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                            <p
                              onClick={(e) => handleStartInlineNote(task, e)}
                              title="Bấm vào để sửa nhanh ghi chú"
                              className="text-[11px] text-neutral-700 dark:text-neutral-300 flex-1 whitespace-pre-wrap leading-relaxed cursor-text hover:text-neutral-950 dark:hover:text-white transition-colors"
                            >
                              {task.description}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => handleStartInlineNote(task, e)}
                              title="Sửa nhanh ghi chú"
                              className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white p-0.5 rounded opacity-0 group-hover/note:opacity-100 transition-opacity"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      )}

                      {/* Clean Unboxed Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                        <span className={`font-medium ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>

                        {task.dueDate && (
                          <>
                            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span className={`font-mono flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              {task.dueDate}
                              {isOverdue && '(Quá hạn)'}
                            </span>
                          </>
                        )}

                        {task.tags.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                            <span>{task.tags.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                      className={`text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded px-2 py-1 focus:outline-none cursor-pointer ${
                        STATUS_CONFIG[task.status].textClass
                      }`}
                    >
                      <option value="todo">Cần làm</option>
                      <option value="in_progress">Đang làm</option>
                      <option value="review">Đang chờ</option>
                      <option value="done">Hoàn thành</option>
                    </select>

                    <button
                      onClick={() => openEditModal(task)}
                      title="Sửa chi tiết (Mở modal)"
                      className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteTask(task.id)}
                      title="Xóa task"
                      className="p-1 text-neutral-400 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {(['todo', 'in_progress', 'review', 'done'] as TaskStatus[]).map((colStatus) => {
              const columnTasks = filteredTasks.filter((t) => t.status === colStatus);
              const config = STATUS_CONFIG[colStatus];

              return (
                <div
                  key={colStatus}
                  className="bg-neutral-50 dark:bg-neutral-900/60 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col min-h-[300px]"
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.dotClass}`}></span>
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {config.label}
                      </h4>
                    </div>
                    <span className="text-xs font-mono tabular-nums text-neutral-400">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    {columnTasks.map((task) => {
                      const jiraTaskKey = getJiraKey(task.jiraTaskUrl);
                      const taskSubtasks = getTaskSubtasks(task);
                      const isEditingThisNote = inlineEditingNoteTaskId === task.id;

                      return (
                        <div
                          key={task.id}
                          className="p-3 bg-white dark:bg-neutral-800/90 rounded border border-neutral-200 dark:border-neutral-700/60 shadow-xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-all flex flex-col gap-2 cursor-pointer"
                          onClick={() => openEditModal(task)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                              {task.title}
                            </span>
                            <span className={`text-[10px] font-semibold shrink-0 ${PRIORITY_CONFIG[task.priority].color}`}>
                              {PRIORITY_CONFIG[task.priority].label}
                            </span>
                          </div>

                          {/* Link Jira Task & Multiple Subtask badges */}
                          {(task.jiraTaskUrl || taskSubtasks.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {task.jiraTaskUrl && (
                                <a
                                  href={toClickableUrl(task.jiraTaskUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 hover:underline"
                                  title={task.jiraTaskUrl}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Jira: {jiraTaskKey}</span>
                                </a>
                              )}
                              {taskSubtasks.map((subUrl, idx) => (
                                <a
                                  key={idx}
                                  href={toClickableUrl(subUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-900 hover:underline"
                                  title={subUrl}
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Sub: {getJiraKey(subUrl)}</span>
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Ghi chú trong Kanban */}
                          {isEditingThisNote ? (
                            <div onClick={(e) => e.stopPropagation()} className="p-2 bg-neutral-50 dark:bg-neutral-900 rounded border border-amber-400 flex flex-col gap-1.5">
                              <textarea
                                autoFocus
                                rows={2}
                                value={inlineNoteText}
                                onChange={(e) => setInlineNoteText(e.target.value)}
                                onKeyDown={(e) => {
                                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    handleSaveInlineNote(task.id, e);
                                  } else if (e.key === 'Escape') {
                                    handleCancelInlineNote(e);
                                  }
                                }}
                                placeholder="Ghi chú..."
                                className="w-full text-xs p-1.5 bg-white dark:bg-neutral-800 border rounded text-neutral-900 dark:text-white resize-y"
                              />
                              <div className="flex justify-end gap-1.5 text-[10px]">
                                <button type="button" onClick={handleCancelInlineNote} className="px-2 py-0.5 text-neutral-400">Hủy</button>
                                <button type="button" onClick={(e) => handleSaveInlineNote(task.id, e)} className="px-2.5 py-0.5 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded font-medium">Lưu</button>
                              </div>
                            </div>
                          ) : (
                            task.description && (
                              <p 
                                onClick={(e) => handleStartInlineNote(task, e)}
                                title="Bấm để sửa nhanh ghi chú"
                                className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-3 leading-relaxed hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                              >
                                {task.description}
                              </p>
                            )
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-neutral-100 dark:border-neutral-700/50 text-[10px] text-neutral-400">
                            {task.dueDate ? (
                              <span className="font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {task.dueDate}
                              </span>
                            ) : (
                              <span>{task.tags.join(', ') || 'Không thẻ'}</span>
                            )}

                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {colStatus !== 'todo' && (
                                <button
                                  onClick={() => {
                                    const prev = colStatus === 'done' ? 'review' : colStatus === 'review' ? 'in_progress' : 'todo';
                                    updateTaskStatus(task.id, prev);
                                  }}
                                  className="px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400"
                                  title="Lùi lại một bước"
                                >
                                  ←
                                </button>
                              )}
                              {colStatus !== 'done' && (
                                <button
                                  onClick={() => {
                                    const next = colStatus === 'todo' ? 'in_progress' : colStatus === 'in_progress' ? 'review' : 'done';
                                    updateTaskStatus(task.id, next);
                                  }}
                                  className="px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400"
                                  title="Tiến lên một bước"
                                >
                                  →
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className="flex-1 flex items-center justify-center text-[11px] text-neutral-400 py-6">
                        Trống
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Task Drawer / Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            onKeyDown={(e) => {
              // Phím tắt Ctrl+Enter hoặc Cmd+Enter để lưu ngay lập tức ở bất cứ đâu trong modal
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSaveEditModal();
              }
            }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg max-w-lg w-full p-5 shadow-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Chỉnh sửa công việc & Link Jira
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* 1. Tiêu đề task */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  1. Tiêu đề công việc
                </label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  placeholder="Nhập tiêu đề task..."
                  className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* 2. Link task Jira chính */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    2. Link task Jira chính
                  </label>
                  {editingTask.jiraTaskUrl && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => copyToClipboard(editingTask.jiraTaskUrl || '', 'link task Jira', e)}
                        className="text-[10px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                      <a
                        href={toClickableUrl(editingTask.jiraTaskUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                      >
                        <span>Mở Jira</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  value={editingTask.jiraTaskUrl || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, jiraTaskUrl: e.target.value })}
                  placeholder="https://your-domain.atlassian.net/browse/PROJ-123"
                  className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white font-mono focus:outline-none"
                />
              </div>

              {/* 3. Danh sách Link subtask Jira */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                    <span>3. Danh sách link subtask</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-200 dark:bg-neutral-800 rounded text-neutral-700 dark:text-neutral-300">
                      {getTaskSubtasks(editingTask).length}
                    </span>
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Bấm Lưu bên dưới để lưu tất cả
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 mb-2.5">
                  {getTaskSubtasks(editingTask).map((subUrl, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/80 p-1.5 rounded border border-neutral-200 dark:border-neutral-700">
                      <span className="text-[10px] font-mono text-neutral-400 w-4 text-center">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        value={subUrl}
                        onChange={(e) => handleUpdateSubtaskInEditing(idx, e.target.value)}
                        placeholder="Link hoặc mã subtask Jira..."
                        className="flex-1 bg-transparent text-xs text-neutral-900 dark:text-white font-mono focus:outline-none"
                      />
                      <a
                        href={toClickableUrl(subUrl)}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở tab mới"
                        className="p-1 text-sky-500 hover:text-sky-600 rounded"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => copyToClipboard(subUrl, 'link subtask', e)}
                        title="Sao chép link"
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtaskFromEditing(idx)}
                        title="Xóa subtask này"
                        className="p-1 text-neutral-400 hover:text-rose-500 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {getTaskSubtasks(editingTask).length === 0 && (
                    <div className="text-[11px] text-neutral-400 italic py-1.5 px-2 bg-neutral-50/50 dark:bg-neutral-800/30 rounded border border-dashed border-neutral-200 dark:border-neutral-800">
                      Task này chưa có subtask nào. Nhập vào ô bên dưới rồi bấm "Thêm" hoặc bấm "Lưu thay đổi".
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtaskToEditing();
                      }
                    }}
                    placeholder="Nhập link hoặc mã subtask (VD: PROJ-102, PROJ-103)..."
                    className="flex-1 text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-900 dark:text-white font-mono focus:outline-none focus:border-neutral-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtaskToEditing}
                    disabled={!newSubtaskInput.trim()}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* 4. Ghi chú - ĐƯỢC NÂNG CẤP HOÀN TOÀN DỄ THAO TÁC */}
              <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                    <span>4. Ghi chú công việc</span>
                  </label>

                  {/* Thanh công cụ trợ giúp nhanh ghi chú */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={insertTimestampToModal}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      title="Chèn mốc giờ hiện tại vào ghi chú"
                    >
                      <Clock className="w-2.5 h-2.5 text-amber-500" />
                      <span>+ Giờ</span>
                    </button>
                    <button
                      type="button"
                      onClick={insertBulletToModal}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      title="Chèn dấu đầu dòng"
                    >
                      <ListPlus className="w-2.5 h-2.5 text-sky-500" />
                      <span>• Đầu dòng</span>
                    </button>
                    {editingTask.description && (
                      <button
                        type="button"
                        onClick={() => setEditingTask({ ...editingTask, description: '' })}
                        className="px-1.5 py-0.5 text-neutral-400 hover:text-rose-500 transition-colors"
                        title="Xóa trắng ghi chú"
                      >
                        Xóa trắng
                      </button>
                    )}
                  </div>
                </div>

                {/* Textarea linh hoạt, kéo dãn thoải mái (resize-y) */}
                <textarea
                  rows={4}
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  placeholder="Ghi chú chi tiết, các điểm cần kiểm tra, kết quả trao đổi, mã lỗi, log...&#10;(Bấm Ctrl + Enter để lưu nhanh mọi thay đổi)"
                  className="w-full text-xs p-2.5 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-500 resize-y min-h-[90px] leading-relaxed font-sans"
                />

                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3 text-neutral-400" />
                    Mẹo: Nhấn <strong>Ctrl + Enter</strong> để lưu ngay lập tức
                  </span>
                  <span>{editingTask.description?.length || 0} ký tự</span>
                </div>
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Trạng thái
                  </label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                    className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none"
                  >
                    <option value="todo">Cần làm</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="review">Đang chờ</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                    className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Vừa</option>
                    <option value="high">Cao</option>
                    <option value="urgent">Gấp</option>
                  </select>
                </div>
              </div>

              {/* Deadline & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Hạn chót (Deadline)
                  </label>
                  <input
                    type="date"
                    value={editingTask.dueDate || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value || undefined })}
                    className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                    Thẻ (phân cách bằng dấu phẩy)
                  </label>
                  <input
                    type="text"
                    value={editingTask.tags.join(', ')}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    placeholder="Dev, Bug, API..."
                    className="w-full text-xs p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  deleteTask(editingTask.id);
                  setEditingTask(null);
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-medium"
              >
                Xóa task này
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  className="px-4 py-1.5 text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
                >
                  Lưu thay đổi (Ctrl+Enter)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
