import { ManagerStaffDirectory } from "./_components/manager-staff-directory";

export default async function ManagerStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ managerId: string }>;
  searchParams: Promise<{ venueId?: string }>;
}) {
  const { managerId } = await params;
  const { venueId } = await searchParams;
  return <ManagerStaffDirectory managerId={managerId} venueId={venueId} />;
}
