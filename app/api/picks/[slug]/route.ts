import { db } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";
import { publicPickInclude, serializePick } from "@/lib/server/pick-select";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const pick = await db.pick.findUnique({ where: { slug }, include: publicPickInclude });
  if (!pick || pick.status === "DRAFT") return fail("Pick haijapatikana.", 404);
  return ok(serializePick(pick));
}
