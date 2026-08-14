"use client";

import type { ApiErrorBody } from "@pilotspos/types";

export class ApiClientError extends Error {
  code?: string;
  status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

/** Cliente HTTP para Client Components. Las cookies viajan automáticamente (same-origin). */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiClientError("Sin conexión con el servidor", 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = await response.json();
    } catch {
      // el cuerpo no era JSON; se usa un mensaje genérico
    }
    throw new ApiClientError(
      body?.error?.message ?? "Ocurrió un error inesperado",
      response.status,
      body?.error?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
