import MatchAnalysisPage from "@/components/MatchAnalysisPage";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await params;
  return <MatchAnalysisPage />;
}
