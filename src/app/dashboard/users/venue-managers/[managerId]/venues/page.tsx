import { ManagerVenuesDirectory } from "./manager-venues-directory";

export default async function ManagerVenuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ managerId: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  const [{ managerId }, query] = await Promise.all([params, searchParams]);
  const managerName = Array.isArray(query.name) ? query.name[0] : query.name;

  return (
    <ManagerVenuesDirectory
      managerId={managerId}
      managerName={managerName?.trim() || undefined}
    />
  );
}
