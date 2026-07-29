import { ResultStatus } from "@prisma/client";
import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/http";
import { publicPickInclude, serializePick } from "@/lib/server/pick-select";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const statusParam = new URL(request.url).searchParams.get("status")?.toUpperCase();
  const status = Object.values(ResultStatus).includes(statusParam as ResultStatus) ? statusParam as ResultStatus : undefined;
  const picks = await db.pick.findMany({
    where: { status: { in: ["PUBLISHED", "SETTLED"] }, ...(status ? { result: status } : {}) },
    include: publicPickInclude,
    orderBy: [{ match: { kickoffAt: "desc" } }],
    take: 100,
  });
  const settled = picks.filter((pick) => pick.result === "WON" || pick.result === "LOST");
  const wins = settled.filter((pick) => pick.result === "WON").length;
  return ok({
    summary: {
      won: picks.filter((pick) => pick.result === "WON").length,
      lost: picks.filter((pick) => pick.result === "LOST").length,
      void: picks.filter((pick) => pick.result === "VOID").length,
      pending: picks.filter((pick) => pick.result === "PENDING").length,
      hitRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
    },
    results: picks.map((pick) => serializePick(pick, true)),
  });
}
