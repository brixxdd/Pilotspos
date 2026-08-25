import type { UUID } from "@pilotspos/types";

/**
 * Identidad de un cliente final con sesión abierta en el menú digital.
 * Deliberadamente NO tiene `role` ni `branchId`: un cliente no es personal y
 * no debe poder pasar por ninguna comprobación de permisos del sistema.
 */
export interface CustomerContext {
  sessionId: string;
  customerId: UUID;
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string | null;
  addressReferences: string | null;
  creditLimit: number;
  balance: number;
  organizationId: UUID;
  organizationName: string;
}
