import os
from typing import List, Optional
import numpy as np

try:
    import onnxruntime as ort
    from tokenizers import Tokenizer
    from huggingface_hub import hf_hub_download
    _HAS_ONNX = True
except ImportError:
    ort = None
    Tokenizer = None
    hf_hub_download = None
    _HAS_ONNX = False

from app.config.settings import settings


class EmbeddingService:
    """
    Lightweight CPU Embedding Service powered by ONNX Runtime and Tokenizers.
    Replaces heavy PyTorch + sentence-transformers stack to fit Render Free (512 MiB RAM).

    Model Specifications:
      - Model Name: all-MiniLM-L6-v2 (ONNX Quantized)
      - Model Source: xenova/all-MiniLM-L6-v2
      - Embedding Dimension: 384
      - Tokenizer: Fast Rust-based Tokenizer (tokenizer.json)
      - Pooling: Mean Pooling over non-padded tokens
      - Normalization: L2 normalization
    """

    def __init__(self):
        self.session: Optional[Any] = None
        self.tokenizer: Optional[Any] = None
        self.dim = 384
        self.repo_id = "xenova/all-MiniLM-L6-v2"

    def load(self):
        if not _HAS_ONNX:
            print("[EmbeddingService] ONNX Runtime or tokenizers library not installed.")
            return

        if self.session is not None and self.tokenizer is not None:
            return

        try:
            model_path = hf_hub_download(repo_id=self.repo_id, filename="onnx/model_quantized.onnx")
            tokenizer_path = hf_hub_download(repo_id=self.repo_id, filename="tokenizer.json")

            tokenizer = Tokenizer.from_file(tokenizer_path)
            tokenizer.enable_padding(length=128)
            tokenizer.enable_truncation(max_length=128)
            self.tokenizer = tokenizer

            opts = ort.SessionOptions()
            opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            opts.intra_op_num_threads = 2
            opts.inter_op_num_threads = 1

            self.session = ort.InferenceSession(model_path, opts, providers=["CPUExecutionProvider"])
            print("[EmbeddingService] ONNX MiniLM-L6-v2 model loaded successfully.")
        except Exception as e:
            print(f"[EmbeddingService] Failed to load ONNX model: {e}")
            self.session = None
            self.tokenizer = None

    def available(self) -> bool:
        return self.session is not None and self.tokenizer is not None

    def encode(self, texts: List[str]) -> np.ndarray:
        if not self.available():
            # If model not available, load on the fly if ONNX installed
            self.load()

        if not self.available():
            raise RuntimeError("Embedding model not loaded")

        if not texts:
            return np.empty((0, self.dim), dtype=np.float32)

        # Ensure all items are strings
        clean_texts = [str(t) if t is not None else "" for t in texts]

        # Tokenize batch
        batch_encodings = self.tokenizer.encode_batch(clean_texts)

        input_ids = np.array([e.ids for e in batch_encodings], dtype=np.int64)
        attention_mask = np.array([e.attention_mask for e in batch_encodings], dtype=np.int64)
        token_type_ids = np.array([e.type_ids for e in batch_encodings], dtype=np.int64)

        input_names = [i.name for i in self.session.get_inputs()]
        feed = {}
        if "input_ids" in input_names:
            feed["input_ids"] = input_ids
        if "attention_mask" in input_names:
            feed["attention_mask"] = attention_mask
        if "token_type_ids" in input_names:
            feed["token_type_ids"] = token_type_ids

        outputs = self.session.run(None, feed)
        last_hidden_state = outputs[0]  # (batch_size, seq_len, 384)

        # Mean pooling
        input_mask_expanded = np.expand_dims(attention_mask, -1)
        sum_embeddings = np.sum(last_hidden_state * input_mask_expanded, axis=1)
        sum_mask = np.clip(input_mask_expanded.sum(axis=1), a_min=1e-9, a_max=None)
        embeddings = sum_embeddings / sum_mask

        # L2 normalization
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        embeddings = embeddings / norms

        return embeddings.astype(np.float32)


_svc = EmbeddingService()


def get_embedding_service() -> EmbeddingService:
    return _svc
