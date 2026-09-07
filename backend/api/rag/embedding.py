"""
Embedding converter: turns medical text into vector embeddings for LanceDB.
Uses sentence-transformers all-MiniLM-L6-v2 (384-dim).
"""

import logging
import os
import numpy as np
from typing import List, Optional

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
    
    # Get HF_TOKEN from Django settings if available
    hf_token = os.environ.get('HF_TOKEN', '')
    if hf_token:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", use_auth_token=hf_token)
    else:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
except ImportError:
    _model = None
    logger.warning("sentence-transformers not installed; embedding converter disabled.")


def embed_text(text: str) -> Optional[List[float]]:
    """Return a 384-dim embedding for a single text string."""
    if _model is None:
        return None
    vec = _model.encode(text, normalize_embeddings=True)
    return vec.tolist()


def embed_batch(texts: List[str]) -> Optional[List[List[float]]]:
    """Return 384-dim embeddings for a batch of texts."""
    if _model is None:
        return None
    vecs = _model.encode(texts, normalize_embeddings=True)
    return [v.tolist() for v in vecs]


def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Cosine similarity between two vectors (assumes unit-normalised)."""
    return float(np.dot(a, b))