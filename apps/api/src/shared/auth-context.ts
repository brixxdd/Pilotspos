import type { UUID, UserRole } from "@pilotspos/types";

export interface AuthContext {
  sessionId: string;
  userId: UUID;
  username: string;
  fullName: string;
  role: UserRole;
  organizationId: UUID;
  organizationName: string;
  branchId: UUID | null;
  branchName: string | null;
}
