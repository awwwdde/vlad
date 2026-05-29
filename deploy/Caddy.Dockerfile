# Caddy с DNS-плагином — нужен для wildcard-сертификата *.awwwdde.art
# (single-domain сертификаты Caddy умеет из коробки, а wildcard требует
# DNS-01 challenge, т.е. плагина под вашего DNS-провайдера).
#
# Пример — Cloudflare. Под другого провайдера замените модуль:
#   Selectel:   github.com/caddy-dns/selectel        (если есть)
#   Reg.ru:     обычно проще завести Cloudflare как DNS поверх домена
#   nic.ru:     github.com/caddy-dns/... (по наличию)
FROM caddy:2-builder-alpine AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
