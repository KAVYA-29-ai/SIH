export type TrustMeshDecision = "ALLOW" | "DENY" | "STEP_UP";

export interface TrustMeshAccessRequest {
  orgId: string;
  did: string;
  resourceId: string;
  action: string;
  role?: string;
}

export interface TrustMeshAccessResponse {
  allowed: boolean;
  reason: string;
  role: string;
}

export interface TrustMeshClientOptions {
  baseUrl: string;
}

export interface TrustMeshClient {
  accessCheck(
    request: TrustMeshAccessRequest,
  ): Promise<TrustMeshAccessResponse & { decision: TrustMeshDecision }>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function createTrustMeshClient(
  options: TrustMeshClientOptions,
): TrustMeshClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  return {
    async accessCheck(request) {
      const response = await fetch(`${baseUrl}/access/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          org_id: request.orgId,
          did: request.did,
          role: request.role ?? "User",
          resource_id: request.resourceId,
          action: request.action,
        }),
      });

      if (!response.ok) {
        let detail = `TrustMesh authorization failed (${response.status}).`;

        try {
          const error = (await response.json()) as { detail?: string };
          if (error.detail) detail = error.detail;
        } catch {
          // Keep the HTTP-status fallback when the server does not return JSON.
        }

        throw new Error(detail);
      }

      const result = (await response.json()) as TrustMeshAccessResponse;

      return {
        ...result,
        decision: result.allowed ? "ALLOW" : "DENY",
      };
    },
  };
}
