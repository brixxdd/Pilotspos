import type { FastifyReply } from "fastify";
import { env } from "../../config/env.js";

/** Cookie propia del repartidor (/r), distinta de la del staff y del cliente. */
export function setDriverCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(env.DRIVER_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    signed: true,
    expires: expiresAt,
  });
}

export function clearDriverCookie(reply: FastifyReply) {
  reply.clearCookie(env.DRIVER_COOKIE_NAME, { path: "/" });
}
