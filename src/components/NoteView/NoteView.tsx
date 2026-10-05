import React, { useState, useMemo } from 'react';
import { 
  Pin, 
  Trash2, 
  Copy, 
  Plus, 
  Search, 
  FileText, 
  Calendar, 
  Tag as TagIcon,
  Check,
  Eye,
  Edit3
} from 'lucide-react';
import { Note } from '../../types';
import { useToast } from '../../context/ToastContext';

interface NoteViewProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  searchQuery: string;
}

export const NoteView: React.FC<NoteViewProps> = ({ notes, setNotes, searchQuery }) => {
  const { showToast } = useToast();
  
  // Selected note ID for active editing
  const [selectedNoteId, setSelectedNoteId] = useState<string>(() => {
    return notes.length > 0 ? notes[0].id : '';
  });
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<boolean>(false);

  // All unique tags across notes
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => {
        if (tagFilter !== 'all' && !n.tags.includes(tagFilter)) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = n.title.toLowerCase().includes(q);
          const matchContent = n.content.toLowerCase().includes(q);
          const matchTag = n.tags.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchContent && !matchTag) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Pinned notes first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
  }, [notes, tagFilter, searchQuery]);

  // Current active note
  const currentNote = useMemo(() => {
    const found = notes.find((n) => n.id === selectedNoteId);
    return found || filteredNotes[0] || null;
  }, [notes, selectedNoteId, filteredNotes]);

  // Create new note
  const handleCreateNote = () => {
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
    setSelectedNoteId(newNote.id);
    setPreviewMode(false);
    showToast('Đã tạo ghi chú mới');
  };

  // Update note field
  const updateCurrentNote = (field: Partial<Note>) => {
    if (!currentNote) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === currentNote.id ? { ...n, ...field, updatedAt: Date.now() } : n
      )
    );
  };

  // Toggle pin
  const togglePin = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
    showToast('Đã cập nhật ghim');
  };

  // Delete note
  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNoteId === id) {
      const remaining = notes.filter((n) => n.id !== id);
      setSelectedNoteId(remaining.length > 0 ? remaining[0].id : '');
    }
    showToast('Đã xóa ghi chú', 'info');
  };

  // Copy note content
  const copyNoteContent = () => {
    if (!currentNote) return;
    navigator.clipboard.writeText(`${currentNote.title}\n\n${currentNote.content}`);
    showToast('Đã sao chép nội dung vào Clipboard');
  };

  const wordCount = currentNote ? currentNote.content.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = currentNote ? currentNote.content.length : 0;

  return (
    <div className="flex-1 flex min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-hidden">
      {/* Left Sidebar: Notes list */}
      <div className="w-72 md:w-80 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 flex flex-col shrink-0 min-h-0">
        {/* Notes Header / Controls */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
              Danh sách ({filteredNotes.length})
            </span>
          </div>

          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo mới</span>
          </button>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => setTagFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                tagFilter === 'all'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              Tất cả
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tag)}
                className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                  tagFilter === tag
                    ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {/* Notes Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              Không có ghi chú nào
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = currentNote?.id === note.id;
              const dateStr = new Date(note.updatedAt).toLocaleDateString('vi-VN', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-3 text-left cursor-pointer transition-colors relative group ${
                    isSelected
                      ? 'bg-neutral-100/80 dark:bg-neutral-800/80'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate flex-1">
                      {note.title || 'Ghi chú không tên'}
                    </span>
                    {note.isPinned && (
                      <Pin className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500" />
                    )}
                  </div>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-2">
                    {note.content.trim() || 'Chưa có nội dung...'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                    <span>{dateStr}</span>
                    {note.tags.length > 0 && (
                      <span className="truncate max-w-[120px]">
                        {note.tags.map((t) => `#${t}`).join(' ')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Note Editor */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-neutral-950">
        {currentNote ? (
          <>
            {/* Note Editor Header Bar */}
            <div className="h-12 px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3 text-neutral-400">
                <span className="font-mono tabular-nums">
                  {wordCount} từ &middot; {charCount} ký tự
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">
                  Sửa lần cuối: {new Date(currentNote.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Preview / Edit Toggle */}
                <button
                  onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {previewMode ? (
                    <>
                      <Edit3 className="w-3 h-3" />
                      <span>Soạn thảo</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3" />
                      <span>Xem trước</span>
                    </>
                  )}
                </button>

                <button
                  onClick={copyNoteContent}
                  title="Sao chép toàn bộ ghi chú"
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => togglePin(currentNote.id, e)}
                  title={currentNote.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                  className={`p-1.5 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                    currentNote.isPinned ? 'text-amber-500' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${currentNote.isPinned ? 'fill-amber-500' : ''}`} />
                </button>

                <button
                  onClick={(e) => handleDeleteNote(currentNote.id, e)}
                  title="Xóa ghi chú"
                  className="p-1.5 text-neutral-500 hover:text-rose-500 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Note Fields */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              {/* Note Title */}
              <input
                type="text"
                value={currentNote.title}
                onChange={(e) => updateCurrentNote({ title: e.target.value })}
                placeholder="Tiêu đề ghi chú..."
                className="text-lg md:text-xl font-semibold bg-transparent text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none mb-3"
              />

              {/* Note Tags Bar */}
              <div className="flex items-center gap-2 mb-4 text-xs">
                <TagIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={currentNote.tags.join(', ')}
                  onChange={(e) =>
                    updateCurrentNote({
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Gắn thẻ (phân cách bằng dấu phẩy: dự án, dev, ideas)..."
                  className="flex-1 bg-transparent text-xs text-neutral-600 dark:text-neutral-400 placeholder-neutral-400 focus:outline-none"
                />
              </div>

              {/* Note Content Area */}
              {previewMode ? (
                <div className="flex-1 text-xs md:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-sans leading-relaxed pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                  {currentNote.content ? (
                    currentNote.content
                  ) : (
                    <span className="italic text-neutral-400">Chưa có nội dung. Chuyển sang chế độ soạn thảo để viết.</span>
                  )}
                </div>
              ) : (
                <textarea
                  value={currentNote.content}
                  onChange={(e) => updateCurrentNote({ content: e.target.value })}
                  placeholder="Bắt đầu viết ghi chú tại đây... Hỗ trợ phím tắt, code snippets, checklist..."
                  className="flex-1 w-full bg-transparent text-xs md:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none leading-relaxed border-t border-neutral-100 dark:border-neutral-800/80 pt-4"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mb-3" />
            <h3 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Chưa có ghi chú nào được chọn
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Tạo ghi chú mới hoặc chọn từ danh sách bên trái để bắt đầu.
            </p>
            <button
              onClick={handleCreateNote}
              className="px-3.5 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            >
              + Tạo ghi chú đầu tiên
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
