import React, { useState, useMemo } from 'react';
import { 
  Check, 
  Copy, 
  Trash2, 
  Minimize2, 
  FileCode, 
  Table, 
  Code2, 
  AlertCircle, 
  CheckCircle2, 
  Layers,
  Sparkles,
  ArrowRight,
  Wand2,
  HelpCircle,
  FileCheck
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// Decode HTML entities (e.g. &quot; -> ", &#34; -> ", &apos; -> ', &amp; -> &, etc.)
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/gi, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#x22;/gi, '"')
    .replace(/&#x0022;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&#60;/g, '<')
    .replace(/&#060;/g, '<')
    .replace(/&#x3c;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#62;/g, '>')
    .replace(/&#062;/g, '>')
    .replace(/&#x3e;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#x26;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&#47;/g, '/')
    .replace(/&#92;/g, '\\');
}

export interface SmartParseResult {
  parsed: any | null;
  error: string | null;
  wasFixed: boolean;
  fixNotice?: string;
  cleanedText: string;
}

// Smart JSON parser with automatic error recovery for HTML entities, escaped strings, Python dicts, etc.
export function smartParseJson(raw: string): SmartParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { parsed: null, error: null, wasFixed: false, cleanedText: '' };
  }

  // 1. Direct standard parse
  try {
    const direct = JSON.parse(trimmed);
    return { parsed: direct, error: null, wasFixed: false, cleanedText: trimmed };
  } catch {
    // Continue to smart fixing
  }

  // 2. Decode HTML Entities (e.g. &quot; -> ", &#34; -> ", &apos; -> ', &amp; -> &, etc.)
  if (/&(quot|apos|lt|gt|amp|nbsp|#34|#034|#39|#039|#x22|#x27);/i.test(trimmed)) {
    const decoded = decodeHtmlEntities(trimmed);
    try {
      const parsed = JSON.parse(decoded);
      return {
        parsed,
        error: null,
        wasFixed: true,
        fixNotice: 'Tự động khử mã HTML entities (&quot; → ")',
        cleanedText: decoded,
      };
    } catch {
      // Continue to next steps using the decoded text as candidate
    }
  }

  let candidate = decodeHtmlEntities(trimmed);

  // 3. Check for escaped JSON string wrapper: e.g. "{\"channel\": \"EWAPP\"}"
  if (candidate.startsWith('"') && candidate.endsWith('"')) {
    try {
      const unquoted = JSON.parse(candidate);
      if (typeof unquoted === 'string') {
        const innerCandidate = decodeHtmlEntities(unquoted);
        const innerParsed = JSON.parse(innerCandidate);
        return {
          parsed: innerParsed,
          error: null,
          wasFixed: true,
          fixNotice: 'Tự động unescape chuỗi bọc ngoài JSON',
          cleanedText: typeof innerParsed === 'object' ? JSON.stringify(innerParsed, null, 2) : innerCandidate,
        };
      }
    } catch {
      // Continue
    }
  }

  // 4. Check for backslash escaped quotes: {\"channel\": \"EWAPP\"}
  if (candidate.includes('\\"')) {
    const unescapedSlashes = candidate.replace(/\\"/g, '"');
    try {
      const parsed = JSON.parse(unescapedSlashes);
      return {
        parsed,
        error: null,
        wasFixed: true,
        fixNotice: 'Tự động khử dấu gạch chéo escape (\\" → ")',
        cleanedText: unescapedSlashes,
      };
    } catch {
      // Continue
    }
  }

  // 5. Check for URL-encoded JSON (e.g. %7B%22channel%22%3A%22EWAPP%22%7D)
  if (/%[0-9a-fA-F]{2}/.test(candidate)) {
    try {
      const urlDecoded = decodeHtmlEntities(decodeURIComponent(candidate));
      const parsed = JSON.parse(urlDecoded);
      return {
        parsed,
        error: null,
        wasFixed: true,
        fixNotice: 'Tự động giải mã URL-encoded JSON',
        cleanedText: urlDecoded,
      };
    } catch {
      // Continue
    }
  }

  // 6. Python dictionary or JS object literal (single quotes, trailing commas, Python booleans)
  let relaxed = candidate
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null')
    .replace(/,\s*([\}\]])/g, '$1'); // Remove trailing comma

  // Replace single quotes with double quotes
  if (relaxed.includes("'")) {
    const singleQuoteFixed = relaxed.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
    try {
      const parsed = JSON.parse(singleQuoteFixed);
      return {
        parsed,
        error: null,
        wasFixed: true,
        fixNotice: 'Tự động chuẩn hóa dấu nháy đơn (\' → ") và hằng số',
        cleanedText: singleQuoteFixed,
      };
    } catch {
      // Continue
    }
  }

  // 7. If still invalid, report clear standard error message
  try {
    JSON.parse(candidate);
    return { parsed: null, error: null, wasFixed: false, cleanedText: candidate };
  } catch (err: any) {
    return {
      parsed: null,
      error: err.message || 'JSON không đúng cú pháp',
      wasFixed: false,
      cleanedText: candidate,
    };
  }
}

// Simple robust JSON to YAML converter
function jsonToYaml(obj: any, indent = 0): string {
  const spacing = '  '.repeat(indent);
  if (obj === null) return 'null';
  if (typeof obj === 'undefined') return '';
  if (typeof obj === 'boolean' || typeof obj === 'number') return String(obj);
  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('"') || obj.includes('#')) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          const innerYaml = jsonToYaml(item, indent + 1);
          const trimmed = innerYaml.trimStart();
          return `${spacing}- ${trimmed}`;
        }
        return `${spacing}- ${jsonToYaml(item, indent + 1)}`;
      })
      .join('\n');
  }

  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const val = obj[key];
        if (typeof val === 'object' && val !== null) {
          return `${spacing}${key}:\n${jsonToYaml(val, indent + 1)}`;
        }
        return `${spacing}${key}: ${jsonToYaml(val, indent + 1)}`;
      })
      .join('\n');
  }

  return String(obj);
}

// JSON to CSV converter (for arrays of objects)
function jsonToCsv(jsonArray: any[]): string {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    return 'Lỗi: Dữ liệu phải là mảng các đối tượng (Array of Objects) để chuyển sang CSV.';
  }

  // Collect all unique headers
  const headers = Array.from(
    new Set(
      jsonArray.flatMap((item) =>
        typeof item === 'object' && item !== null ? Object.keys(item) : []
      )
    )
  );

  if (headers.length === 0) {
    return 'Lỗi: Không tìm thấy trường dữ liệu để tạo cột CSV.';
  }

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.join(',')];
  for (const item of jsonArray) {
    if (typeof item === 'object' && item !== null) {
      const row = headers.map((h) => escapeCsv(item[h]));
      csvRows.push(row.join(','));
    }
  }

  return csvRows.join('\n');
}

const SAMPLE_JSON = `{
  "id": "ord_9921",
  "customer": {
    "name": "Nguyễn Văn Minh",
    "email": "minhratlangoan@gmail.com",
    "tier": "VIP"
  },
  "items": [
    { "id": 1, "product": "Bàn phím cơ không dây", "price": 1250000, "qty": 1 },
    { "id": 2, "product": "Chuột công thái học", "price": 850000, "qty": 2 }
  ],
  "totalAmount": 2950000,
  "currency": "VND",
  "status": "paid",
  "isShipped": false
}`;

const SAMPLE_HTML_ENTITIES_JSON = `{
&quot;channel&quot;: &quot;EWAPP&quot;,
&quot;requestId&quot;: &quot;1&quot;,
&quot;confirmRequestId&quot;: &quot;21155467374461952&quot;,
&quot;checksum&quot;: &quot;abcde&quot;
}`;

export const JsonTool: React.FC = () => {
  const { showToast } = useToast();

  const [inputJson, setInputJson] = useState<string>('');
  const [outputTab, setOutputTab] = useState<'formatted' | 'yaml' | 'csv' | 'tree'>('formatted');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Smart Parse state & validation
  const { 
    parsedObj, 
    parseError, 
    wasFixed, 
    fixNotice, 
    cleanedText,
    formattedString, 
    yamlString, 
    csvString 
  } = useMemo(() => {
    if (!inputJson.trim()) {
      return {
        parsedObj: null,
        parseError: null,
        wasFixed: false,
        fixNotice: undefined,
        cleanedText: '',
        formattedString: '',
        yamlString: '',
        csvString: '',
      };
    }

    const { parsed, error, wasFixed, fixNotice, cleanedText } = smartParseJson(inputJson);

    if (!parsed) {
      return {
        parsedObj: null,
        parseError: error || 'JSON không đúng cú pháp',
        wasFixed,
        fixNotice,
        cleanedText,
        formattedString: '',
        yamlString: '',
        csvString: '',
      };
    }

    const formatted = JSON.stringify(parsed, null, indentSize);
    const yaml = jsonToYaml(parsed);
    const csv = Array.isArray(parsed)
      ? jsonToCsv(parsed)
      : typeof parsed === 'object' && parsed !== null
      ? jsonToCsv(
          Object.values(parsed).find((v) => Array.isArray(v)) as any[] || [parsed]
        )
      : 'Cần một danh sách mảng JSON để xuất CSV';

    return {
      parsedObj: parsed,
      parseError: null,
      wasFixed,
      fixNotice,
      cleanedText,
      formattedString: formatted,
      yamlString: yaml,
      csvString: csv,
    };
  }, [inputJson, indentSize]);

  // Actions
  const handleMinify = () => {
    if (!parsedObj) {
      showToast('Không thể nén: JSON đang có lỗi cú pháp', 'error');
      return;
    }
    const minified = JSON.stringify(parsedObj);
    setInputJson(minified);
    showToast('Đã nén JSON thành 1 dòng');
  };

  const handleBeautify = () => {
    if (!parsedObj) {
      showToast('JSON đang có lỗi cú pháp, vui lòng kiểm tra lại', 'error');
      return;
    }
    setInputJson(formattedString);
    showToast(wasFixed ? 'Đã khử ký tự lạ và format JSON chuẩn đẹp' : 'Đã format JSON đẹp');
  };

  // Decode HTML entities directly in the input box
  const handleDecodeHtml = () => {
    const decoded = decodeHtmlEntities(inputJson);
    if (decoded === inputJson) {
      showToast('Không tìm thấy ký tự HTML entities (&quot;, &apos;...) nào');
      return;
    }
    setInputJson(decoded);
    showToast('Đã chuyển &quot; thành dấu nháy kép "');
  };

  // Auto-Fix & Beautify in 1-Click
  const handleAutoFix = () => {
    if (parsedObj) {
      setInputJson(formattedString);
      showToast('Đã tự động sửa lỗi và làm đẹp JSON');
      return;
    }
    // If not directly parseable, try cleaning HTML entities first
    const cleaned = decodeHtmlEntities(inputJson);
    const retry = smartParseJson(cleaned);
    if (retry.parsed) {
      const pretty = JSON.stringify(retry.parsed, null, indentSize);
      setInputJson(pretty);
      showToast('Đã tự động sửa lỗi và làm đẹp JSON');
    } else {
      showToast('Không thể tự động sửa lỗi JSON này', 'error');
    }
  };

  const handleEscapeString = () => {
    try {
      const escaped = JSON.stringify(inputJson);
      setInputJson(escaped);
      showToast('Đã escape chuỗi JSON');
    } catch {
      showToast('Lỗi khi escape', 'error');
    }
  };

  const handleUnescapeString = () => {
    try {
      let trimmed = inputJson.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        trimmed = JSON.parse(trimmed);
      } else {
        trimmed = trimmed.replace(/\\"/g, '"');
      }
      setInputJson(trimmed);
      showToast('Đã unescape chuỗi');
    } catch {
      showToast('Không thể unescape chuỗi này', 'error');
    }
  };

  const handleCopyOutput = () => {
    const textToCopy =
      outputTab === 'formatted'
        ? formattedString
        : outputTab === 'yaml'
        ? yamlString
        : outputTab === 'csv'
        ? csvString
        : JSON.stringify(parsedObj, null, 2);

    navigator.clipboard.writeText(textToCopy);
    showToast('Đã sao chép kết quả');
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedKey(path);
    showToast(`Đã chép đường dẫn: ${path}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Render Interactive Tree recursively
  const renderTree = (data: any, path = ''): React.ReactNode => {
    if (data === null) return <span className="text-rose-500 font-mono">null</span>;
    if (typeof data === 'boolean') {
      return <span className="text-amber-500 font-mono">{String(data)}</span>;
    }
    if (typeof data === 'number') {
      return <span className="text-sky-500 font-mono tabular-nums">{data}</span>;
    }
    if (typeof data === 'string') {
      return <span className="text-emerald-500 font-mono">"{data}"</span>;
    }

    if (Array.isArray(data)) {
      return (
        <div className="pl-4 border-l border-neutral-200 dark:border-neutral-800 flex flex-col gap-1 my-0.5">
          <span className="text-neutral-400 font-mono text-[11px]">[</span>
          {data.map((item, index) => {
            const currentPath = path ? `${path}[${index}]` : `[${index}]`;
            return (
              <div key={index} className="flex items-start gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 p-0.5 rounded">
                <button
                  onClick={() => copyPath(currentPath)}
                  title="Click để copy path"
                  className="font-mono text-[11px] text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  {index}:
                </button>
                <div className="flex-1">{renderTree(item, currentPath)}</div>
              </div>
            );
          })}
          <span className="text-neutral-400 font-mono text-[11px]">]</span>
        </div>
      );
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      return (
        <div className="pl-4 border-l border-neutral-200 dark:border-neutral-800 flex flex-col gap-1 my-0.5">
          <span className="text-neutral-400 font-mono text-[11px]">&#123;</span>
          {keys.map((key) => {
            const currentPath = path ? `${path}.${key}` : key;
            return (
              <div key={key} className="flex items-start gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 p-0.5 rounded group">
                <button
                  onClick={() => copyPath(currentPath)}
                  title="Click để copy JSON path"
                  className="font-mono text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 hover:underline hover:text-neutral-950 dark:hover:text-white"
                >
                  "{key}":
                </button>
                <div className="flex-1">{renderTree(data[key], currentPath)}</div>
              </div>
            );
          })}
          <span className="text-neutral-400 font-mono text-[11px]">&#125;</span>
        </div>
      );
    }

    return String(data);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-y-auto">
      {/* Top Action Bar */}
      <div className="p-4 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-3">
        {/* Actions for Input */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Format / Beautify */}
          <button
            onClick={handleBeautify}
            disabled={!parsedObj}
            className="flex items-center gap-1 px-3 py-1.5 font-semibold rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 transition-colors shadow-2xs"
            title="Làm đẹp và thụt lề chuẩn JSON"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Format đẹp</span>
          </button>

          {/* Dedicated Decode HTML Entities button */}
          <button
            onClick={handleDecodeHtml}
            disabled={!inputJson.trim()}
            className="flex items-center gap-1 px-2.5 py-1.5 font-medium rounded border border-neutral-300 dark:border-neutral-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 disabled:opacity-40 transition-colors"
            title="Khử mã &amp;quot; thành dấu nháy kép"
          >
            <span>Khử &quot; (HTML)</span>
          </button>

          <button
            onClick={handleMinify}
            disabled={!parsedObj}
            className="flex items-center gap-1 px-2.5 py-1.5 font-medium rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Nén 1 dòng</span>
          </button>

          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

          <button
            onClick={handleUnescapeString}
            className="px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Khử dấu gạch chéo escape"
          >
            Khử \ (Unescape)
          </button>

          <button
            onClick={handleEscapeString}
            className="px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            Escape \
          </button>

          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

          {/* Sample Selectors */}
          <button
            onClick={() => setInputJson(SAMPLE_HTML_ENTITIES_JSON)}
            className="px-2 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline transition-colors"
            title="Thử với JSON mẫu dính &quot;"
          >
            Mẫu dính &quot;
          </button>

          <button
            onClick={() => setInputJson(SAMPLE_JSON)}
            className="px-2 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Mẫu chuẩn
          </button>

          <button
            onClick={() => setInputJson('')}
            className="p-1.5 text-neutral-400 hover:text-rose-500 transition-colors"
            title="Xóa trắng"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Validation Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {parseError ? (
            <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[11px] bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[280px]">{parseError}</span>
            </div>
          ) : wasFixed ? (
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono text-[11px] bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded border border-amber-200 dark:border-amber-900">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>{fixNotice}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Cú pháp hợp lệ (Valid JSON)</span>
            </div>
          )}
        </div>
      </div>

      {/* Notice Banner when Auto-Fixed */}
      {wasFixed && parsedObj && (
        <div className="mx-4 md:mx-8 mt-4 p-2.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Phát hiện JSON dính mã HTML ({fixNotice}):</strong> Hệ thống đã tự động bóc tách và tạo ra JSON chuẩn đẹp ở khung bên phải.
            </span>
          </div>
          <button
            onClick={handleBeautify}
            className="shrink-0 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium text-[11px] transition-colors"
          >
            Áp dụng vào ô nhập
          </button>
        </div>
      )}

      {/* Main Dual Workspace */}
      <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left: Input Editor */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 min-h-[350px]">
          <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <span>Dữ liệu JSON đầu vào</span>
              {inputJson.includes('&quot;') && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Có &quot;
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {inputJson.includes('&quot;') && (
                <button
                  onClick={handleDecodeHtml}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Đổi sang " ngay
                </button>
              )}
              <span className="text-neutral-400 font-mono text-[11px]">
                {inputJson.length} bytes
              </span>
            </div>
          </div>

          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            placeholder={`Dán chuỗi JSON cần xử lý tại đây...\n\nHỗ trợ:\n• JSON dính HTML entities (&quot;channel&quot;: &quot;EWAPP&quot;)\n• JSON bị escape (\\\"channel\\\": \\\"EWAPP\\\")\n• Chuỗi bọc ngoài (\"{\\\"a\\\": 1}\")\n• Python dict ('channel': 'EWAPP', 'active': True)`}
            className="flex-1 p-4 bg-transparent text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-mono leading-relaxed"
          />
        </div>

        {/* Right: Output Converter */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 min-h-[350px]">
          {/* Output Mode Tabs */}
          <div className="px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded">
              <button
                onClick={() => setOutputTab('formatted')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  outputTab === 'formatted'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                JSON Chuẩn
              </button>
              <button
                onClick={() => setOutputTab('yaml')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  outputTab === 'yaml'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                YAML
              </button>
              <button
                onClick={() => setOutputTab('csv')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  outputTab === 'csv'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setOutputTab('tree')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  outputTab === 'tree'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Cây (Tree)
              </button>
            </div>

            <div className="flex items-center gap-2">
              {outputTab === 'formatted' && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-mono">
                  <span>Tab:</span>
                  <button
                    onClick={() => setIndentSize(2)}
                    className={`px-1.5 rounded ${
                      indentSize === 2
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                        : 'text-neutral-500'
                    }`}
                  >
                    2
                  </button>
                  <button
                    onClick={() => setIndentSize(4)}
                    className={`px-1.5 rounded ${
                      indentSize === 4
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                        : 'text-neutral-500'
                    }`}
                  >
                    4
                  </button>
                </div>
              )}

              <button
                onClick={handleCopyOutput}
                disabled={!parsedObj}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded disabled:opacity-40 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Output Content */}
          <div className="flex-1 p-4 overflow-auto font-mono text-xs text-neutral-900 dark:text-neutral-100 select-text leading-relaxed">
            {outputTab === 'formatted' && (
              <pre className="whitespace-pre break-all">
                {formattedString || (
                  <span className="text-neutral-400 select-none">
                    Kết quả JSON chuẩn đẹp sẽ hiển thị ở đây...
                  </span>
                )}
              </pre>
            )}

            {outputTab === 'yaml' && (
              <pre className="whitespace-pre break-all">
                {yamlString || (
                  <span className="text-neutral-400 select-none">
                    Kết quả chuyển sang YAML sẽ hiển thị ở đây...
                  </span>
                )}
              </pre>
            )}

            {outputTab === 'csv' && (
              <pre className="whitespace-pre break-all">
                {csvString || (
                  <span className="text-neutral-400 select-none">
                    Kết quả chuyển sang CSV sẽ hiển thị ở đây...
                  </span>
                )}
              </pre>
            )}

            {outputTab === 'tree' && (
              <div className="flex flex-col">
                {parsedObj ? (
                  renderTree(parsedObj)
                ) : (
                  <span className="text-neutral-400 select-none">
                    Dạng cây thư mục tương tác sẽ hiển thị ở đây...
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
