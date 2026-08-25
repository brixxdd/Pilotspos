import type { FastifyReply } from "fastify";
import { env } from "../../config/env.js";

/**
 * Cookie propia del cliente final, distinta de la del personal. Si compartieran
 * nombre, abrir el menú en la misma computadora del mostrador cerraría la
 * sesión del cajero — y peor, mezclaría las dos identidades.
 */
export function setCustomerCookie(reply: FastifyReply, token: string, expiresAt: Date) {
  reply.setCookie(env.CUSTOMER_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    signed: true,
    expires: expiresAt,
  });
}

export function clearCustomerCookie(reply: FastifyReply) {
  reply.clearCookie(env.CUSTOMER_COOKIE_NAME, { path: "/" });
}
