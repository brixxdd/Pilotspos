# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/types/package.json        packages/types/
COPY packages/validation/package.json   packages/validation/
COPY packages/domain/package.json       packages/domain/
COPY packages/database/package.json     packages/database/
COPY packages/ui/package.json           packages/ui/
COPY apps/web-corte/package.json        apps/web-corte/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /repo
ENV NEXT_TELEMETRY_DISABLED=1
# next.config.mjs arma el rewrite /api/* con API_URL, y los rewrites se
# evalúan en tiempo de BUILD y quedan horneados en el manifiesto de rutas.
# Sin esto el rewrite apunta al fallback localhost:3001 y todo el fetch del
# navegador falla en producción, aunque los Server Components sí funcionen
# porque leen la variable en cada request.
ARG API_URL=http://api:3011
ENV API_URL=$API_URL
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/web-corte ./apps/web-corte
# Los paquetes compartidos se compilan primero: web-corte importa su `dist`.
RUN npm run build -w @pilotspos/types -w @pilotspos/validation \
                  -w @pilotspos/domain -w @pilotspos/database -w @pilotspos/ui \
 && npm run build -w @pilotspos/web-corte

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
# `output: standalone` deja en .next/standalone un servidor con solo lo que usa.
COPY --from=build --chown=nextjs:nodejs /repo/apps/web-corte/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web-corte/.next/static ./apps/web-corte/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web-corte/public ./apps/web-corte/public
USER nextjs
EXPOSE 3100
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web-corte/server.js"]
