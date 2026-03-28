import { useState, useCallback } from "react";
import type { ApiResponse } from "../types";

interface ResponseViewerProps {
  response: ApiResponse | null;
  loading: boolean;
}

type ActiveTab = "body" | "headers";

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-green-600/20 text-green-400 border-green-500/30";
  if (status >= 400 && status < 500) return "bg-yellow-600/20 text-yellow-400 border-yellow-500/30";
  if (status >= 500) return "bg-red-600/20 text-red-400 border-red-500/30";
  return "bg-slate-600/20 text-slate-400 border-slate-500/30";
}

function JsonKey({ children }: { children: string }) {
  return <span className="text-cyan-400">"{children}"</span>;
}

function JsonString({ children }: { children: string }) {
  return <span className="text-green-400">"{children}"</span>;
}

function JsonNumber({ children }: { children: number }) {
  return <span className="text-yellow-400">{String(children)}</span>;
}

function JsonBoolean({ children }: { children: boolean }) {
  return <span className="text-purple-400">{String(children)}</span>;
}

function JsonNull() {
  return <span className="text-red-400">null</span>;
}

function CollapsibleNode({
  label,
  isArray,
  children,
  entryCount,
}: {
  label?: string;
  isArray: boolean;
  children: React.ReactNode;
  entryCount: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const bracket = isArray ? ["[", "]"] : ["{", "}"];

  return (
    <span>
      {label !== undefined && (
        <>
          <JsonKey>{label}</JsonKey>
          <span className="text-slate-400">: </span>
        </>
      )}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer text-slate-500 hover:text-slate-300 transition-colors"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        <span className="select-none mr-1 text-xs inline-block w-3">
          {expanded ? "▼" : "▶"}
        </span>
        <span className="text-slate-300">{bracket[0]}</span>
      </button>
      {expanded ? (
        <>
          <div className="pl-5 border-l border-slate-700/50">{children}</div>
          <span className="text-slate-300">{bracket[1]}</span>
        </>
      ) : (
        <span className="text-slate-500">
          {" "}
          {entryCount} {entryCount === 1 ? "item" : "items"}{" "}
          <span className="text-slate-300">{bracket[1]}</span>
        </span>
      )}
    </span>
  );
}

function JsonValue({
  value,
  keyName,
  isLast,
}: {
  value: any;
  keyName?: string;
  isLast?: boolean;
}) {
  const comma = isLast ? "" : ",";

  if (value === null) {
    return (
      <div>
        {keyName !== undefined && (
          <>
            <JsonKey>{keyName}</JsonKey>
            <span className="text-slate-400">: </span>
          </>
        )}
        <JsonNull />
        <span className="text-slate-400">{comma}</span>
      </div>
    );
  }

  if (typeof value === "string") {
    return (
      <div>
        {keyName !== undefined && (
          <>
            <JsonKey>{keyName}</JsonKey>
            <span className="text-slate-400">: </span>
          </>
        )}
        <JsonString>{value}</JsonString>
        <span className="text-slate-400">{comma}</span>
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div>
        {keyName !== undefined && (
          <>
            <JsonKey>{keyName}</JsonKey>
            <span className="text-slate-400">: </span>
          </>
        )}
        <JsonNumber>{value}</JsonNumber>
        <span className="text-slate-400">{comma}</span>
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div>
        {keyName !== undefined && (
          <>
            <JsonKey>{keyName}</JsonKey>
            <span className="text-slate-400">: </span>
          </>
        )}
        <JsonBoolean>{value}</JsonBoolean>
        <span className="text-slate-400">{comma}</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    const entries = value;
    return (
      <div>
        <CollapsibleNode label={keyName} isArray entryCount={entries.length}>
          {entries.map((item, i) => (
            <JsonValue key={i} value={item} isLast={i === entries.length - 1} />
          ))}
        </CollapsibleNode>
        <span className="text-slate-400">{comma}</span>
      </div>
    );
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    return (
      <div>
        <CollapsibleNode label={keyName} isArray={false} entryCount={keys.length}>
          {keys.map((k, i) => (
            <JsonValue
              key={k}
              keyName={k}
              value={value[k]}
              isLast={i === keys.length - 1}
            />
          ))}
        </CollapsibleNode>
        <span className="text-slate-400">{comma}</span>
      </div>
    );
  }

  return (
    <div>
      {keyName !== undefined && (
        <>
          <JsonKey>{keyName}</JsonKey>
          <span className="text-slate-400">: </span>
        </>
      )}
      <span className="text-slate-400">{String(value)}</span>
      <span className="text-slate-400">{comma}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="bg-slate-900 rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-6 w-16 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-24 bg-slate-700 rounded animate-pulse" />
        <div className="ml-auto h-4 w-20 bg-slate-700 rounded animate-pulse" />
      </div>
      <div className="flex gap-4 border-b border-slate-700 pb-2">
        <div className="h-4 w-12 bg-slate-700 rounded animate-pulse" />
        <div className="h-4 w-16 bg-slate-700 rounded animate-pulse" />
      </div>
      <div className="space-y-2 pt-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-4 bg-slate-800 rounded animate-pulse"
            style={{ width: `${60 + Math.random() * 35}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ResponseViewer({ response, loading }: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("body");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!response) return;
    const text =
      typeof response.body === "string"
        ? response.body
        : JSON.stringify(response.body, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [response]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!response) {
    return null;
  }

  const headerEntries = Object.entries(response.headers);
  const bodyIsObject = response.body !== null && typeof response.body === "object";

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-semibold border ${getStatusColor(response.status)}`}
        >
          {response.status}
        </span>
        <span className="text-slate-400 text-sm">{response.statusText}</span>
        <span className="ml-auto text-slate-500 text-sm font-mono">
          {response.duration}ms
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-6 px-5 border-b border-slate-800">
        {(["body", "headers"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`relative py-3 text-sm font-medium capitalize transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-[#38bdf8]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#38bdf8] rounded-full" />
            )}
          </button>
        ))}

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          className="ml-auto text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer py-3"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === "body" && (
          <div className="font-mono text-sm leading-relaxed overflow-x-auto">
            {bodyIsObject ? (
              <JsonValue value={response.body} isLast />
            ) : (
              <pre className="text-slate-300 whitespace-pre-wrap break-words">
                {typeof response.body === "string"
                  ? response.body
                  : String(response.body)}
              </pre>
            )}
          </div>
        )}

        {activeTab === "headers" && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">
                    Header
                  </th>
                  <th className="text-left px-4 py-2.5 text-slate-400 font-medium">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {headerEntries.map(([key, value], i) => (
                  <tr
                    key={key}
                    className={
                      i % 2 === 0 ? "bg-slate-800/30" : "bg-slate-800/60"
                    }
                  >
                    <td className="px-4 py-2 text-cyan-400 whitespace-nowrap">
                      {key}
                    </td>
                    <td className="px-4 py-2 text-slate-300 break-all">
                      {value}
                    </td>
                  </tr>
                ))}
                {headerEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No headers
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
