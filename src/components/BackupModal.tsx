import React, { useState } from 'react';
import { Download, Upload, Check, AlertTriangle, X, FileText } from 'lucide-react';
import { storage } from '../services/storage';
import { useToast } from '../context/ToastContext';
import { Task, Note, RecentImageUrl } from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReloaded: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose, onDataReloaded }) => {
  const { showToast } = useToast();
  const [importText, setImportText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadFile = () => {
    const jsonStr = storage.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Đã tải xuống file sao lưu JSON');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        setErrorMsg(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!importText.trim()) {
      setErrorMsg('Vui lòng dán hoặc chọn file JSON sao lưu.');
      return;
    }
    const success = storage.importBackup(importText);
    if (success) {
      showToast('Đã khôi phục dữ liệu thành công!');
      onDataReloaded();
      onClose();
    } else {
      setErrorMsg('File JSON không hợp lệ hoặc sai cấu trúc dữ liệu TaskFlow.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-neutral-500" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Sao lưu & Khôi phục dữ liệu
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed">
          Tất cả dữ liệu công việc (Tasks), trạng thái, ghi chú (Notes) và lịch sử công cụ được lưu trữ hoàn toàn trên trình duyệt của bạn (LocalStorage). Bạn có thể xuất file JSON để lưu trữ hoặc chuyển sang máy khác bất cứ lúc nào.
        </p>

        {/* Export Section */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded border border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
              Xuất dữ liệu hiện tại
            </h4>
            <span className="text-[11px] text-neutral-400">
              Tải về file taskflow-backup.json
            </span>
          </div>
          <button
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải JSON</span>
          </button>
        </div>

        {/* Import Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
              Khôi phục từ file JSON
            </label>
            <label className="text-xs text-neutral-600 dark:text-neutral-400 hover:underline cursor-pointer">
              <span>Chọn file từ máy...</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <textarea
            rows={4}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="Dán nội dung file JSON sao lưu vào đây..."
            className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 font-mono focus:outline-none resize-none"
          />

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-rose-500 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ task và ghi chú trên máy này để bắt đầu mới hoàn toàn?')) {
                storage.clearAllData();
                onDataReloaded();
                showToast('Đã xóa sạch toàn bộ dữ liệu');
                onClose();
              }
            }}
            className="text-xs text-rose-500 hover:text-rose-600 font-medium"
          >
            Xóa sạch dữ liệu (Reset)
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
            >
              Đóng
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!importText.trim()}
              className="px-3.5 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 transition-colors"
            >
              Tiến hành khôi phục
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
