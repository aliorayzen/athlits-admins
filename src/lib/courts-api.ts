import { apiClient } from "@/lib/api-client";
import { adminEndpoints } from "@/lib/admin-endpoints";

export async function deleteCourt(
  venueId: string,
  courtId: string,
): Promise<void> {
  const endpoint = adminEndpoints.deleteCourt(venueId, courtId);
  await apiClient.request({ method: endpoint.method, url: endpoint.path });
}
