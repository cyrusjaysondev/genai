import { useState, useCallback, useMemo } from 'react';
import { endpoints, type Endpoint } from './endpoints';
import { buildCurl, buildFetchRequest } from './curlBuilder';
import type { ApiResponse } from './types';
import EndpointSidebar from './components/EndpointSidebar';
import ParamForm from './components/ParamForm';
import CurlDisplay from './components/CurlDisplay';
import JobPoller from './components/JobPoller';
import ResultDisplay from './components/ResultDisplay';
import ResponseViewer from './components/ResponseViewer';
import ResponseActions from './components/ResponseActions';

const QUICK_COMMANDS = [
  {
    label: 'Full Restart (ComfyUI + API)',
    cmd: `pip install fastapi uvicorn httpx websockets python-multipart\ncd /workspace/ComfyUI && python main.py --listen 0.0.0.0 &\nsleep 40 && cd /workspace/api && python3 -m uvicorn main:app --host 0.0.0.0 --port 7860 &`,
  },
  {
    label: 'Restart API Only',
    cmd: `cd /workspace/api && python3 -m uvicorn main:app --host 0.0.0.0 --port 7860 &`,
  },
  {
    label: 'Restart ComfyUI Only',
    cmd: `cd /workspace/ComfyUI && python main.py --listen 0.0.0.0 &`,
  },
  {
    label: 'Install Dependencies',
    cmd: `pip install fastapi uvicorn httpx websockets python-multipart`,
  },
];

function QuickCommands() {
  const [open, setOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleCopy = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
        title="Quick Commands"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-[32rem] bg-slate-800 border border-slate-700/60 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">Quick Commands</h3>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">RunPod Terminal</span>
            </div>
            <div className="divide-y divide-slate-700/30 max-h-96 overflow-y-auto">
              {QUICK_COMMANDS.map((item, i) => (
                <div key={i} className="px-4 py-3 hover:bg-slate-700/20 transition-colors group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-300">{item.label}</span>
                    <button
                      onClick={() => handleCopy(item.cmd, i)}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        copiedIdx === i
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
                      }`}
                    >
                      {copiedIdx === i ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-400 bg-slate-900/60 rounded-lg px-3 py-2 whitespace-pre-wrap break-all leading-relaxed">{item.cmd}</pre>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  const [podId, setPodId] = useState(() => localStorage.getItem('podId') || '');
  const [selectedId, setSelectedId] = useState('health');
  const [values, setValues] = useState<Record<string, Record<string, unknown>>>({});
  const [files, setFiles] = useState<Record<string, Record<string, File>>>({});
  const [copied, setCopied] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [responseLoading, setResponseLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<{ status: string; url?: string; filename?: string; error?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'curl' | 'response'>('curl');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const endpoint = useMemo(() => endpoints.find(e => e.id === selectedId)!, [selectedId]);
  const baseUrl = `https://${podId}-7860.proxy.runpod.net`;

  const currentValues = values[selectedId] || {};
  const currentFiles = files[selectedId] || {};

  // Initialize defaults when selecting an endpoint
  const getValuesWithDefaults = useCallback((ep: Endpoint, vals: Record<string, unknown>) => {
    const result = { ...vals };
    for (const param of ep.params) {
      if (result[param.name] === undefined && param.default !== undefined) {
        result[param.name] = param.default;
      }
    }
    return result;
  }, []);

  const valuesWithDefaults = useMemo(
    () => getValuesWithDefaults(endpoint, currentValues),
    [endpoint, currentValues, getValuesWithDefaults]
  );

  const curl = useMemo(
    () => buildCurl(podId ? baseUrl : 'https://YOUR_POD_ID-7860.proxy.runpod.net', endpoint, valuesWithDefaults as Record<string, string | boolean | number | File | null>),
    [baseUrl, podId, endpoint, valuesWithDefaults]
  );

  const handleSelectEndpoint = useCallback((id: string) => {
    setSelectedId(id);
    setResponse(null);
    setJobId(null);
    setJobResult(null);
    setActiveTab('curl');
  }, []);

  const handleParamChange = useCallback((name: string, value: unknown) => {
    setValues(prev => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] || {}), [name]: value },
    }));
  }, [selectedId]);

  const handleFileChange = useCallback((name: string, file: File) => {
    setFiles(prev => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] || {}), [name]: file },
    }));
    // Also set in values for curl display
    setValues(prev => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] || {}), [name]: file },
    }));
  }, [selectedId]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [curl]);

  const handlePodIdChange = useCallback((val: string) => {
    setPodId(val);
    localStorage.setItem('podId', val);
  }, []);

  const handleNavigateToEndpoint = useCallback((endpointId: string, params: Record<string, string>) => {
    setSelectedId(endpointId);
    setValues(prev => ({
      ...prev,
      [endpointId]: { ...(prev[endpointId] || {}), ...params },
    }));
    setResponse(null);
    setJobId(null);
    setJobResult(null);
    setActiveTab('curl');
  }, []);

  const handleExecute = useCallback(async () => {
    if (!podId) return;
    setExecuting(true);
    setResponseLoading(true);
    setResponse(null);
    setJobId(null);
    setJobResult(null);
    setActiveTab('response');

    const start = performance.now();
    try {
      const { url, init } = buildFetchRequest(
        podId,
        endpoint,
        valuesWithDefaults as Record<string, string | boolean | number | File | null>,
        currentFiles
      );
      const res = await fetch(url, init);
      const duration = Math.round(performance.now() - start);

      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });

      let body: unknown;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      const apiResponse: ApiResponse = {
        status: res.status,
        statusText: res.statusText,
        headers,
        body,
        duration,
      };
      setResponse(apiResponse);

      // If response contains a job_id, start polling
      if (body && typeof body === 'object' && 'job_id' in (body as Record<string, unknown>)) {
        setJobId((body as Record<string, unknown>).job_id as string);
      }
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: { error: err instanceof Error ? err.message : 'Request failed' },
        duration,
      });
    } finally {
      setExecuting(false);
      setResponseLoading(false);
    }
  }, [podId, baseUrl, endpoint, valuesWithDefaults, currentFiles]);

  const handleJobComplete = useCallback((result: { status: string; url?: string; filename?: string; error?: string }) => {
    setJobResult(result);
  }, []);

  const handleJobCancel = useCallback(() => {
    setJobId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    handleExecute();
  }, [handleExecute]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} flex-shrink-0 transition-all duration-300 overflow-hidden`}>
        <EndpointSidebar selectedId={selectedId} onSelect={handleSelectEndpoint} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm text-slate-400 whitespace-nowrap">Pod ID:</label>
            <input
              type="text"
              value={podId}
              onChange={e => handlePodIdChange(e.target.value)}
              placeholder="e.g. t6pgge1y1kl2qt"
              className="flex-1 max-w-xs px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-colors"
            />
            {podId && (
              <span className="text-xs text-slate-500 font-mono truncate max-w-md">
                {baseUrl}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              endpoint.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400' :
              endpoint.method === 'POST' ? 'bg-sky-500/15 text-sky-400' :
              'bg-red-500/15 text-red-400'
            }`}>
              <span>{endpoint.method}</span>
              <span className="text-slate-500">|</span>
              <span className="font-mono">{endpoint.path}</span>
            </div>
            <QuickCommands />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-5xl mx-auto p-5 space-y-5">
            {/* Endpoint header */}
            <div>
              <h1 className="text-xl font-semibold text-slate-100">{endpoint.name}</h1>
              <p className="text-sm text-slate-400 mt-1">{endpoint.description}</p>
            </div>

            {/* Parameters */}
            {endpoint.params.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wider">Parameters</h2>
                <ParamForm
                  params={endpoint.params}
                  values={valuesWithDefaults}
                  onChange={handleParamChange}
                  onFileChange={handleFileChange}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleExecute}
                disabled={!podId || executing}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {executing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Executing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Send Request
                  </>
                )}
              </button>
              {!podId && (
                <span className="text-sm text-amber-400">Enter your Pod ID above to execute requests</span>
              )}
            </div>

            {/* Tabs: Curl / Response */}
            <div className="border-b border-slate-700">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('curl')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'curl'
                      ? 'border-sky-400 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  cURL Command
                </button>
                <button
                  onClick={() => setActiveTab('response')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'response'
                      ? 'border-sky-400 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Response
                  {response && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      response.status >= 200 && response.status < 300 ? 'bg-emerald-500/20 text-emerald-400' :
                      response.status >= 400 ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-600 text-slate-300'
                    }`}>
                      {response.status || 'ERR'}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Tab content */}
            {activeTab === 'curl' && (
              <CurlDisplay curl={curl} onCopy={handleCopy} copied={copied} />
            )}

            {activeTab === 'response' && (
              <div className="space-y-4">
                <ResponseActions
                  endpointId={selectedId}
                  response={response}
                  podId={podId}
                  context={Object.fromEntries(
                    Object.entries(valuesWithDefaults).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v as string])
                  )}
                  onNavigate={handleNavigateToEndpoint}
                  onRefresh={handleRefresh}
                />
                <ResponseViewer response={response} loading={responseLoading} />
              </div>
            )}

            {/* Job Polling */}
            {jobId && !jobResult && (
              <JobPoller
                podId={podId}
                jobId={jobId}
                onComplete={handleJobComplete}
                onCancel={handleJobCancel}
              />
            )}

            {/* Result Display */}
            {jobResult && (
              <ResultDisplay
                result={jobResult}
                baseUrl={baseUrl}
                outputType={endpoint.outputType || 'json'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
