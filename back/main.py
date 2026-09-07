"""FastAPI-приложение панели awwwdde.

Здесь только сборка приложения: middleware, жизненный цикл и подключение
роутеров. Сами эндпоинты живут в пакете `api/`, по файлу на предметную
область - список с описаниями смотрите в /docs, он собирается из кода и
поэтому не устаревает.

Авторизация: Bearer в заголовке Authorization - либо JWT из /api/auth/login,
либо API_TOKEN из .env для CLI.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import metrics_collector
import uploads
from api import ROUTERS
from bootstrap import bootstrap
from config import settings

DESCRIPTION = """
Панель управления платформой: гостевые стенды в контейнерах, их домены,
секреты и нагрузка, плюс контент публичного сайта.

Разделы соответствуют файлам в `back/api/`.
""".strip()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Старт и остановка панели.

    Прежний `@app.on_event("startup")` удалён из Starlette и на актуальных
    версиях приложение с ним просто не поднимается. Заодно lifespan даёт то,
    чего у on_event не было: гарантированную точку остановки, без которой
    сборщик метрик пришлось бы гасить по таймауту.
    """
    bootstrap()

    stop = asyncio.Event()
    collector = asyncio.create_task(metrics_collector.run_forever(stop))
    try:
        yield
    finally:
        stop.set()
        # Ждём завершения текущего прохода, но не бесконечно: съём упирается
        # в докер, и подвисший демон не должен задерживать остановку панели.
        try:
            await asyncio.wait_for(collector, timeout=metrics_collector.INTERVAL_SECONDS + 5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            collector.cancel()


app = FastAPI(
    title="awwwdde control panel",
    version="0.3.0",
    description=DESCRIPTION,
    lifespan=lifespan,
)

# В dev фронт крутится на localhost, в проде живёт на том же домене (CORS не
# нужен, но явный whitelist проще дебажить локально).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:4173",
        f"https://{settings.base_domain}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in ROUTERS:
    app.include_router(router)

# Загруженные картинки портфолио. Раздаются без авторизации: их показывает
# публичный сайт. Монтируется после роутеров, чтобы префикс /uploads не
# перехватывал ничего из /api.
#
# StaticFiles сам отдаёт ETag и Last-Modified, поэтому повторные заходы
# получают 304, а не файл целиком.
app.mount("/uploads", StaticFiles(directory=uploads.uploads_dir()), name="uploads")
