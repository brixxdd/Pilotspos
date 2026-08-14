import type { FastifyError, FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { AppError } from "./errors.js";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          message: "Datos inválidos",
          code: "VALIDATION_ERROR",
          details: error.flatten(),
        },
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { message: error.message, code: error.code },
      });
    }

    const statusCode = "statusCode" in error ? error.statusCode : undefined;
    if (typeof statusCode === "number" && statusCode < 500) {
      return reply.status(statusCode).send({
        error: { message: error.message, code: "REQUEST_ERROR" },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: { message: "Error interno del servidor", code: "INTERNAL_ERROR" },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { message: "Ruta no encontrada", code: "NOT_FOUND" } });
  });
}
