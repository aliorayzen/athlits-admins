import { VenueManagersDirectory } from "./_components/venue-managers-directory";

/** Dedicated venue-manager directory, wired to the live admin-user-controller
 *  endpoints (paginated list + activate/deactivate). */
export default async function VenueManagersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search = "" } = await searchParams;
  return <VenueManagersDirectory initialSearch={search} />;
}
