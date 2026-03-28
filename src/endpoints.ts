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
  // System
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
      { name: 'job_id', type: 'string', required: true, description: 'Job ID from a generation endpoint', location: 'path', placeholder: 'abc-123-def-456' },
    ],
    outputType: 'json',
  },
  {
    id: 'queue',
    method: 'GET',
    path: '/queue',
    name: 'View Queue',
    description: 'View active jobs (queued or processing)',
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

  // LTX Text to Video
  {
    id: 'ltx-t2v',
    method: 'POST',
    path: '/t2v',
    name: 'LTX 2.3 Text to Video',
    description: 'Fast text-to-video. Best for landscapes, nature, abstract. ~20-90s.',
    category: 'LTX 2.3',
    contentType: 'json',
    outputType: 'video',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Describe what you want to generate', placeholder: 'Aerial drone shot over misty mountain valley at sunrise...' },
      { name: 'negative_prompt', type: 'string', description: 'What to exclude', placeholder: 'blurry, distorted, watermark' },
      { name: 'width', type: 'int', default: 544, description: 'Width in pixels (divisible by 8)', min: 256, max: 1280, step: 8 },
      { name: 'height', type: 'int', default: 960, description: 'Height in pixels (divisible by 8)', min: 256, max: 1280, step: 8 },
      { name: 'seconds', type: 'int', default: 5, description: 'Video duration (1-10)', min: 1, max: 10 },
      { name: 'quality', type: 'select', default: 'balanced', description: 'Quality preset (overrides steps/cfg)', options: [
        { label: 'Fast (~20s)', value: 'fast' },
        { label: 'Balanced (~45s)', value: 'balanced' },
        { label: 'High (~90s)', value: 'high' },
      ]},
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random)', min: -1, max: 999999999 },
      { name: 'steps', type: 'int', default: 20, description: 'Denoising steps (4-50)', min: 4, max: 50 },
      { name: 'cfg', type: 'float', default: 1.0, description: 'CFG scale (1.0-2.0 for LTX)', min: 0.1, max: 5, step: 0.1 },
      { name: 'enhance_prompt', type: 'bool', default: false, description: 'Auto-prepend quality keywords' },
      { name: 'audio', type: 'bool', default: true, description: 'Generate ambient audio' },
    ],
  },

  // LTX Image to Video
  {
    id: 'ltx-i2v',
    method: 'POST',
    path: '/i2v/upload',
    name: 'LTX 2.3 Image to Video',
    description: 'Animate an image. Best for people, products, portraits. ~45s.',
    category: 'LTX 2.3',
    contentType: 'multipart',
    outputType: 'video',
    params: [
      { name: 'file', type: 'file', required: true, description: 'Input image (JPG/PNG) to animate' },
      { name: 'prompt', type: 'string', required: true, description: 'Describe the motion/action', placeholder: 'The woman walks forward slowly, hair moving gently...' },
      { name: 'negative_prompt', type: 'string', description: 'What to avoid', placeholder: 'jittery, flickering' },
      { name: 'width', type: 'int', default: 544, description: 'Output width (match image aspect ratio)', min: 256, max: 1280, step: 8 },
      { name: 'height', type: 'int', default: 960, description: 'Output height (match image aspect ratio)', min: 256, max: 1280, step: 8 },
      { name: 'seconds', type: 'int', default: 5, description: 'Duration (1-10)', min: 1, max: 10 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random)', min: -1, max: 999999999 },
      { name: 'cfg', type: 'float', default: 1.5, description: 'CFG scale (1.0-2.0)', min: 0.1, max: 5, step: 0.1 },
      { name: 'steps', type: 'int', default: 8, description: 'Denoising steps (8 default for I2V)', min: 4, max: 50 },
      { name: 'audio', type: 'bool', default: true, description: 'Generate ambient audio' },
    ],
  },

  // Wan Text to Video
  {
    id: 'wan-t2v',
    method: 'POST',
    path: '/wan/t2v',
    name: 'Wan 2.2 Text to Video',
    description: 'High quality video. Best for realistic humans, cinematic scenes. ~3-5min.',
    category: 'Wan 2.2',
    contentType: 'json',
    outputType: 'video',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Describe what you want', placeholder: 'A woman in a red dress walking down a Paris street at golden hour...' },
      { name: 'negative_prompt', type: 'string', description: 'What to exclude', placeholder: 'blurry, cartoon' },
      { name: 'width', type: 'int', default: 832, description: 'Width (divisible by 16). Portrait: 704, Landscape: 1280', min: 256, max: 1280, step: 16 },
      { name: 'height', type: 'int', default: 480, description: 'Height (divisible by 16). Portrait: 1280, Landscape: 704', min: 256, max: 1280, step: 16 },
      { name: 'seconds', type: 'int', default: 5, description: 'Duration (1-10)', min: 1, max: 10 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random)', min: -1, max: 999999999 },
      { name: 'steps', type: 'int', default: 30, description: 'Denoising steps (30-50 for best)', min: 4, max: 50 },
      { name: 'cfg', type: 'float', default: 6.0, description: 'CFG scale (4.0-7.0 recommended)', min: 1, max: 15, step: 0.5 },
    ],
  },

  // Wan Text to Image
  {
    id: 'wan-t2i',
    method: 'POST',
    path: '/wan/t2i',
    name: 'Wan 2.2 Text to Image',
    description: 'High quality images. Best for portraits, fashion, products. ~20-40s.',
    category: 'Wan 2.2',
    contentType: 'json',
    outputType: 'image',
    params: [
      { name: 'prompt', type: 'string', required: true, description: 'Describe the image with subject, clothing, lighting, camera style', placeholder: 'A young woman in a red dress standing in Paris...' },
      { name: 'negative_prompt', type: 'string', description: 'What to exclude', placeholder: 'blurry, cartoon, bad hands' },
      { name: 'width', type: 'int', default: 704, description: 'Width. Portrait: 704, Landscape: 1280, Square: 1024', min: 256, max: 1280, step: 16 },
      { name: 'height', type: 'int', default: 1280, description: 'Height. Portrait: 1280, Landscape: 704, Square: 1024', min: 256, max: 1280, step: 16 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed (-1 for random)', min: -1, max: 999999999 },
      { name: 'steps', type: 'int', default: 30, description: 'Denoising steps (30-40 recommended)', min: 4, max: 50 },
      { name: 'cfg', type: 'float', default: 4.0, description: 'CFG scale (3.0-5.5). Lower=creative, Higher=prompt-faithful', min: 1, max: 10, step: 0.5 },
      { name: 'enhance_prompt', type: 'bool', default: true, description: 'Auto-prepend quality keywords' },
    ],
  },

  // FLUX Head Swap (Image)
  {
    id: 'flux-face-swap',
    method: 'POST',
    path: '/flux/face-swap',
    name: 'FLUX Head Swap',
    description: 'Highest quality head swap using FLUX.2 Klein 9B. Replaces the entire head region (hair, face) in the target image. ~3-4 min.',
    category: 'Face Swap',
    contentType: 'multipart',
    outputType: 'image',
    params: [
      { name: 'target_image', type: 'file', required: true, description: 'Template/base image — body, clothing, pose, background are preserved. Only the head is replaced.' },
      { name: 'face_image', type: 'file', required: true, description: 'Source face/identity — this person\'s head, hair, and facial features will be transferred into the target.' },
      { name: 'aspect_ratio', type: 'select', default: '9:16', description: 'Output aspect ratio', options: [
        { label: '9:16 Portrait', value: '9:16' },
        { label: '16:9 Landscape', value: '16:9' },
        { label: '1:1 Square', value: '1:1' },
        { label: '3:4 Standard', value: '3:4' },
        { label: '4:3 Wide', value: '4:3' },
        { label: '2:3', value: '2:3' },
        { label: '3:2', value: '3:2' },
      ]},
      { name: 'megapixels', type: 'float', default: 2.0, description: 'Output resolution in megapixels. 1.0 ≈ 1MP, 2.0 ≈ 2MP, 3.0 ≈ 3MP. Higher = more detail but slower.', min: 0.5, max: 4.0, step: 0.5 },
      { name: 'lora_strength', type: 'float', default: 1.0, description: 'BFS Head Swap LoRA strength. 0.8 = subtler swap, 1.0 = default, 1.2 = stronger identity transfer.', min: 0.5, max: 1.5, step: 0.1 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed for reproducibility (-1 for random)', min: -1, max: 999999999 },
      { name: 'steps', type: 'int', default: 4, description: 'Inference steps. 4 is optimal for Klein distilled — don\'t increase unless needed.', min: 1, max: 20 },
      { name: 'cfg', type: 'float', default: 1.0, description: 'CFG guidance scale. Keep at 1.0 for Klein distilled. Higher causes artifacts.', min: 0.1, max: 5.0, step: 0.1 },
    ],
  },

  // FLUX Head Swap + Animate (Best Quality)
  {
    id: 'flux-face-swap-animate',
    method: 'POST',
    path: '/flux/face-swap/animate',
    name: 'FLUX Head Swap + Animate',
    description: 'Best quality: FLUX.2 Klein 9B head swap → LTX/Wan animation. ~5-7 min total.',
    category: 'Face Swap',
    contentType: 'multipart',
    outputType: 'video',
    params: [
      { name: 'target_image', type: 'file', required: true, description: 'Template/base image — body, pose, clothing preserved. Head region is replaced.' },
      { name: 'face_image', type: 'file', required: true, description: 'Source face/identity to transfer into the template.' },
      { name: 'prompt', type: 'string', description: 'Motion description for animation step', placeholder: 'the person smiles slowly, hair moving gently, natural cinematic movement' },
      { name: 'model', type: 'select', default: 'ltx', description: 'Animation model', options: [
        { label: 'LTX (fast, ~60-90s)', value: 'ltx' },
        { label: 'Wan (quality, ~3-5min)', value: 'wan' },
      ]},
      { name: 'negative_prompt', type: 'string', description: 'What to avoid in animation', placeholder: 'jittery, flickering, blurry' },
      { name: 'width', type: 'int', default: 544, description: 'Width. LTX: 544/960. Wan: 704/1280', min: 256, max: 1280, step: 8 },
      { name: 'height', type: 'int', default: 960, description: 'Height. LTX: 960/544. Wan: 1280/704', min: 256, max: 1280, step: 8 },
      { name: 'seconds', type: 'int', default: 5, description: 'Video duration (1-10 seconds)', min: 1, max: 10 },
      { name: 'seed', type: 'int', default: -1, description: 'Animation seed (-1 for random)', min: -1, max: 999999999 },
      { name: 'steps', type: 'int', default: 20, description: 'Animation inference steps. LTX: 8-30, Wan: 20-50', min: 4, max: 50 },
      { name: 'cfg', type: 'float', default: 1.5, description: 'Animation CFG. LTX: 1.0-2.0, Wan: 4.0-7.0', min: 0.1, max: 15, step: 0.1 },
      { name: 'audio', type: 'bool', default: true, description: 'Generate audio (LTX only)' },
      { name: 'quality', type: 'select', default: 'balanced', description: 'LTX quality preset (ignored for Wan)', options: [
        { label: 'Fast', value: 'fast' },
        { label: 'Balanced', value: 'balanced' },
        { label: 'High', value: 'high' },
      ]},
    ],
  },

  // Face Swap + Animate (ReActor — Legacy)
  {
    id: 'face-swap-animate',
    method: 'POST',
    path: '/face-swap/animate',
    name: 'Face Swap + Animate',
    description: 'Swap face into template then animate to video. LTX ~60-90s, Wan ~3-5min.',
    category: 'Face Swap',
    contentType: 'multipart',
    outputType: 'video',
    params: [
      { name: 'source_image', type: 'file', required: true, description: 'User face photo (clear, frontal, well-lit)' },
      { name: 'target_image', type: 'file', required: true, description: 'Template image (face will be replaced)' },
      { name: 'prompt', type: 'string', required: true, description: 'Describe the animation motion', placeholder: 'the person smiles slowly and turns their head...' },
      { name: 'model', type: 'select', default: 'ltx', description: 'Animation model', options: [
        { label: 'LTX (fast, ~60-90s)', value: 'ltx' },
        { label: 'Wan (quality, ~3-5min)', value: 'wan' },
      ]},
      { name: 'negative_prompt', type: 'string', description: 'What to avoid', placeholder: 'jittery, flickering, blurry' },
      { name: 'width', type: 'int', default: 544, description: 'Width. LTX: 544/960. Wan: 704/1280', min: 256, max: 1280, step: 8 },
      { name: 'height', type: 'int', default: 960, description: 'Height. LTX: 960/544. Wan: 1280/704', min: 256, max: 1280, step: 8 },
      { name: 'seconds', type: 'int', default: 5, description: 'Duration (1-10)', min: 1, max: 10 },
      { name: 'seed', type: 'int', default: -1, description: 'Random seed', min: -1, max: 999999999 },
      { name: 'steps', type: 'int', default: 20, description: 'Inference steps. LTX: 8-30, Wan: 20-50', min: 4, max: 50 },
      { name: 'cfg', type: 'float', default: 1.5, description: 'CFG scale. LTX: 1.0-2.0, Wan: 4.0-7.0', min: 0.1, max: 15, step: 0.1 },
      { name: 'audio', type: 'bool', default: true, description: 'Generate audio (LTX only)' },
      { name: 'quality', type: 'select', default: 'balanced', description: 'LTX quality preset (ignored for Wan)', options: [
        { label: 'Fast', value: 'fast' },
        { label: 'Balanced', value: 'balanced' },
        { label: 'High', value: 'high' },
      ]},
      { name: 'face_restore_visibility', type: 'float', default: 1.0, description: 'Face restoration strength (0.1-1.0)', min: 0.1, max: 1.0, step: 0.1 },
      { name: 'codeformer_weight', type: 'float', default: 0.5, description: 'Fidelity vs smoothness (0.0-1.0)', min: 0, max: 1, step: 0.1 },
      { name: 'detect_gender_source', type: 'select', default: 'no', description: 'Filter source face gender', options: [
        { label: 'No filter', value: 'no' },
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
      ]},
      { name: 'detect_gender_target', type: 'select', default: 'no', description: 'Filter target face gender', options: [
        { label: 'No filter', value: 'no' },
        { label: 'Female', value: 'female' },
        { label: 'Male', value: 'male' },
      ]},
      { name: 'source_face_index', type: 'string', default: '0', description: 'Source face index (0=first)', placeholder: '0' },
      { name: 'target_face_index', type: 'string', default: '0', description: 'Target face index (comma-separated for multiple)', placeholder: '0' },
    ],
  },

  // Management
  {
    id: 'cancel-job',
    method: 'DELETE',
    path: '/jobs/{job_id}/cancel',
    name: 'Cancel Job',
    description: 'Cancel a queued or processing job',
    category: 'Management',
    params: [
      { name: 'job_id', type: 'string', required: true, description: 'Job ID to cancel', location: 'path', placeholder: 'abc-123-def-456' },
    ],
    outputType: 'json',
  },
  {
    id: 'retry-job',
    method: 'POST',
    path: '/jobs/{job_id}/retry',
    name: 'Retry Job',
    description: 'Retry a failed or cancelled job',
    category: 'Management',
    params: [
      { name: 'job_id', type: 'string', required: true, description: 'Failed job ID to retry', location: 'path', placeholder: 'abc-123-def-456' },
    ],
    outputType: 'json',
  },
  {
    id: 'delete-job',
    method: 'DELETE',
    path: '/jobs/{job_id}',
    name: 'Delete Job',
    description: 'Delete a specific job and its media file',
    category: 'Management',
    params: [
      { name: 'job_id', type: 'string', required: true, description: 'Job ID to delete', location: 'path', placeholder: 'abc-123-def-456' },
    ],
    outputType: 'json',
  },
  {
    id: 'delete-all-jobs',
    method: 'DELETE',
    path: '/jobs',
    name: 'Delete All Jobs',
    description: 'Delete completed jobs (or all with completed_only=false)',
    category: 'Management',
    params: [
      { name: 'completed_only', type: 'bool', default: true, description: 'Only delete completed jobs', location: 'query' },
    ],
    outputType: 'json',
  },
  {
    id: 'delete-video',
    method: 'DELETE',
    path: '/video/{filename}',
    name: 'Delete Video',
    description: 'Delete a video file from disk',
    category: 'Management',
    params: [
      { name: 'filename', type: 'string', required: true, description: 'Video filename to delete', location: 'path', placeholder: 'wan_output_3661989987.mp4' },
    ],
    outputType: 'json',
  },
];

export const categories = [...new Set(endpoints.map(e => e.category))];
