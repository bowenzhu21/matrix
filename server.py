"""
DeepSeek-R1-Distill-Qwen-32B on Modal via vLLM (OpenAI-compatible API).

Usage:
  # 1) Optional one-time pre-download into Modal Volume
  modal run server.py::download_model

  # 2) Start ephemeral dev endpoint (stops with Ctrl+C)
  modal serve server.py

  # 3) Deploy persistent endpoint
  modal deploy server.py

  # 4) Smoke test deployed endpoint
  DEEPSEEK_SMOKE_TEST_URL="https://<your-endpoint>/v1/chat/completions" modal run server.py
"""

from __future__ import annotations

import json
import os
import shutil
import time

import modal

APP_NAME = os.getenv("MODAL_APP_NAME", "deepseek-r1-32b")
MODEL_ID = os.getenv("DEEPSEEK_MODEL_ID", "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B")
SERVED_MODEL_NAME = os.getenv("DEEPSEEK_SERVED_MODEL_NAME", "deepseek-r1")
MODEL_DIR = os.getenv("DEEPSEEK_MODEL_DIR", "/model")
VOLUME_NAME = os.getenv("DEEPSEEK_VOLUME_NAME", "deepseek-r1-32b-weights")
VLLM_PORT = int(os.getenv("VLLM_PORT", "8000"))
DEFAULT_SMOKE_TEST_URL = os.getenv("DEEPSEEK_SMOKE_TEST_URL", "")

# Runtime knobs (can be overridden with env vars at deploy time).
# Reduce defaults for initial testing to avoid large GPU requests.
GPU_CONFIG = os.getenv("DEEPSEEK_GPU", "A100-80GB:2")
TENSOR_PARALLEL_SIZE = int(os.getenv("DEEPSEEK_TP", "2"))
MAX_MODEL_LEN = int(os.getenv("DEEPSEEK_MAX_MODEL_LEN", "32768"))
GPU_MEMORY_UTILIZATION = os.getenv("DEEPSEEK_GPU_MEMORY_UTIL", "0.92")
WEB_STARTUP_TIMEOUT_SEC = int(os.getenv("DEEPSEEK_WEB_STARTUP_TIMEOUT_SEC", "1800"))
MODEL_MARKER_FILE = os.path.join(MODEL_DIR, ".model_repo_id")
FORCE_MODEL_DOWNLOAD = os.getenv("DEEPSEEK_FORCE_MODEL_DOWNLOAD", "").strip().lower() in {
    "1",
    "true",
    "yes",
}

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.0-devel-ubuntu22.04", add_python="3.12"
    )
    .entrypoint([])
    .pip_install(
        "vllm==0.8.5",
        "huggingface-hub==0.30.2",
        "hf-transfer>=0.1.8",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

app = modal.App(APP_NAME)
volume = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)

# Optional Modal secret containing a Hugging Face token mapped to env key HF_HUB_TOKEN
# Create with: `modal secret create hf --env HF_HUB_TOKEN=<YOUR_TOKEN>`
HF_SECRET = modal.Secret.from_name("hf")


def _model_exists() -> bool:
    # vLLM expects config + tokenizer files to exist in the model directory.
    required = [
        os.path.join(MODEL_DIR, "config.json"),
        os.path.join(MODEL_DIR, "tokenizer.json"),
    ]
    return all(os.path.exists(path) for path in required)


def _read_model_marker() -> str:
    try:
        return open(MODEL_MARKER_FILE, "r", encoding="utf-8").read().strip()
    except OSError:
        return ""


def _write_model_marker(model_id: str) -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_MARKER_FILE, "w", encoding="utf-8") as f:
        f.write(model_id.strip())
        f.write("\n")


def _looks_like_expected_model(config_path: str) -> bool:
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
    except (OSError, json.JSONDecodeError):
        return False

    hint = str(config.get("_name_or_path", "")).strip().lower()
    expected = MODEL_ID.strip().lower()
    if hint and (hint in expected or expected in hint):
        return True

    expected_leaf = expected.split("/")[-1]
    return bool(hint and expected_leaf and expected_leaf in hint)


def _model_matches_expected() -> bool:
    marker = _read_model_marker()
    if marker:
        return marker == MODEL_ID

    config_path = os.path.join(MODEL_DIR, "config.json")
    return _looks_like_expected_model(config_path)


def _wipe_model_dir() -> None:
    if not os.path.isdir(MODEL_DIR):
        os.makedirs(MODEL_DIR, exist_ok=True)
        return

    for entry in os.listdir(MODEL_DIR):
        path = os.path.join(MODEL_DIR, entry)
        try:
            if os.path.isdir(path) and not os.path.islink(path):
                shutil.rmtree(path)
            else:
                os.unlink(path)
        except OSError:
            # Skip stubborn leftovers; snapshot_download will refill required files.
            pass


def _download_model(force: bool = False) -> None:
    from huggingface_hub import snapshot_download

    if force:
        print(f"Refreshing model files under {MODEL_DIR} for {MODEL_ID}...")
        _wipe_model_dir()
    else:
        print(f"Model files missing under {MODEL_DIR}. Downloading {MODEL_ID}...")

    snapshot_download(
        repo_id=MODEL_ID,
        local_dir=MODEL_DIR,
    )
    _write_model_marker(MODEL_ID)
    volume.commit()
    print("Model download complete.")


def _download_model_if_needed() -> None:
    if FORCE_MODEL_DOWNLOAD:
        print("DEEPSEEK_FORCE_MODEL_DOWNLOAD is set; forcing fresh model download.")
        _download_model(force=True)
        return

    if not _model_exists():
        _download_model(force=False)
        return

    if not _model_matches_expected():
        marker = _read_model_marker() or "(missing)"
        print(
            "Model volume contents do not match expected repo. "
            f"marker={marker}, expected={MODEL_ID}. Re-downloading."
        )
        _download_model(force=True)
        return


@app.function(
    image=image,
    volumes={MODEL_DIR: volume},
    secrets=[HF_SECRET],
    timeout=60 * 60 * 2,
    cpu=8,
    memory=32768,
)
def download_model() -> None:
    """One-time pre-download of model weights into the Modal volume."""
    _download_model_if_needed()


@app.function(
    image=image,
    gpu=GPU_CONFIG,
    volumes={MODEL_DIR: volume},
    secrets=[HF_SECRET],
    timeout=60 * 60 * 24,
    scaledown_window=300,
)
@modal.web_server(port=VLLM_PORT, startup_timeout=WEB_STARTUP_TIMEOUT_SEC)
def openai_server() -> None:
    """Starts vLLM OpenAI server inside container and exposes it over Modal web endpoint."""
    import subprocess

    _download_model_if_needed()

    print(
        "Runtime config:",
        {
            "model_id": MODEL_ID,
            "served_model_name": SERVED_MODEL_NAME,
            "max_model_len": MAX_MODEL_LEN,
            "tensor_parallel_size": TENSOR_PARALLEL_SIZE,
            "gpu": GPU_CONFIG,
            "volume_name": VOLUME_NAME,
        },
    )

    cmd = [
        "vllm",
        "serve",
        MODEL_DIR,
        "--served-model-name",
        SERVED_MODEL_NAME,
        "--tensor-parallel-size",
        str(TENSOR_PARALLEL_SIZE),
        "--host",
        "0.0.0.0",
        "--port",
        str(VLLM_PORT),
        "--max-model-len",
        str(MAX_MODEL_LEN),
        "--gpu-memory-utilization",
        str(GPU_MEMORY_UTILIZATION),
        "--enforce-eager",
        "--trust-remote-code",
    ]

    print("Launching vLLM:", " ".join(cmd))
    proc = subprocess.Popen(cmd)

    # Fail fast with a clear error if vLLM crashes immediately.
    time.sleep(8)
    exit_code = proc.poll()
    if exit_code is not None:
        raise RuntimeError(f"vLLM process exited during startup with code {exit_code}")


@app.local_entrypoint()
def main(url: str = "") -> None:
    """Smoke test a deployed endpoint URL."""
    import json
    import urllib.request

    endpoint = url or DEFAULT_SMOKE_TEST_URL
    if not endpoint:
        raise RuntimeError(
            "Provide endpoint via: modal run server.py --url https://<endpoint>/v1/chat/completions "
            "or set DEEPSEEK_SMOKE_TEST_URL in your environment."
        )

    body = json.dumps(
        {
            "model": SERVED_MODEL_NAME,
            "messages": [{"role": "user", "content": "Say OK"}],
            "max_tokens": 32,
            "temperature": 0,
        }
    ).encode()

    req = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json"},
    )

    with urllib.request.urlopen(req, timeout=120) as resp:
        payload = json.loads(resp.read())

    message = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    print("Smoke test response:")
    print(message)
