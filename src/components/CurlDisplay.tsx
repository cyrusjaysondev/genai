interface CurlDisplayProps {
  curl: string;
  onCopy: () => void;
  copied: boolean;
}

function highlightCurl(curl: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let remaining = curl;
  let key = 0;

  const patterns: { regex: RegExp; color: string }[] = [
    // Strings (single or double quoted)
    { regex: /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/, color: "#4ade80" },
    // curl keyword
    { regex: /^(curl)\b/, color: "#38bdf8" },
    // Flags like -X, -H, -F, -d, --header, --data, etc.
    { regex: /^(--?[a-zA-Z][\w-]*)/, color: "#38bdf8" },
    // URLs (http/https)
    { regex: /^(https?:\/\/[^\s'"\\]+)/, color: "#fbbf24" },
  ];

  while (remaining.length > 0) {
    let matched = false;

    for (const { regex, color } of patterns) {
      const match = remaining.match(regex);
      if (match) {
        parts.push(
          <span key={key++} style={{ color }}>
            {match[1]}
          </span>
        );
        remaining = remaining.slice(match[1].length);
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Consume one character as plain text, coalescing with previous plain text
      const lastPart = parts[parts.length - 1];
      if (typeof lastPart === "string") {
        parts[parts.length - 1] = lastPart + remaining[0];
      } else {
        parts.push(
          <span key={key++} className="text-slate-300">
            {remaining[0]}
          </span>
        );
      }
      remaining = remaining.slice(1);
    }
  }

  return parts;
}

export default function CurlDisplay({ curl, onCopy, copied }: CurlDisplayProps) {
  return (
    <div className="relative rounded-xl border border-[#334155] bg-[#0f172a] overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#334155] bg-[#1e293b]">
        <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
          Generated cURL
        </span>
        <button
          onClick={onCopy}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
            transition-all duration-200 cursor-pointer
            ${
              copied
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-600/50 hover:text-white hover:border-slate-500/50"
            }
          `}
        >
          {copied ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code block */}
      <div className="overflow-x-auto">
        <pre className="p-4 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap break-all">
          <code>{highlightCurl(curl)}</code>
        </pre>
      </div>
    </div>
  );
}
