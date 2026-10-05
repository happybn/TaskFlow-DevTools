import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Copy, 
  Trash2, 
  Download, 
  FileCode, 
  Image as ImageIcon, 
  Type, 
  Upload, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// Safe UTF-8 Base64 Helpers
function utf8ToBase64(str: string, urlSafe = false): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    let base64 = btoa(binary);
    if (urlSafe) {
      base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    return base64;
  } catch (e) {
    return 'Lỗi mã hóa Base64';
  }
}

function base64ToUtf8(str: string): string {
  try {
    let clean = str.trim();
    // Convert URL-safe base64 back to standard
    clean = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4) {
      clean += '=';
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    return 'Lỗi: Chuỗi Base64 không hợp lệ hoặc sai định dạng UTF-8.';
  }
}

export const Base64Tool: React.FC = () => {
  const { showToast } = useToast();
  
  // Tab: 'text' or 'image'
  const [toolMode, setToolMode] = useState<'text' | 'image'>('text');

  // Text Mode State
  const [textInput, setTextInput] = useState<string>('');
  const [direction, setDirection] = useState<'encode' | 'decode'>('encode');
  const [urlSafe, setUrlSafe] = useState<boolean>(false);
  const [textOutput, setTextOutput] = useState<string>('');

  // Image Mode State
  const [imageBase64Input, setImageBase64Input] = useState<string>('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [imageFileInfo, setImageFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);

  // Compute text conversion
  useEffect(() => {
    if (direction === 'encode') {
      setTextOutput(utf8ToBase64(textInput, urlSafe));
    } else {
      setTextOutput(base64ToUtf8(textInput));
    }
  }, [textInput, direction, urlSafe]);

  // Compute image preview
  useEffect(() => {
    if (!imageBase64Input.trim()) {
      setImagePreviewUrl('');
      return;
    }
    let dataUri = imageBase64Input.trim();
    if (!dataUri.startsWith('data:')) {
      // Guess png if bare base64
      dataUri = `data:image/png;base64,${dataUri}`;
    }
    setImagePreviewUrl(dataUri);
  }, [imageBase64Input]);

  // Text Mode Handlers
  const handleSwapDirection = () => {
    setDirection((prev) => (prev === 'encode' ? 'decode' : 'encode'));
    setTextInput(textOutput);
    showToast('Đã đổi chiều Encode ⇄ Decode');
  };

  const handleCopyText = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast('Đã sao chép vào Clipboard');
  };

  // Image Mode Handlers
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1);
    setImageFileInfo({
      name: file.name,
      size: `${sizeKb} KB`,
      type: file.type || 'image/png',
    });

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageBase64Input(result);
        showToast(`Đã chuyển đổi ${file.name} sang Base64 Data URI`);
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadDecodedImage = () => {
    if (!imagePreviewUrl) return;
    const a = document.createElement('a');
    a.href = imagePreviewUrl;
    a.download = `decoded-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Đang tải ảnh xuống máy');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-y-auto">
      {/* Mode Switcher Bar */}
      <div className="p-4 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <button
            onClick={() => setToolMode('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              toolMode === 'text'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Văn bản UTF-8 (Tiếng Việt)</span>
          </button>
          <button
            onClick={() => setToolMode('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              toolMode === 'image'
                ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Hình ảnh / File Data URI</span>
          </button>
        </div>

        {toolMode === 'text' && (
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={urlSafe}
                onChange={(e) => setUrlSafe(e.target.checked)}
                className="rounded border-neutral-300 dark:border-neutral-700"
              />
              <span>URL-safe Base64 (dùng cho query/token)</span>
            </label>

            <button
              onClick={handleSwapDirection}
              className="flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            >
              <ArrowLeftRight className="w-3 h-3" />
              <span>Đổi chiều</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Mode Body */}
      {toolMode === 'text' ? (
        <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Input Panel */}
          <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 min-h-[300px]">
            <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {direction === 'encode' ? '1. Nhập văn bản nguồn (Plain Text)' : '1. Nhập chuỗi mã hóa (Base64 String)'}
              </span>
              <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                <span>{textInput.length} ký tự</span>
                <button
                  onClick={() => setTextInput('')}
                  title="Xóa nội dung"
                  className="hover:text-rose-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={direction === 'encode' ? 'Gõ hoặc dán văn bản bất kỳ (hỗ trợ Tiếng Việt có dấu, emoji, JSON)...' : 'Dán chuỗi Base64 cần giải mã tại đây...'}
              className="flex-1 p-4 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-mono leading-relaxed"
            />
          </div>

          {/* Output Panel */}
          <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 min-h-[300px]">
            <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {direction === 'encode' ? '2. Kết quả Base64' : '2. Văn bản đã giải mã'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-mono text-[11px]">
                  {textOutput.length} ký tự
                </span>
                <button
                  onClick={() => handleCopyText(textOutput)}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Sao chép</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={textOutput}
              placeholder="Kết quả chuyển đổi sẽ hiển thị tại đây..."
              className="flex-1 p-4 bg-neutral-50/50 dark:bg-neutral-950/40 text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-mono leading-relaxed"
            />
          </div>
        </div>
      ) : (
        /* Image Mode Body */
        <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-6 min-h-0">
          {/* Left: Input Base64 or File Upload */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Cách 1: Tải file ảnh lên để chuyển sang Base64
              </h4>
              <p className="text-[11px] text-neutral-500 mb-3">
                Hỗ trợ PNG, JPEG, SVG, WebP, GIF, ICO. Tự động mã hóa thành chuỗi Data URI chuẩn HTML/CSS.
              </p>

              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg hover:border-neutral-400 dark:hover:border-neutral-500 transition-colors cursor-pointer bg-neutral-50 dark:bg-neutral-950/50">
                <Upload className="w-6 h-6 text-neutral-400 mb-2" />
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                  Nhấp để chọn file ảnh hoặc kéo thả vào đây
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">
                  Xử lý 100% tại máy bạn, không upload lên server
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {imageFileInfo && (
                <div className="mt-3 p-2 bg-neutral-100 dark:bg-neutral-800 rounded text-xs flex items-center justify-between font-mono">
                  <span className="truncate">{imageFileInfo.name}</span>
                  <span className="text-neutral-400 shrink-0 ml-2">{imageFileInfo.size}</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 min-h-[220px]">
              <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                  Cách 2: Dán chuỗi Base64 Data URI
                </span>
                <div className="flex items-center gap-2">
                  {imageBase64Input && (
                    <button
                      onClick={() => handleCopyText(imageBase64Input)}
                      className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  )}
                  <button
                    onClick={() => setImageBase64Input('')}
                    title="Xóa"
                    className="text-neutral-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <textarea
                value={imageBase64Input}
                onChange={(e) => setImageBase64Input(e.target.value)}
                placeholder="Dán chuỗi 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...' hoặc Base64 thuần vào đây để xem ảnh..."
                className="flex-1 p-3 bg-transparent text-[11px] text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none resize-none font-mono break-all"
              />
            </div>
          </div>

          {/* Right: Decoded Image Preview & Quick Code Snippets */}
          <div className="w-full lg:w-96 flex flex-col gap-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Xem trước ảnh giải mã
                </span>
                {imagePreviewUrl && (
                  <button
                    onClick={downloadDecodedImage}
                    className="flex items-center gap-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
                  >
                    <Download className="w-3 h-3" />
                    <span>Tải ảnh về</span>
                  </button>
                )}
              </div>

              <div className="h-56 rounded border border-neutral-200 dark:border-neutral-800 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:12px_12px] flex items-center justify-center p-2 overflow-hidden">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Decoded preview"
                    className="max-h-full max-w-full object-contain rounded shadow-xs"
                    onError={() => showToast('Chuỗi Base64 không hợp lệ cho hình ảnh', 'error')}
                  />
                ) : (
                  <div className="text-center text-xs text-neutral-400">
                    Chưa có ảnh nào được nạp
                  </div>
                )}
              </div>
            </div>

            {/* Ready Snippets */}
            {imageBase64Input && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-2 text-xs">
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                  Đoạn mã tạo sẵn
                </span>

                <button
                  onClick={() => handleCopyText(`<img src="${imagePreviewUrl}" alt="embedded base64" />`)}
                  className="flex items-center justify-between p-2 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
                >
                  <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 truncate">
                    Thẻ HTML &lt;img&gt;
                  </span>
                  <Copy className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </button>

                <button
                  onClick={() => handleCopyText(`background-image: url("${imagePreviewUrl}");`)}
                  className="flex items-center justify-between p-2 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition-colors"
                >
                  <span className="text-[11px] font-mono text-neutral-700 dark:text-neutral-300 truncate">
                    CSS background-image
                  </span>
                  <Copy className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
