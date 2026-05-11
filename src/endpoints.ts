export type ParamType = 'string' | 'int' | 'float' | 'bool' | 'select' | 'file';

export interface Param {
  name: string;
  type: ParamType;
  required?: boolean;
  default?: string | number | boolean;
  description: string;
  options?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  location?: 'body' | 'path' | 'query';
  advanced?: boolean;
}

export interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  name: string;
  description: string;
  category: string;
  contentType?: 'json' | 'multipart';
  params: Param[];
  outputType?: 'video' | 'image' | 'json';
}

export const endpoints: Endpoint[] = [
  // ─── System ──────────────────────────────────────────────────────
  {
    id: 'health',
    method: 'GET',
    path: '/health',
    name: 'Health Check',
    description: 'Check if the API is running',
    category: 'System',
    params: [],
    outputType: 'json',
  },
  {
    id: 'status',
    method: 'GET',
    path: '/status/{job_id}',
    name: 'Job Status',
    description: 'Poll job status with timestamps',
    category: 'System',
    params: [
      { name: 'job_id', type: 'string', required: true, description: 'Job ID from a generation endpoint', location: 'path', placeholder: 'a1b2c3d4-e5f6-7890-abcd-...' },
    ],
    outputType: 'json',
  },
  {
    id: 'queue',
    method: 'GET',
    path: '/queue',
    name: 'Active Queue',
    description: 'View queued and processing jobs',
    category: 'System',
    params: [],
    outputType: 'json',
  },
  {
    id: 'jobs',
    method: 'GET',
    path: '/jobs',
    name: 'All Jobs',
    description: 'View all jobs including completed and failed',
    category: 'System',
    params: [],
    outputType: 'json',
  },
  {
    id: 'videos',
    method: 'GET',
    path: '/videos',
    name: 'List Videos',
    description: 'List all video files on disk',
    category: 'System',
    params: [],
    outputType: 'json',
  },

  // ─── FLUX.2 Generation ───────────────────────────────────────────
  {
    id: 'flux-t2i',
    method: 'POST',
    path: '/t2i',
    name: 'Text to Image',
    description: 'Generate an image from text using FLUX.2 Klein 9B. Warm: ~10-15s. Cold start: ~3-5 min extra for model loading (~50 GB into VRAM).',
    category: 'FLUX.2',
    contentType: 'json',
    outputType: 'image',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'What to generate', placeholder: 'a woman in a red dress standing in Times Square, photorealistic, 4K' },
      { name: 'width', type: 'int', default: 1024, description: 'Output width in pixels', min: 256, max: 2048, step: 8 },
      { name: 'height', type: 'int', default: 1024, description: 'Output height in pixels', min: 256, max: 2048, step: 8 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random). Same seed + same inputs ≈ same result.', min: -1, max: 999999999 },
      { name: 'guidance', type: 'float', default: 4.0, description: 'FLUX guidance strength (2.0–6.0). Higher = more prompt-faithful.', min: 2.0, max: 6.0, step: 0.5, advanced: true },
      { name: 'steps', type: 'int', default: 4, description: 'Inference steps. 4 is ideal for FLUX Klein.', min: 1, max: 20, advanced: true },
      { name: 'cfg', type: 'float', default: 1.0, description: 'CFG scale. Keep at 1.0 for Klein distilled.', min: 0.1, max: 5.0, step: 0.1, advanced: true },
    ],
  },
  {
    id: 'flux-face-swap',
    method: 'POST',
    path: '/flux/face-swap',
    name: 'Head / Face Swap',
    description: 'Replace the head in a target image with a face from a source image using FLUX.2 Klein 9B + BFS LoRA. Warm: ~20-30s. Cold start: ~3-5 min extra.',
    category: 'FLUX.2',
    contentType: 'multipart',
    outputType: 'image',
    params: [
      { name: 'target_image', type: 'file', required: true, description: 'Body/template photo — head gets replaced. Body, clothing, pose, background preserved.' },
      { name: 'face_image', type: 'file', required: true, description: 'Face photo — identity to transfer. Head, hair, facial features will be swapped in.' },
      { name: 'aspect_ratio', type: 'select', default: 'original', description: 'Output aspect ratio', options: [
        { label: 'Original', value: 'original' },
        { label: '1:1 — Square', value: '1:1' },
        { label: '4:3 — Standard', value: '4:3' },
        { label: '3:4 — Portrait', value: '3:4' },
        { label: '16:9 — Widescreen', value: '16:9' },
        { label: '9:16 — Vertical', value: '9:16' },
        { label: '3:2 — Classic Photo', value: '3:2' },
        { label: '2:3 — Classic Portrait', value: '2:3' },
        { label: '21:9 — Cinematic', value: '21:9' },
        { label: '9:21 — Tall Cinematic', value: '9:21' },
      ]},
      { name: 'megapixels', type: 'float', default: 2.0, description: 'Output resolution in megapixels. 1.0 ≈ 1MP, 2.0 ≈ 2MP, 3.0 ≈ 3MP. Higher = more detail but slower.', min: 0.5, max: 4.0, step: 0.5 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed for reproducibility (-1 for random)', min: -1, max: 999999999 },
      { name: 'lora_strength', type: 'float', default: 1.0, description: 'BFS LoRA strength. 0.8 = subtler swap, 1.0 = default, higher = stronger identity transfer.', min: 0.5, max: 1.5, step: 0.1, advanced: true },
      { name: 'steps', type: 'int', default: 4, description: 'Inference steps. 4 is ideal for Klein.', min: 1, max: 20, advanced: true },
      { name: 'cfg', type: 'float', default: 1.0, description: 'CFG scale. Keep at 1.0 for Klein.', min: 0.1, max: 5.0, step: 0.1, advanced: true },
      { name: 'guidance', type: 'float', default: 4.0, description: 'FLUX guidance strength (2.0–6.0)', min: 2.0, max: 6.0, step: 0.5, advanced: true },
    ],
  },

  // ─── LTX 2.3 ────────────────────────────────────────────────────
  {
    id: 'ltx-presets',
    method: 'GET',
    path: '/ltx/presets',
    name: 'List Presets',
    description: 'List available speed/quality presets for LTX video endpoints. Shows steps, LoRA strength, and which endpoints support presets.',
    category: 'LTX 2.3',
    params: [],
    outputType: 'json',
  },
  {
    id: 'ltx-i2v',
    method: 'POST',
    path: '/ltx/i2v',
    name: 'Image to Video',
    description: 'Animate an image into video using LTX 2.3 (22B). Fast: ~35s (5 steps, single pass). Quality: ~100s+ (20+5 steps, two-pass upscale). Cold start adds 3-8 min for model loading.',
    category: 'LTX 2.3',
    contentType: 'multipart',
    outputType: 'video',
    params: [
      { name: 'image', type: 'file', required: true, description: 'Source image — becomes the first frame of the video. Use a clear, high-res image for best results.' },
      { name: 'prompt', type: 'string', description: 'Motion/scene description (auto-enhanced via Gemma). Tip: describe camera movement and subject action separately.', placeholder: 'the person walks forward slowly, camera follows' },
      { name: 'negative_prompt', type: 'string', description: 'What to avoid. Default: "low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, weird hand, ugly"', placeholder: 'low quality, worst quality, deformed, distorted' },
      { name: 'preset', type: 'select', default: 'fast', description: 'Fast: 5 steps, single pass, no upscale (~35s at 720p). Quality: 20+5 steps, two-pass spatial upscale (~100s+). Use fast for previews, quality for final renders.', options: [
        { label: 'Fast (5 steps, single pass, ~35s)', value: 'fast' },
        { label: 'Quality (20+5 steps, two-pass upscale, ~100s+)', value: 'quality' },
      ]},
      { name: 'audio', type: 'bool', default: false, description: 'Generate audio track with the video. Adds ~5-10s overhead. Skips audio VAE entirely when false for faster generation.' },
      { name: 'aspect_ratio', type: 'select', default: 'original', description: 'Output aspect ratio. "original" preserves input image ratio. Dimensions are snapped to multiples of 32.', options: [
        { label: 'Original (from image)', value: 'original' },
        { label: '16:9 — Widescreen (1280×720)', value: '16:9' },
        { label: '9:16 — Vertical (720×1280)', value: '9:16' },
        { label: '1:1 — Square (1024×1024)', value: '1:1' },
        { label: '4:3 — Standard (1024×768)', value: '4:3' },
        { label: '3:4 — Portrait (768×1024)', value: '3:4' },
        { label: '3:2 — Classic (1152×768)', value: '3:2' },
        { label: '2:3 — Classic Portrait (768×1152)', value: '2:3' },
        { label: '21:9 — Cinematic (1280×544)', value: '21:9' },
        { label: '9:21 — Tall Cinematic (544×1280)', value: '9:21' },
      ]},
      { name: 'length', type: 'int', default: 121, description: 'Number of frames. 49≈2s, 73≈3s, 97≈4s, 121≈5s, 161≈6.7s, 257≈10s at 24fps. Longer = slower.', min: 25, max: 257, step: 8 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random). Same seed + same inputs ≈ same result.', min: -1, max: 999999999 },
      { name: 'width', type: 'int', default: 1280, description: 'Output width in pixels. Only used when aspect_ratio is "original". Must be multiple of 32.', min: 256, max: 1920, step: 32, advanced: true },
      { name: 'height', type: 'int', default: 720, description: 'Output height in pixels. Only used when aspect_ratio is "original". Must be multiple of 32.', min: 256, max: 1920, step: 32, advanced: true },
      { name: 'fps', type: 'int', default: 24, description: 'Frames per second (12-30). 24 is standard cinematic.', min: 12, max: 30, advanced: true },
    ],
  },
  {
    id: 'ltx-t2v',
    method: 'POST',
    path: '/ltx/t2v',
    name: 'Text to Video',
    description: 'Generate video from text prompt using LTX 2.3 (22B). No input image needed. Fast: ~35s (5 steps). Quality: ~100s+ (20+5 steps). Cold start adds 3-8 min.',
    category: 'LTX 2.3',
    contentType: 'multipart',
    outputType: 'video',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Video description. Tip: be specific about subject, motion, camera angle, and lighting.', placeholder: 'a golden retriever running through a meadow, cinematic slow motion, golden hour lighting' },
      { name: 'negative_prompt', type: 'string', description: 'What to avoid. Default: "low quality, worst quality, deformed, distorted, disfigured, motion smear, motion artifacts, fused fingers, bad anatomy, weird hand, ugly"', placeholder: 'low quality, worst quality, deformed, distorted' },
      { name: 'preset', type: 'select', default: 'fast', description: 'Fast: 5 steps, single pass, no upscale (~35s at 720p). Quality: 20+5 steps, two-pass spatial upscale (~100s+). Use fast for previews, quality for final renders.', options: [
        { label: 'Fast (5 steps, single pass, ~35s)', value: 'fast' },
        { label: 'Quality (20+5 steps, two-pass upscale, ~100s+)', value: 'quality' },
      ]},
      { name: 'audio', type: 'bool', default: false, description: 'Generate audio track with the video. Adds ~5-10s overhead. Skips audio VAE entirely when false for faster generation.' },
      { name: 'aspect_ratio', type: 'select', default: '16:9', description: 'Output aspect ratio. Dimensions snapped to multiples of 32.', options: [
        { label: '16:9 — Widescreen (1280×720)', value: '16:9' },
        { label: '9:16 — Vertical (720×1280)', value: '9:16' },
        { label: '1:1 — Square (1024×1024)', value: '1:1' },
        { label: '4:3 — Standard (1024×768)', value: '4:3' },
        { label: '3:4 — Portrait (768×1024)', value: '3:4' },
        { label: '3:2 — Classic (1152×768)', value: '3:2' },
        { label: '2:3 — Classic Portrait (768×1152)', value: '2:3' },
        { label: '21:9 — Cinematic (1280×544)', value: '21:9' },
        { label: '9:21 — Tall Cinematic (544×1280)', value: '9:21' },
        { label: 'Custom', value: 'original' },
      ]},
      { name: 'length', type: 'int', default: 121, description: 'Number of frames. 49≈2s, 73≈3s, 97≈4s, 121≈5s, 161≈6.7s, 257≈10s at 24fps. Longer = slower.', min: 25, max: 257, step: 8 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random). Same seed + same inputs ≈ same result.', min: -1, max: 999999999 },
      { name: 'width', type: 'int', default: 1280, description: 'Output width in pixels. Only used when aspect_ratio is "original". Must be multiple of 32.', min: 256, max: 1920, step: 32, advanced: true },
      { name: 'height', type: 'int', default: 720, description: 'Output height in pixels. Only used when aspect_ratio is "original". Must be multiple of 32.', min: 256, max: 1920, step: 32, advanced: true },
      { name: 'fps', type: 'int', default: 24, description: 'Frames per second (12-30). 24 is standard cinematic.', min: 12, max: 30, advanced: true },
    ],
  },

  // ─── Face Animate Pipeline ─────────────────────────────────────
  {
    id: 'face-animate',
    method: 'POST',
    path: '/face-animate',
    name: 'Face Swap + Animate',
    description: 'Two-step pipeline: FLUX.2 Klein face swap → LTX 2.3 animation. Fast: ~55s total (swap+video). Quality: ~130s+. Cold start adds 5-8 min. Poll /status — "step" field shows progress: "face_swap" or "animating".',
    category: 'Face Swap',
    contentType: 'multipart',
    outputType: 'video',
    params: [
      { name: 'target_image', type: 'file', required: true, description: 'Template/body photo — head gets replaced. Body, clothing, pose, and background are preserved.' },
      { name: 'face_image', type: 'file', required: true, description: 'User\'s face photo — identity to transfer. Use a clear, well-lit, frontal photo for best results.' },
      { name: 'animate_prompt', type: 'string', required: true, description: 'Motion/scene description for the video animation step. Tip: describe the action and camera movement.', placeholder: 'the person smiles and looks at the camera, gentle head movement' },
      { name: 'preset', type: 'select', default: 'fast', description: 'Video generation preset. Fast: 5 steps, single pass (~55s total). Quality: 20+5 steps, two-pass upscale (~130s+ total).', options: [
        { label: 'Fast (5 steps, single pass, ~55s total)', value: 'fast' },
        { label: 'Quality (20+5 steps, two-pass upscale, ~130s+)', value: 'quality' },
      ]},
      { name: 'audio', type: 'bool', default: false, description: 'Generate audio track with the video. Adds ~5-10s overhead. Skips audio VAE entirely when false.' },
      { name: 'aspect_ratio', type: 'select', default: '16:9', description: 'Output video aspect ratio. Dimensions snapped to multiples of 32.', options: [
        { label: '16:9 — Widescreen (1280×720)', value: '16:9' },
        { label: '9:16 — Vertical (720×1280)', value: '9:16' },
        { label: '1:1 — Square (1024×1024)', value: '1:1' },
        { label: '4:3 — Standard (1024×768)', value: '4:3' },
        { label: '3:4 — Portrait (768×1024)', value: '3:4' },
        { label: '3:2 — Classic (1152×768)', value: '3:2' },
        { label: '2:3 — Classic Portrait (768×1152)', value: '2:3' },
        { label: '21:9 — Cinematic (1280×544)', value: '21:9' },
        { label: '9:21 — Tall Cinematic (544×1280)', value: '9:21' },
        { label: 'Custom', value: 'original' },
      ]},
      { name: 'length_seconds', type: 'float', default: 5.0, description: 'Video duration in seconds (3-10). Longer = slower generation.', min: 3, max: 10, step: 0.5 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random). Same seed + same inputs ≈ same result.', min: -1, max: 999999999 },
      { name: 'swap_prompt', type: 'string', description: 'Prompt for the face swap step. Uses a smart default if empty — only set this if you need to override.', placeholder: 'head_swap: seamlessly replace head...', advanced: true },
      { name: 'negative_prompt', type: 'string', description: 'What to avoid in the video output', placeholder: 'low quality, worst quality, deformed, distorted', advanced: true },
      { name: 'width', type: 'int', default: 1280, description: 'Output width (used when aspect_ratio is "original"). Must be multiple of 32.', min: 256, max: 1920, step: 32, advanced: true },
      { name: 'height', type: 'int', default: 720, description: 'Output height (used when aspect_ratio is "original"). Must be multiple of 32.', min: 256, max: 1920, step: 32, advanced: true },
      { name: 'fps', type: 'int', default: 24, description: 'Frames per second (12-30). 24 is standard cinematic.', min: 12, max: 30, advanced: true },
      { name: 'megapixels', type: 'float', default: 2.0, description: 'Face swap output resolution. 1.0≈1MP (fast), 2.0≈2MP (default), 3.0≈3MP (high detail). Higher = slower swap step.', min: 0.5, max: 4.0, step: 0.5, advanced: true },
      { name: 'lora_strength', type: 'float', default: 1.0, description: 'BFS LoRA strength for face swap. 0.5=subtle, 1.0=default, higher=stronger identity transfer.', min: 0.5, max: 1.0, step: 0.1, advanced: true },
      { name: 'swap_steps', type: 'int', default: 4, description: 'Face swap inference steps. 4 is ideal for FLUX Klein.', min: 1, max: 20, advanced: true },
      { name: 'swap_guidance', type: 'float', default: 4.0, description: 'Face swap FLUX guidance strength (2.0–6.0).', min: 2.0, max: 6.0, step: 0.5, advanced: true },
    ],
  },

  // ─── Management ──────────────────────────────────────────────────
  {
    id: 'retry-job',
    method: 'POST',
    path: '/jobs/{job_id}/retry',
    name: 'Retry Job',
    description: 'Retry a failed job',
    category: 'Management',
    params: [
      { name: 'job_id', type: 'string', required: true, description: 'Failed job ID to retry', location: 'path', placeholder: 'a1b2c3d4-...' },
    ],
    outputType: 'json',
  },
  {
    id: 'delete-job',
    method: 'DELETE',
    path: '/jobs/{job_id}',
    name: 'Delete Job',
    description: 'Delete a job record and its output file',
    category: 'Management',
    params: [
      { name: 'job_id', type: 'string', required: true, description: 'Job ID to delete', location: 'path', placeholder: 'a1b2c3d4-...' },
    ],
    outputType: 'json',
  },
  {
    id: 'delete-all-jobs',
    method: 'DELETE',
    path: '/jobs',
    name: 'Bulk Delete Jobs',
    description: 'Delete completed jobs. Pass completed_only=false to delete all.',
    category: 'Management',
    params: [
      { name: 'completed_only', type: 'bool', default: true, description: 'Only delete completed jobs. Set false to delete all (including queued/processing).', location: 'query' },
    ],
    outputType: 'json',
  },
];

export const categories = [...new Set(endpoints.map(e => e.category))];
