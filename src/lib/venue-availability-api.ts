import { apiClient } from "@/lib/api-client";
import { adminEndpoints } from "@/lib/admin-endpoints";
import type {
  AvailabilityScheduleRequest,
  AvailabilityScheduleResponse,
  BlackoutImpactResponse,
  BlackoutResponse,
  BookingConflictResponse,
  ConfirmBlackoutResponse,
  CourtConflictQuery,
  CreateBlackoutRequest,
} from "@/types/admin-operations";

async function request<T>(
  endpoint: { method: "DELETE" | "GET" | "POST" | "PUT"; path: string },
  options: { data?: unknown; params?: object; signal?: AbortSignal } = {},
): Promise<T> {
  const { data } = await apiClient.request<T>({
    method: endpoint.method,
    url: endpoint.path,
    ...options,
  });
  return data;
}

export function getVenueAvailability(venueId: string, signal?: AbortSignal) {
  return request<AvailabilityScheduleResponse>(
    adminEndpoints.venueAvailability(venueId),
    { signal },
  );
}

export function getCourtAvailability(
  venueId: string,
  courtId: string,
  signal?: AbortSignal,
) {
  return request<AvailabilityScheduleResponse>(
    adminEndpoints.courtAvailability(venueId, courtId),
    { signal },
  );
}

export function updateCourtAvailability(
  venueId: string,
  courtId: string,
  payload: AvailabilityScheduleRequest,
) {
  return request<AvailabilityScheduleResponse>(
    adminEndpoints.updateCourtAvailability(venueId, courtId),
    { data: payload },
  );
}

export function getVenueBlackouts(venueId: string, signal?: AbortSignal) {
  return request<BlackoutResponse[]>(adminEndpoints.venueBlackouts(venueId), {
    signal,
  });
}

export function checkVenueBlackout(
  venueId: string,
  payload: CreateBlackoutRequest,
) {
  return request<BlackoutImpactResponse>(
    adminEndpoints.checkVenueBlackout(venueId),
    { data: payload },
  );
}

export function confirmVenueBlackout(
  venueId: string,
  payload: CreateBlackoutRequest,
) {
  return request<ConfirmBlackoutResponse>(
    adminEndpoints.confirmVenueBlackout(venueId),
    { data: payload },
  );
}

export async function deleteVenueBlackout(
  venueId: string,
  blackoutId: string,
): Promise<void> {
  await request<void>(adminEndpoints.deleteVenueBlackout(venueId, blackoutId));
}

export async function getCourtConflicts(
  venueId: string,
  courtId: string,
  query: CourtConflictQuery,
  signal?: AbortSignal,
): Promise<BookingConflictResponse> {
  const result = await request<{
    conflict: boolean;
    conflictingBookingIds: Array<string | number>;
  }>(adminEndpoints.courtConflicts(venueId, courtId), {
    params: query,
    signal,
  });
  return {
    ...result,
    conflictingBookingIds: result.conflictingBookingIds.map(String),
  };
}
