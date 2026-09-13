import { apiClient } from "@/lib/api-client";
import type { ContractResponse, CreateContractRequest } from "@/types/api";
import { adminEndpoints } from "@/lib/admin-endpoints";

export type UpdateContractRequest = CreateContractRequest;

export async function updateVenueContract(
  venueId: string,
  contractId: string,
  payload: UpdateContractRequest,
): Promise<ContractResponse> {
  const endpoint = adminEndpoints.updateVenueContract(venueId, contractId);
  const { data } = await apiClient.request<ContractResponse>({
    method: endpoint.method,
    url: endpoint.path,
    data: payload,
  });
  return {
    ...data,
    id: String(data.id),
    venueId: String(data.venueId),
  };
}
