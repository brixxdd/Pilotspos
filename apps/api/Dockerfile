# syntax=docker/dockerfile:1

# La API vive en un monorepo con workspaces: el contexto de build es la raíz,
# no apps/api, porque necesita compilar también los paquetes @pilotspos/*.
FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/types/package.json        packages/types/
COPY packages/validation/package.json   packages/validation/
COPY packages/domain/package.json       packages/domain/
COPY packages/database/package.json     packages/database/
COPY packages/ui/package.json           packages/ui/
COPY apps/api/package.json              apps/api/
# `npm ci` con solo los package.json copiados: esta capa se reusa mientras las
# dependencias no cambien, aunque el código sí.
RUN npm ci --workspace @pilotspos/api --include-workspace-root \
    --workspace @pilotspos/types --workspace @pilotspos/validation \
    --workspace @pilotspos/domain --workspace @pilotspos/database

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm run build -w @pilotspos/types -w @pilotspos/validation \
                  -w @pilotspos/domain -w @pilotspos/database \
 && npm run build -w @pilotspos/api

FROM node:20-alpine AS runner
WORKDIR /repo
ENV NODE_ENV=production
# Nunca como root: si algo se escapa del proceso, que no sea con todo el sistema.
RUN addgroup -g 1001 -S nodejs && adduser -S fastify -u 1001
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json ./package.json
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
# `COPY --chmod` exigiría BuildKit; así funciona con el builder clásico también.
COPY apps/api/docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
USER fastify
EXPOSE 3011
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
