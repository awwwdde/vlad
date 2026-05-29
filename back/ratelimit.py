"""Простой in-memory rate-limit (sliding window) для публичных эндпоинтов.

Не для прода с несколькими инстансами (там нужен redis/мемкэш) — но для одного
панели-инстанса этого достаточно. Защищает от наивного флуда контактной формы.
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

_lock = Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def hit(key: str, *, limit: int, window_sec: float) -> bool:
    """Зарегистрировать обращение. True — пропускаем, False — превышено."""
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        # Сбрасываем устаревшие записи.
        while q and now - q[0] > window_sec:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True
