import { PlayerBookingHistory } from "../../_components/player-booking-history";

export default async function PlayerHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ name?: string | string[] }>;
}) {
  const { playerId } = await params;
  const { name } = await searchParams;
  const playerName = typeof name === "string" ? name.slice(0, 120) : undefined;

  return <PlayerBookingHistory playerId={playerId} playerName={playerName} />;
}
