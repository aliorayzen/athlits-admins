import { VenueManagersDirectory } from "./_components/venue-managers-directory";

/** Dedicated venue-manager directory, wired to the live admin-user-controller
 *  endpoints (paginated list + activate/deactivate). */
export default function VenueManagersPage() {
  return <VenueManagersDirectory />;
}
