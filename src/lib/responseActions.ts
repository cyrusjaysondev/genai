export type ActionIcon = 'status' | 'cancel' | 'retry' | 'delete' | 'play' | 'open' | 'download';
export type ActionVariant = 'primary' | 'danger' | 'secondary';

export interface ResponseAction {
  id: string;
  label: string;
  icon: ActionIcon;
  variant: ActionVariant;
  navigate?: { endpointId: string; params: Record<string, string> };
  execute?: { method: string; path: string; confirm?: string };
  href?: string; // For direct links (open in new tab)
  preview?: { url: string; type: 'video' | 'image'; title?: string }; // Open in modal
}

export interface ActionGroup {
  title: string;
  subtitle?: string;
  status?: string;
  actions: ResponseAction[];
}

type Body = Record<string, unknown>;

function isObject(v: unknown): v is Body {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function jobActions(jobId: string, status: string, url?: string): ResponseAction[] {
  const actions: ResponseAction[] = [];

  actions.push({
    id: `status-${jobId}`,
    label: 'Check Status',
    icon: 'status',
    variant: 'primary',
    navigate: { endpointId: 'status', params: { job_id: jobId } },
  });

  if (status === 'queued' || status === 'processing') {
    actions.push({
      id: `cancel-${jobId}`,
      label: 'Cancel',
      icon: 'cancel',
      variant: 'danger',
      execute: { method: 'DELETE', path: `/jobs/${jobId}/cancel`, confirm: `Cancel job ${jobId.slice(0, 8)}...?` },
    });
  }

  if (status === 'failed' || status === 'cancelled') {
    actions.push({
      id: `retry-${jobId}`,
      label: 'Retry',
      icon: 'retry',
      variant: 'primary',
      execute: { method: 'POST', path: `/jobs/${jobId}/retry` },
    });
  }

  if (url) {
    const isVideo = url.endsWith('.mp4') || url.endsWith('.webm');
    actions.push({
      id: `play-${jobId}`,
      label: 'Open',
      icon: 'play',
      variant: 'secondary',
      preview: { url, type: isVideo ? 'video' : 'image', title: `Job ${jobId.slice(0, 8)}...` },
    });
  }

  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    actions.push({
      id: `delete-${jobId}`,
      label: 'Delete',
      icon: 'delete',
      variant: 'danger',
      execute: { method: 'DELETE', path: `/jobs/${jobId}`, confirm: `Delete job ${jobId.slice(0, 8)}... and its file?` },
    });
  }

  return actions;
}

export function getResponseActions(endpointId: string, body: unknown, context?: Record<string, string>): ActionGroup[] {
  if (!isObject(body)) return [];
  const groups: ActionGroup[] = [];

  // GET /videos — list of video files
  if (endpointId === 'videos' && Array.isArray(body.videos)) {
    for (const video of body.videos) {
      if (!isObject(video) || typeof video.filename !== 'string') continue;
      const filename = video.filename as string;
      const sizeMb = typeof video.size_mb === 'number' ? `${video.size_mb.toFixed(1)} MB` : undefined;
      const url = typeof video.url === 'string' ? (video.url as string) : undefined;

      const actions: ResponseAction[] = [];
      if (url) {
        const isVideo = url.endsWith('.mp4') || url.endsWith('.webm');
        actions.push({
          id: `play-${filename}`,
          label: isVideo ? 'Play' : 'View',
          icon: 'play',
          variant: 'primary',
          preview: { url, type: isVideo ? 'video' : 'image', title: filename },
        });
        actions.push({
          id: `download-${filename}`,
          label: 'Download',
          icon: 'download',
          variant: 'secondary',
          href: url,
        });
      }
      actions.push({
        id: `delete-${filename}`,
        label: 'Delete',
        icon: 'delete',
        variant: 'danger',
        execute: { method: 'DELETE', path: `/video/${filename}`, confirm: `Delete ${filename}?` },
      });

      groups.push({ title: filename, subtitle: sizeMb, actions });
    }
    return groups;
  }

  // GET /jobs — all jobs list
  if ((endpointId === 'jobs' || endpointId === 'queue') && Array.isArray(body.jobs)) {
    for (const job of body.jobs) {
      if (!isObject(job)) continue;
      const jobId = (job.job_id ?? job.id) as string | undefined;
      const status = job.status as string | undefined;
      if (!jobId || !status) continue;

      const url = typeof job.url === 'string' ? (job.url as string) : undefined;
      groups.push({
        title: jobId,
        status,
        actions: jobActions(jobId, status, url),
      });
    }
    return groups;
  }

  // GET /status/{job_id} — single job status
  if (endpointId === 'status' && typeof body.status === 'string') {
    const status = body.status as string;
    const jobId = context?.job_id;
    const url = typeof body.url === 'string' ? (body.url as string) : undefined;
    const filename = typeof body.filename === 'string' ? (body.filename as string) : undefined;

    const actions: ResponseAction[] = [];

    if (jobId && (status === 'queued' || status === 'processing')) {
      actions.push({
        id: 'cancel-current',
        label: 'Cancel',
        icon: 'cancel',
        variant: 'danger',
        execute: { method: 'DELETE', path: `/jobs/${jobId}/cancel`, confirm: `Cancel job ${jobId.slice(0, 8)}...?` },
      });
    }

    if (jobId && (status === 'failed' || status === 'cancelled')) {
      actions.push({
        id: 'retry-current',
        label: 'Retry',
        icon: 'retry',
        variant: 'primary',
        execute: { method: 'POST', path: `/jobs/${jobId}/retry` },
      });
    }

    if (url) {
      const isVideo = url.endsWith('.mp4') || url.endsWith('.webm');
      actions.push({
        id: 'play-result',
        label: 'Open Result',
        icon: 'play',
        variant: 'primary',
        preview: { url, type: isVideo ? 'video' : 'image', title: filename || 'Result' },
      });
      actions.push({
        id: 'download-result',
        label: 'Download',
        icon: 'download',
        variant: 'secondary',
        href: url,
      });
    }

    if (filename && (status === 'completed' || status === 'failed')) {
      actions.push({
        id: 'delete-video',
        label: 'Delete File',
        icon: 'delete',
        variant: 'danger',
        execute: { method: 'DELETE', path: `/video/${filename}`, confirm: `Delete ${filename}?` },
      });
    }

    if (actions.length > 0) {
      groups.push({
        title: `Job ${status}`,
        status,
        subtitle: filename,
        actions,
      });
    }
    return groups;
  }

  // POST generation responses — job_id returned
  if (typeof body.job_id === 'string') {
    const jobId = body.job_id as string;
    const status = (body.status as string) || 'queued';
    const actions: ResponseAction[] = [
      {
        id: `status-${jobId}`,
        label: 'Check Status',
        icon: 'status',
        variant: 'primary',
        navigate: { endpointId: 'status', params: { job_id: jobId } },
      },
    ];
    if (status === 'queued' || status === 'processing') {
      actions.push({
        id: `cancel-${jobId}`,
        label: 'Cancel',
        icon: 'cancel',
        variant: 'danger',
        execute: { method: 'DELETE', path: `/jobs/${jobId}/cancel`, confirm: `Cancel job?` },
      });
    }
    groups.push({ title: `Job submitted`, subtitle: jobId, status, actions });
    return groups;
  }

  // POST /jobs/{job_id}/retry response — new_job_id
  if (typeof body.new_job_id === 'string') {
    const newJobId = body.new_job_id as string;
    groups.push({
      title: 'Job retried',
      subtitle: newJobId,
      status: 'queued',
      actions: [
        {
          id: `status-${newJobId}`,
          label: 'Check Status',
          icon: 'status',
          variant: 'primary',
          navigate: { endpointId: 'status', params: { job_id: newJobId } },
        },
      ],
    });
    return groups;
  }

  return groups;
}
