import { useState, useMemo } from 'react';
import type { ApiResponse } from '../types';
import { getResponseActions, type ActionGroup, type ResponseAction, type ActionIcon } from '../lib/responseActions';
import { executeAction } from '../lib/apiClient';
import MediaModal from './MediaModal';

interface ResponseActionsProps {
  endpointId: string;
  response: ApiResponse | null;
  podId: string;
  context?: Record<string, string>;
  onNavigate: (endpointId: string, params: Record<string, string>) => void;
  onRefresh: () => void;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                  */
/* ------------------------------------------------------------------ */

function Icon({ name, className = 'w-3.5 h-3.5' }: { name: ActionIcon; className?: string }) {
  const props = { className, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'status':
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'cancel':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      );
    case 'retry':
      return (
        <svg {...props}>
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      );
    case 'delete':
      return (
        <svg {...props}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      );
    case 'play':
      return (
        <svg {...props}>
          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'open':
      return (
        <svg {...props}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
    case 'download':
      return (
        <svg {...props}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      );
    default:
      return null;
  }
}

function Spinner() {
  return (
    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                      */
/* ------------------------------------------------------------------ */

const statusColors: Record<string, string> = {
  queued: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  processing: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/15 text-green-400 border-green-500/20',
  failed: 'bg-red-500/15 text-red-400 border-red-500/20',
  cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded border ${colors}`}>
      {status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Refresh button (top-right of list header)                         */
/* ------------------------------------------------------------------ */

function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
      title="Refresh"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Action button                                                     */
/* ------------------------------------------------------------------ */

const variantClasses = {
  primary: 'bg-sky-500/15 text-sky-400 hover:bg-sky-500/25',
  danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
  secondary: 'bg-slate-600/30 text-slate-300 hover:bg-slate-600/50',
};

function ActionButton({
  action,
  podId,
  onNavigate,
  onRefresh,
  onPreview,
}: {
  action: ResponseAction;
  podId: string;
  onNavigate: (endpointId: string, params: Record<string, string>) => void;
  onRefresh: () => void;
  onPreview: (preview: { url: string; type: 'video' | 'image'; title?: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[action.variant]}`;

  // Clear error after a few seconds
  if (error) {
    setTimeout(() => setError(null), 3000);
  }

  // href action — render as anchor (for downloads only now)
  if (action.href) {
    const isDownload = action.icon === 'download';
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        {...(isDownload ? { download: '' } : {})}
        className={base}
      >
        <Icon name={action.icon} />
        {action.label}
      </a>
    );
  }

  const handleClick = async () => {
    // preview action — open modal
    if (action.preview) {
      onPreview(action.preview);
      return;
    }

    // navigate action
    if (action.navigate) {
      onNavigate(action.navigate.endpointId, action.navigate.params);
      return;
    }

    // execute action
    if (action.execute) {
      if (action.execute.confirm && !window.confirm(action.execute.confirm)) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await executeAction(podId, action.execute.method, action.execute.path);
        if (!result.ok) {
          setError(`Error ${result.status}`);
        } else {
          onRefresh();
        }
      } catch {
        setError('Failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <button onClick={handleClick} disabled={loading} className={base}>
        {loading ? <Spinner /> : <Icon name={action.icon} />}
        {action.label}
      </button>
      {error && (
        <span className="absolute -bottom-5 left-0 text-[10px] text-red-400 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  List layout (multiple groups)                                     */
/* ------------------------------------------------------------------ */

function ListLayout({
  groups,
  podId,
  onNavigate,
  onRefresh,
  onPreview,
}: {
  groups: ActionGroup[];
  podId: string;
  onNavigate: (endpointId: string, params: Record<string, string>) => void;
  onRefresh: () => void;
  onPreview: (preview: { url: string; type: 'video' | 'image'; title?: string }) => void;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800/80 px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-200">Results</h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {groups.length} {groups.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <RefreshButton onClick={onRefresh} />
      </div>

      {/* Scrollable rows */}
      <div className="max-h-80 overflow-y-auto">
        {groups.map((group, i) => (
          <div
            key={group.title + i}
            className={`px-4 py-2.5 flex items-center gap-3 hover:bg-slate-700/30 transition-colors ${
              i < groups.length - 1 ? 'border-b border-slate-700/30' : ''
            }`}
          >
            {/* Title + subtitle */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-200 font-mono truncate">{group.title}</span>
                {group.status && <StatusBadge status={group.status} />}
              </div>
              {group.subtitle && (
                <span className="text-xs text-slate-500 truncate block mt-0.5">{group.subtitle}</span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {group.actions.map((action) => (
                <ActionButton
                  key={action.id}
                  action={action}
                  podId={podId}
                  onNavigate={onNavigate}
                  onRefresh={onRefresh}
                  onPreview={onPreview}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single-item layout                                                */
/* ------------------------------------------------------------------ */

function SingleLayout({
  group,
  podId,
  onNavigate,
  onRefresh,
  onPreview,
}: {
  group: ActionGroup;
  podId: string;
  onNavigate: (endpointId: string, params: Record<string, string>) => void;
  onRefresh: () => void;
  onPreview: (preview: { url: string; type: 'video' | 'image'; title?: string }) => void;
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Title + subtitle */}
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-sm text-slate-200 font-medium">{group.title}</span>
          {group.status && <StatusBadge status={group.status} />}
          {group.subtitle && (
            <span className="text-xs text-slate-500 font-mono truncate">{group.subtitle}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {group.actions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              podId={podId}
              onNavigate={onNavigate}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function ResponseActions({
  endpointId,
  response,
  podId,
  context,
  onNavigate,
  onRefresh,
}: ResponseActionsProps) {
  const [preview, setPreview] = useState<{ url: string; type: 'video' | 'image'; title?: string } | null>(null);

  const groups = useMemo(
    () => getResponseActions(endpointId, response?.body, context),
    [endpointId, response?.body, context],
  );

  if (groups.length === 0) return null;

  const modal = preview && (
    <MediaModal
      url={preview.url}
      type={preview.type}
      title={preview.title}
      onClose={() => setPreview(null)}
    />
  );

  if (groups.length === 1) {
    return (
      <>
        <SingleLayout
          group={groups[0]}
          podId={podId}
          onNavigate={onNavigate}
          onRefresh={onRefresh}
          onPreview={setPreview}
        />
        {modal}
      </>
    );
  }

  return (
    <>
      <ListLayout
        groups={groups}
        podId={podId}
        onNavigate={onNavigate}
        onRefresh={onRefresh}
        onPreview={setPreview}
      />
      {modal}
    </>
  );
}
