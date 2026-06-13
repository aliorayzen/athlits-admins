import { Users } from "lucide-react";

import { DirectoryUnavailable } from "./_components/directory/directory-unavailable";

/** There is no combined "all users" listing endpoint. Browse by role instead
 *  (Venue Managers and Players have live directories). */
export default function UsersPage() {
  return (
    <DirectoryUnavailable
      title="Users"
      subtitle="Everyone with platform access"
      icon={Users}
      accent="teal"
      body="A combined user directory isn't available yet. Browse by role instead — Venue Managers and Players have live directories in the sidebar."
      action={{
        href: "/dashboard/users/venue-managers",
        label: "View venue managers",
      }}
    />
  );
}
