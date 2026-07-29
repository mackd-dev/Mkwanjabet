import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/http";
import { publicPickInclude, serializePick } from "@/lib/server/pick-select";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const access = url.searchParams.get("access")?.toUpperCase();
  const minConfidence = Number(url.searchParams.get("minConfidence") ?? 0);
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);

  const picks = await db.pick.findMany({
    where: {
      status: "PUBLISHED",
      match: { kickoffAt: { gte: start, lte: end } },
      confidence: { gte: Number.isFinite(minConfidence) ? minConfidence : 0 },
      ...(access === "FREE" || access === "PREMIUM" ? { access } : {}),
    },
    include: publicPickInclude,
    orderBy: [{ featured: "desc" }, { confidence: "desc" }, { match: { kickoffAt: "asc" } }],
  });
  return ok({ date: start.toISOString().slice(0, 10), total: picks.length, picks: picks.map((pick) => serializePick(pick)) });
}
