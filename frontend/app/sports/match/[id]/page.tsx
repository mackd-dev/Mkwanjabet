import MatchCenter from "../../../../components/MatchCenter";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MatchCenter matchId={id} />;
}
