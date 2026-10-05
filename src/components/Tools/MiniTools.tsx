import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Link, 
  FileEdit, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  Check,
  Globe
} from 'lucide-react';
import { storage } from '../../services/storage';
import { useToast } from '../../context/ToastContext';

export const MiniTools: React.FC = () => {
  const { showToast } = useToast();

  // Scratchpad
  const [scratchpadText, setScratchpadText] = useState<string>(() => storage.getScratchpad());

  // Timestamp tool
  const [currentEpoch, setCurrentEpoch] = useState<number>(Math.floor(Date.now() / 1000));
  const [inputEpoch, setInputEpoch] = useState<string>(String(Math.floor(Date.now() / 1000)));
  const [inputDate, setInputDate] = useState<string>(new Date().toISOString().slice(0, 16));

  // URL tool
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlDecoded, setUrlDecoded] = useState<string>('');
  const [urlEncoded, setUrlEncoded] = useState<string>('');
  const [queryParams, setQueryParams] = useState<{ key: string; val: string }[]>([]);

  // Keep epoch timer running
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Autosave scratchpad
  useEffect(() => {
    storage.saveScratchpad(scratchpadText);
  }, [scratchpadText]);

  // URL Parser Effect
  useEffect(() => {
    try {
      setUrlDecoded(decodeURIComponent(urlInput));
      setUrlEncoded(encodeURI(urlInput));

      // Parse query params
      const parsed = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`);
      const params: { key: string; val: string }[] = [];
      parsed.searchParams.forEach((val, key) => {
        params.push({ key, val });
      });
      setQueryParams(params);
    } catch {
      setUrlDecoded(decodeURIComponent(urlInput));
      setUrlEncoded(encodeURIComponent(urlInput));
      setQueryParams([]);
    }
  }, [urlInput]);

  const copyText = (val: string) => {
    navigator.clipboard.writeText(val);
    showToast('Đã sao chép vào Clipboard');
  };

  // Convert input epoch to readable string
  const convertedDateInfo = (() => {
    const num = Number(inputEpoch.trim());
    if (isNaN(num) || num <= 0) return null;
    // Auto-detect seconds vs milliseconds
    const date = new Date(num > 1e11 ? num : num * 1000);
    if (isNaN(date.getTime())) return null;

    return {
      gmt7: date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'medium' }),
      utc: date.toUTCString(),
      iso: date.toISOString(),
      relative: `${Math.round((Date.now() - date.getTime()) / 60000)} phút trước`,
    };
  })();

  const handleConvertDateToEpoch = (isoDateTime: string) => {
    setInputDate(isoDateTime);
    const date = new Date(isoDateTime);
    if (!isNaN(date.getTime())) {
      setInputEpoch(String(Math.floor(date.getTime() / 1000)));
      showToast('Đã chuyển đổi ngày sang Epoch');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-100/50 dark:bg-neutral-950 overflow-y-auto p-4 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
        {/* Card 1: Unix Epoch Converter */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Epoch & Timestamp Converter
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-neutral-500">
              <span>Hiện tại:</span>
              <strong className="text-neutral-900 dark:text-neutral-100 tabular-nums">
                {currentEpoch}
              </strong>
              <button
                onClick={() => setInputEpoch(String(currentEpoch))}
                title="Lấy thời gian hiện tại"
                className="hover:text-neutral-900 dark:hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-xs">
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Nhập Epoch Timestamp (Giây hoặc Mili-giây)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputEpoch}
                  onChange={(e) => setInputEpoch(e.target.value)}
                  className="flex-1 p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded font-mono text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
                <button
                  onClick={() => setInputEpoch(String(currentEpoch))}
                  className="px-2.5 py-2 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Hiện tại
                </button>
              </div>
            </div>

            {convertedDateInfo && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 rounded border border-neutral-200 dark:border-neutral-800 flex flex-col gap-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Giờ Việt Nam (GMT+7):</span>
                  <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
                    {convertedDateInfo.gmt7}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">ISO 8601:</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {convertedDateInfo.iso}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">UTC:</span>
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {convertedDateInfo.utc}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Hoặc chọn Ngày / Giờ để lấy Timestamp
              </label>
              <input
                type="datetime-local"
                value={inputDate}
                onChange={(e) => handleConvertDateToEpoch(e.target.value)}
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Scratchpad Quick Notes */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Sổ nháp tạm thời (Scratchpad)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-neutral-400 font-mono">
                Tự động lưu LocalStorage
              </span>
              <button
                onClick={() => copyText(scratchpadText)}
                className="p-1 hover:text-neutral-900 dark:hover:text-white"
                title="Sao chép toàn bộ"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <textarea
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            placeholder="Dán nhanh văn bản tạm, số tài khoản, link, token hoặc câu lệnh... Sẽ được tự động lưu lại trên máy bạn."
            className="flex-1 w-full p-3 bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none resize-none font-mono min-h-[160px] leading-relaxed"
          />
        </div>

        {/* Card 3: URL Encoder / Decoder & Query Inspector (Full Width) */}
        <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                URL Encode / Decode & Bóc tách Query Parameters
              </h3>
            </div>
            <button
              onClick={() => copyText(urlDecoded)}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy URL đã giải mã</span>
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Nhập URL hoặc chuỗi query
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/api?param1=abc%20xyz&param2=123"
                className="w-full p-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none"
              />
            </div>

            {queryParams.length > 0 && (
              <div>
                <span className="text-[11px] font-medium text-neutral-500 block mb-1.5">
                  Bảng tham số bóc tách ({queryParams.length} tham số)
                </span>
                <div className="rounded border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <table className="w-full text-xs font-mono">
                    <thead className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 text-left border-b border-neutral-200 dark:border-neutral-700">
                      <tr>
                        <th className="py-1.5 px-3 font-medium w-1/3">Key</th>
                        <th className="py-1.5 px-3 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {queryParams.map((p, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                          <td className="py-1.5 px-3 text-neutral-900 dark:text-neutral-100 font-semibold">{p.key}</td>
                          <td className="py-1.5 px-3 text-neutral-600 dark:text-neutral-400 break-all">{p.val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
