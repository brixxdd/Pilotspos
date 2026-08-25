#!/bin/sh
set -e

# Las migraciones se aplican al arrancar, no a mano: así un despliegue no
# puede olvidarlas y dejar la app corriendo contra un esquema viejo.
# Drizzle lleva registro de las ya aplicadas, así que reiniciar el contenedor
# no las repite. Se corre desde packages/database porque migrate.js busca
# la carpeta ./drizzle relativa al directorio de trabajo.
if [ "${RUN_MIGRATIONS}" = "true" ]; then
  echo "→ Aplicando migraciones..."
  cd /repo/packages/database
  node dist/client/migrate.js
  cd /repo
fi

exec node apps/api/dist/server.js
