import { env } from "./config/env.js";
import Fastify from "fastify";
import { registerSecurityPlugins } from "./plugins/security.js";
import { registerErrorHandler } from "./shared/error-handler.js";
import { registerModules } from "./modules/index.js";

async function main() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
    },
  });

  await registerSecurityPlugins(app);
  registerErrorHandler(app);
  await registerModules(app);

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

main();
