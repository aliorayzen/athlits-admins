import { apiClient } from "@/lib/api-client";
import { adminEndpoints } from "@/lib/admin-endpoints";
import type {
  UpdateVenueCourtLimitRequest,
  UpdateVenueCourtLimitResponse,
} from "@/types/admin-operations";

export async function updateVenueCourtLimit(
  venueId: string,
  payload: UpdateVenueCourtLimitRequest,
): Promise<UpdateVenueCourtLimitResponse> {
  const endpoint = adminEndpoints.updateCourtLimit(venueId);
  const { data } = await apiClient.request<UpdateVenueCourtLimitResponse>({
    method: endpoint.method,
    url: endpoint.path,
    data: payload,
  });
  return data;
}
