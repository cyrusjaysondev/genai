import { useRef, useState, useCallback } from 'react';
import type { Param } from '../endpoints';

interface ParamFormProps {
  params: Param[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onFileChange: (name: string, file: File) => void;
}

/* ------------------------------------------------------------------ */
/*  Shared style tokens                                                */
/* ------------------------------------------------------------------ */
const colors = {
  bg: '#1e293b',
  bgHover: '#273549',
  border: '#334155',
  borderFocus: '#38bdf8',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  accent: '#38bdf8',
  accentDim: 'rgba(56,189,248,0.15)',
};

const inputBase =
  'w-full rounded-lg border bg-[#1e293b] px-3 py-2 text-sm text-slate-100 ' +
  'border-slate-700 placeholder:text-slate-500 ' +
  'focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 focus:outline-none ' +
  'transition-colors duration-150';

const labelBase = 'block text-sm font-medium text-slate-200 mb-1';

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function FieldWrapper({
  param,
  children,
}: {
  param: Param;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={param.name} className={labelBase}>
        {param.name}
        {param.required && (
          <span className="ml-1 text-sky-400" title="Required">
            *
          </span>
        )}
        {param.location && (
          <span className="ml-2 rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {param.location}
          </span>
        )}
      </label>
      {children}
      {param.description && (
        <p className="text-xs text-slate-500 leading-relaxed">
          {param.description}
        </p>
      )}
    </div>
  );
}

/* ---- String / Textarea ---- */
function StringField({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: string;
  onChange: (name: string, v: string) => void;
}) {
  const isTextarea = param.name.toLowerCase().includes('prompt');

  return (
    <FieldWrapper param={param}>
      {isTextarea ? (
        <textarea
          id={param.name}
          rows={4}
          className={`${inputBase} resize-y min-h-[80px]`}
          placeholder={param.placeholder ?? ''}
          value={value ?? ''}
          onChange={(e) => onChange(param.name, e.target.value)}
        />
      ) : (
        <input
          id={param.name}
          type="text"
          className={inputBase}
          placeholder={param.placeholder ?? ''}
          value={value ?? ''}
          onChange={(e) => onChange(param.name, e.target.value)}
        />
      )}
    </FieldWrapper>
  );
}

/* ---- Number (int / float) ---- */
function NumberField({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: number;
  onChange: (name: string, v: number) => void;
}) {
  const step =
    param.step ?? (param.type === 'int' ? 1 : 0.01);
  const handleChange = (raw: string) => {
    const n = param.type === 'int' ? parseInt(raw, 10) : parseFloat(raw);
    if (!isNaN(n)) onChange(param.name, n);
  };

  return (
    <FieldWrapper param={param}>
      <div className="flex items-center gap-3">
        <input
          id={param.name}
          type="number"
          className={`${inputBase} w-28 shrink-0 tabular-nums`}
          min={param.min}
          max={param.max}
          step={step}
          value={value ?? param.default ?? ''}
          onChange={(e) => handleChange(e.target.value)}
        />
        {param.min !== undefined && param.max !== undefined && (
          <div className="flex flex-1 items-center gap-2">
            <span className="text-[11px] tabular-nums text-slate-500">
              {param.min}
            </span>
            <input
              type="range"
              className="slider flex-1"
              min={param.min}
              max={param.max}
              step={step}
              value={value ?? param.default ?? param.min}
              onChange={(e) => handleChange(e.target.value)}
            />
            <span className="text-[11px] tabular-nums text-slate-500">
              {param.max}
            </span>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
}

/* ---- Boolean toggle ---- */
function BoolField({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: boolean;
  onChange: (name: string, v: boolean) => void;
}) {
  const checked = value ?? param.default ?? false;

  return (
    <FieldWrapper param={param}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        onClick={() => onChange(param.name, !checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 cursor-pointer
          rounded-full border-2 border-transparent transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:ring-offset-2 focus:ring-offset-slate-900
          ${checked ? 'bg-sky-500' : 'bg-slate-600'}
        `}
      >
        <span
          className={`
            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
            ring-0 transition-transform duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </FieldWrapper>
  );
}

/* ---- Select dropdown ---- */
function SelectField({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: string;
  onChange: (name: string, v: string) => void;
}) {
  return (
    <FieldWrapper param={param}>
      <div className="relative">
        <select
          id={param.name}
          className={`${inputBase} appearance-none pr-9`}
          value={value ?? param.default ?? ''}
          onChange={(e) => onChange(param.name, e.target.value)}
        >
          <option value="" disabled>
            Select...
          </option>
          {param.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Chevron */}
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </FieldWrapper>
  );
}

/* ---- File upload with drag-and-drop ---- */
function FileField({
  param,
  value: _value,
  onFileChange,
}: {
  param: Param;
  value: any;
  onFileChange: (name: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      onFileChange(param.name, file);
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [param.name, onFileChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <FieldWrapper param={param}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          group relative flex cursor-pointer flex-col items-center justify-center
          rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors duration-150
          ${
            dragOver
              ? 'border-sky-400 bg-sky-400/10'
              : 'border-slate-600 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/60'
          }
        `}
      >
        <input
          ref={inputRef}
          id={param.name}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {preview ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={preview}
              alt="Preview"
              className="h-20 w-20 rounded-md object-cover shadow-md ring-1 ring-slate-600"
            />
            <span className="max-w-[200px] truncate text-xs text-slate-400">
              {fileName}
            </span>
          </div>
        ) : fileName ? (
          <div className="flex flex-col items-center gap-1">
            <svg
              className="h-8 w-8 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="max-w-[200px] truncate text-xs text-slate-400">
              {fileName}
            </span>
          </div>
        ) : (
          <>
            <svg
              className="mb-2 h-8 w-8 text-slate-500 group-hover:text-slate-400 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.34 3 3 0 013.837 3.867A3.75 3.75 0 0118 19.5H6.75z"
              />
            </svg>
            <p className="text-sm text-slate-400">
              <span className="font-medium text-sky-400">Click to upload</span>{' '}
              or drag and drop
            </p>
          </>
        )}
      </div>
    </FieldWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Aspect Ratio Selector                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Resolution + Aspect Ratio Selector                                 */
/* ------------------------------------------------------------------ */

interface ResolutionTier {
  label: string;
  tag: string;
  ratios: { ratio: string; width: number; height: number }[];
}

const LTX_TIERS: ResolutionTier[] = [
  {
    label: 'SD', tag: '480p',
    ratios: [
      { ratio: '9:16', width: 272, height: 480 },
      { ratio: '16:9', width: 480, height: 272 },
      { ratio: '1:1',  width: 384, height: 384 },
    ],
  },
  {
    label: 'HD', tag: '720p',
    ratios: [
      { ratio: '9:16', width: 408, height: 720 },
      { ratio: '16:9', width: 720, height: 408 },
      { ratio: '1:1',  width: 544, height: 544 },
    ],
  },
  {
    label: 'Full HD', tag: '1080p',
    ratios: [
      { ratio: '9:16', width: 544, height: 960 },
      { ratio: '16:9', width: 960, height: 544 },
      { ratio: '1:1',  width: 720, height: 720 },
    ],
  },
];

const WAN_VIDEO_TIERS: ResolutionTier[] = [
  {
    label: 'SD', tag: '480p',
    ratios: [
      { ratio: '9:16', width: 480, height: 848 },
      { ratio: '16:9', width: 848, height: 480 },
      { ratio: '1:1',  width: 640, height: 640 },
      { ratio: '4:3',  width: 736, height: 544 },
    ],
  },
  {
    label: 'HD', tag: '720p',
    ratios: [
      { ratio: '9:16', width: 704, height: 1280 },
      { ratio: '16:9', width: 1280, height: 704 },
      { ratio: '1:1',  width: 832, height: 832 },
      { ratio: '4:3',  width: 960, height: 720 },
    ],
  },
];

const WAN_IMAGE_TIERS: ResolutionTier[] = [
  {
    label: 'SD', tag: '480p',
    ratios: [
      { ratio: '9:16', width: 480, height: 848 },
      { ratio: '16:9', width: 848, height: 480 },
      { ratio: '1:1',  width: 640, height: 640 },
      { ratio: '3:4',  width: 576, height: 768 },
    ],
  },
  {
    label: 'HD', tag: '720p',
    ratios: [
      { ratio: '9:16', width: 704, height: 1280 },
      { ratio: '16:9', width: 1280, height: 704 },
      { ratio: '1:1',  width: 832, height: 832 },
      { ratio: '3:4',  width: 768, height: 1024 },
    ],
  },
  {
    label: 'Full HD', tag: '1080p',
    ratios: [
      { ratio: '9:16', width: 768, height: 1344 },
      { ratio: '16:9', width: 1344, height: 768 },
      { ratio: '1:1',  width: 1024, height: 1024 },
      { ratio: '3:4',  width: 896, height: 1152 },
    ],
  },
  {
    label: '2K', tag: '1440p',
    ratios: [
      { ratio: '9:16', width: 896, height: 1600 },
      { ratio: '16:9', width: 1600, height: 896 },
      { ratio: '1:1',  width: 1152, height: 1152 },
      { ratio: '3:4',  width: 1024, height: 1344 },
    ],
  },
];

type PresetConfig = { tiers: ResolutionTier[] } | null;

function getPresetsForParams(params: Param[]): PresetConfig {
  const hasWidth = params.some(p => p.name === 'width');
  const hasHeight = params.some(p => p.name === 'height');
  if (!hasWidth || !hasHeight) return null;

  const widthParam = params.find(p => p.name === 'width')!;

  if (widthParam.step === 8) return { tiers: LTX_TIERS };

  const hasSeconds = params.some(p => p.name === 'seconds');
  if (!hasSeconds) return { tiers: WAN_IMAGE_TIERS };
  return { tiers: WAN_VIDEO_TIERS };
}

function ResolutionSelector({
  tiers,
  currentWidth,
  currentHeight,
  onChange,
}: {
  tiers: ResolutionTier[];
  currentWidth: number;
  currentHeight: number;
  onChange: (name: string, value: number) => void;
}) {
  // Find active tier + ratio
  let activeTierIdx = -1;
  let activeRatio = '';
  for (let t = 0; t < tiers.length; t++) {
    const match = tiers[t].ratios.find(r => r.width === currentWidth && r.height === currentHeight);
    if (match) {
      activeTierIdx = t;
      activeRatio = match.ratio;
      break;
    }
  }

  // If no exact match, default to first tier
  const selectedTierIdx = activeTierIdx >= 0 ? activeTierIdx : 0;
  const selectedTier = tiers[selectedTierIdx];

  const handleTierClick = (tierIdx: number) => {
    const tier = tiers[tierIdx];
    // Try to keep same aspect ratio, fallback to first
    const sameRatio = tier.ratios.find(r => r.ratio === activeRatio);
    const pick = sameRatio || tier.ratios[0];
    onChange('width', pick.width);
    onChange('height', pick.height);
  };

  const handleRatioClick = (r: { ratio: string; width: number; height: number }) => {
    onChange('width', r.width);
    onChange('height', r.height);
  };

  return (
    <div className="space-y-3">
      {/* Resolution tier */}
      <div className="space-y-1.5">
        <label className={labelBase}>Resolution</label>
        <div className="flex flex-wrap gap-2">
          {tiers.map((tier, idx) => {
            const isActive = idx === selectedTierIdx;
            return (
              <button
                key={tier.tag}
                type="button"
                onClick={() => handleTierClick(idx)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  border transition-all duration-150 cursor-pointer
                  ${isActive
                    ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }
                `}
              >
                <span className="flex flex-col items-start leading-tight">
                  <span>{tier.label}</span>
                  <span className="text-[10px] opacity-60">{tier.tag}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Aspect ratio */}
      <div className="space-y-1.5">
        <label className={labelBase}>Aspect Ratio</label>
        <div className="flex flex-wrap gap-2">
          {selectedTier.ratios.map((r) => {
            const isActive = r.width === currentWidth && r.height === currentHeight;
            return (
              <button
                key={r.ratio}
                type="button"
                onClick={() => handleRatioClick(r)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  border transition-all duration-150 cursor-pointer
                  ${isActive
                    ? 'border-sky-400 bg-sky-500/15 text-sky-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }
                `}
              >
                <span
                  className={`block rounded-sm border-2 ${isActive ? 'border-sky-400' : 'border-slate-500'}`}
                  style={{
                    width: r.width > r.height ? 20 : r.width === r.height ? 16 : 12,
                    height: r.height > r.width ? 20 : r.width === r.height ? 16 : 12,
                  }}
                />
                <span className="flex flex-col items-start leading-tight">
                  <span>{r.ratio}</span>
                  <span className="text-[10px] opacity-60">{r.width}×{r.height}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Pick resolution & ratio, or set custom width/height below
      </p>
    </div>
  );
}

export default function ParamForm({
  params,
  values,
  onChange,
  onFileChange,
}: ParamFormProps) {
  if (params.length === 0) {
    return (
      <p className="py-6 text-center text-sm italic text-slate-500">
        This endpoint has no parameters.
      </p>
    );
  }

  const required = params.filter((p) => p.required);
  const optional = params.filter((p) => !p.required);
  const presetConfig = getPresetsForParams(params);

  const renderField = (param: Param) => {
    const val = values[param.name];
    switch (param.type) {
      case 'string':
        return (
          <StringField
            key={param.name}
            param={param}
            value={val}
            onChange={onChange}
          />
        );
      case 'int':
      case 'float':
        return (
          <NumberField
            key={param.name}
            param={param}
            value={val}
            onChange={onChange}
          />
        );
      case 'bool':
        return (
          <BoolField
            key={param.name}
            param={param}
            value={val}
            onChange={onChange}
          />
        );
      case 'select':
        return (
          <SelectField
            key={param.name}
            param={param}
            value={val}
            onChange={onChange}
          />
        );
      case 'file':
        return (
          <FileField
            key={param.name}
            param={param}
            value={val}
            onFileChange={onFileChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      {/* Slider accent styles */}
      <style>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          background: ${colors.border};
          outline: none;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          background: ${colors.accent};
          cursor: pointer;
          box-shadow: 0 0 0 3px ${colors.accentDim};
          transition: box-shadow 0.15s;
        }
        .slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 5px ${colors.accentDim};
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border: none;
          border-radius: 9999px;
          background: ${colors.accent};
          cursor: pointer;
          box-shadow: 0 0 0 3px ${colors.accentDim};
        }
      `}</style>

      {/* Required params */}
      {required.length > 0 && (
        <div className="space-y-4">
          {required.length > 0 && optional.length > 0 && (
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span>Required</span>
              <span className="h-px flex-1 bg-slate-700" />
            </h3>
          )}
          {required.map(renderField)}
        </div>
      )}

      {/* Divider between required & optional */}
      {required.length > 0 && optional.length > 0 && (
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-700/50" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-slate-900 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Optional
            </span>
          </div>
        </div>
      )}

      {/* Resolution + Aspect ratio presets */}
      {presetConfig && (
        <ResolutionSelector
          tiers={presetConfig.tiers}
          currentWidth={Number(values.width) || 0}
          currentHeight={Number(values.height) || 0}
          onChange={onChange}
        />
      )}

      {/* Optional params */}
      {optional.length > 0 && (
        <div className="space-y-4">{optional.map(renderField)}</div>
      )}
    </div>
  );
}
