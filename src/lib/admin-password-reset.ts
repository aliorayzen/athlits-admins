import { apiClient } from "./api-client";

export interface PasswordResetResult {
  userId: number;
  email: string;
  temporaryPassword: string;
  forcePasswordChange: boolean;
  emailSent: boolean;
}

// Credentials must only be held by the open dialog, never cached or logged.
export async function resetVenueAccountPassword(
  managerId: string,
  staffUserId?: string,
): Promise<PasswordResetResult> {
  const base = `/api/admin/v1/users/venue-managers/${encodeURIComponent(managerId)}`;
  const path = staffUserId === undefined
    ? base
    : `${base}/staff/${encodeURIComponent(staffUserId)}`;
  const { data } = await apiClient.post<PasswordResetResult>(`${path}/reset-password`);
  return data;
}
