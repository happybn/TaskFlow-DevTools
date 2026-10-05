import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  KeyRound, 
  RefreshCw, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Share2, 
  History, 
  Trash2,
  Lock,
  Sparkles
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface HistoryItem {
  password: string;
  timestamp: number;
  strength: string;
}

// Character sets
const CHARS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
const CHARS_NUMBERS = '0123456789';
const CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Ambiguous characters to exclude when option is enabled
const AMBIGUOUS = new Set(['I', 'l', '1', 'O', '0', 'o', '|', '`', '\'', '"']);

// Wordlist for memorable passphrases
const PASSPHRASE_WORDS = [
  'alpha', 'beacon', 'breeze', 'cactus', 'cascade', 'comet', 'coral', 'crystal',
  'delta', 'echo', 'ember', 'falcon', 'feather', 'forest', 'galaxy', 'glacier',
  'harbor', 'horizon', 'indigo', 'jungle', 'lagoon', 'lotus', 'lunar', 'meadow',
  'nebula', 'nexus', 'oasis', 'ocean', 'orbit', 'phoenix', 'planet', 'polar',
  'prism', 'quantum', 'quartz', 'radar', 'radiant', 'ripple', 'river', 'safari',
  'shadow', 'sierra', 'silver', 'solar', 'spark', 'summit', 'tiger', 'timber',
  'topaz', 'velvet', 'vertex', 'vortex', 'whisper', 'zenith', 'zephyr'
];

export const PasswordGenTool: React.FC = () => {
  const { showToast } = useToast();

  // Settings matching screenshot
  const [includeUpper, setIncludeUpper] = useState<boolean>(true);
  const [includeLower, setIncludeLower] = useState<boolean>(true);
  const [includeNumbers, setIncludeNumbers] = useState<boolean>(true);
  const [includeSymbols, setIncludeSymbols] = useState<boolean>(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState<boolean>(true);
  const [ensureEachSet, setEnsureEachSet] = useState<boolean>(true);
  const [length, setLength] = useState<number>(16);

  // Display state
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // History & presets
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [generatorMode, setGeneratorMode] = useState<'random' | 'passphrase' | 'pin'>('random');

  // Secure Random Helper using Web Crypto API
  const getSecureRandomInt = (max: number): number => {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] % max;
  };

  // Generate password function
  const generatePassword = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 300);

    if (generatorMode === 'pin') {
      let pin = '';
      for (let i = 0; i < length; i++) {
        pin += getSecureRandomInt(10).toString();
      }
      setPassword(pin);
      return;
    }

    if (generatorMode === 'passphrase') {
      const wordCount = Math.max(3, Math.min(8, Math.round(length / 4)));
      const words: string[] = [];
      for (let i = 0; i < wordCount; i++) {
        const randWord = PASSPHRASE_WORDS[getSecureRandomInt(PASSPHRASE_WORDS.length)];
        words.push(randWord);
      }
      const num = getSecureRandomInt(100);
      const joined = words.join('-') + '-' + num;
      setPassword(joined);
      return;
    }

    // Filter character pools
    const filterPool = (pool: string) => {
      if (!excludeAmbiguous) return pool;
      return pool
        .split('')
        .filter((ch) => !AMBIGUOUS.has(ch))
        .join('');
    };

    const upperPool = includeUpper ? filterPool(CHARS_UPPER) : '';
    const lowerPool = includeLower ? filterPool(CHARS_LOWER) : '';
    const numberPool = includeNumbers ? filterPool(CHARS_NUMBERS) : '';
    const symbolPool = includeSymbols ? filterPool(CHARS_SYMBOLS) : '';

    const selectedPools = [upperPool, lowerPool, numberPool, symbolPool].filter(Boolean);

    if (selectedPools.length === 0) {
      showToast('Vui lòng chọn ít nhất một bộ ký tự', 'error');
      setPassword('');
      return;
    }

    const allChars = selectedPools.join('');
    const resultChars: string[] = [];

    // Ensure at least one character from each selected set
    if (ensureEachSet) {
      for (const pool of selectedPools) {
        if (resultChars.length < length && pool.length > 0) {
          resultChars.push(pool[getSecureRandomInt(pool.length)]);
        }
      }
    }

    // Fill remaining length
    while (resultChars.length < length) {
      resultChars.push(allChars[getSecureRandomInt(allChars.length)]);
    }

    // Fisher-Yates Shuffle with crypto randomness
    for (let i = resultChars.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1);
      const temp = resultChars[i];
      resultChars[i] = resultChars[j];
      resultChars[j] = temp;
    }

    const finalPass = resultChars.join('');
    setPassword(finalPass);

    // Add to history (keep latest 15)
    setHistory((prev) => [
      { password: finalPass, timestamp: Date.now(), strength: 'Mạnh' },
      ...prev.slice(0, 14),
    ]);
  }, [
    length,
    includeUpper,
    includeLower,
    includeNumbers,
    includeSymbols,
    excludeAmbiguous,
    ensureEachSet,
    generatorMode,
  ]);

  // Initial and auto-generate on settings change
  useEffect(() => {
    generatePassword();
  }, [generatePassword]);

  // Calculate password strength & entropy
  const strengthInfo = useMemo(() => {
    if (!password) return { label: 'Trống', score: 0, color: 'bg-neutral-500', text: 'text-neutral-400', crackTime: '0 giây' };
    
    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

    const entropy = Math.round(password.length * Math.log2(Math.max(2, poolSize)));

    if (entropy < 35 || password.length < 8) {
      return { label: 'Yếu', score: 25, color: 'bg-rose-500', text: 'text-rose-500', crackTime: 'Vài giây' };
    }
    if (entropy < 55 || password.length < 12) {
      return { label: 'Trung bình', score: 50, color: 'bg-amber-500', text: 'text-amber-500', crackTime: 'Vài ngày' };
    }
    if (entropy < 80 || password.length < 16) {
      return { label: 'Mạnh', score: 75, color: 'bg-emerald-500', text: 'text-emerald-500', crackTime: 'Vài thế kỷ' };
    }
    return { label: 'Cực mạnh (Chuẩn bảo mật cao)', score: 100, color: 'bg-emerald-400', text: 'text-emerald-400', crackTime: 'Hàng triệu năm' };
  }, [password]);

  const handleCopy = (textToCopy?: string) => {
    const target = textToCopy || password;
    if (!target) return;
    navigator.clipboard.writeText(target);
    setIsCopied(true);
    showToast('Đã sao chép mật khẩu vào bộ nhớ tạm');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Trình tạo mật khẩu an toàn',
        text: password,
      }).catch(() => {});
    } else {
      handleCopy();
      showToast('Đã sao chép mật khẩu');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 text-neutral-100 overflow-y-auto p-4 md:p-8">
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header hoàn toàn tiếng Việt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                Trình tạo mật khẩu
              </h1>
              <div className="w-12 h-1 bg-indigo-500 rounded-full mt-2" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                title="Lịch sử mật khẩu đã tạo"
                className={`p-2 rounded-lg border transition-colors ${
                  showHistory
                    ? 'bg-neutral-800 border-neutral-700 text-white'
                    : 'border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                <History className="w-4 h-4" />
              </button>

              <button
                onClick={handleShare}
                title="Sao chép hoặc chia sẻ mật khẩu"
                className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl mt-1">
            Tạo mật khẩu mạnh và an toàn với bộ ký tự tùy chỉnh, tự động loại bỏ các ký tự dễ gây nhầm lẫn và đảm bảo có đủ các nhóm ký tự được chọn.
          </p>
        </div>

        {/* Generator Mode Presets */}
        <div className="flex items-center gap-2 bg-neutral-900/80 p-1 rounded-lg border border-neutral-800 w-fit text-xs font-medium">
          <button
            onClick={() => setGeneratorMode('random')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              generatorMode === 'random'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ngẫu nhiên (Tùy biến)
          </button>
          <button
            onClick={() => {
              setGeneratorMode('passphrase');
              setLength(20);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              generatorMode === 'passphrase'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Cụm từ dễ nhớ (Passphrase)
          </button>
          <button
            onClick={() => {
              setGeneratorMode('pin');
              setLength(6);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              generatorMode === 'pin'
                ? 'bg-neutral-800 text-white shadow-xs font-semibold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Mã PIN số
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl">
          
          {/* 6 Toggles Grid (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
            {/* Col 1, Row 1: Chữ in hoa */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-200 font-medium">
                Chữ in hoa (ABC...)
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeUpper}
                  onChange={(e) => setIncludeUpper(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-400"></div>
              </label>
            </div>

            {/* Col 2, Row 1: Ký tự đặc biệt */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-200 font-medium">
                Ký tự đặc biệt (!-;...)
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSymbols}
                  onChange={(e) => setIncludeSymbols(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-400"></div>
              </label>
            </div>

            {/* Col 1, Row 2: Chữ thường */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-200 font-medium">
                Chữ thường (abc...)
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLower}
                  onChange={(e) => setIncludeLower(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-400"></div>
              </label>
            </div>

            {/* Col 2, Row 2: Loại bỏ ký tự dễ nhầm */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-neutral-200 font-medium">
                  Loại bỏ ký tự dễ nhầm lẫn
                </span>
                <span className="text-[10px] text-neutral-400">
                  (Il1lOo, v.v.)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={excludeAmbiguous}
                  onChange={(e) => setExcludeAmbiguous(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-400"></div>
              </label>
            </div>

            {/* Col 1, Row 3: Chữ số */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-neutral-200 font-medium">
                Chữ số (123...)
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeNumbers}
                  onChange={(e) => setIncludeNumbers(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-400"></div>
              </label>
            </div>

            {/* Col 2, Row 3: Đảm bảo có ít nhất 1 từ mỗi nhóm */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-neutral-200 font-medium">
                  Đảm bảo có ít nhất 1 ký tự
                </span>
                <span className="text-[10px] text-neutral-400">
                  từ mỗi nhóm đã chọn
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  checked={ensureEachSet}
                  onChange={(e) => setEnsureEachSet(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-400"></div>
              </label>
            </div>
          </div>

          {/* Length Slider */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-200 font-medium">
                Độ dài ký tự ({length})
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <button
                  type="button"
                  onClick={() => setLength(8)}
                  className="px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors"
                >
                  8
                </button>
                <button
                  type="button"
                  onClick={() => setLength(12)}
                  className="px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors"
                >
                  12
                </button>
                <button
                  type="button"
                  onClick={() => setLength(16)}
                  className="px-2 py-0.5 rounded bg-neutral-800 text-white font-medium"
                >
                  16
                </button>
                <button
                  type="button"
                  onClick={() => setLength(24)}
                  className="px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors"
                >
                  24
                </button>
                <button
                  type="button"
                  onClick={() => setLength(32)}
                  className="px-2 py-0.5 rounded hover:bg-neutral-800 transition-colors"
                >
                  32
                </button>
              </div>
            </div>

            <input
              type="range"
              min={6}
              max={64}
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-400 focus:outline-none"
            />
          </div>

          {/* Password Display Box with Eye toggle */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="relative flex items-center bg-black/60 border border-neutral-800 rounded-xl px-4 py-3.5 focus-within:border-neutral-600 transition-colors">
              <input
                type={showPassword ? 'text' : 'password'}
                readOnly
                value={password}
                placeholder="Mật khẩu tạo ra sẽ hiển thị ở đây..."
                className="w-full bg-transparent text-sm md:text-base font-mono text-white tracking-wider focus:outline-none pr-10 select-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ẩn mật khẩu (dạng dấu chấm)' : 'Hiện mật khẩu'}
                className="absolute right-3.5 p-1 text-neutral-400 hover:text-white transition-colors"
              >
                {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength meter bar */}
            <div className="flex items-center justify-between gap-3 px-1 pt-1 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Độ mạnh:</span>
                <span className={`font-semibold ${strengthInfo.text}`}>
                  {strengthInfo.label}
                </span>
                <span className="text-neutral-500">·</span>
                <span className="text-neutral-400">
                  Thời gian giải mã: <strong className="text-neutral-300 font-normal">{strengthInfo.crackTime}</strong>
                </span>
              </div>

              <div className="w-24 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                  style={{ width: `${strengthInfo.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Sao chép & Làm mới */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleCopy()}
              className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={generatePassword}
              className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Tạo lại</span>
            </button>
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col gap-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <span className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-indigo-400" />
                Lịch sử mật khẩu vừa tạo ({history.length})
              </span>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  Xóa lịch sử
                </button>
              )}
            </div>

            <div className="flex flex-col divide-y divide-neutral-800/60 max-h-56 overflow-y-auto">
              {history.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 text-xs font-mono group">
                  <span className="text-neutral-300 truncate max-w-md">
                    {item.password}
                  </span>
                  <button
                    onClick={() => handleCopy(item.password)}
                    className="p-1 text-neutral-400 hover:text-white opacity-80 group-hover:opacity-100"
                    title="Sao chép"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
