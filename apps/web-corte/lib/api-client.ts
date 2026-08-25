"use client";

import type { ApiErrorBody } from "@pilotspos/types";

/** Errores por campo tal como los devuelve `z.ZodError#flatten()` en la API. */
export interface FieldErrors {
  [field: string]: string[] | undefined;
}

export class ApiClientError extends Error {
  code?: string;
  status: number;
  /**
   * Qué campo falló y por qué. La API ya lo manda en `error.details` cuando
   * rebota un `VALIDATION_ERROR`; sin esto el formulario solo podría enseñar
   * "Datos inválidos", que no le dice nada a quien está llenándolo.
   */
  fieldErrors: FieldErrors;

  constructor(message: string, status: number, code?: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

function readFieldErrors(body: ApiErrorBody | null): FieldErrors {
  const details = body?.error?.details;
  if (!details || typeof details !== "object") return {};
  const candidate = (details as { fieldErrors?: unknown }).fieldErrors;
  return candidate && typeof candidate === "object" ? (candidate as FieldErrors) : {};
}

/** Cliente HTTP para Client Components. Las cookies viajan automáticamente (same-origin). */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
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
      readFieldErrors(body),
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
