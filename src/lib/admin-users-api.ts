import { apiClient } from "@/lib/api-client";
import { adminEndpoints } from "@/lib/admin-endpoints";
import type { UserDto } from "@/types/api";

export async function removeVenueManagerStaff(
  managerId: string,
  staffUserId: string,
): Promise<void> {
  const endpoint = adminEndpoints.removeVenueManagerStaff(
    managerId,
    staffUserId,
  );
  await apiClient.request({ method: endpoint.method, url: endpoint.path });
}

export async function blockUser(userId: string): Promise<UserDto> {
  const endpoint = adminEndpoints.blockUser(userId);
  const { data } = await apiClient.request<UserDto>({
    method: endpoint.method,
    url: endpoint.path,
  });
  return { ...data, id: String(data.id) };
}
