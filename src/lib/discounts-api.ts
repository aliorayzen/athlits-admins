import { apiClient } from "@/lib/api-client";
import { adminEndpoints, type AdminEndpoint } from "@/lib/admin-endpoints";
import type { PageResponse, PromotionRedemption, VenueDiscountRequest, VenueDiscountResponse, VenuePromotionResponse } from "@/types/admin-operations";

async function request<T>(endpoint: AdminEndpoint, options: { data?: unknown; params?: object; signal?: AbortSignal } = {}): Promise<T> {
  const response = await apiClient.request<T>({ method: endpoint.method, url: endpoint.path, ...options });
  return response.data;
}

export const discountsApi = {
  list: (venueId: string, signal?: AbortSignal) => request<VenueDiscountResponse[]>(adminEndpoints.venueDiscounts(venueId), { signal }),
  create: (venueId: string, payload: VenueDiscountRequest) => request<VenueDiscountResponse>(adminEndpoints.createVenueDiscount(venueId), { data: payload }),
  update: (venueId: string, discountId: string, payload: VenueDiscountRequest) => request<VenueDiscountResponse>(adminEndpoints.venueDiscount(venueId, discountId, "PUT"), { data: payload }),
  delete: (venueId: string, discountId: string) => request<void>(adminEndpoints.venueDiscount(venueId, discountId, "DELETE")),
  listPromotions: (venueId: string, signal?: AbortSignal) => request<VenuePromotionResponse[]>(adminEndpoints.venuePromotions(venueId), { signal }),
  redemptions: (venueId: string, promotionId: string, page: number, signal?: AbortSignal) => request<PageResponse<PromotionRedemption>>(adminEndpoints.promotionRedemptions(venueId, promotionId), { params: { page, size: 20 }, signal }),
};
