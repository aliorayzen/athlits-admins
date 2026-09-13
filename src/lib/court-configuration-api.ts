import { apiClient } from "@/lib/api-client";
import { adminEndpoints, type AdminEndpoint } from "@/lib/admin-endpoints";
import { normalizeListResponse } from "@/lib/normalize-list-response";
import type { BasePricingRequest, CourtLayoutResponse, CourtRuleRequest, CourtRuleResponse, CourtSportResponse, CreateCourtSportRequest, EquipmentRequest, EquipmentResponse, PricingRuleRequest, PricingRuleResponse, UpdateCourtSportRequest, UpdatePricingRuleRequest } from "@/types/admin-operations";

async function request<T>(endpoint: AdminEndpoint, data?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await apiClient.request<T>({ method: endpoint.method, url: endpoint.path, data, signal });
  return response.data;
}

export const courtConfigurationApi = {
  getLayout: (venueId: string, courtId: string, signal?: AbortSignal) => request<CourtLayoutResponse>(adminEndpoints.courtLayout(venueId, courtId), undefined, signal),
  updateLayout: (venueId: string, courtId: string, divisionLayout: CourtLayoutResponse["divisionLayout"]) => request<CourtLayoutResponse>(adminEndpoints.updateCourtLayout(venueId, courtId), { divisionLayout }),
  listRules: async (venueId: string, courtId: string, signal?: AbortSignal) => normalizeListResponse<CourtRuleResponse>(await request<unknown>(adminEndpoints.courtRules(venueId, courtId), undefined, signal), "Court rules"),
  createRule: (venueId: string, courtId: string, payload: CourtRuleRequest) => request<CourtRuleResponse>(adminEndpoints.createCourtRule(venueId, courtId), payload),
  deleteRule: (venueId: string, courtId: string, ruleId: string) => request<void>(adminEndpoints.deleteCourtRule(venueId, courtId, ruleId)),
  listSports: async (venueId: string, courtId: string, signal?: AbortSignal) => normalizeListResponse<CourtSportResponse>(await request<unknown>(adminEndpoints.courtSports(venueId, courtId), undefined, signal), "Court sports"),
  createSport: (venueId: string, courtId: string, payload: CreateCourtSportRequest) => request<CourtSportResponse>(adminEndpoints.createCourtSport(venueId, courtId), payload),
  updateSport: (venueId: string, courtId: string, sportId: string, payload: UpdateCourtSportRequest) => request<CourtSportResponse>(adminEndpoints.courtSport(venueId, courtId, sportId, "PUT"), payload),
  deleteSport: (venueId: string, courtId: string, sportId: string) => request<void>(adminEndpoints.courtSport(venueId, courtId, sportId, "DELETE")),
  listEquipment: async (venueId: string, courtId: string, sportId: string, signal?: AbortSignal) => normalizeListResponse<EquipmentResponse>(await request<unknown>(adminEndpoints.courtEquipment(venueId, courtId, sportId), undefined, signal), "Court equipment"),
  createEquipment: (venueId: string, courtId: string, sportId: string, payload: EquipmentRequest) => request<EquipmentResponse>(adminEndpoints.createCourtEquipment(venueId, courtId, sportId), payload),
  updateEquipment: (venueId: string, courtId: string, sportId: string, equipmentId: string, payload: EquipmentRequest) => request<EquipmentResponse>(adminEndpoints.courtEquipmentItem(venueId, courtId, sportId, equipmentId, "PUT"), payload),
  deleteEquipment: (venueId: string, courtId: string, sportId: string, equipmentId: string) => request<void>(adminEndpoints.courtEquipmentItem(venueId, courtId, sportId, equipmentId, "DELETE")),
  listPricing: async (venueId: string, courtId: string, sportId: string, signal?: AbortSignal) => normalizeListResponse<PricingRuleResponse>(await request<unknown>(adminEndpoints.courtPricing(venueId, courtId, sportId), undefined, signal), "Court pricing"),
  createPricing: (venueId: string, courtId: string, sportId: string, payload: PricingRuleRequest) => request<PricingRuleResponse>(adminEndpoints.createCourtPricing(venueId, courtId, sportId), payload),
  createBasePricing: (venueId: string, courtId: string, sportId: string, payload: BasePricingRequest) => request<PricingRuleResponse[]>(adminEndpoints.createBasePricing(venueId, courtId, sportId), payload),
  updatePricing: (venueId: string, courtId: string, sportId: string, ruleId: string, payload: UpdatePricingRuleRequest) => request<PricingRuleResponse>(adminEndpoints.courtPricingRule(venueId, courtId, sportId, ruleId, "PUT"), payload),
  deletePricing: (venueId: string, courtId: string, sportId: string, ruleId: string) => request<void>(adminEndpoints.courtPricingRule(venueId, courtId, sportId, ruleId, "DELETE")),
  updatePricingGroup: (venueId: string, courtId: string, sportId: string, groupId: string, payload: PricingRuleRequest) => request<PricingRuleResponse[]>(adminEndpoints.courtPricingGroup(venueId, courtId, sportId, groupId, "PUT"), payload),
  deletePricingGroup: (venueId: string, courtId: string, sportId: string, groupId: string) => request<void>(adminEndpoints.courtPricingGroup(venueId, courtId, sportId, groupId, "DELETE")),
};
