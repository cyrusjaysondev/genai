import { useState } from 'react';

interface JobResult {
  status: string;
  url?: string;
  filename?: string;
  error?: string;
}

interface ResultDisplayProps {
  result: JobResult | null;
  baseUrl: string;
  outputType: 'video' | 'image' | 'json';
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer
        bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <svg className="w-6 h-6 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="text-red-400 font-semibold text-sm mb-1">Job Failed</h4>
          <p className="text-red-300/80 text-sm leading-relaxed">{error}</p>
          <p className="text-slate-500 text-xs mt-3">
            Check your parameters and try submitting the job again.
          </p>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ result, outputType }: { result: JobResult; outputType: 'video' | 'image' | 'json' }) {
  if (outputType === 'video' && result.url) {
    return (
      <video
        controls
        className="w-full max-w-2xl rounded-lg border border-slate-700/50"
        src={result.url}
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  if (outputType === 'image' && result.url) {
    return (
      <img
        src={result.url}
        alt={result.filename ?? 'Generated output'}
        className="w-full max-w-2xl rounded-lg border border-slate-700/50"
      />
    );
  }

  // JSON output
  return (
    <pre className="bg-slate-900 rounded-lg p-4 overflow-x-auto text-sm text-slate-300 font-mono border border-slate-700/50 max-w-2xl w-full">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

export default function ResultDisplay({ result, outputType }: ResultDisplayProps) {
  if (!result) return null;

  // Error state
  if (result.status === 'failed' || result.error) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 shadow-lg shadow-slate-900/50 border border-slate-700/50">
        <ErrorCard error={result.error ?? 'An unknown error occurred.'} />
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg shadow-slate-900/50 border border-slate-700/50 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-200">Result</h3>
        {result.filename && (
          <span className="ml-auto text-xs text-slate-500 font-mono">{result.filename}</span>
        )}
      </div>

      {/* Media preview */}
      <MediaPreview result={result} outputType={outputType} />

      {/* URL bar */}
      {result.url && (
        <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-4 py-2.5 border border-slate-700/50">
          <span className="text-slate-400 text-xs truncate flex-1 font-mono select-all">
            {result.url}
          </span>
          <CopyButton text={result.url} />
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100"
          >
            Open
          </a>
        </div>
      )}

      {/* Download button */}
      {result.url && (
        <a
          href={result.url}
          download={result.filename ?? true}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
            bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 hover:text-blue-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
          </svg>
          Download
        </a>
      )}
    </div>
  );
}
