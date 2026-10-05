import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  GitCompare, 
  ArrowLeftRight, 
  Trash2, 
  Copy, 
  Upload, 
  Download, 
  Check, 
  Split, 
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

type DiffViewMode = 'split' | 'unified';
type DiffType = 'equal' | 'insert' | 'delete' | 'modify';

interface WordPart {
  type: 'equal' | 'insert' | 'delete' | 'change';
  text: string;
}

interface DiffLine {
  type: DiffType;
  lineNumA?: number;
  lineNumB?: number;
  textA?: string;
  textB?: string;
  wordsA?: WordPart[];
  wordsB?: WordPart[];
}

const SAMPLE_TEXT_A = `// Phiên bản v1.0.0
function calculateDiscount(user, cartTotal) {
  let discount = 0;
  if (user.isVip) {
    discount = 0.10; // Giảm 10% cho VIP
  } else if (cartTotal > 1000000) {
    discount = 0.05; // Giảm 5% cho đơn lớn
  }
  return cartTotal * (1 - discount);
}`;

const SAMPLE_TEXT_B = `// Phiên bản v2.0.0 (Cập nhật ưu đãi mùa hè)
function calculateDiscount(user, cartTotal) {
  let discount = 0;
  if (user.isVip && user.points > 100) {
    discount = 0.15; // Tăng lên 15% cho VIP tích lũy
  } else if (cartTotal > 800000) {
    discount = 0.08; // Hạ mốc đơn xuống 800k, giảm 8%
  }
  // Bổ sung phí vận chuyển ưu đãi
  return Math.max(0, cartTotal * (1 - discount));
}`;

// Word-level LCS diff algorithm
function diffWords(strA: string, strB: string): { wordsA: WordPart[]; wordsB: WordPart[] } {
  // Tokenize preserving spaces & punctuation
  const tokenize = (s: string) => s.match(/([a-zA-Z0-9_]+|[\s]+|[^\s\w]+)/g) || [s];
  const tokensA = tokenize(strA);
  const tokensB = tokenize(strB);

  const m = tokensA.length;
  const n = tokensB.length;

  // LCS Matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (tokensA[i] === tokensB[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // Backtrack
  let i = m;
  let j = n;
  const partsA: WordPart[] = [];
  const partsB: WordPart[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      partsA.unshift({ type: 'equal', text: tokensA[i - 1] });
      partsB.unshift({ type: 'equal', text: tokensB[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      partsB.unshift({ type: 'change', text: tokensB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      partsA.unshift({ type: 'change', text: tokensA[i - 1] });
      i--;
    }
  }

  return { wordsA: partsA, wordsB: partsB };
}

// Line-level LCS diff
function computeDiff(textA: string, textB: string, ignoreWhitespace: boolean): DiffLine[] {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');

  const normalize = (s: string) => (ignoreWhitespace ? s.trim() : s);

  const m = linesA.length;
  const n = linesB.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (normalize(linesA[i]) === normalize(linesB[j])) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const rawDiff: { type: 'equal' | 'delete' | 'insert'; lineA?: string; lineB?: string; numA?: number; numB?: number }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && normalize(linesA[i - 1]) === normalize(linesB[j - 1])) {
      rawDiff.unshift({ type: 'equal', lineA: linesA[i - 1], lineB: linesB[j - 1], numA: i, numB: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.unshift({ type: 'insert', lineB: linesB[j - 1], numB: j });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.unshift({ type: 'delete', lineA: linesA[i - 1], numA: i });
      i--;
    }
  }

  // Combine adjacent delete + insert into 'modify' for side-by-side highlighting
  const result: DiffLine[] = [];
  let k = 0;
  while (k < rawDiff.length) {
    const item = rawDiff[k];
    if (item.type === 'delete' && k + 1 < rawDiff.length && rawDiff[k + 1].type === 'insert') {
      const next = rawDiff[k + 1];
      const { wordsA, wordsB } = diffWords(item.lineA || '', next.lineB || '');
      result.push({
        type: 'modify',
        lineNumA: item.numA,
        lineNumB: next.numB,
        textA: item.lineA,
        textB: next.lineB,
        wordsA,
        wordsB,
      });
      k += 2;
    } else if (item.type === 'equal') {
      result.push({
        type: 'equal',
        lineNumA: item.numA,
        lineNumB: item.numB,
        textA: item.lineA,
        textB: item.lineB,
      });
      k++;
    } else if (item.type === 'delete') {
      result.push({
        type: 'delete',
        lineNumA: item.numA,
        textA: item.lineA,
        wordsA: [{ type: 'change', text: item.lineA || '' }],
      });
      k++;
    } else {
      result.push({
        type: 'insert',
        lineNumB: item.numB,
        textB: item.lineB,
        wordsB: [{ type: 'change', text: item.lineB || '' }],
      });
      k++;
    }
  }

  return result;
}

export const TextDiffTool: React.FC = () => {
  const { showToast } = useToast();

  // Inputs
  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');

  // Settings
  const [viewMode, setViewMode] = useState<DiffViewMode>('split');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<boolean>(false);
  const [wordHighlightOnly, setWordHighlightOnly] = useState<boolean>(true);

  // Sync scroll refs
  const scrollRefA = useRef<HTMLDivElement>(null);
  const scrollRefB = useRef<HTMLDivElement>(null);

  const handleScrollA = () => {
    if (scrollRefA.current && scrollRefB.current) {
      scrollRefB.current.scrollTop = scrollRefA.current.scrollTop;
      scrollRefB.current.scrollLeft = scrollRefA.current.scrollLeft;
    }
  };

  const handleScrollB = () => {
    if (scrollRefA.current && scrollRefB.current) {
      scrollRefA.current.scrollTop = scrollRefB.current.scrollTop;
      scrollRefA.current.scrollLeft = scrollRefB.current.scrollLeft;
    }
  };

  // Diff result calculation
  const diffLines = useMemo(() => {
    if (!textA && !textB) return [];
    return computeDiff(textA, textB, ignoreWhitespace);
  }, [textA, textB, ignoreWhitespace]);

  // Statistics
  const stats = useMemo(() => {
    let diffCount = 0;
    let addedLines = 0;
    let removedLines = 0;
    let modifiedLines = 0;

    for (const item of diffLines) {
      if (item.type === 'modify') {
        modifiedLines++;
        diffCount++;
      } else if (item.type === 'insert') {
        addedLines++;
        diffCount++;
      } else if (item.type === 'delete') {
        removedLines++;
        diffCount++;
      }
    }
    return { diffCount, addedLines, removedLines, modifiedLines };
  }, [diffLines]);

  const handleSwap = () => {
    const temp = textA;
    setTextA(textB);
    setTextB(temp);
    showToast('Đã đảo vị trí văn bản A ⇄ B');
  };

  const handleClear = () => {
    setTextA('');
    setTextB('');
    showToast('Đã xóa sạch cả 2 bên');
  };

  const handleLoadSample = () => {
    setTextA(SAMPLE_TEXT_A);
    setTextB(SAMPLE_TEXT_B);
    showToast('Đã nạp văn bản mẫu so sánh');
  };

  const handleCopyUnified = () => {
    if (!diffLines.length) return;
    const textReport = diffLines
      .map((line) => {
        if (line.type === 'equal') return `  ${line.textA}`;
        if (line.type === 'delete') return `- ${line.textA}`;
        if (line.type === 'insert') return `+ ${line.textB}`;
        return `- ${line.textA}\n+ ${line.textB}`;
      })
      .join('\n');

    navigator.clipboard.writeText(textReport);
    showToast('Đã copy báo cáo so sánh (diff)');
  };

  const handleFileUpload = (side: 'A' | 'B', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (typeof content === 'string') {
        if (side === 'A') setTextA(content);
        else setTextB(content);
        showToast(`Đã tải file "${file.name}" vào bên ${side}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-hidden">
      {/* Top Header & Action Controls */}
      <div className="px-4 md:px-6 py-3 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Text Diff · So sánh văn bản
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Tự động phát hiện khác biệt và <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1 rounded">bôi vàng nổi bật</span> các ký tự / dòng thay đổi
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            {(textA || textB) && (
              <div className="hidden sm:flex items-center gap-2 ml-3 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono">
                {stats.diffCount === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Hai văn bản hoàn toàn giống nhau
                  </span>
                ) : (
                  <>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {stats.diffCount} điểm khác biệt
                    </span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-amber-500">{stats.modifiedLines} sửa</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-emerald-500">+{stats.addedLines} thêm</span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-rose-500">-{stats.removedLines} bớt</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-md border border-neutral-200 dark:border-neutral-700">
              <button
                onClick={() => setViewMode('split')}
                title="Dạng song song (Side by side)"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>2 Cột</span>
              </button>
              <button
                onClick={() => setViewMode('unified')}
                title="Dạng hợp nhất (Unified)"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === 'unified'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span>1 Cột</span>
              </button>
            </div>

            {/* Options */}
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(e) => setIgnoreWhitespace(e.target.checked)}
                className="rounded border-neutral-300 dark:border-neutral-700 text-amber-500 focus:ring-0"
              />
              <span>Bỏ qua dấu cách</span>
            </label>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={!textA && !textB}
              title="Đảo vị trí văn bản A sang B và ngược lại"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đảo A ⇄ B</span>
            </button>

            {/* Sample Button */}
            <button
              onClick={handleLoadSample}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Nạp mẫu</span>
            </button>

            {/* Copy Result */}
            <button
              onClick={handleCopyUnified}
              disabled={!diffLines.length}
              title="Sao chép báo cáo so sánh diff"
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 disabled:opacity-40 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy diff</span>
            </button>

            {/* Clear Button */}
            {(textA || textB) && (
              <button
                onClick={handleClear}
                title="Xóa cả 2 bên"
                className="p-1.5 text-neutral-400 hover:text-rose-500 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Diff Area */}
      <div className="flex-1 flex flex-col min-h-0 p-3 md:p-5 gap-4 overflow-hidden">
        {/* Inputs row (Collapsible or editable text areas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-44 shrink-0">
          {/* Text A Input */}
          <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Văn bản gốc (Bên A)
              </span>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Chọn file...</span>
                  <input
                    type="file"
                    accept=".txt,.json,.js,.ts,.html,.css,.md,.sql"
                    onChange={(e) => handleFileUpload('A', e)}
                    className="hidden"
                  />
                </label>
                {textA && (
                  <button
                    onClick={() => setTextA('')}
                    className="text-[11px] text-neutral-400 hover:text-rose-500"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              placeholder="Dán văn bản gốc (hoặc code, JSON, SQL...) vào đây..."
              className="flex-1 w-full bg-transparent text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Text B Input */}
          <div className="flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-neutral-100 dark:border-neutral-800 text-xs">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Văn bản mới cần so sánh (Bên B)
              </span>
              <div className="flex items-center gap-2">
                <label className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  <span>Chọn file...</span>
                  <input
                    type="file"
                    accept=".txt,.json,.js,.ts,.html,.css,.md,.sql"
                    onChange={(e) => handleFileUpload('B', e)}
                    className="hidden"
                  />
                </label>
                {textB && (
                  <button
                    onClick={() => setTextB('')}
                    className="text-[11px] text-neutral-400 hover:text-rose-500"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              placeholder="Dán văn bản đã sửa đổi (hoặc code mới) vào đây..."
              className="flex-1 w-full bg-transparent text-xs font-mono text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* Diff Visualizer Viewport */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xs overflow-hidden">
          {/* Visualizer Header */}
          <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Kết quả đối chiếu chi tiết
              </span>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-amber-300 dark:bg-amber-500/50 border border-amber-400 rounded-xs"></span>
                  <span className="font-medium text-amber-700 dark:text-amber-300">Vàng: Chỗ khác biệt / Đã sửa</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-emerald-200 dark:bg-emerald-900/50 border border-emerald-400 rounded-xs"></span>
                  <span className="text-emerald-700 dark:text-emerald-300">Xanh: Thêm mới</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 bg-rose-200 dark:bg-rose-900/50 border border-rose-400 rounded-xs"></span>
                  <span className="text-rose-700 dark:text-rose-300">Đỏ: Đã xóa</span>
                </span>
              </div>
            </div>

            <span className="text-[11px] text-neutral-400 font-mono">
              Tổng {diffLines.length} dòng
            </span>
          </div>

          {/* Empty Prompt */}
          {!textA && !textB ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-neutral-400">
              <GitCompare className="w-10 h-10 mb-2.5 text-neutral-300 dark:text-neutral-700 stroke-[1.5]" />
              <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Chưa có văn bản để so sánh
              </h4>
              <p className="text-[11px] text-neutral-500 max-w-sm mb-3">
                Dán văn bản vào 2 khung bên trên hoặc nhấn nút "Nạp mẫu" để xem ngay kết quả bôi vàng các điểm khác nhau.
              </p>
              <button
                onClick={handleLoadSample}
                className="px-3 py-1.5 text-xs font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                Nạp thử văn bản mẫu
              </button>
            </div>
          ) : viewMode === 'split' ? (
            /* Split View (2 Columns Synchronized) */
            <div className="flex-1 grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 overflow-hidden font-mono text-xs">
              {/* Left Column (A) */}
              <div
                ref={scrollRefA}
                onScroll={handleScrollA}
                className="overflow-auto select-text p-2"
              >
                {diffLines.map((line, idx) => {
                  if (line.type === 'insert') {
                    // Blank spacer line in Column A when line was inserted in B
                    return (
                      <div
                        key={idx}
                        className="flex items-center min-h-[22px] bg-neutral-50/60 dark:bg-neutral-950/40 text-neutral-300 dark:text-neutral-700 select-none px-2"
                      >
                        <span className="w-8 text-right mr-3 text-neutral-300 dark:text-neutral-800 text-[11px]">-</span>
                        <span className="italic text-[10px] text-neutral-300 dark:text-neutral-700">·</span>
                      </div>
                    );
                  }

                  const isModified = line.type === 'modify';
                  const isDeleted = line.type === 'delete';

                  return (
                    <div
                      key={idx}
                      className={`flex items-start min-h-[22px] px-2 py-0.5 rounded-xs transition-colors ${
                        isModified
                          ? 'bg-amber-100/70 dark:bg-amber-950/40 border-l-2 border-amber-500'
                          : isDeleted
                          ? 'bg-rose-100/60 dark:bg-rose-950/40 border-l-2 border-rose-500'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                        {line.lineNumA}
                      </span>

                      <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                        {isModified && line.wordsA ? (
                          line.wordsA.map((part, pIdx) => (
                            <span
                              key={pIdx}
                              className={
                                part.type === 'change'
                                  ? 'bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs ring-1 ring-amber-400 dark:ring-amber-500/50'
                                  : ''
                              }
                            >
                              {part.text}
                            </span>
                          ))
                        ) : isDeleted ? (
                          <span className="bg-rose-200/80 dark:bg-rose-900/60 text-rose-950 dark:text-rose-100 line-through px-0.5 rounded-xs">
                            {line.textA}
                          </span>
                        ) : (
                          line.textA || '\u00A0'
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column (B) */}
              <div
                ref={scrollRefB}
                onScroll={handleScrollB}
                className="overflow-auto select-text p-2"
              >
                {diffLines.map((line, idx) => {
                  if (line.type === 'delete') {
                    // Blank spacer line in Column B when line was deleted from A
                    return (
                      <div
                        key={idx}
                        className="flex items-center min-h-[22px] bg-neutral-50/60 dark:bg-neutral-950/40 text-neutral-300 dark:text-neutral-700 select-none px-2"
                      >
                        <span className="w-8 text-right mr-3 text-neutral-300 dark:text-neutral-800 text-[11px]">-</span>
                        <span className="italic text-[10px] text-neutral-300 dark:text-neutral-700">·</span>
                      </div>
                    );
                  }

                  const isModified = line.type === 'modify';
                  const isInserted = line.type === 'insert';

                  return (
                    <div
                      key={idx}
                      className={`flex items-start min-h-[22px] px-2 py-0.5 rounded-xs transition-colors ${
                        isModified
                          ? 'bg-amber-100/70 dark:bg-amber-950/40 border-l-2 border-amber-500'
                          : isInserted
                          ? 'bg-emerald-100/60 dark:bg-emerald-950/40 border-l-2 border-emerald-500'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                        {line.lineNumB}
                      </span>

                      <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                        {isModified && line.wordsB ? (
                          line.wordsB.map((part, pIdx) => (
                            <span
                              key={pIdx}
                              className={
                                part.type === 'change'
                                  ? 'bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs ring-1 ring-amber-400 dark:ring-amber-500/50'
                                  : ''
                              }
                            >
                              {part.text}
                            </span>
                          ))
                        ) : isInserted ? (
                          <span className="bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 px-0.5 rounded-xs font-medium">
                            {line.textB}
                          </span>
                        ) : (
                          line.textB || '\u00A0'
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Unified View (1 Combined Column) */
            <div className="flex-1 overflow-auto select-text p-2 font-mono text-xs">
              {diffLines.map((line, idx) => {
                if (line.type === 'equal') {
                  return (
                    <div
                      key={idx}
                      className="flex items-start min-h-[22px] px-2 py-0.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                    >
                      <span className="w-8 shrink-0 text-right mr-2 text-neutral-400 select-none text-[11px]">
                        {line.lineNumA}
                      </span>
                      <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                        {line.lineNumB}
                      </span>
                      <span className="w-4 select-none text-neutral-300 dark:text-neutral-700"> </span>
                      <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                        {line.textA || '\u00A0'}
                      </div>
                    </div>
                  );
                }

                if (line.type === 'modify') {
                  return (
                    <React.Fragment key={idx}>
                      {/* Old modified line */}
                      <div className="flex items-start min-h-[22px] px-2 py-0.5 bg-amber-100/60 dark:bg-amber-950/40 border-l-2 border-amber-500">
                        <span className="w-8 shrink-0 text-right mr-2 text-neutral-400 select-none text-[11px]">
                          {line.lineNumA}
                        </span>
                        <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                          -
                        </span>
                        <span className="w-4 select-none text-rose-500 font-bold">-</span>
                        <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                          {line.wordsA ? (
                            line.wordsA.map((part, pIdx) => (
                              <span
                                key={pIdx}
                                className={
                                  part.type === 'change'
                                    ? 'bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs ring-1 ring-amber-400'
                                    : ''
                                }
                              >
                                {part.text}
                              </span>
                            ))
                          ) : (
                            line.textA
                          )}
                        </div>
                      </div>

                      {/* New modified line */}
                      <div className="flex items-start min-h-[22px] px-2 py-0.5 bg-amber-100/80 dark:bg-amber-950/50 border-l-2 border-amber-500">
                        <span className="w-8 shrink-0 text-right mr-2 text-neutral-400 select-none text-[11px]">
                          -
                        </span>
                        <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                          {line.lineNumB}
                        </span>
                        <span className="w-4 select-none text-emerald-500 font-bold">+</span>
                        <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                          {line.wordsB ? (
                            line.wordsB.map((part, pIdx) => (
                              <span
                                key={pIdx}
                                className={
                                  part.type === 'change'
                                    ? 'bg-amber-300 dark:bg-amber-500/40 text-amber-950 dark:text-amber-100 font-semibold px-0.5 rounded-xs ring-1 ring-amber-400'
                                    : ''
                                }
                              >
                                {part.text}
                              </span>
                            ))
                          ) : (
                            line.textB
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                }

                if (line.type === 'delete') {
                  return (
                    <div
                      key={idx}
                      className="flex items-start min-h-[22px] px-2 py-0.5 bg-rose-100/60 dark:bg-rose-950/40 border-l-2 border-rose-500"
                    >
                      <span className="w-8 shrink-0 text-right mr-2 text-neutral-400 select-none text-[11px]">
                        {line.lineNumA}
                      </span>
                      <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                        -
                      </span>
                      <span className="w-4 select-none text-rose-500 font-bold">-</span>
                      <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                        <span className="bg-rose-200/80 dark:bg-rose-900/60 text-rose-950 dark:text-rose-100 line-through px-0.5 rounded-xs">
                          {line.textA}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="flex items-start min-h-[22px] px-2 py-0.5 bg-emerald-100/60 dark:bg-emerald-950/40 border-l-2 border-emerald-500"
                  >
                    <span className="w-8 shrink-0 text-right mr-2 text-neutral-400 select-none text-[11px]">
                      -
                    </span>
                    <span className="w-8 shrink-0 text-right mr-3 text-neutral-400 select-none text-[11px]">
                      {line.lineNumB}
                    </span>
                    <span className="w-4 select-none text-emerald-500 font-bold">+</span>
                    <div className="flex-1 whitespace-pre-wrap break-all text-neutral-900 dark:text-neutral-100 leading-relaxed">
                      <span className="bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 px-0.5 rounded-xs font-medium">
                        {line.textB}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
