import type { Endpoint } from './endpoints';

export function buildCurl(
  baseUrl: string,
  endpoint: Endpoint,
  values: Record<string, string | boolean | number | File | null>
): string {
  let url = `${baseUrl}${endpoint.path}`;
  const lines: string[] = [];

  // Replace path params
  for (const param of endpoint.params) {
    if (param.location === 'path' && values[param.name]) {
      url = url.replace(`{${param.name}}`, String(values[param.name]));
    }
  }

  // Query params
  const queryParams = endpoint.params.filter(p => p.location === 'query');
  if (queryParams.length > 0) {
    const qs = queryParams
      .filter(p => values[p.name] !== undefined && values[p.name] !== p.default)
      .map(p => `${p.name}=${values[p.name]}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  if (endpoint.method !== 'GET') {
    lines.push(`curl -X ${endpoint.method} ${url}`);
  } else {
    lines.push(`curl ${url}`);
  }

  if (endpoint.contentType === 'json') {
    lines.push(`  -H "Content-Type: application/json"`);
    const body: Record<string, unknown> = {};
    for (const param of endpoint.params) {
      if (param.location === 'path' || param.location === 'query') continue;
      const val = values[param.name];
      if (val === undefined || val === null || val === '') continue;
      body[param.name] = val;
    }
    if (Object.keys(body).length > 0) {
      lines.push(`  -d '${JSON.stringify(body, null, 2)}'`);
    }
  } else if (endpoint.contentType === 'multipart') {
    for (const param of endpoint.params) {
      if (param.location === 'path' || param.location === 'query') continue;
      const val = values[param.name];
      if (val === undefined || val === null || val === '') continue;
      if (param.type === 'file') {
        const file = val as unknown as File;
        lines.push(`  -F "${param.name}=@${file?.name || '/path/to/file.jpg'}"`);
      } else {
        lines.push(`  -F "${param.name}=${val}"`);
      }
    }
  }

  return lines.join(' \\\n');
}

export function buildFetchRequest(
  podId: string,
  endpoint: Endpoint,
  values: Record<string, string | boolean | number | File | null>,
  files: Record<string, File>
): { url: string; init: RequestInit } {
  // Route through local /api proxy to avoid CORS
  let url = `/api${endpoint.path}`;

  // Replace path params
  for (const param of endpoint.params) {
    if (param.location === 'path' && values[param.name]) {
      url = url.replace(`{${param.name}}`, String(values[param.name]));
    }
  }

  // Query params
  const queryParams = endpoint.params.filter(p => p.location === 'query');
  if (queryParams.length > 0) {
    const qs = queryParams
      .filter(p => values[p.name] !== undefined)
      .map(p => `${p.name}=${values[p.name]}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const init: RequestInit = { method: endpoint.method, headers: { 'x-pod-id': podId } };

  if (endpoint.contentType === 'json') {
    const body: Record<string, unknown> = {};
    for (const param of endpoint.params) {
      if (param.location === 'path' || param.location === 'query') continue;
      const val = values[param.name];
      if (val === undefined || val === null || val === '') continue;
      body[param.name] = val;
    }
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  } else if (endpoint.contentType === 'multipart') {
    const formData = new FormData();
    for (const param of endpoint.params) {
      if (param.location === 'path' || param.location === 'query') continue;
      if (param.type === 'file') {
        const file = files[param.name];
        if (file) formData.append(param.name, file);
      } else {
        const val = values[param.name];
        if (val !== undefined && val !== null && val !== '') {
          formData.append(param.name, String(val));
        }
      }
    }
    init.body = formData;
  }

  return { url, init };
}
