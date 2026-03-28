# RunPod Setup Guide — AI Video & Image Generation API

## Overview

This guide covers deploying the AI generation API on RunPod with full support for:
- **LTX 2.3** — Text-to-video, image-to-video (with audio)
- **Wan 2.2** — Text-to-video, image-to-video
- **FLUX.2 Klein 9B** — AI head/face swap
- **JuggernautXL** — Text-to-image, image-to-image, inpainting
- **ReActor (art-venture)** — Face swap + animation chains
- **Ollama** — Local prompt enhancement (llama3.2:3b)

**Total model size:** ~90GB | **Recommended volume:** 150GB+

---

## Prerequisites

1. A [RunPod](https://runpod.io) account with GPU credits
2. SSH key added to RunPod (Settings > SSH Keys)
3. The `cyrusjaysondev/ai-gen-api` GitHub repo with updated `setup.sh` and `api/main.py`

---

## Step 1: Create a New Pod

1. Go to **RunPod Dashboard** > **Pods** > **+ Deploy**
2. **Select GPU:** RTX 5090 (32GB) recommended — $0.90/hr
3. **Select Template:** Use the ComfyUI + LTX 2.3 template:
   - Image: `docker.io/bookease23/comfyui-ltx2-gpu-lat...`
   - Or search for "LTX" in the template list

---

## Step 2: Configure Template Settings

Under **Edit Template** or **Environment Variables**, set:

| Variable | Value |
|----------|-------|
| `download_ltx_23_22b_dev_fp8_29gb` | `true` |
| `SETUP_SCRIPT_URL` | `https://raw.githubusercontent.com/cyrusjaysondev/ai-gen-api/main/setup.sh` |

---

## Step 3: Configure Volume & Ports

**Volume:**
- Create a **new volume** with at least **150GB**
- Mount path: `/workspace`

**Exposed Ports** (should be pre-configured by template):

| Port | Service |
|------|---------|
| 7860 | API (FastAPI/Uvicorn) |
| 8188 | ComfyUI |
| 8888 | Jupyter Notebook |

---

## Step 4: Deploy

Click **Deploy**. The pod will:

1. Start the container and download LTX 2.3 checkpoint (~29GB, from template)
2. Run `setup.sh` which downloads all additional models and installs custom nodes
3. Start ComfyUI on port 8188
4. Start the API on port 7860

**First-time setup takes 15-30 minutes** (downloading ~90GB of models). Subsequent restarts are fast since models persist on the volume.

---

## Step 5: Monitor Setup Progress

### Option A: Jupyter Terminal (recommended — no disconnects)
1. Open `https://YOUR_POD_ID-8888.proxy.runpod.net`
2. Open a Terminal (New > Terminal)
3. Run: `tail -f /workspace/api_setup.log`

### Option B: SSH
```bash
ssh YOUR_POD_ID-XXXXX@ssh.runpod.io -i ~/.ssh/id_ed25519 -o ServerAliveInterval=10
tail -f /workspace/api_setup.log
```

You should see steps `[1/15]` through `[15/15]` completing.

---

## Step 6: Verify Everything Works

### Check services are running:
```bash
# API health
curl http://localhost:7860/health
# Expected: {"status":"ok"}

# ComfyUI
curl -s http://localhost:8188/system_stats | head -5

# Ollama
OLLAMA_MODELS=/workspace/ollama_models ollama list
# Expected: llama3.2:3b

# Model count
find /workspace/ComfyUI/models -name "*.safetensors" -o -name "*.onnx" -o -name "*.pth" | wc -l
# Expected: 24+
```

### Public URLs:
```
API Docs:  https://YOUR_POD_ID-7860.proxy.runpod.net/docs
Health:    https://YOUR_POD_ID-7860.proxy.runpod.net/health
ComfyUI:   https://YOUR_POD_ID-8188.proxy.runpod.net
```

---

## Troubleshooting

### API not starting (port 7860 stuck on "Initializing")

**Check the log:**
```bash
tail -20 /workspace/api.log
```

**Common errors:**

| Error | Fix |
|-------|-----|
| `Attribute "app" not found in module "main"` | Wrong working directory. Run: `cd /workspace/api && nohup /opt/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 7860 >> /workspace/api.log 2>&1 & disown` |
| `address already in use` | Kill old process: `pkill -f uvicorn; sleep 1` then restart |
| `Failed to download main.py` | Network issue. Manual download: `wget -O /workspace/api/main.py "https://raw.githubusercontent.com/cyrusjaysondev/ai-gen-api/main/api/main.py"` |
| `No module named 'fastapi'` | Reinstall deps: `/opt/venv/bin/pip install fastapi uvicorn httpx websockets python-multipart` |

### CUDA errors

```bash
# Check GPU is visible
nvidia-smi

# Check PyTorch can see GPU
/opt/venv/bin/python -c "import torch; torch.cuda.init(); print('OK:', torch.cuda.get_device_name(0))"

# If /dev/nvidia0 is missing (migration issue)
ls /dev/nvidia*
# If you see /dev/nvidia2 but no /dev/nvidia0, contact RunPod support
```

### SSH keeps disconnecting

Use Jupyter terminal instead (port 8888). Or add keep-alive:
```bash
ssh YOUR_POD_ID@ssh.runpod.io -i ~/.ssh/id_ed25519 -o ServerAliveInterval=10 -o ServerAliveCountMax=5
```

### Pod keeps restarting

Check if `setup.sh` has `exit 1` on failed download:
```bash
grep "exit 1" /workspace/setup.sh
```
If found, remove it:
```bash
sed -i 's/exit 1/log "Skipping, will retry"/' /workspace/setup.sh
```

---

## Manual Startup (if auto-start fails)

Run from **Jupyter terminal** (won't die on disconnect):

```bash
# 1. Kill any existing processes
pkill -f uvicorn
pkill -f "ComfyUI/main.py"

# 2. Install pip deps (lost on restart)
/opt/venv/bin/pip install -q fastapi uvicorn httpx websockets python-multipart
/opt/venv/bin/pip install -q insightface onnx onnxruntime-gpu opencv-python gguf segment-anything
/opt/venv/bin/pip install -q "numpy>=2.0.0,<3"

# 3. Start ComfyUI
cd /workspace/ComfyUI && nohup /opt/venv/bin/python main.py --listen --port 8188 >> /workspace/comfyui.log 2>&1 & disown

# 4. Wait for ComfyUI to be ready
until curl -s http://localhost:8188/system_stats > /dev/null 2>&1; do sleep 3; echo "waiting..."; done
echo "ComfyUI ready!"

# 5. Start Ollama
apt-get install -y -qq zstd && curl -fsSL https://ollama.com/install.sh | sh
export OLLAMA_MODELS=/workspace/ollama_models
ollama serve & sleep 5 && ollama pull llama3.2:3b

# 6. Update pod ID in main.py
sed -i "s|RUNPOD_POD_ID_PLACEHOLDER|$RUNPOD_POD_ID|g" /workspace/api/main.py
sed -i "s|t6pgge1y1kl2qt|$RUNPOD_POD_ID|g" /workspace/api/main.py
sed -i "s|8mj50saxmbkhdz|$RUNPOD_POD_ID|g" /workspace/api/main.py

# 7. Start API
cd /workspace/api && nohup /opt/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 7860 >> /workspace/api.log 2>&1 & disown

# 8. Verify
sleep 2 && curl http://localhost:7860/health
```

---

## What the Setup Script Downloads

### Models (~90GB total)

| Model | Size | Path | Used By |
|-------|------|------|---------|
| ltx-2.3-22b-dev-fp8 | 29GB | checkpoints/ | Template (auto) |
| ltx-2.3-22b-distilled-lora | — | loras/ | Template (auto) |
| gemma_3_12B_it_fp4_mixed | 8.8GB | text_encoders/ | LTX workflows |
| wan2.2_ti2v_5B_fp16 | 9.3GB | diffusion_models/ | Wan video |
| wan2.2_vae | 1.3GB | vae/ | Wan video |
| umt5-xxl-enc-bf16 | 10.6GB | text_encoders/ | Wan video |
| flux2-klein-9b | 18GB | diffusion_models/ | FLUX head swap |
| flux2-vae | 336MB | vae/ | FLUX head swap |
| qwen_3_8b_fp8mixed | 8.7GB | text_encoders/ | FLUX head swap |
| bfs_head_v1 LoRA | 663MB | loras/ | FLUX head swap |
| bfs-face-swap LoRA | 331MB | loras/ | FLUX face swap |
| juggernautXL_v9Rdphoto2Lightning | 7.1GB | checkpoints/ | t2i, i2i, inpaint, head-swap |
| inswapper_128.onnx | 500MB | insightface/ | Face swap |
| hyperswap 1a/1b/1c | ~200MB ea | hyperswap/ | Face swap (alt models) |
| GFPGANv1.4.pth | 300MB | facerestore_models/ | Face restoration |
| detection_Resnet50_Final.pth | — | facedetection/ | Face detection |
| parsing_parsenet.pth | — | facedetection/ | Face parsing |
| sam_vit_b_01ec64.pth | 375MB | sams/ | Inpaint auto-mask |

### Custom Nodes

| Node | Purpose |
|------|---------|
| ComfyUI-WanVideoWrapper | Wan 2.2 video generation |
| comfyui-art-venture | ReActorFaceSwap node |
| ComfyUI-Impact-Pack | SAMLoader, inpaint segmentation |
| ComfyUI-CLIPSeg | Auto-mask detection (hair, face, etc.) |
| ComfyUI-VideoHelperSuite | VHS_VideoCombine for Wan output |
| ComfyUI-LTXVideo | LTX audio/video nodes |
| LanPaint | FLUX head swap (LanPaint_KSampler, ReferenceLatent) |

### Pip Packages (reinstalled on every restart)

```
fastapi, uvicorn, httpx, websockets, python-multipart
insightface, onnx, onnxruntime-gpu, opencv-python, gguf
segment-anything, numpy>=2.0
```

---

## Scaling (Multiple Pods)

To deploy additional pods:

1. Repeat Steps 1-4 with the same template settings
2. Each pod auto-configures via `$RUNPOD_POD_ID` — URLs are replaced automatically
3. First pod takes 15-30min (model downloads). Subsequent pods with the **same volume** start in 2-3 minutes
4. For independent pods (separate volumes), each needs to download models (~15-30 min)

---

## API Endpoints Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/t2v` | POST | Text to video (LTX 2.3) |
| `/i2v/upload` | POST | Image to video (LTX 2.3) |
| `/wan/t2v` | POST | Text to video (Wan 2.2) |
| `/wan/t2i` | POST | Text to image (JuggernautXL) |
| `/i2i` | POST | Image to image (JuggernautXL) |
| `/inpaint` | POST | Inpainting with optional auto-mask |
| `/face-swap` | POST | Face swap (ReActor) |
| `/face-swap/animate` | POST | Face swap + animate (LTX/Wan) |
| `/head-swap` | POST | Head swap + SDXL refinement |
| `/flux/face-swap` | POST | AI head swap (FLUX Klein 9B) |
| `/flux/face-swap/animate` | POST | FLUX head swap + animate |
| `/status/{job_id}` | GET | Check job status |
| `/jobs` | GET | List all jobs |
| `/queue` | GET | List active jobs |
| `/videos` | GET | List generated videos |
| `/video/{filename}` | GET | Download video |
| `/image/{filename}` | GET | Download image |
| `/jobs/{job_id}` | DELETE | Delete job + file |
| `/jobs/{job_id}/cancel` | DELETE | Cancel running job |
| `/jobs/{job_id}/retry` | POST | Retry failed job |

Full interactive docs at: `https://YOUR_POD_ID-7860.proxy.runpod.net/docs`
