import { db } from "@/lib/server/db";
import { fail, ok } from "@/lib/server/http";

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return ok({ service: "primeodds-api", database: "connected", timestamp: new Date().toISOString() });
  } catch {
    return fail("API iko hai lakini database haijaunganishwa.", 503);
  }
}
