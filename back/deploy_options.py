"""Deployment contract and path validation, independent of Docker and app config."""
from pathlib import Path, PurePosixPath
import re
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator


class DeployOptions(BaseModel):
    model_config = ConfigDict(extra='forbid')
    git_branch: str = Field(default='', max_length=100)
    context_dir: str = Field(default='.', max_length=250)
    dockerfile: str = Field(default='Dockerfile', max_length=250)
    app_port: int | None = Field(default=None, ge=1, le=65535, strict=True)
    health_path: str = Field(default='/healthz', max_length=250)
    health_timeout: int = Field(default=120, ge=10, le=600, strict=True)
    health_interval: int = Field(default=3, ge=1, le=30, strict=True)
    health_status: int = Field(default=200, ge=200, le=399, strict=True)
    memory_mb: int | None = Field(default=None, ge=128, le=32768, strict=True)
    cpus: float | None = Field(default=None, gt=0, le=16, strict=True)
    pids_limit: int | None = Field(default=None, ge=32, le=4096, strict=True)
    restart_policy: Literal['unless-stopped', 'on-failure', 'no'] = 'unless-stopped'
    start_command: list[str] = Field(default_factory=list, max_length=40)
    no_cache: StrictBool = False
    pull_base_image: StrictBool = False
    database_enabled: StrictBool = True

    @field_validator('git_branch')
    @classmethod
    def branch(cls, value: str) -> str:
        if value and (not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._/-]*', value) or any(x in value for x in ('..', '//', '/.')) or value.endswith(('.', '/', '.lock'))):
            raise ValueError('Укажите имя ветки без пробелов и служебных символов')
        return value

    @field_validator('context_dir', 'dockerfile')
    @classmethod
    def relative_path(cls, value: str) -> str:
        if not value or '\\' in value or ':' in value or any(ord(c) < 32 for c in value):
            raise ValueError('Используйте относительный путь с /')
        path = PurePosixPath(value)
        if path.is_absolute() or '..' in path.parts:
            raise ValueError('Путь должен оставаться внутри исходников')
        return str(path)

    @field_validator('health_path')
    @classmethod
    def health_url(cls, value: str) -> str:
        if not re.fullmatch(r'/[A-Za-z0-9/_?.=&%~-]*', value) or value.startswith('//'):
            raise ValueError('Укажите локальный HTTP-путь, например /healthz')
        return value

    @field_validator('start_command')
    @classmethod
    def command(cls, value: list[str]) -> list[str]:
        if any(not part or len(part) > 1000 or '\x00' in part for part in value):
            raise ValueError('Команда — непустые аргументы, до 1000 символов каждый')
        return value


def build_paths(root: Path, options: DeployOptions) -> tuple[Path, Path]:
    root = root.resolve()
    context = (root / options.context_dir).resolve()
    dockerfile = (context / options.dockerfile).resolve()
    if not context.is_relative_to(root) or not dockerfile.is_relative_to(context):
        raise ValueError('Контекст и Dockerfile должны оставаться внутри исходников, включая ссылки')
    return context, dockerfile


def safe_error(message: str, secrets: list[str]) -> str:
    for value in sorted(set(secrets), key=len, reverse=True):
        if len(value) >= 4:
            message = message.replace(value, '[скрыто]')
    message = re.sub(r'(https?://|ssh://)[^\s/@]+@', r'\1[скрыто]@', message)
    message = re.sub(r'(?i)([?&](?:access_token|token|password|secret|api_key)=)[^\s&]+', r'\1[скрыто]', message)
    return message[:6000]
