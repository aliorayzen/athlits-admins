import { apiClient } from "@/lib/api-client";
import { adminEndpoints, type AdminEndpoint } from "@/lib/admin-endpoints";
import { normalizeListResponse } from "@/lib/normalize-list-response";
import type {
  PageResponse,
  PromotionRedemption,
  VenueDiscountRequest,
  VenueDiscountResponse,
  VenuePromotionResponse,
} from "@/types/admin-operations";

async function request<T>(
  endpoint: AdminEndpoint,
  options: { data?: unknown; params?: object; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await apiClient.request<T>({
    method: endpoint.method,
    url: endpoint.path,
    ...options,
  });
  return response.data;
}

export const discountsApi = {
  list: async (venueId: string, signal?: AbortSignal) =>
    normalizeListResponse<VenueDiscountResponse>(
      await request<unknown>(adminEndpoints.venueDiscounts(venueId), {
        signal,
      }),
      "Venue discounts",
    ),
  create: (venueId: string, payload: VenueDiscountRequest) =>
    request<VenueDiscountResponse>(
      adminEndpoints.createVenueDiscount(venueId),
      { data: payload },
    ),
  update: (
    venueId: string,
    discountId: string,
    payload: VenueDiscountRequest,
  ) =>
    request<VenueDiscountResponse>(
      adminEndpoints.venueDiscount(venueId, discountId, "PUT"),
      { data: payload },
    ),
  delete: (venueId: string, discountId: string) =>
    request<void>(adminEndpoints.venueDiscount(venueId, discountId, "DELETE")),
  listPromotions: async (venueId: string, signal?: AbortSignal) =>
    normalizeListResponse<VenuePromotionResponse>(
      await request<unknown>(adminEndpoints.venuePromotions(venueId), {
        signal,
      }),
      "Venue promotions",
    ),
  redemptions: (
    venueId: string,
    promotionId: string,
    page: number,
    signal?: AbortSignal,
  ) =>
    request<PageResponse<PromotionRedemption>>(
      adminEndpoints.promotionRedemptions(venueId, promotionId),
      { params: { page, size: 20 }, signal },
    ),
};
