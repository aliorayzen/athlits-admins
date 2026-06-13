import type { UserDto } from "@/types/api";

// Shared presentation helpers for the signed-in admin. Both the sidebar footer
// and the top-bar render the same identity, so the name/initials logic lives in
// one place. On a hard refresh the user is rehydrated from the JWT payload,
// which carries no name (firstName/lastName are ""), so every helper degrades
// gracefully: name → email → a constant fallback.

const NAME_FALLBACK = "Admin";
const INITIALS_FALLBACK = "AA";

export function getDisplayName(user: UserDto | null): string {
  if (!user) return NAME_FALLBACK;
  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return fullName || user.email || NAME_FALLBACK;
}

export function getInitials(user: UserDto | null): string {
  if (!user) return INITIALS_FALLBACK;
  const first = user.firstName?.[0] ?? "";
  const last = user.lastName?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  if (initials) return initials;
  return user.email?.[0]?.toUpperCase() || INITIALS_FALLBACK;
}
