import { AdminBookingFlow } from "@/app/dashboard/bookings/_components/admin-booking-flow";

export default async function NewCourtBookingPage({
  params,
}: {
  params: Promise<{ venueId: string; courtId: string }>;
}) {
  const { venueId, courtId } = await params;

  return (
    <AdminBookingFlow
      initialVenueId={venueId}
      initialCourtId={courtId}
      backHref={`/dashboard/venues/${venueId}`}
    />
  );
}
