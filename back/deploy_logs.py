"""Bounded, redacted deployment output. No shell or interactive execution."""
from __future__ import annotations

import re
import time
from sqlalchemy import func, select

from deploy_options import safe_error
from models import DeploymentLog

STAGES = {
    'queued': 'Задание сохранено. Ожидание worker.',
    'source': 'Получение и проверка исходников.',
    'build': 'Сборка Docker-образа.',
    'database': 'Подготовка базы данных.',
    'container': 'Запуск новой версии в отдельном контейнере.',
    'health': 'Проверка HTTP-готовности новой версии.',
    'publish': 'Переключение маршрута на проверенную версию.',
    'complete': 'Выкладка завершена. Новая версия опубликована.',
}


def redact(message: str, hidden: list[str]) -> str:
    message = re.sub(r'\x1b\[[0-?]*[ -/]*[@-~]', '', message)
    message = safe_error(message, hidden)
    message = re.sub(
        r'(?i)((?:[\w-]*(?:password|secret|token|api[_-]?key)[\w-]*)["\s]*[:=]\s*)("[^"\n]*"|\S+)',
        r'\1[REDACTED]', message,
    )
    return ''.join(c for c in message if c in '\t' or ord(c) >= 32)[:4000]


class DeploymentLogger:
    MAX_LINES = 5000

    def __init__(self, db, attempt_id: int, hidden: list[str]):
        self.db, self.attempt_id, self.hidden = db, attempt_id, hidden
        self.stage = 'source'
        self.count = db.scalar(select(func.count()).select_from(DeploymentLog).where(DeploymentLog.deployment_id == attempt_id)) or 0
        self.buffer = ''
        self.pending = 0
        self.last_flush = time.monotonic()

    def emit(self, message: str, level: str = 'info', *, flush=False):
        if self.count > self.MAX_LINES:
            return
        if self.count == self.MAX_LINES:
            message, level = 'Лимит журнала достигнут. Дальнейший подробный вывод не сохраняется.', 'warning'
        message = redact(str(message), self.hidden)
        if not message.strip():
            return
        self.db.add(DeploymentLog(deployment_id=self.attempt_id, stage=self.stage, level=level, message=message))
        self.count += 1; self.pending += 1
        if flush or self.pending >= 30 or time.monotonic() - self.last_flush >= .5:
            self.flush()

    def write(self, fragment: str):
        # Build streams can split a secret between chunks. Redact complete
        # lines only; never persist unredacted fragments independently.
        self.buffer += str(fragment).replace('\r', '\n')
        while '\n' in self.buffer:
            line, self.buffer = self.buffer.split('\n', 1)
            self.emit(line)
        if len(self.buffer) > 64000:
            self.buffer = ''
            self.emit('Пропущена строка вывода длиннее 64 КБ.', 'warning')

    def flush(self):
        self.db.commit()
        self.pending = 0; self.last_flush = time.monotonic()

    def finish(self):
        if self.buffer:
            self.emit(self.buffer); self.buffer = ''
        self.flush()
