import { api } from "./api";
import type { RecoveryRequest, RecoveryResponse } from "../types/api";

export async function getRecoveryCenter(): Promise<RecoveryResponse> {
  return api.get<RecoveryResponse>("/recovery/");
}

export async function createRecoveryRequest(payload: {
  subject: string;
  reason: string;
  required_approvals?: number;
  timelock_hours?: number;
}): Promise<{ request: RecoveryRequest }> {
  return api.post<{ request: RecoveryRequest }>("/recovery/requests", payload);
}

export async function approveRecoveryRequest(
  requestId: string,
): Promise<{ request: RecoveryRequest }> {
  return api.post<{ request: RecoveryRequest }>(
    `/recovery/requests/${encodeURIComponent(requestId)}/approve`,
    {},
  );
}

export async function executeRecoveryRequest(
  requestId: string,
): Promise<{ request: RecoveryRequest }> {
  return api.post<{ request: RecoveryRequest }>(
    `/recovery/requests/${encodeURIComponent(requestId)}/execute`,
    {},
  );
}
