import { db } from "@/lib/server/db";
import { ok } from "@/lib/server/http";

export async function GET() {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return ok(plans);
}
