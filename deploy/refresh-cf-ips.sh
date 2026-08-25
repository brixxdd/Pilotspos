#!/bin/sh
# Regenera la lista de rangos de Cloudflare para la restauración de IP real.
# Cloudflare los cambia de vez en cuando; si se quedan viejos, Nginx deja de
# reconocer a ese edge y el rate limiting vuelve a ver una IP para todos.
set -e
OUT="$(dirname "$0")/nginx/cloudflare-real-ip.conf"
{
  echo "# Rangos de Cloudflare. Generado el $(date -u +%Y-%m-%d) desde"
  echo "# https://www.cloudflare.com/ips-v4 y /ips-v6 — regenerar con deploy/refresh-cf-ips.sh"
  # `grep .` descarta líneas vacías y garantiza salto final: el archivo de
  # Cloudflare no siempre termina en newline y la última directiva se pegaba
  # a la siguiente.
  curl -sf https://www.cloudflare.com/ips-v4 | grep . | sed 's/^/set_real_ip_from /; s/$/;/'
  curl -sf https://www.cloudflare.com/ips-v6 | grep . | sed 's/^/set_real_ip_from /; s/$/;/'
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$OUT"
echo "Actualizado: $OUT"
