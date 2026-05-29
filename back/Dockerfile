# Образ панели awwwdde. Управляет Docker хоста (через смонтированный сокет),
# поэтому внутрь ставим только Python-зависимости — сборка гостей идёт демоном хоста.
FROM python:3.12-slim

WORKDIR /app

# git нужен движку для clone гостевых репозиториев.
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
