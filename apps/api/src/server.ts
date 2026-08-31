import { env } from "./config/env.js";
import Fastify from "fastify";
import { registerSecurityPlugins } from "./plugins/security.js";
import { registerErrorHandler } from "./shared/error-handler.js";
import { authContextPlugin } from "./middleware/auth.js";
import { customerContextPlugin } from "./modules/customers/routes.js";
import { driverContextPlugin } from "./modules/deliveries/routes.js";
import { registerModules } from "./modules/index.js";

async function main() {
  const app = Fastify({
    trustProxy: env.TRUST_PROXY,
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "production"
          ? undefined
          : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
    },
  });

  await registerSecurityPlugins(app);
  await app.register(authContextPlugin);
  await app.register(customerContextPlugin);
  await app.register(driverContextPlugin);
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
