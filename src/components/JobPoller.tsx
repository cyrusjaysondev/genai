import { useState, useEffect, useRef, useCallback } from 'react';

interface JobResult {
  status: string;
  url?: string;
  filename?: string;
  error?: string;
}

interface JobPollerProps {
  podId: string;
  jobId: string;
  onComplete: (result: JobResult) => void;
  onCancel: () => void;
}

interface StatusResponse {
  status: string;
  url?: string;
  filename?: string;
  error?: string;
  created_at?: string;
  started_at?: string;
}

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0
    ? `${mins}m ${secs.toString().padStart(2, '0')}s`
    : `${secs}s`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  queued: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Queued' },
  processing: { color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Processing' },
  completed: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Completed' },
  failed: { color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (status === 'failed') {
    return (
      <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }

  // Spinner for queued / processing
  return (
    <svg className="w-6 h-6 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function JobPoller({ podId, jobId, onComplete, onCancel }: JobPollerProps) {
  const [status, setStatus] = useState<string>('queued');
  const [elapsed, setElapsed] = useState(0);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    pollRef.current = null;
    timerRef.current = null;
  }, []);

  useEffect(() => {
    // Elapsed time counter — ticks every second
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`, { headers: { 'x-pod-id': podId } });
        if (!res.ok) return;
        const data: StatusResponse = await res.json();

        setStatus(data.status);
        if (data.created_at) setCreatedAt(data.created_at);
        if (data.started_at) setStartedAt(data.started_at);

        if ((data.status === 'completed' || data.status === 'failed') && !doneRef.current) {
          doneRef.current = true;
          cleanup();
          onComplete({
            status: data.status,
            url: data.url,
            filename: data.filename,
            error: data.error,
          });
        }
      } catch {
        // Silently retry on network errors
      }
    };

    // Initial poll immediately, then every 4 seconds
    poll();
    pollRef.current = setInterval(poll, 4000);

    return cleanup;
  }, [podId, jobId, onComplete, cleanup]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch(`/api/jobs/${jobId}/cancel`, { method: 'DELETE', headers: { 'x-pod-id': podId } });
    } catch {
      // Best-effort cancel
    }
    cleanup();
    onCancel();
  };

  const cfg = statusConfig[status] ?? statusConfig.queued;

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-lg shadow-slate-900/50 border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Job Status
        </h3>
        <span className="font-mono text-xs text-slate-500 select-all">{jobId}</span>
      </div>

      {/* Status badge + elapsed */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg ${cfg.bg}`}>
          <StatusIcon status={status} />
          <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <div className="text-slate-400 text-sm tabular-nums">
          Elapsed: <span className="text-slate-200 font-mono">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Timestamps */}
      {(createdAt || startedAt) && (
        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          {createdAt && (
            <div>
              <span className="text-slate-500">Created</span>
              <p className="text-slate-300 font-mono text-xs mt-0.5">{formatTimestamp(createdAt)}</p>
            </div>
          )}
          {startedAt && (
            <div>
              <span className="text-slate-500">Started</span>
              <p className="text-slate-300 font-mono text-xs mt-0.5">{formatTimestamp(startedAt)}</p>
            </div>
          )}
        </div>
      )}

      {/* Progress bar (indeterminate) for active states */}
      {(status === 'queued' || status === 'processing') && (
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden mb-5">
          <div
            className={`h-full rounded-full ${
              status === 'queued' ? 'bg-yellow-400/60' : 'bg-blue-400/60'
            } animate-pulse`}
            style={{ width: status === 'queued' ? '30%' : '65%' }}
          />
        </div>
      )}

      {/* Cancel button */}
      {status !== 'completed' && status !== 'failed' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors
            bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400
            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {cancelling ? 'Cancelling…' : 'Cancel Job'}
        </button>
      )}
    </div>
  );
}
