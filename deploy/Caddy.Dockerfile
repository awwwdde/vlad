# Стоковый Caddy. Сертификаты — HTTP-01 challenge на каждый поддомен
# отдельно (panel.caddy.py добавляет маршруты по одному, Caddy выпускает
# cert при первом запросе).
#
# Если позже захотим wildcard *.awwwdde.art — пересобрать с плагином под
# DNS-провайдера: `xcaddy build --with github.com/caddy-dns/<provider>`.
FROM caddy:2-alpine
