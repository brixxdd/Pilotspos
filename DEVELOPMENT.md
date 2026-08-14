# Desarrollo — PilotsPOS

## Requisitos

- Node.js 20+
- Docker (PostgreSQL en desarrollo)
- npm 10+ (workspaces)

## Primera vez

```bash
npm install
cp .env.example .env
npm run build:packages     # obligatorio: apps/api y apps/web consumen dist/ de packages/*
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
```

Luego, en dos terminales:

```bash
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:3000
```

Si cambias algo dentro de `packages/*`, vuelve a correr `npm run build:packages` (o el `build` del paquete específico) para que `apps/api`/`apps/web` vean el cambio — no hay watch automático cross-package en este MVP.

## Variables de entorno

Ver `.env.example` para la lista completa y comentada. Las más relevantes:

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Solo la lee `apps/api` (y los scripts de `packages/database`). Nunca llega al navegador |
| `COOKIE_SECRET` | Firma las cookies de sesión. Genera una nueva en cada entorno: `openssl rand -hex 32` |
| `SESSION_TTL_DAYS` | Vigencia de la sesión (default 7 días) |
| `CORS_ORIGIN` | Orígenes permitidos, separados por coma |
| `API_URL` | Usado por `apps/web` para el proxy `/api/*` y para las llamadas server-side (Server Components) |

## Puertos en conflicto

Si `3001` ya está ocupado en tu máquina (otro proyecto, etc.), cambia `API_PORT` en `.env` y `API_URL` a juego, o pásalos inline: `API_PORT=3011 npm run dev:api` / `API_URL=http://localhost:3011 npm run dev:web`.

## Comandos de calidad

```bash
npm run lint
npm run typecheck
npm run build
```

Los tres deben pasar antes de dar por cerrada una fase.

## Producción

Este proyecto no incluye todavía scripts de despliegue automatizado (Fase 9 se detiene en dejar el build de producción funcional y documentado; el despliegue concreto depende del proveedor que elijas).

Flujo de build de producción:

```bash
npm ci
API_URL=https://api.tu-dominio.com npm run build   # ver nota abajo: API_URL debe ir ANTES del build
NODE_ENV=production node apps/api/dist/server.js
NODE_ENV=production npm run start -w @pilotspos/web   # next start
```

Recomendaciones y advertencias para producción:

- **`API_URL` se hornea en el build, no en el arranque.** El proxy `/api/*` de `apps/web` (`next.config.mjs`) usa `rewrites()`, que Next.js resuelve y graba en `.next/routes-manifest.json` durante `next build` — **no** se vuelve a leer en `next start`. Si cambias `API_URL`, debes volver a correr `npm run build -w @pilotspos/web` con el valor correcto ya exportado; exportarlo solo antes de `next start` no tiene efecto. Esto se verificó manualmente: un build hecho con el `API_URL` por defecto sirvió el proxy apuntando a ese destino incluso arrancando el server con otro valor.
- **Base de datos**: usa un Postgres gestionado (RDS, Supabase, Neon, Railway...) en vez del contenedor de `docker-compose.yml`, que es solo para desarrollo.
- **Reverse proxy / TLS obligatorio.** Con `NODE_ENV=production`, la cookie de sesión se marca `Secure` — el navegador (y `curl`) la descarta si el sitio no se sirve por HTTPS real. Esto también se verificó manualmente: en producción local por HTTP plano, el login respondía 200 pero la cookie nunca volvía en la siguiente petición. Pon `apps/api` y `apps/web` detrás de un proxy (Nginx, Caddy, el balanceador del proveedor) que termine TLS antes de probar el flujo de login en un build de producción.
- **Variables**: nunca reutilices `COOKIE_SECRET` ni las credenciales de `docker-compose.yml` en producción. `CORS_ORIGIN` debe apuntar exactamente al dominio público del frontend.
- **Logging**: Fastify usa `pino`; en producción emite JSON estructurado a stdout (sin `pino-pretty`), listo para recolectores de logs (CloudWatch, Loki, etc.) — no requiere configuración adicional.
- **Backups**: ver `DATABASE.md`.

## Checklist de seguridad (estado actual)

- [x] Cookies de sesión HTTP-only, firmadas, `secure` en producción
- [x] Sesiones hasheadas server-side (no JWT, no localStorage)
- [x] Contraseñas con bcrypt
- [x] CORS restringido a `CORS_ORIGIN`
- [x] Validación con Zod en toda entrada de la API
- [x] Autorización por rol en el backend (`requirePermission`/`requireRole`), nunca solo en la UI
- [x] Aislamiento estricto por `organizationId` derivado de la sesión, nunca del cliente
- [x] Rate limiting en `/auth/login`
- [x] Errores controlados (sin stack traces ni detalles internos en la respuesta)
- [x] `password_hash` nunca se incluye en las respuestas de `/users`
- [x] `DATABASE_URL` nunca se expone al frontend

### Limitación conocida: versión de Next.js

El documento de reconstrucción fija **React 18.3.1** (para compatibilidad con componentes compartidos) y por lo tanto **Next.js 14** (Next 15/16 requieren React 19). La rama 14.x más reciente (`14.2.35`) no tiene backport de todos los CVEs que sí están resueltos en Next 15/16 — son mayormente de bajo impacto en este contexto (DoS en Image Optimization, casos de Server Actions/Middleware que este proyecto no usa en las rutas afectadas), pero quedan documentados aquí en vez de ignorados. Si en algún momento se decide soltar el pin de React 18, migrar a Next 15+ resuelve el resto.

## Estilo de commits

Cada fase del desarrollo (ver README) se cierra con un commit que:

1. Compila (`npm run build`), tipa (`npm run typecheck`) y lintea (`npm run lint`) limpio.
2. Fue probado manualmente contra la API real y Postgres real (no solo mocks).
3. Describe qué se construyó y por qué, no solo qué archivos cambiaron.
