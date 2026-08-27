# Career For Me — Python AI Microservice (Render Free CPU-Optimized)

This FastAPI microservice powers the deterministic machine learning and semantic recommendation engine for Career For Me. It is engineered specifically for low-memory CPU cloud environments like **Render Free Plan (512 MiB RAM limit)**.

---

## 1. AI Architecture

```
                       ┌─────────────────────────┐
                       │     Next.js Frontend    │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │     Express Gateway     │
                       └────────────┬────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
      ┌───────────────────────┐           ┌───────────────────────┐
      │   Python AI Service   │           │    Google Gemini API  │
      │   (Deterministic ML)  │           │   (NL Generation &    │
      └───────────┬───────────┘           │     Enrichment)       │
                  │                       └───────────────────────┘
      ┌───────────┴───────────┐
      ▼                       ▼
┌──────────────┐     ┌─────────────────┐
│ ONNX Runtime │     │ Career Dataset  │
│  (MiniLM CPU)│     │ & Precomputed   │
└──────┬───────┘     │ Embeddings      │
       │             └─────────────────┘
       ▼
┌────────────────────────────────┐
│  6-Factor Recommendation Model │
└────────────────────────────────┘
```

---

## 2. Embedding Model

- **Model Name:** `all-MiniLM-L6-v2` (Quantized ONNX Format)
- **Model Source:** `xenova/all-MiniLM-L6-v2` via Hugging Face Hub
- **Embedding Dimension:** 384 dimensions
- **Tokenizer:** Fast Rust-based Hugging Face Tokenizer (`tokenizer.json`)
- **Inference Engine:** ONNX Runtime (`onnxruntime` CPUExecutionProvider)
- **Pooling Method:** Mean pooling across non-padded tokens
- **Normalization Method:** Row-wise L2 vector normalization ($\|v\|_2 = 1.0$)

---

## 3. Why PyTorch & Sentence-Transformers Were Removed

- **Memory Overhead:** PyTorch (`torch`), CUDA libraries (`nvidia-*`), and `sentence-transformers` loaded GPU symbols and dynamic C++ runtimes that consumed over **1.2 GB of RAM** at startup.
- **Render Free Limit:** Render Free web service instances strictly enforce a **512 MiB RAM** ceiling. Exceeding this triggers an OS `Out of memory (used over 512Mi)` process termination.
- **CPU Inference Suitability:** For 384-dimensional sentence embeddings on lightweight text payloads, ONNX Runtime CPU inference runs in **~10 ms** with peak RAM usage of **~45 MB**, making PyTorch/CUDA completely redundant.

---

## 4. Why ONNX Runtime Was Selected

1. **Ultra-Low Memory:** Total runtime footprint is ~30–45 MB RAM vs >1.2 GB for PyTorch.
2. **Zero CUDA Dependencies:** Completely eliminates `torch`, `torchvision`, `triton`, and `nvidia-cuda-*` packages.
3. **Identical Semantic Quality:** Runs the exact same `all-MiniLM-L6-v2` transformer weights in INT8 ONNX quantized format with negligible accuracy loss.
4. **Instant Startup:** Combined with precomputed `.npz` career embeddings, service startup takes **< 1 second**.

---

## 5. Recommendation Formula

The Python AI service remains strictly deterministic. Gemini does **NOT** calculate or override numerical match scores.

$$\text{Final Score} = 0.40 \cdot \text{SkillMatch} + 0.20 \cdot \text{InterestMatch} + 0.15 \cdot \text{GoalMatch} + 0.10 \cdot \text{ExperienceMatch} + 0.05 \cdot \text{EducationMatch} + 0.10 \cdot \text{SemanticMatch}$$

---

## 6. Dataset

Located in `app/data/`:
- `career.csv`
- `careers.json`
- `careers/technical/*.json`
- `careers/occupational/*.json`
- `career_embeddings.npz` (Precomputed 384-dim normalized vectors)

---

## 7. API Endpoints

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Lightweight service health probe (`{"status": "ok"}`) |
| `GET` | `/ready` | Readiness check reporting model and dataset load status |
| `POST` | `/recommend` | Executes 6-factor hybrid match scoring for user profile |
| `POST` | `/embeddings/search` | Performs vector cosine similarity search |
| `POST` | `/roadmap/generate` | Resolves target career and generates milestone phase structure |
| `POST` | `/learning-path/generate` | Generates personalized course & project sequence |
| `POST` | `/courses/{id}/complete` | Updates course progress and recalibrates path |
| `POST` | `/projects/{id}/complete` | Updates project progress and recalibrates path |
| `POST` | `/assessments/{id}/submit`| Evaluates assessment results and updates skill proficiencies |

---

## 8. Environment Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `8000` | Dynamic HTTP port (assigned by Render in production) |
| `AI_SERVICE_PORT` | `8000` | Fallback port if `PORT` is unset |
| `AI_MOCK_MODE` | `false` | Enable mock responses for testing without model loads |
| `GEMINI_API_KEY` | `""` | Gemini API Key for NL generation (used by Express backend) |

---

## 9. 🛠️ Complete AI Microservice Setup Guide

Follow these step-by-step instructions to configure, run, and verify the Python FastAPI AI Microservice locally.

---

### 📋 Prerequisites

* **Python**: `v3.10.x` or `v3.11.x` (`3.11.9` recommended)
* **pip**: `v23.x+`

---

### 1️⃣ Virtual Environment Setup

Navigate to the `ai-service/` directory and create a Python virtual environment:

```bash
cd ai-service

# Create virtual environment named .venv
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.venv\Scripts\Activate.ps1

# Windows (Command Prompt):
.venv\Scripts\activate.bat

# Linux / macOS (Bash / Zsh):
source .venv/bin/activate
```

---

### 2️⃣ Install Dependencies

Install the lightweight, CPU-optimized dependencies (ONNX Runtime, FastAPI, Uvicorn, NumPy):

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### 3️⃣ Environment Variables Configuration

Create a `.env` file in the `ai-service/` directory based on `.env.example`:

```bash
cp .env.example .env
```

Configure your `.env` variables:

```ini
AI_SERVICE_PORT=8000
NODE_BACKEND_URL=http://localhost:5000
AI_MOCK_MODE=false
EMBEDDING_MODEL=all-MiniLM-L6-v2
AI_SERVICE_TIMEOUT=30000

# Optional Google Gemini API Key for direct AI calls
GEMINI_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.0
```

---

### 4️⃣ Precompute Vector Embeddings (Optional)

Precompute 384-dimensional dense career vector embeddings into `app/data/career_embeddings.npz`:

```bash
python scripts/precompute_embeddings.py
```

---

### 5️⃣ Run FastAPI Server

Start the FastAPI application server with auto-reload:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

* The microservice will run on `http://localhost:8000`.
* Interactive OpenAPI/Swagger documentation is available at: `http://localhost:8000/docs`
* Health probe endpoint: `http://localhost:8000/health`

---

### 🧪 Automated Testing

Run the pytest test suite for career recommendations, roadmap graph generation, and ONNX embeddings:

```bash
pytest
```

---

## 10. Render Deployment Configuration

- **Service Type:** Web Service
- **Root Directory:** `ai-service`
- **Environment:** `Python`
- **Python Version:** Specified via `.python-version` (`3.11.9`)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Plan:** Free (512 MiB RAM)

---

## 11. Memory Optimization Decisions

1. **Zero PyTorch/CUDA:** Saved ~1.1 GB RAM.
2. **NumPy Cosine Search:** Replaced FAISS to save C++ vector index heap allocations.
3. **Precomputed `.npz` Embeddings:** Saved startup embedding computation time and peak memory spikes.
4. **Lazy/Singleton Model Loading:** Model loaded once during startup and shared across all request threads.
5. **Thread Allocation:** Restricted ONNX Runtime to 2 intra-op threads (`intra_op_num_threads = 2`) to avoid CPU starvation.

---

## 12. Known Limitations

- **Model Download on First Start:** If `app/data/career_embeddings.npz` is deleted, ONNX Runtime will fetch `xenova/all-MiniLM-L6-v2` (`~23 MB`) from Hugging Face Hub on first startup.
- **Local Memory Limit:** Designed specifically for <= 512 MB environments; batch encoding size is constrained to max 128 tokens per text.
