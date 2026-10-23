"""Read-only readiness probes. Never start containers or change source files."""
from datetime import datetime, timezone
from pathlib import Path
import os
import shutil
import subprocess

import docker
import caddy
from config import settings
from models import ServiceHeartbeat


def now():
    return datetime.now(timezone.utc)


def heartbeat(db):
    db.merge(ServiceHeartbeat(name='deploy_worker', seen_at=now()))
    db.commit()


def inspect_server(db):
    checks = []
    def add(key, label, status, message):
        checks.append(dict(key=key, label=label, status=status, message=message))
    try:
        probe = docker.from_env(timeout=3)
        try: probe.ping()
        finally: probe.close()
        add('docker', 'Docker', 'ok', 'Docker API доступен из панели.')
    except Exception:
        add('docker', 'Docker', 'error', 'Docker API недоступен. Проверьте Docker Engine и доступ панели к docker.sock.')
    try:
        stamp = db.get(ServiceHeartbeat, 'deploy_worker')
        seen = stamp.seen_at if stamp else None
        if seen and seen.tzinfo is None: seen = seen.replace(tzinfo=timezone.utc)
        age = (now() - seen).total_seconds() if seen else None
        if age is not None and 0 <= age <= 45:
            add('worker', 'Worker', 'ok', f'Процесс worker передал heartbeat {int(age)} с назад. Это проверка процесса, не прогресса конкретной сборки.')
        else:
            add('worker', 'Worker', 'error', 'Нет свежего heartbeat worker. Запустите обновлённый deploy_worker с той же БД и ключом шифрования; после запуска подождите до 10 секунд.')
    except Exception:
        db.rollback()
        add('worker', 'Worker', 'error', 'Не удалось прочитать heartbeat. Проверьте обновление схемы БД и соединение панели с БД.')
    try:
        available = caddy.ping()
    except Exception:
        available = False
    add('caddy', 'Caddy', 'ok' if available else 'error',
        'Admin API Caddy доступен.' if available else 'Caddy недоступен из панели. Публикация сайта не подтверждена; проверьте Admin API и сеть.')
    try:
        root = Path(settings.workspaces_dir).resolve()
        while not root.exists() and root.parent != root: root = root.parent
        usage = shutil.disk_usage(root)
        free_gb = usage.free / 1024**3
        status = 'error' if free_gb < 1 else 'warning' if free_gb < 5 else 'ok'
        add('disk', 'Диск исходников', status, f'Свободно {free_gb:.1f} ГБ на файловой системе workspaces. Это не проверка места в хранилище Docker-образов.')
        writable = os.access(root, os.W_OK)
        add('workspace', 'Каталог исходников', 'ok' if writable else 'error',
            'Права на запись доступны по проверке ОС; тестовый файл не создавался.' if writable else 'Нет прав на запись в каталог исходников.')
    except Exception:
        add('disk', 'Диск исходников', 'error', 'Не удалось проверить место и доступ к каталогу исходников.')
    return {'at': now(), 'can_deploy': not any(c['status'] == 'error' for c in checks), 'checks': checks}


def inspect_git(source, branch):
    if not source or not (source.startswith(('http://', 'https://', 'git@', 'ssh://')) or source.endswith('.git')):
        return None
    if source.startswith('-') or any(ord(c) < 32 for c in source):
        return dict(key='git', label='Git', status='error', message='Некорректный источник Git.')
    env = {**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GIT_SSH_COMMAND': 'ssh -oBatchMode=yes -oConnectTimeout=5 -oStrictHostKeyChecking=yes'}
    try:
        subprocess.run(['git', 'ls-remote', '--exit-code', source, f'refs/heads/{branch}' if branch else 'HEAD'],
            env=env, capture_output=True, timeout=12, check=True)
        return dict(key='git', label='Git', status='ok', message='Выбранная ветка доступна из HTTP-панели. Worker должен иметь те же Git/SSH credentials; код не скачивался.')
    except Exception:
        return dict(key='git', label='Git', status='error', message='Не удалось прочитать выбранную ветку за 12 секунд. Проверьте URL, имя ветки и Git/SSH-доступ сервера. Секреты и вывод команды не возвращаются.')
