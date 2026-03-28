# AI Video & Image Generation API Documentation

> **Base URL:** `https://YOUR_POD_ID-7860.proxy.runpod.net`
> Replace `YOUR_POD_ID` with your actual RunPod pod ID (e.g. `t6pgge1y1kl2qt`)

---

## How It Works

All generation endpoints are **asynchronous**. They return a `job_id` immediately — you then poll `/status/{job_id}` until the job completes and returns a media URL.

```
Step 1: POST /wan/t2v        → { "job_id": "abc-123" }
Step 2: GET /status/abc-123  → { "status": "processing" }
Step 3: GET /status/abc-123  → { "status": "completed", "url": "https://..." }
```

---

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check if API is running |
| GET | `/status/{job_id}` | Poll job status (includes timestamps) |
| GET | `/queue` | View active jobs |
| GET | `/jobs` | View all jobs |
| GET | `/videos` | List all videos on disk |
| GET | `/video/{filename}` | Stream/download a video |
| GET | `/image/{filename}` | Serve an image |
| POST | `/t2v` | LTX 2.3 Text to Video |
| POST | `/i2v/upload` | LTX 2.3 Image to Video |
| POST | `/wan/t2v` | Wan 2.2 Text to Video |
| POST | `/wan/t2i` | Wan 2.2 Text to Image |
| POST | `/face-swap` | Swap a face from one image into another (ReActor) |
| POST | `/face-swap/animate` | Face swap + animate into video (LTX or Wan) |
| POST | `/flux/face-swap` | **Head swap image** — FLUX.2 Klein 9B (highest quality) |
| POST | `/flux/face-swap/animate` | **Head swap + animate** — FLUX.2 Klein 9B → LTX/Wan video |
| DELETE | `/video/{filename}` | Delete a video file |
| DELETE | `/jobs/{job_id}` | Delete a job and its file |
| DELETE | `/jobs` | Delete all completed jobs |
| DELETE | `/jobs/{job_id}/cancel` | Cancel a job |
| POST | `/jobs/{job_id}/retry` | Retry a failed job |

---

## System Endpoints

### GET /health
Check if the API is running and accepting requests.

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/health
```

**Response:**
```json
{ "status": "ok" }
```

---

### GET /status/{job_id}
Poll this endpoint after submitting a generation job. Keep polling every 3-5 seconds until `status` is `completed` or `failed`. All responses now include timestamps so you can track how long jobs take.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `job_id` | URL path | string | The job ID returned from a generation endpoint | `abc-123-def-456` |

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/status/abc-123-def-456
```

**Response — Queued** (job is waiting in queue):
```json
{
  "status": "queued",
  "created_at": "2026-03-26T04:30:00+00:00"
}
```

**Response — Processing** (job is actively generating):
```json
{
  "status": "processing",
  "created_at": "2026-03-26T04:30:00+00:00",
  "started_at": "2026-03-26T04:30:02+00:00"
}
```

**Response — Completed** (ready to use):
```json
{
  "status": "completed",
  "url": "https://YOUR_POD_ID-7860.proxy.runpod.net/video/wan_output_3661989987.mp4",
  "filename": "wan_output_3661989987.mp4",
  "created_at": "2026-03-26T04:30:00+00:00",
  "started_at": "2026-03-26T04:30:02+00:00",
  "completed_at": "2026-03-26T04:33:45+00:00"
}
```

**Response — Failed:**
```json
{
  "status": "failed",
  "error": "CUDA out of memory",
  "created_at": "2026-03-26T04:30:00+00:00",
  "failed_at": "2026-03-26T04:30:10+00:00"
}
```

---

### GET /queue
Returns only the currently active jobs (queued or processing). Useful for checking server load before submitting new jobs.

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/queue
```

**Response:**
```json
{
  "count": 2,
  "jobs": [
    { "job_id": "abc-123", "status": "processing" },
    { "job_id": "def-456", "status": "queued" }
  ]
}
```

---

### GET /jobs
Returns all jobs in memory including completed and failed ones. Useful for debugging.

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/jobs
```

**Response:**
```json
{
  "total": 10,
  "summary": {
    "queued": 1,
    "processing": 1,
    "completed": 7,
    "failed": 1
  },
  "jobs": [...]
}
```

---

### GET /videos
Lists all MP4 video files stored on disk, sorted by newest first.

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/videos
```

**Response:**
```json
{
  "total": 3,
  "videos": [
    {
      "filename": "wan_output_3661989987.mp4",
      "size_mb": 6.4,
      "url": "https://YOUR_POD_ID-7860.proxy.runpod.net/video/wan_output_3661989987.mp4",
      "created_at": 1774492363.0
    }
  ]
}
```

---

### GET /video/{filename}
Stream or download a generated video file.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `filename` | URL path | string | The video filename from the completed job | `wan_output_3661989987.mp4` |

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/video/wan_output_3661989987.mp4 \
  --output myvideo.mp4
```

---

### GET /image/{filename}
Serve a generated image file.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `filename` | URL path | string | The image filename from the completed job | `wan_image_1234567890_00001_.png` |

```bash
curl https://YOUR_POD_ID-7860.proxy.runpod.net/image/wan_image_1234567890_00001_.png \
  --output myimage.png
```

---

## LTX 2.3 — Text to Video

**Model:** LTX 2.3 22B Dev FP8
**Speed:** ~20–90 seconds depending on quality mode
**Best for:** Landscapes, nature, abstract scenes, non-human content
**Not recommended for:** Realistic human generation (use Wan 2.2 instead)

### POST /t2v

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `prompt` | string | ✅ Yes | — | Describe what you want to generate. Be specific about camera angles, lighting, motion, and environment. | `"Aerial drone shot over misty mountain valley at sunrise, smooth cinematic glide"` |
| `negative_prompt` | string | No | auto | What to exclude from generation. Defaults to a comprehensive quality filter. Only override if you need specific exclusions. | `"blurry, distorted, watermark"` |
| `width` | int | No | 544 | Output video width in pixels. Must be divisible by 8. Use 544 for portrait or 960 for landscape. | `544` |
| `height` | int | No | 960 | Output video height in pixels. Must be divisible by 8. Use 960 for portrait or 544 for landscape. | `960` |
| `seconds` | int | No | 5 | Video duration in seconds. Longer videos use more VRAM and take longer. Range: 1–10. | `5` |
| `seed` | int | No | -1 | Random seed for reproducibility. Set to -1 for a random seed each time. Same seed + same prompt = same result. | `42` |
| `steps` | int | No | 20 | Denoising steps. More steps = better quality but slower. Overridden by `quality` preset if set. Range: 4–50. | `20` |
| `cfg` | float | No | 1.0 | Classifier-Free Guidance scale. Controls how closely the model follows the prompt. Keep between 1.0–2.0 for LTX. Higher values cause distortion. | `1.5` |
| `enhance_prompt` | bool | No | false | Automatically prepends quality keywords to your prompt. Useful for short prompts. | `true` |
| `audio` | bool | No | true | Generate ambient audio alongside the video. Set to false for silent video. | `true` |
| `quality` | string | No | `balanced` | Quality preset that overrides `steps` and `cfg`. Options: `fast` (8 steps, ~20s), `balanced` (20 steps, ~45s), `high` (30 steps no LoRA, ~90s). | `"balanced"` |

### Quality Presets Explained

| Preset | Steps | LoRA | Approx Time | Use Case |
|---|---|---|---|---|
| `fast` | 8 | ✅ On | ~20 sec | Testing prompts, previews |
| `balanced` | 20 | ✅ On | ~45 sec | Standard production |
| `high` | 30 | ❌ Off | ~90 sec | Final renders, best quality |

### Example 1 — Mountain Landscape (Balanced)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/t2v \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Aerial drone shot gliding over a vast green mountain valley at sunrise, golden light breaking through morning mist, lush pine forests below, smooth slow cinematic camera movement, photorealistic, 4K HDR",
    "width": 960,
    "height": 544,
    "seconds": 5,
    "quality": "balanced",
    "audio": true
  }'
```

### Example 2 — Ocean Waves (High Quality)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/t2v \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Slow motion close-up of turquoise ocean waves crashing on white sand beach at sunset, golden and pink sky reflections shimmering on wet sand, sea foam spreading across frame, cinematic wide angle shot, photorealistic, 4K",
    "width": 960,
    "height": 544,
    "seconds": 5,
    "quality": "high",
    "audio": true
  }'
```

### Example 3 — City at Night (Fast Preview)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/t2v \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Tokyo neon-lit street at night after rain, reflections of colorful signs on wet pavement, people walking with umbrellas, cinematic tracking shot, bokeh lights, photorealistic, 4K",
    "width": 544,
    "height": 960,
    "seconds": 5,
    "quality": "fast"
  }'
```

---

## LTX 2.3 — Image to Video

**Model:** LTX 2.3 22B Dev FP8
**Speed:** ~45 seconds for 5s video
**Best for:** Animating people, products, portraits — any subject from an input image
**Input format:** `multipart/form-data`

### POST /i2v/upload

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `file` | File | ✅ Yes | — | Input image to animate. Supports JPG, PNG. The model will animate this image based on your prompt. | `portrait.jpg` |
| `prompt` | string | ✅ Yes | — | Describe the motion and action you want. Focus on movement and camera description. | `"The woman walks forward slowly, hair moving gently in the breeze"` |
| `negative_prompt` | string | No | auto | What to avoid. Uses the comprehensive default if not set. | `"jittery, flickering"` |
| `width` | int | No | 544 | Output video width. Should roughly match your input image aspect ratio. | `544` |
| `height` | int | No | 960 | Output video height. Match your input image aspect ratio for best results. | `960` |
| `seconds` | int | No | 5 | Video duration in seconds. Range: 1–10. | `5` |
| `seed` | int | No | -1 | Random seed. Set to -1 for random. Use a fixed seed to regenerate a similar result. | `42` |
| `cfg` | float | No | 1.5 | CFG scale. Keep between 1.0–2.0 for LTX. Higher values cause visual distortion. | `1.5` |
| `steps` | int | No | 8 | Denoising steps. 8 is optimized for I2V. Increasing to 20 gives better quality. | `8` |
| `audio` | bool | No | true | Generate ambient audio alongside the video. | `true` |

### Example 1 — Animate a Portrait
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/i2v/upload \
  -F "file=@/path/to/portrait.jpg" \
  -F "prompt=The woman slowly turns her head and smiles warmly, hair gently swaying in a light breeze, soft natural sunlight, smooth cinematic motion, photorealistic" \
  -F "width=544" \
  -F "height=960" \
  -F "seconds=5" \
  -F "cfg=1.5" \
  -F "steps=8" \
  -F "audio=true"
```

### Example 2 — Product Animation
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/i2v/upload \
  -F "file=@/path/to/product.jpg" \
  -F "prompt=The product slowly rotates 360 degrees on a clean white surface, soft studio lighting from above, smooth professional product showcase animation" \
  -F "width=960" \
  -F "height=544" \
  -F "seconds=5" \
  -F "cfg=1.5" \
  -F "steps=20"
```

### Example 3 — Fashion Model Walk
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/i2v/upload \
  -F "file=@/path/to/fashion_photo.jpg" \
  -F "prompt=The model walks confidently forward on a runway, dress flowing naturally, professional catwalk movement, smooth camera tracking, studio lighting" \
  -F "width=544" \
  -F "height=960" \
  -F "seconds=5" \
  -F "cfg=1.5" \
  -F "steps=15"
```

---

## Wan 2.2 — Text to Video

**Model:** Wan 2.2 TI2V-5B FP16
**Speed:** ~3–5 minutes for 5s 720p video
**Best for:** Realistic human generation, complex cinematic scenes, high quality output

### POST /wan/t2v

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `prompt` | string | ✅ Yes | — | Describe what you want. Wan 2.2 responds strongly to specific descriptions of subject, motion, lighting, camera, and environment. | `"A woman in a red dress walking down a Paris street at golden hour"` |
| `negative_prompt` | string | No | auto | What to exclude. Uses the comprehensive default if not set. Only override for specific exclusions. | `"blurry, cartoon"` |
| `width` | int | No | 832 | Video width in pixels. For portrait use 704, for landscape use 1280. Must be divisible by 16. | `704` |
| `height` | int | No | 480 | Video height in pixels. For portrait use 1280, for landscape use 704. Must be divisible by 16. | `1280` |
| `seconds` | int | No | 5 | Video duration in seconds. Frames are calculated as `(seconds × 24 − 1) / 4 × 4 + 1`. | `5` |
| `seed` | int | No | -1 | Random seed. Set to -1 for random. Reuse the same seed to regenerate similar results. | `1234` |
| `steps` | int | No | 30 | Denoising steps. 30 is a good balance. Use 40–50 for highest quality. More steps = slower but sharper. | `30` |
| `cfg` | float | No | 6.0 | CFG scale. Controls prompt adherence. Range 4.0–7.0 recommended. Too high causes oversaturation. | `5.0` |

### Recommended Resolutions

| Orientation | Width | Height | Use Case |
|---|---|---|---|
| Portrait 9:16 | 704 | 1280 | Social media, mobile, people |
| Landscape 16:9 | 1280 | 704 | Cinematic, YouTube, scenes |
| Square 1:1 | 832 | 832 | Instagram, product |
| Landscape 4:3 | 832 | 480 | Standard wide |

### Example 1 — Realistic Woman Walking
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2v \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful young woman with long dark wavy hair wearing an elegant black dress, walking confidently down a cobblestone Parisian street at golden hour, Haussmann buildings softly blurred in background, warm sunset light illuminating her face, shallow depth of field, smooth cinematic tracking shot, natural fluid movement, photorealistic, 4K HDR",
    "width": 704,
    "height": 1280,
    "seconds": 5,
    "steps": 35,
    "cfg": 5.0,
    "seed": -1
  }'
```

### Example 2 — Cinematic Couple Scene
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2v \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A young couple walking hand in hand through a cherry blossom park in Kyoto Japan, pale pink petals drifting gently around them in the wind, soft morning golden light filtering through the branches, slow motion wide angle cinematic shot, romantic atmosphere, photorealistic, 4K",
    "width": 1280,
    "height": 704,
    "seconds": 5,
    "steps": 35,
    "cfg": 5.0
  }'
```

### Example 3 — Fashion Model
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2v \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A high fashion model with short platinum blonde hair wearing a white tailored blazer and black wide-leg trousers, walking on a sleek modern sidewalk in New York City, overcast natural daylight creating soft even lighting, confident elegant runway-style walk, slight hair movement, cinematic slow tracking shot, ultra realistic, Vogue editorial style, 4K",
    "width": 704,
    "height": 1280,
    "seconds": 5,
    "steps": 40,
    "cfg": 5.0
  }'
```

---

## Wan 2.2 — Text to Image

**Model:** Wan 2.2 TI2V-5B FP16
**Speed:** ~20–40 seconds
**Best for:** High quality portrait photography, fashion, lifestyle imagery, product shots

### POST /wan/t2i

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `prompt` | string | ✅ Yes | — | Describe the image. Include subject details, clothing, location, lighting, camera type, and photographic style for best results. | `"A young woman in a red dress standing in Paris"` |
| `negative_prompt` | string | No | auto | What to exclude. Defaults to comprehensive quality and anatomy filters. | `"blurry, cartoon, bad hands"` |
| `width` | int | No | 704 | Image width in pixels. For portrait use 704, for landscape use 1280. | `704` |
| `height` | int | No | 1280 | Image height in pixels. For portrait use 1280, for landscape use 704. | `1280` |
| `seed` | int | No | -1 | Random seed. Set to -1 for random. Reuse the same seed to generate similar images. | `9999` |
| `steps` | int | No | 30 | Denoising steps. 30–40 gives the best balance of quality and speed. | `35` |
| `cfg` | float | No | 4.0 | CFG scale. Lower (3.5) = more creative and natural. Higher (5.0) = more prompt-faithful but can oversaturate. Range: 3.0–5.5. | `4.0` |
| `enhance_prompt` | bool | No | true | Automatically prepends `masterpiece, best quality, ultra realistic, sharp focus, perfect anatomy, perfect proportions` to your prompt. Disable if you want full control over the prompt. | `true` |

### Recommended Resolutions

| Format | Width | Height | Use Case |
|---|---|---|---|
| Portrait 9:16 | 704 | 1280 | People, fashion, social media |
| Square 1:1 | 1024 | 1024 | Product, profile, Instagram |
| Landscape 16:9 | 1280 | 704 | Scenery, editorial, banner |
| Portrait 3:4 | 768 | 1024 | Magazine, editorial |

### Example 1 — Portrait Photography
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2i \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A stunning young woman in her mid-20s with long wavy dark chestnut hair, wearing a black silk slip dress, standing on a sunlit Parisian cobblestone street, Haussmann buildings softly blurred in background, warm golden hour light, shallow depth of field, shot on Canon EOS R5 85mm f1.4, professional fashion photography, ultra realistic, 8K",
    "width": 704,
    "height": 1280,
    "steps": 35,
    "cfg": 4.0,
    "enhance_prompt": true
  }'
```

### Example 2 — Corporate / Business
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2i \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A confident Asian businesswoman in her early 30s with a short bob haircut, wearing a tailored navy blue blazer with white blouse, holding a leather portfolio, standing in a bright modern glass office lobby, soft natural window light from the side, sharp focus on face, professional corporate headshot style, photorealistic, 4K",
    "width": 704,
    "height": 1280,
    "steps": 35,
    "cfg": 3.5,
    "enhance_prompt": true
  }'
```

### Example 3 — Fashion Editorial
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2i \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "High fashion editorial photograph of a model with sharp cheekbones wearing an oversized cream trench coat belted at the waist, standing on a Tokyo rooftop at blue hour dusk, city lights bokeh behind her, dramatic side rim lighting, shot on Hasselblad medium format camera, Vogue Paris editorial style, photorealistic, ultra sharp, 8K",
    "width": 704,
    "height": 1280,
    "steps": 40,
    "cfg": 4.0,
    "enhance_prompt": false
  }'
```

### Example 4 — Product Photography
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/wan/t2i \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Luxury perfume bottle with gold cap sitting on a white marble surface, soft studio lighting with subtle reflections, minimalist clean background, professional commercial product photography, ultra sharp macro details, photorealistic, 4K",
    "width": 1024,
    "height": 1024,
    "steps": 35,
    "cfg": 4.5,
    "enhance_prompt": true
  }'
```

---

## FLUX.2 Klein 9B — Head Swap (Image)

**Model:** FLUX.2 Klein 9B + BFS Head Swap LoRA + LanPaint KSampler
**Speed:** ~3–4 minutes
**Best for:** High-fidelity head/face transplants onto template images. Preserves body, pose, clothing, background, and lighting from the target. Transfers full identity — face, hair, skin tone, facial structure — from the source.
**Output:** PNG image

> **⚠️ Non-Commercial License** — FLUX.2 Klein 9B is released under a non-commercial research license by Black Forest Labs. This endpoint is for research and personal use only.

### How It Works

```
target_image (body template) + face_image (source identity)
        ↓
   Auto-detect head region → create inpaint mask
        ↓
   FLUX.2 Klein 9B + BFS LoRA transplants identity
        ↓
   LanPaint KSampler blends seamlessly
        ↓
   Final PNG — original body + new head
```

The model automatically detects the head region of the target image and replaces it with the identity from the face image. Clothing, pose, background, hands, and body remain completely unchanged.

### POST /flux/face-swap

> **Input format:** `multipart/form-data` — use `-F` flags with curl

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `target_image` | File | ✅ Yes | — | The template/base image. The body, clothing, pose, and background from this image are preserved. Only the head region is replaced. | `template.png` |
| `face_image` | File | ✅ Yes | — | The source face/identity. This person's head, hair, and facial features will be transferred into the target image. | `selfie.jpg` |
| `seed` | int | No | -1 | Random seed for reproducibility. Set to -1 for a random seed each time. Same seed + same inputs ≈ same result. | `42` |
| `megapixels` | float | No | `2.0` | Output resolution in megapixels. `1.0` ≈ 1MP, `2.0` ≈ 2MP (default), `3.0` ≈ 3MP. Higher = more detail but slower generation. | `2.0` |
| `steps` | int | No | `4` | Inference steps. 4 is optimal for the Klein distilled model — do not increase unless you have a specific reason. | `4` |
| `cfg` | float | No | `1.0` | CFG guidance scale. Keep at 1.0 for Klein distilled. Higher values cause artifacts. | `1.0` |
| `lora_strength` | float | No | `1.0` | BFS Head Swap LoRA strength. Controls how strongly the face identity is transferred. Range: 0.5–1.5. Try 0.8 for a subtler swap, 1.2 for stronger identity transfer. | `1.0` |

### Example — Basic Head Swap
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap \
  -F "target_image=@/path/to/template.png" \
  -F "face_image=@/path/to/selfie.jpg"
```

### Example — High Resolution + Strong Identity Transfer
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap \
  -F "target_image=@/path/to/template.png" \
  -F "face_image=@/path/to/selfie.jpg" \
  -F "megapixels=3.0" \
  -F "lora_strength=1.2" \
  -F "seed=123456"
```

### Example — Subtle Swap (less identity, more template preservation)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap \
  -F "target_image=@/path/to/template.png" \
  -F "face_image=@/path/to/selfie.jpg" \
  -F "lora_strength=0.8" \
  -F "megapixels=2.0"
```

### Example — JavaScript (Browser Upload)
```javascript
async function fluxHeadSwap(targetFile, faceFile, options = {}) {
  const formData = new FormData();
  formData.append('target_image', targetFile);
  formData.append('face_image', faceFile);
  formData.append('seed', options.seed ?? -1);
  formData.append('megapixels', options.megapixels ?? 2.0);
  formData.append('lora_strength', options.lora_strength ?? 1.0);

  const res = await fetch('https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap', {
    method: 'POST',
    body: formData
  });
  const { job_id } = await res.json();
  console.log('Job submitted:', job_id);

  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const result = await fetch(`https://YOUR_POD_ID-7860.proxy.runpod.net/status/${job_id}`)
      .then(r => r.json());
    console.log('Status:', result.status);
    if (result.status === 'completed') return result.url;
    if (result.status === 'failed') throw new Error(result.error);
  }
}

// Usage
const imageUrl = await fluxHeadSwap(
  document.getElementById('template').files[0],
  document.getElementById('selfie').files[0],
  { megapixels: 2.0, lora_strength: 1.0 }
);
document.getElementById('result').src = imageUrl;
```

### Example — Python
```python
import requests, time

BASE_URL = "https://YOUR_POD_ID-7860.proxy.runpod.net"

def flux_head_swap(target_path, face_path, megapixels=2.0, lora_strength=1.0, seed=-1):
    with open(target_path, 'rb') as t, open(face_path, 'rb') as f:
        res = requests.post(
            f"{BASE_URL}/flux/face-swap",
            files={'target_image': t, 'face_image': f},
            data={'seed': seed, 'megapixels': megapixels, 'lora_strength': lora_strength}
        )
    job_id = res.json()['job_id']
    print(f"Job submitted: {job_id}")

    while True:
        time.sleep(5)
        status = requests.get(f"{BASE_URL}/status/{job_id}").json()
        print(f"Status: {status['status']}")
        if status['status'] == 'completed':
            return status['url']
        if status['status'] == 'failed':
            raise Exception(status['error'])

url = flux_head_swap('template.png', 'selfie.jpg', megapixels=2.0, lora_strength=1.0)
print(f"Done! Image URL: {url}")
```

### Response (on submit)
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "type": "image",
  "model": "flux2-klein-9b",
  "created_at": "2026-03-27T03:00:00+00:00",
  "poll_url": "https://YOUR_POD_ID-7860.proxy.runpod.net/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Response (when completed)
```json
{
  "status": "completed",
  "url": "https://YOUR_POD_ID-7860.proxy.runpod.net/image/images/flux_swap_3291847561_00001_.png",
  "filename": "images/flux_swap_3291847561_00001_.png",
  "created_at": "2026-03-27T03:00:00+00:00",
  "started_at": "2026-03-27T03:00:02+00:00",
  "completed_at": "2026-03-27T03:04:10+00:00"
}
```

### Tips for Best Results

**Target image (body template):**
- Face should be clearly visible and well-lit
- Works best with a single person
- Higher resolution = better blending quality
- The head region is fully replaced — make sure the body/pose is what you want to keep

**Face image (source identity):**
- Use a clear, well-lit, frontal face photo
- Single person, no sunglasses or heavy occlusion
- The model transfers hair, eye color, nose structure, skin tone, and facial proportions

**What is preserved from the target:**
- Body, clothing, and accessories
- Pose and hand positions
- Background and environment
- Camera angle, lighting direction, and exposure

**What is transferred from the face image:**
- Head shape and facial structure
- Hair texture and style
- Eye color and nose structure
- Skin tone adapted to match target lighting

---

## Face Swap + Animate (ReActor — Legacy)

**Models:** ReActor (face swap) → LTX 2.3 I2V or Wan 2.2 I2V (animation)
**Speed:** LTX ~60–90 sec | Wan ~3–5 min
**Best for:** Fast face swaps with animation. Lower identity fidelity than FLUX. Use `/flux/face-swap/animate` for highest quality.

> **Tip:** For the best results use `/flux/face-swap/animate` which uses FLUX.2 Klein 9B for the swap step before animating.

### How It Works

This is a **two-step chained workflow** that runs entirely inside ComfyUI as a single job:

```
source_image (user face) + target_image (your template)
        ↓
   Step 1: ReActor Face Swap
        ↓
   Swapped Image
        ↓
   Step 2: LTX 2.3 I2V or Wan 2.2 I2V
        ↓
   Final Animated Video
```

You submit once, poll once — the entire pipeline runs automatically.

### POST /face-swap/animate

> **Input format:** `multipart/form-data` — use `-F` flags with curl

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `source_image` | File | ✅ Yes | — | The user's face photo. Should be clear, well-lit, frontal. Supports JPG and PNG. | `user_selfie.jpg` |
| `target_image` | File | ✅ Yes | — | Your prepared template image that will be animated. The face in this image gets replaced before animation. | `template.png` |
| `prompt` | string | ✅ Yes | — | Describe the motion and animation. Focus on movement, expression, and camera description. | `"the person smiles slowly and turns their head, natural cinematic movement"` |
| `model` | string | No | `ltx` | Which model to use for animation. `ltx` = LTX 2.3 I2V (faster, ~60-90s), `wan` = Wan 2.2 (better quality, ~3-5min). | `"wan"` |
| `negative_prompt` | string | No | auto | What to avoid in the animation. | `"jittery, flickering, blurry"` |
| `width` | int | No | 544 | Output video width in pixels. Portrait: 544 (LTX) or 704 (Wan). Landscape: 960 (LTX) or 1280 (Wan). | `704` |
| `height` | int | No | 960 | Output video height in pixels. Portrait: 960 (LTX) or 1280 (Wan). Landscape: 544 (LTX) or 704 (Wan). | `1280` |
| `seconds` | int | No | 5 | Video duration in seconds. Range: 1–10. | `5` |
| `seed` | int | No | -1 | Random seed. -1 = random. Use same seed to reproduce identical results. | `42` |
| `steps` | int | No | 20 | Inference steps. LTX: 8–30 recommended. Wan: 20–50 recommended. More steps = better quality but slower. If you set this manually it overrides the `quality` preset. | `30` |
| `cfg` | float | No | 1.5 | CFG scale. LTX: keep 1.0–2.0. Wan: use 4.0–7.0. Controls how closely the model follows your prompt. | `6.0` |
| `audio` | bool | No | `true` | Generate ambient audio alongside the video. LTX only — Wan does not support audio. | `true` |
| `quality` | string | No | `balanced` | LTX quality preset — only applies when `steps` is not manually set. `fast` (8 steps), `balanced` (20 steps), `high` (30 steps, no LoRA). Wan ignores this. | `"high"` |
| `face_restore_visibility` | float | No | `1.0` | How strongly to apply GFPGANv1.4 face restoration after the swap. `1.0` = full, `0.1` = minimal. Range: 0.1–1.0. | `1.0` |
| `codeformer_weight` | float | No | `0.5` | Balance between face fidelity and restoration smoothness. `0.0` = max restoration/smoothing, `1.0` = preserve original face details exactly. Range: 0.0–1.0. | `0.5` |
| `detect_gender_source` | string | No | `"no"` | Filter which face to use from source: `no`, `female`, `male`. Useful if source image has multiple people. | `"female"` |
| `detect_gender_target` | string | No | `"no"` | Filter which face to replace in target: `no`, `female`, `male`. | `"no"` |
| `source_face_index` | string | No | `"0"` | Which face to use from source image. `"0"` = first/largest detected face. | `"0"` |
| `target_face_index` | string | No | `"0"` | Which face in template to replace. `"0"` = first/largest. Comma-separated for multiple e.g. `"0,1"`. | `"0"` |

### Recommended Settings by Model

| Setting | LTX (fast) | Wan (quality) |
|---|---|---|
| `width` × `height` | 544 × 960 (portrait) | 704 × 1280 (portrait) |
| `steps` | 8–30 | 20–50 |
| `cfg` | 1.0–2.0 | 4.0–7.0 |
| `quality` | `fast` / `balanced` / `high` | ignored |
| Speed | ~60–90 sec | ~3–5 min |
| Audio | ✅ Yes | ❌ No |

### Example 1 — LTX Fast (Best for testing)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/face-swap/animate \
  -F "source_image=@/path/to/user_selfie.jpg" \
  -F "target_image=@/path/to/template.png" \
  -F "prompt=the person smiles slowly and turns their head, hair moving gently, natural cinematic movement" \
  -F "model=ltx" \
  -F "quality=fast" \
  -F "width=544" \
  -F "height=960" \
  -F "seconds=5"
```

### Example 2 — LTX High Quality
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/face-swap/animate \
  -F "source_image=@/path/to/user_selfie.jpg" \
  -F "target_image=@/path/to/template.png" \
  -F "prompt=the warrior slowly looks up at camera, dramatic lighting, hair moving, intense expression, cinematic" \
  -F "model=ltx" \
  -F "quality=high" \
  -F "width=544" \
  -F "height=960" \
  -F "seconds=5" \
  -F "cfg=1.5"
```

### Example 3 — LTX with Manual Steps Control
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/face-swap/animate \
  -F "source_image=@/path/to/user_selfie.jpg" \
  -F "target_image=@/path/to/template.png" \
  -F "prompt=the person smiles and blinks, looking at camera naturally, soft lighting" \
  -F "model=ltx" \
  -F "steps=25" \
  -F "cfg=1.5" \
  -F "width=544" \
  -F "height=960" \
  -F "seconds=5"
```

### Example 4 — Wan 2.2 (Best Quality)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/face-swap/animate \
  -F "source_image=@/path/to/user_selfie.jpg" \
  -F "target_image=@/path/to/template.png" \
  -F "prompt=the person walks forward confidently, natural fluid movement, cinematic tracking shot, photorealistic" \
  -F "model=wan" \
  -F "steps=30" \
  -F "cfg=6.0" \
  -F "width=704" \
  -F "height=1280" \
  -F "seconds=5"
```

### Example 5 — JavaScript (Browser Upload)
```javascript
async function faceSwapAnimate(userSelfie, templateFile, options = {}) {
  const formData = new FormData();
  formData.append('source_image', userSelfie);   // user's uploaded selfie
  formData.append('target_image', templateFile); // your prepared template
  formData.append('prompt', options.prompt || 'the person smiles naturally, cinematic');
  formData.append('model', options.model || 'ltx');
  formData.append('quality', options.quality || 'balanced');
  formData.append('width', options.width || '544');
  formData.append('height', options.height || '960');
  formData.append('seconds', options.seconds || '5');

  // Step 1: Submit job
  const res = await fetch('https://YOUR_POD_ID-7860.proxy.runpod.net/face-swap/animate', {
    method: 'POST',
    body: formData
  });
  const { job_id, poll_url } = await res.json();
  console.log('Job submitted:', job_id);

  // Step 2: Poll every 5 seconds
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const status = await fetch(`https://YOUR_POD_ID-7860.proxy.runpod.net/status/${job_id}`);
    const result = await status.json();
    console.log('Status:', result.status);

    if (result.status === 'completed') {
      console.log(`Done in ${result.completed_at}`);
      return result.url; // video URL
    }
    if (result.status === 'failed') throw new Error(result.error);
  }
}

// Usage
const videoUrl = await faceSwapAnimate(
  document.getElementById('selfie').files[0],
  await fetch('/templates/warrior.png').then(r => r.blob()),
  {
    prompt: 'the warrior slowly looks up at camera, dramatic lighting, cinematic',
    model: 'ltx',
    quality: 'high',
    width: '544',
    height: '960'
  }
);
document.getElementById('result-video').src = videoUrl;
```

### Response (on submit)
```json
{
  "job_id": "98b8e899-da0e-411c-b09c-ae5bd2752bcc",
  "status": "queued",
  "model": "faceswap+ltx",
  "type": "video",
  "poll_url": "https://YOUR_POD_ID-7860.proxy.runpod.net/status/98b8e899-da0e-411c-b09c-ae5bd2752bcc"
}
```

### Response (when completed)
```json
{
  "status": "completed",
  "url": "https://YOUR_POD_ID-7860.proxy.runpod.net/video/faceswap_ltx_2629496073.mp4",
  "filename": "faceswap_ltx_2629496073.mp4",
  "created_at": "2026-03-26T04:30:00+00:00",
  "started_at": "2026-03-26T04:30:02+00:00",
  "completed_at": "2026-03-26T04:31:15+00:00"
}
```

### Tips for Best Results

**Source image (user selfie):**
- Clear, well-lit, frontal face
- Single person in the photo
- No sunglasses or heavy occlusion
- Higher resolution = better swap quality

**Template image:**
- Face should be clearly visible and reasonably sized
- Avoid very small faces in the frame
- Works best when lighting is similar to the source

**Prompt tips for animation:**
- Always describe the motion specifically — `"slowly turns head"` not just `"moving"`
- Add `"natural cinematic movement"` for smoother results
- For LTX: keep prompts focused on motion
- For Wan: add more detail about lighting and camera — `"smooth tracking shot, golden lighting"`

---

## FLUX.2 Klein 9B — Head Swap + Animate (Best Quality)

**Models:** FLUX.2 Klein 9B (head swap) → LTX 2.3 I2V or Wan 2.2 I2V (animation)
**Speed:** ~5–7 min total (FLUX swap ~3-4min + animation ~60-90s LTX / ~3-5min Wan)
**Best for:** Highest fidelity personalized videos — FLUX transfers full head identity then animates the result. Better identity preservation than ReActor-based pipeline.

### How It Works

```
target_image (body template) + face_image (source identity)
        ↓
   Step 1: FLUX.2 Klein 9B + BFS LoRA — full head swap
        ↓
   Swapped PNG (high fidelity)
        ↓
   Step 2: LTX 2.3 I2V or Wan 2.2 I2V — animate
        ↓
   Final MP4 video
```

Poll the status endpoint — it will show which step is currently running (`"step": "1/2 — FLUX head swap"` or `"step": "2/2 — Animating"`).

### POST /flux/face-swap/animate

> **Input format:** `multipart/form-data` — use `-F` flags with curl

**Parameters:**

| Field | Type | Required | Default | Description | Example |
|---|---|---|---|---|---|
| `target_image` | File | ✅ Yes | — | The template/base image. Body, pose, clothing preserved. | `template.png` |
| `face_image` | File | ✅ Yes | — | Source face/identity to transfer into the template. | `selfie.jpg` |
| `prompt` | string | No | auto | Motion description for the animation step. | `"the person smiles slowly, hair moving gently"` |
| `model` | string | No | `ltx` | Animation model. `ltx` = faster (~60-90s), `wan` = higher quality (~3-5min). | `"wan"` |
| `negative_prompt` | string | No | auto | What to avoid in the animation. | `"jittery, flickering, blurry"` |
| `width` | int | No | `544` | Output video width. Portrait: 544 (LTX) or 704 (Wan). | `704` |
| `height` | int | No | `960` | Output video height. Portrait: 960 (LTX) or 1280 (Wan). | `1280` |
| `seconds` | int | No | `5` | Video duration in seconds (1–10). | `5` |
| `seed` | int | No | `-1` | Animation seed. -1 = random. | `42` |
| `steps` | int | No | `20` | Animation inference steps. LTX: 8–30. Wan: 20–50. | `30` |
| `cfg` | float | No | `1.5` | Animation CFG. LTX: 1.0–2.0. Wan: 4.0–7.0. | `6.0` |
| `audio` | bool | No | `true` | Generate audio. LTX only. | `true` |
| `quality` | string | No | `balanced` | LTX quality preset: `fast`, `balanced`, `high`. Wan ignores this. | `"high"` |

### Example 1 — LTX (Fast)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap/animate \
  -F "target_image=@/path/to/template.png" \
  -F "face_image=@/path/to/selfie.jpg" \
  -F "prompt=the person smiles slowly and looks at the camera, natural cinematic movement" \
  -F "model=ltx" \
  -F "quality=balanced" \
  -F "width=544" \
  -F "height=960" \
  -F "seconds=5"
```

### Example 2 — Wan (Best Quality)
```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap/animate \
  -F "target_image=@/path/to/template.png" \
  -F "face_image=@/path/to/selfie.jpg" \
  -F "prompt=the person walks forward confidently, natural fluid movement, cinematic tracking shot" \
  -F "model=wan" \
  -F "steps=30" \
  -F "cfg=6.0" \
  -F "width=704" \
  -F "height=1280" \
  -F "seconds=5"
```

### Example — JavaScript
```javascript
async function fluxHeadSwapAnimate(targetFile, faceFile, options = {}) {
  const formData = new FormData();
  formData.append('target_image', targetFile);
  formData.append('face_image', faceFile);
  formData.append('prompt', options.prompt || 'the person smiles naturally, cinematic');
  formData.append('model', options.model || 'ltx');
  formData.append('quality', options.quality || 'balanced');
  formData.append('width', options.width || '544');
  formData.append('height', options.height || '960');
  formData.append('seconds', options.seconds || '5');

  const res = await fetch('https://YOUR_POD_ID-7860.proxy.runpod.net/flux/face-swap/animate', {
    method: 'POST',
    body: formData
  });
  const { job_id } = await res.json();

  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const result = await fetch(`https://YOUR_POD_ID-7860.proxy.runpod.net/status/${job_id}`)
      .then(r => r.json());
    console.log(`Status: ${result.status} — ${result.step || ''}`);
    if (result.status === 'completed') return result.url;
    if (result.status === 'failed') throw new Error(result.error);
  }
}

// Usage
const videoUrl = await fluxHeadSwapAnimate(
  document.getElementById('template').files[0],
  document.getElementById('selfie').files[0],
  { prompt: 'the person smiles and turns their head slowly, cinematic', model: 'ltx', quality: 'high' }
);
document.getElementById('video').src = videoUrl;
```

### Response (on submit)
```json
{
  "job_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "queued",
  "model": "flux2-klein-9b+ltx",
  "type": "video",
  "created_at": "2026-03-27T03:00:00+00:00",
  "poll_url": "https://YOUR_POD_ID-7860.proxy.runpod.net/status/a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Response (while processing — shows current step)
```json
{
  "status": "processing",
  "step": "1/2 — FLUX head swap",
  "created_at": "2026-03-27T03:00:00+00:00",
  "started_at": "2026-03-27T03:00:02+00:00"
}
```

### Response (when completed)
```json
{
  "status": "completed",
  "url": "https://YOUR_POD_ID-7860.proxy.runpod.net/video/flux_anim_ltx_3291847561.mp4",
  "filename": "flux_anim_ltx_3291847561.mp4",
  "created_at": "2026-03-27T03:00:00+00:00",
  "started_at": "2026-03-27T03:00:02+00:00",
  "completed_at": "2026-03-27T03:07:30+00:00"
}
```

---

### DELETE /jobs/{job_id}/cancel
Cancel a queued or processing job before it completes.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `job_id` | URL path | string | The job ID to cancel | `abc-123-def-456` |

```bash
curl -X DELETE https://YOUR_POD_ID-7860.proxy.runpod.net/jobs/abc-123-def-456/cancel
```

**Response:**
```json
{ "job_id": "abc-123-def-456", "status": "cancelled" }
```

---

### POST /jobs/{job_id}/retry
Retry a failed or cancelled job using the exact same workflow and parameters.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `job_id` | URL path | string | The failed job ID to retry | `abc-123-def-456` |

```bash
curl -X POST https://YOUR_POD_ID-7860.proxy.runpod.net/jobs/abc-123-def-456/retry
```

**Response:**
```json
{
  "new_job_id": "xyz-789",
  "original_job_id": "abc-123-def-456",
  "status": "queued",
  "poll_url": "https://YOUR_POD_ID-7860.proxy.runpod.net/status/xyz-789"
}
```

---

### DELETE /jobs/{job_id}
Delete a specific job from memory and delete its associated media file from disk.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `job_id` | URL path | string | The job ID to delete | `abc-123-def-456` |

```bash
curl -X DELETE https://YOUR_POD_ID-7860.proxy.runpod.net/jobs/abc-123-def-456
```

**Response:**
```json
{ "job_id": "abc-123-def-456", "deleted": true, "file_deleted": "wan_output_1234.mp4" }
```

---

### DELETE /jobs
Delete all completed jobs from memory and their files from disk. Pass `completed_only=false` to also delete queued and processing jobs.

**Parameters:**

| Parameter | Location | Type | Default | Description | Example |
|---|---|---|---|---|---|
| `completed_only` | Query string | bool | `true` | If `true`, only deletes completed jobs. If `false`, deletes all jobs including active ones. | `false` |

```bash
# Delete only completed jobs (safe)
curl -X DELETE https://YOUR_POD_ID-7860.proxy.runpod.net/jobs

# Delete ALL jobs including active (caution)
curl -X DELETE "https://YOUR_POD_ID-7860.proxy.runpod.net/jobs?completed_only=false"
```

**Response:**
```json
{ "deleted_jobs": 7, "deleted_files": 7 }
```

---

### DELETE /video/{filename}
Delete a specific video file from disk and remove it from the jobs store.

**Parameters:**

| Parameter | Location | Type | Description | Example |
|---|---|---|---|---|
| `filename` | URL path | string | The video filename to delete | `wan_output_3661989987.mp4` |

```bash
curl -X DELETE https://YOUR_POD_ID-7860.proxy.runpod.net/video/wan_output_3661989987.mp4
```

**Response:**
```json
{ "status": "deleted", "filename": "wan_output_3661989987.mp4" }
```

---

## Polling Pattern

### JavaScript (Frontend)
```javascript
async function generateAndWait(endpoint, body) {
  // Step 1: Submit job
  const submitRes = await fetch(`https://YOUR_POD_ID-7860.proxy.runpod.net${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const { job_id } = await submitRes.json();
  console.log('Job submitted:', job_id);

  // Step 2: Poll every 5 seconds
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const statusRes = await fetch(`https://YOUR_POD_ID-7860.proxy.runpod.net/status/${job_id}`);
    const result = await statusRes.json();
    console.log('Status:', result.status);

    if (result.status === 'completed') return result.url;
    if (result.status === 'failed') throw new Error(result.error);
  }
}

// Usage
const url = await generateAndWait('/wan/t2i', {
  prompt: 'A beautiful woman in Paris street, golden hour, photorealistic',
  width: 704,
  height: 1280,
  steps: 35,
  cfg: 4.0
});
console.log('Done! URL:', url);
```

### Python
```python
import requests
import time

BASE_URL = "https://YOUR_POD_ID-7860.proxy.runpod.net"

def generate_and_wait(endpoint, body):
    # Submit job
    res = requests.post(f"{BASE_URL}{endpoint}", json=body)
    job_id = res.json()["job_id"]
    print(f"Job submitted: {job_id}")

    # Poll until done
    while True:
        time.sleep(5)
        status = requests.get(f"{BASE_URL}/status/{job_id}").json()
        print(f"Status: {status['status']}")
        if status["status"] == "completed":
            return status["url"]
        if status["status"] == "failed":
            raise Exception(status["error"])

# Usage
url = generate_and_wait("/wan/t2i", {
    "prompt": "A beautiful woman in Paris street, golden hour, photorealistic",
    "width": 704,
    "height": 1280,
    "steps": 35,
    "cfg": 4.0
})
print(f"Done! URL: {url}")
```

---

## Prompt Writing Guide

### The Formula for Great Results

```
[Subject details] + [Action/Motion] + [Location details] + [Lighting] + [Camera] + [Style/Quality]
```

**Example:**
```
"A young woman with long dark hair [Subject] 
walking slowly forward [Action] 
on a cobblestone Paris street [Location] 
at golden hour with warm sunlight [Lighting] 
smooth cinematic tracking shot [Camera] 
photorealistic, 4K HDR [Quality]"
```

---

### Subject — Be Specific
| ❌ Vague | ✅ Specific |
|---|---|
| `a woman` | `a young Asian woman in her late 20s with long straight black hair` |
| `a man` | `a tall athletic man in his 30s wearing a fitted navy suit` |
| `a model` | `a fashion model with sharp cheekbones and short platinum blonde hair` |

### Action — Describe Motion Clearly
| ❌ Vague | ✅ Specific |
|---|---|
| `walking` | `walking confidently forward with natural fluid movement` |
| `standing` | `standing still, head slowly turning to look at camera` |
| `moving` | `hair gently swaying in the breeze, dress flowing naturally` |

### Lighting — Always Include
| Effect | Prompt Keywords |
|---|---|
| Warm sunset | `golden hour, warm amber light, long shadows` |
| Soft studio | `soft studio lighting, even illumination, no harsh shadows` |
| Dramatic | `dramatic side rim lighting, deep shadows, high contrast` |
| Natural day | `soft natural daylight, overcast diffused light` |
| Night | `neon lights, city glow, bokeh light reflections` |

### Camera — Control the Shot
| Shot Type | Prompt Keywords |
|---|---|
| Follow shot | `smooth cinematic tracking shot` |
| Close-up | `close-up portrait, shallow depth of field` |
| Wide scene | `wide angle cinematic shot, establishing shot` |
| Aerial | `aerial drone shot, bird's eye view` |
| Slow motion | `slow motion, 240fps` |

### Quality Boosters
Always add at least one of these at the end:
- `photorealistic, 4K HDR`
- `ultra realistic, sharp focus, 8K`
- `professional photography, shot on Canon EOS R5`
- `cinematic, Vogue editorial style`

---

## Model Comparison

| Feature | LTX 2.3 T2V | LTX 2.3 I2V | Wan 2.2 T2V | Wan 2.2 T2I | ReActor Face Swap | Face Swap + Animate | **FLUX Head Swap** | **FLUX + Animate** |
|---|---|---|---|---|---|---|---|---|
| **Input** | Text | Image + Text | Text | Text | 2 Images | 2 Images + Text | 2 Images | 2 Images + Text |
| **Output** | MP4 Video | MP4 Video | MP4 Video | PNG Image | PNG Image | MP4 Video | **PNG Image** | **MP4 Video** |
| **Speed** | 20–90 sec | ~45 sec | 3–5 min | 20–40 sec | 5–15 sec | 60–90s / 3–5min | **~3–4 min** | **~5–7 min** |
| **Face fidelity** | N/A | N/A | N/A | N/A | ✅ Good | ✅ Good | **⭐ Highest** | **⭐ Highest** |
| **Best for** | Nature, landscapes | Animating images | Cinematic people | Portraits | Quick swap | Personalized video | **Avatar creation** | **Best personalized video** |
| **Max resolution** | 960×544 | 960×544 | 1280×720 | 1280×704 | Same as template | 960×544 / 1280×704 | Same as template | 960×544 / 1280×704 |
| **Audio** | ✅ Yes | ✅ Yes | ❌ No | ❌ N/A | ❌ N/A | ✅ LTX only | ❌ N/A | ✅ LTX only |
| **License** | Open | Open | Open | Open | Open | Open | **Non-commercial** | **Non-commercial** |
