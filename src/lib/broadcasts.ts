import { apiClient } from "./api-client";
import type { PageResponse } from "@/types/api";

export type BroadcastAudience = "ALL_PLAYERS" | "USER_IDS" | "SEGMENT";
export type BroadcastStatus = "QUEUED" | "PROCESSING" | "SENT";

export interface BroadcastRequest {
  audience: BroadcastAudience;
  title: string;
  body: string;
  userIds?: number[];
  sport?: string;
  activeWithinDays?: number;
}

export interface BroadcastRecord {
  id: number;
  status: BroadcastStatus;
  audience: BroadcastAudience;
  title: string;
  body: string;
  estimatedRecipientCount: number;
  acceptedRecipientCount: number;
  queuedDeliveryCount: number;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string | null;
}

export interface AudienceEstimate {
  audience: BroadcastAudience;
  recipientCount: number;
}

export interface AudienceEstimateQuery {
  audience: BroadcastAudience;
  userIds?: number[];
  sport?: string;
  activeWithinDays?: number;
}

export async function sendBroadcast(
  request: BroadcastRequest,
  idempotencyKey: string,
): Promise<BroadcastRecord> {
  const { data } = await apiClient.post<BroadcastRecord>(
    "/api/admin/v1/broadcasts",
    request,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return data;
}

export async function estimateBroadcastAudience(
  query: AudienceEstimateQuery,
): Promise<AudienceEstimate> {
  const params = new URLSearchParams({ audience: query.audience });
  query.userIds?.forEach((id) => params.append("userIds", String(id)));
  if (query.sport) params.set("sport", query.sport);
  if (query.activeWithinDays !== undefined) {
    params.set("activeWithinDays", String(query.activeWithinDays));
  }
  const { data } = await apiClient.get<AudienceEstimate>(
    "/api/admin/v1/broadcasts/audience-estimate",
    { params },
  );
  return data;
}

export async function getBroadcast(id: number): Promise<BroadcastRecord> {
  const { data } = await apiClient.get<BroadcastRecord>(
    `/api/admin/v1/broadcasts/${id}`,
  );
  return data;
}

export async function getBroadcasts(
  page = 0,
  size = 20,
): Promise<PageResponse<BroadcastRecord>> {
  const { data } = await apiClient.get<PageResponse<BroadcastRecord>>(
    "/api/admin/v1/broadcasts",
    { params: { page, size } },
  );
  return data;
}
