import type { UUID } from "@pilotspos/types";

/**
 * Identidad de un repartidor con sesión abierta en su portal (/r).
 * Deliberadamente NO tiene `role` ni `branchId`: un repartidor no es personal
 * y no debe poder pasar por ninguna comprobación de permisos del sistema.
 */
export interface DriverContext {
  sessionId: string;
  driverId: UUID;
  name: string;
  phone: string;
  organizationId: UUID;
  organizationName: string;
}
