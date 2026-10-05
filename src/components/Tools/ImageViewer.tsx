import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Maximize2, 
  RefreshCw, 
  Copy, 
  Download, 
  ExternalLink, 
  Image as ImageIcon, 
  FlipHorizontal, 
  FlipVertical, 
  Grid,
  Check,
  AlertTriangle,
  ClipboardPaste,
  History,
  Trash2
} from 'lucide-react';
import { RecentImageUrl } from '../../types';
import { useToast } from '../../context/ToastContext';

interface ImageViewerProps {
  recentImages: RecentImageUrl[];
  setRecentImages: React.Dispatch<React.SetStateAction<RecentImageUrl[]>>;
}

const SAMPLE_IMAGES = [
  {
    name: 'Landscape Architecture',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Minimalist Interior',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Dark Geometric Pattern',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  }
];

export const ImageViewer: React.FC<ImageViewerProps> = ({ recentImages, setRecentImages }) => {
  const { showToast } = useToast();
  
  // Input state
  const [inputUrl, setInputUrl] = useState<string>('');
  const [currentUrl, setCurrentUrl] = useState<string>('');

  // Viewer transformation state
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [checkerboard, setCheckerboard] = useState<boolean>(true);

  // Image load & inspect state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load new URL
  const handleLoadUrl = (urlToLoad: string) => {
    if (!urlToLoad.trim()) return;
    const cleanUrl = urlToLoad.trim();
    setCurrentUrl(cleanUrl);
    setIsLoading(true);
    setHasError(false);
    resetTransform();

    // Add to recent images history if not duplicate
    setRecentImages((prev) => {
      const filtered = prev.filter((item) => item.url !== cleanUrl);
      return [{ url: cleanUrl, timestamp: Date.now() }, ...filtered.slice(0, 15)];
    });
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('data:image/')) {
        setInputUrl(text);
        handleLoadUrl(text);
        showToast('Đã dán và tải ảnh từ Clipboard');
      } else {
        showToast('Nội dung Clipboard không phải là link ảnh hợp lệ', 'warning');
      }
    } catch {
      showToast('Không thể đọc Clipboard, hãy dán thủ công bằng Ctrl+V', 'warning');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn một file hình ảnh', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setInputUrl(result);
        handleLoadUrl(result);
        showToast(`Đã tải ảnh: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Transform controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
  const handleRotateCw = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleToggleFlipH = () => setFlipH((prev) => !prev);
  const handleToggleFlipV = () => setFlipV((prev) => !prev);
  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Handle image load
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setIsLoading(false);
    setHasError(false);
  };

  const onImageError = () => {
    setIsLoading(false);
    setHasError(true);
    setNaturalSize(null);
  };

  // Copy helpers
  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    showToast('Đã chép URL ảnh');
  };

  const copyHtmlSnippet = () => {
    navigator.clipboard.writeText(`<img src="${currentUrl}" alt="Preview image" />`);
    showToast('Đã chép thẻ HTML <img>');
  };

  const copyMarkdownSnippet = () => {
    navigator.clipboard.writeText(`![Image](${currentUrl})`);
    showToast('Đã chép cú pháp Markdown');
  };

  const clearHistory = () => {
    setRecentImages([]);
    showToast('Đã xóa lịch sử ảnh');
  };

  // Calculate Aspect Ratio string
  const aspectRatioStr = naturalSize
    ? (() => {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(naturalSize.width, naturalSize.height);
        const wRatio = naturalSize.width / divisor;
        const hRatio = naturalSize.height / divisor;
        return `${naturalSize.width} × ${naturalSize.height} (${wRatio}:${hRatio})`;
      })()
    : '---';

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-y-auto">
      {/* Top Input Bar */}
      <div className="p-4 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLoadUrl(inputUrl);
          }}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-2 mb-3"
        >
          <div className="relative flex-1">
            <ImageIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Dán link ảnh (http, https, hoặc data:image/png;base64,...)"
              className="w-full pl-9 pr-8 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-500"
            />
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
            >
              Xem ảnh
            </button>

            <button
              type="button"
              onClick={handlePasteClipboard}
              title="Dán từ Clipboard"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dán link</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
              <span>Tải file</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </form>

        {/* Sample Links Quick Selector */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400 text-[11px]">Ảnh mẫu nhanh:</span>
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.name}
              type="button"
              onClick={() => {
                setInputUrl(sample.url);
                handleLoadUrl(sample.url);
              }}
              className="px-2 py-0.5 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              {sample.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Preview Work Area */}
      <div className="flex-1 flex flex-col xl:flex-row min-h-0">
        {/* Left / Center: Interactive Canvas Container */}
        <div className="flex-1 flex flex-col min-h-0 p-4 md:p-6">
          {/* Controls Toolset Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 mb-3 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={handleZoomIn}
                title="Phóng to (+)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Thu nhỏ (-)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 font-mono text-[11px] text-neutral-500 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={resetTransform}
                title="Đặt lại về mặc định"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <button
                onClick={handleRotateCcw}
                title="Xoay ngược chiều kim đồng hồ (-90°)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotateCw}
                title="Xoay theo chiều kim đồng hồ (+90°)"
                className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <button
                onClick={handleToggleFlipH}
                title="Lật ngang (Flip Horizontal)"
                className={`p-1.5 rounded transition-colors ${
                  flipH ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggleFlipV}
                title="Lật dọc (Flip Vertical)"
                className={`p-1.5 rounded transition-colors ${
                  flipV ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <FlipVertical className="w-4 h-4" />
              </button>

              <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

              <button
                onClick={() => setCheckerboard(!checkerboard)}
                title="Bật/Tắt nền kẻ caro (kiểm tra độ trong suốt PNG)"
                className={`p-1.5 rounded transition-colors ${
                  checkerboard ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Export Snippets */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={copyUrl}
                title="Copy URL ảnh"
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>URL</span>
              </button>
              <button
                onClick={copyHtmlSnippet}
                title="Copy mã HTML <img>"
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <span>&lt;img&gt;</span>
              </button>
              <button
                onClick={copyMarkdownSnippet}
                title="Copy cú pháp Markdown"
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <span>MD</span>
              </button>
              <a
                href={currentUrl}
                download="image-preview.png"
                target="_blank"
                rel="noreferrer"
                title="Mở ảnh tab mới / Tải về"
                className="p-1.5 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Viewport Canvas */}
          <div
            ref={containerRef}
            className={`flex-1 min-h-[350px] relative rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden flex items-center justify-center ${
              checkerboard
                ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:16px_16px] bg-neutral-50 dark:bg-neutral-900/50'
                : 'bg-neutral-900'
            }`}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/40 backdrop-blur-xs z-10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-neutral-900/90 text-white text-xs font-mono">
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Đang tải ảnh...</span>
                </div>
              </div>
            )}

            {!currentUrl ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm text-neutral-400">
                <ImageIcon className="w-10 h-10 mb-2.5 text-neutral-300 dark:text-neutral-700 stroke-[1.5]" />
                <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Chưa có ảnh nào được nạp
                </h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed mb-3">
                  Nhập link ảnh phía trên, bấm "Dán link" từ clipboard hoặc kéo file ảnh vào đây để xem ngay.
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handlePasteClipboard()}
                    className="px-2.5 py-1 text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  >
                    Dán từ Clipboard
                  </button>
                  <button
                    onClick={() => {
                      setInputUrl(SAMPLE_IMAGES[0].url);
                      handleLoadUrl(SAMPLE_IMAGES[0].url);
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                  >
                    Thử ảnh mẫu
                  </button>
                </div>
              </div>
            ) : hasError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
                <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                  Không thể tải được hình ảnh
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed mb-4">
                  Đường dẫn ảnh có thể không chính xác, đã hết hạn, hoặc máy chủ chứa ảnh chặn truy cập trực tiếp từ trình duyệt (CORS policy).
                </p>
                <button
                  onClick={() => handleLoadUrl(SAMPLE_IMAGES[0].url)}
                  className="px-3 py-1.5 text-xs bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded font-medium"
                >
                  Xem ảnh mẫu thay thế
                </button>
              </div>
            ) : (
              <div
                className="max-w-full max-h-full flex items-center justify-center transition-transform duration-150 ease-out"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                }}
              >
                <img
                  ref={imgRef}
                  src={currentUrl}
                  alt="URL Preview"
                  referrerPolicy="no-referrer"
                  onLoad={onImageLoad}
                  onError={onImageError}
                  className="max-h-[60vh] max-w-full object-contain rounded shadow-xs select-none pointer-events-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Image Inspector & History */}
        <div className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 p-4 md:p-6 flex flex-col gap-6">
          {/* Metadata Inspector Card */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
              Thông số hình ảnh
            </h4>
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Trạng thái:</span>
                <span className={`font-medium ${hasError ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {hasError ? 'Lỗi tải ảnh' : 'Tải thành công'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Kích thước thật:</span>
                <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                  {naturalSize ? `${naturalSize.width} × ${naturalSize.height} px` : '---'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Tỷ lệ (Aspect):</span>
                <span className="font-mono text-neutral-900 dark:text-neutral-100">
                  {aspectRatioStr}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Mức phóng to:</span>
                <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-500">Góc xoay:</span>
                <span className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
                  {rotation}°
                </span>
              </div>
            </div>
          </div>

          {/* History of recent images */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                <History className="w-3.5 h-3.5" />
                <span>Lịch sử URL gần đây</span>
              </div>
              {recentImages.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-neutral-400 hover:text-rose-500"
                >
                  Xóa
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/80 pr-1 max-h-[280px]">
              {recentImages.length === 0 ? (
                <div className="text-[11px] text-neutral-400 py-4 text-center italic">
                  Chưa có lịch sử ảnh nào
                </div>
              ) : (
                recentImages.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setInputUrl(item.url);
                      handleLoadUrl(item.url);
                    }}
                    className={`py-2 px-2 rounded cursor-pointer transition-colors text-left flex items-center justify-between gap-2 group ${
                      currentUrl === item.url
                        ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                        : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    <span className="text-xs truncate font-mono flex-1">
                      {item.url}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
