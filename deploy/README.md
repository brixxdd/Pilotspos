# Despliegue de Corte POS

Servidor: Hetzner `167.233.110.233`, Nginx en el host, un proyecto por carpeta
en `/opt/`. Ver el vault `servidor-hetzner` para el detalle de la máquina.

## Puertos

El contenedor web publica en `127.0.0.1:3007` — nunca en `0.0.0.0`. La única
entrada desde internet es Nginx. Postgres **no publica puerto**: solo se llega
por la red interna de Docker.

Ocupados en el VPS antes de esto: 3000 3001 3002 3005 3006 5000 5433 5678 6379
8080 8085.

## Primer despliegue

```bash
ssh root@167.233.110.233
git clone git@github.com:brixxdd/Pilotspos.git /opt/corte-pos
cd /opt/corte-pos

cp .env.production.example .env
# Rellenar: POSTGRES_PASSWORD, COOKIE_SECRET (openssl rand -hex 32),
# MENU_WHATSAPP_NUMBER. NUNCA reusar los secretos de desarrollo.
chmod 600 .env

docker compose -f docker-compose.prod.yml up -d --build
```

Las migraciones se aplican solas al arrancar la API (`RUN_MIGRATIONS=true`).
Drizzle lleva registro de las aplicadas, así que reiniciar no las repite.

### Datos de demostración

```bash
docker compose -f docker-compose.prod.yml exec -w /repo/packages/database api \
  node dist/seed/index.js
```

> **El seed BORRA todo antes de sembrar.** Correrlo solo en la puesta inicial o
> en un entorno de demo. Nunca contra datos reales del cliente.

## Nginx

```bash
cp deploy/nginx/cloudflare-real-ip.conf /etc/nginx/snippets/
cp deploy/nginx/corte.devpilots.dev.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/corte.devpilots.dev /etc/nginx/sites-enabled/
certbot --nginx -d corte.devpilots.dev
nginx -t && systemctl reload nginx
```

Los rangos de Cloudflare cambian de vez en cuando. Regenerarlos con
`./deploy/refresh-cf-ips.sh` y volver a copiar el snippet; si se quedan viejos,
Nginx deja de reconocer ese edge y el rate limiting vuelve a ver una sola IP
para todos los visitantes.

## Actualizar

```bash
cd /opt/corte-pos && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

## Backup y restauración

Los backups van a `/opt/backups/corte-pos/` (fuera del volumen de Postgres).
Instalar el cron **una vez**:

```bash
mkdir -p /opt/backups/corte-pos
crontab -e
#   30 4 * * * /opt/corte-pos/deploy/backup.sh >> /var/log/corte-backup.log 2>&1
```

- `backup.sh` hace `pg_dump` por la red interna de Docker (no bloquea
  escrituras), comprime y rota a 14 días. Probar el primer día y revisar que el
  archivo no esté vacío.
- `restore.sh <archivo.sql.gz>` detiene la API, restaura y la vuelve a
  arrancar. **Sobrescribe la base actual** — solo para desastres reales.

> Pendiente recomendado: copia fuera del VPS (p. ej. `rclone` a un bucket) para
> que un fallo de disco no se lleve también los backups.

## Seguridad: rotar credenciales del seed

El seed crea `admin / Admin123!`, `encargado / Encargado123!` y
`cajero01 / Cajero123!`. Están activas **hoy** en producción. Antes de la
primera venta real:

1. Entrar UNA vez con `admin / Admin123!` en la computadora del dueño.
2. Crear desde `/users` los usuarios reales con contraseñas fuertes.
3. Desactivar los tres del seed (botón "Desactivar" en `/users`).
4. Verificar que `Admin123!` ya no entra.

Alternativa por SQL (si nadie quiere tocar la UI):

```bash
# genera un hash bcrypt y lo aplica
docker compose -f docker-compose.prod.yml exec -T api node -e '
  const bcrypt = require("bcryptjs");
  const hash = bcrypt.hashSync("NuevaPasswordFuerte!", 10);
  console.log(hash);
'
# pegar el hash en el UPDATE siguiente
docker compose -f docker-compose.prod.yml exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "UPDATE users SET password_hash = '<hash>', active = false WHERE username IN ('admin','encargado','cajero01');"
```

También cambiar `MENU_WHATSAPP_NUMBER` en `/opt/corte-pos/.env` al número real
de la carnicería y recrear el contenedor web (`docker compose up -d --build`).
