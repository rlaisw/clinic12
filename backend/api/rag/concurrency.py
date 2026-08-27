"""
Concurrency helpers for the Clinic RAG System.
Throttles concurrent queries to avoid overloading the embedding model.
"""

import time
import threading
from typing import Optional


class RateLimiter:
    """Simple token-bucket rate limiter."""

    def __init__(self, max_per_second: float = 10.0):
        self._max_rate = max_per_second
        self._tokens = max_per_second
        self._last_refill = time.monotonic()
        self._lock = threading.Lock()

    def acquire(self, tokens: float = 1.0) -> float:
        """Block until *tokens* are available; returns wait time in seconds."""
        with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_refill
            self._tokens = min(self._max_rate, self._tokens + elapsed * self._max_rate)
            self._last_refill = now

            deficit = tokens - self._tokens
            if deficit > 0:
                wait = deficit / self._max_rate
                time.sleep(wait)
                self._tokens = 0.0
            else:
                self._tokens -= tokens
                wait = 0.0
        return wait


rag_rate_limiter = RateLimiter(max_per_second=10.0)