import { PlayersDirectory } from "./_components/players-directory";

/** Read-only players (customer) directory, wired to the live
 *  admin-user-controller customers endpoint (paginated). */
export default function PlayersPage() {
  return <PlayersDirectory />;
}
