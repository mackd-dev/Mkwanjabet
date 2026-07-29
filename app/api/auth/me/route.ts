import { getCurrentUser } from "@/lib/server/auth";
import { fail, ok } from "@/lib/server/http";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("Hujaingia kwenye akaunti.", 401);
  return ok(user);
}
