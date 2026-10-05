import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

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

export const JsonTool: React.FC = () => {
  const { showToast } = useToast();

  const [inputJson, setInputJson] = useState<string>('');
  const [outputTab, setOutputTab] = useState<'formatted' | 'yaml' | 'csv' | 'tree'>('formatted');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Parse state & validation
  const { parsedObj, parseError, formattedString, yamlString, csvString } = useMemo(() => {
    if (!inputJson.trim()) {
      return {
        parsedObj: null,
        parseError: null,
        formattedString: '',
        yamlString: '',
        csvString: '',
      };
    }
    try {
      const parsed = JSON.parse(inputJson);
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
        formattedString: formatted,
        yamlString: yaml,
        csvString: csv,
      };
    } catch (err: any) {
      return {
        parsedObj: null,
        parseError: err.message || 'JSON không đúng cú pháp',
        formattedString: '',
        yamlString: '',
        csvString: '',
      };
    }
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
      showToast('JSON đang có lỗi cú pháp', 'error');
      return;
    }
    setInputJson(formattedString);
    showToast('Đã format JSON đẹp');
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
          <button
            onClick={handleBeautify}
            disabled={!parsedObj}
            className="flex items-center gap-1 px-2.5 py-1.5 font-medium rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 disabled:opacity-40 transition-colors"
          >
            <span>Format đẹp</span>
          </button>

          <button
            onClick={handleMinify}
            disabled={!parsedObj}
            className="flex items-center gap-1 px-2.5 py-1.5 font-medium rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 disabled:opacity-40 transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Nén Minify</span>
          </button>

          <div className="w-[1px] h-4 bg-neutral-200 dark:border-neutral-800 mx-1" />

          <button
            onClick={handleEscapeString}
            className="px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            Escape \
          </button>
          <button
            onClick={handleUnescapeString}
            className="px-2 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            Unescape
          </button>

          <button
            onClick={() => setInputJson(SAMPLE_JSON)}
            className="px-2 py-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            Nạp mẫu
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
            <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[280px]">{parseError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Cú pháp hợp lệ (Valid JSON)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="flex-1 p-4 md:p-8 flex flex-col lg:flex-row gap-4 min-h-0">
        {/* Left: Input Editor */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 min-h-[350px]">
          <div className="px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Dữ liệu JSON đầu vào
            </span>
            <span className="text-neutral-400 font-mono text-[11px]">
              {inputJson.length} bytes
            </span>
          </div>

          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            placeholder="Dán chuỗi JSON cần xử lý hoặc chuyển đổi tại đây..."
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
                Sang YAML
              </button>
              <button
                onClick={() => setOutputTab('csv')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  outputTab === 'csv'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Sang CSV
              </button>
              <button
                onClick={() => setOutputTab('tree')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  outputTab === 'tree'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-950 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Tree Path Finder
              </button>
            </div>

            <button
              onClick={handleCopyOutput}
              disabled={!parsedObj}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded transition-colors disabled:opacity-40"
            >
              <Copy className="w-3 h-3" />
              <span>Sao chép</span>
            </button>
          </div>

          {/* Output Content */}
          <div className="flex-1 overflow-auto p-4 bg-neutral-50/50 dark:bg-neutral-950/40 min-h-0">
            {parseError ? (
              <div className="p-4 text-xs font-mono text-rose-500">
                {parseError}
              </div>
            ) : outputTab === 'formatted' ? (
              <pre className="text-xs font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {formattedString || '// Chưa có dữ liệu'}
              </pre>
            ) : outputTab === 'yaml' ? (
              <pre className="text-xs font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {yamlString || '# Chưa có dữ liệu'}
              </pre>
            ) : outputTab === 'csv' ? (
              <pre className="text-xs font-mono text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap">
                {csvString}
              </pre>
            ) : (
              <div className="text-xs overflow-auto">
                <div className="mb-2 text-[11px] text-neutral-400 italic">
                  * Nhấp chuột vào bất kỳ khóa (key) nào để copy JSON path.
                </div>
                {renderTree(parsedObj)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
