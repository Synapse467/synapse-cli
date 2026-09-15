/**
 * Generated-style public client for synapse-api (OpenAPI 3.1 at /v1/docs).
 * Paths and request shapes match the live API. Auth is the HttpOnly session cookie.
 */
import { api } from "../../workspace";

export const synapseApi = {
  health: () => api<{ status: string; service: string }>("/health"),
  me: () =>
    api<{
      id: string;
      name: string;
      email: string;
      verificationStatus: string;
      stellarPublicKey: string | null;
      platformRole: string;
    }>("/me"),
  myLicenses: () => api<unknown[]>("/me/licenses"),
  workspace: () => api<unknown>("/workspace"),
  workspaceAction: (body: Record<string, unknown>) =>
    api<unknown>("/workspace/actions", { method: "POST", body: JSON.stringify(body) }),
  capsuleUsage: (id: string) => api<unknown[]>(`/capsules/${id}/usage`),
  capsuleSettlements: (id: string) =>
    api<{ settlements: unknown[]; receipts: unknown[] }>(`/capsules/${id}/settlements`),
  pendingCredentials: () => api<unknown[]>("/experts/credentials"),
  reviewCredential: (id: string, status: "APPROVED" | "REJECTED") =>
    api<unknown>(`/experts/credentials/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  assignPlatformRole: (email: string, role: "NONE" | "REVIEWER" | "ADMIN") =>
    api<unknown>("/admin/platform-roles", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),
};
