import { api } from "./api";
import type {
  SecurityFindingsResponse,
  SecurityResponse,
  RiskGraphResponse,
} from "../types/api";

export async function getSecurityCenter(): Promise<SecurityResponse> {
  return api.get<SecurityResponse>("/security/");
}

export async function getSecurityFindings(): Promise<SecurityFindingsResponse> {
  return api.get<SecurityFindingsResponse>("/security/findings");
}

export async function getRiskGraph(): Promise<RiskGraphResponse> {
  return api.get<RiskGraphResponse>("/security/risk-graph");
}
