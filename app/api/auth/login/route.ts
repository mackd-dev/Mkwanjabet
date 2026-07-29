import { compare } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { fail, handleApiError, ok } from "@/lib/server/http";

const schema = z.object({ identifier: z.string().trim().min(5), password: z.string().min(8).max(72) });

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const normalized = input.identifier.includes("@") ? input.identifier.toLowerCase() : input.identifier.startsWith("+") ? input.identifier : `+${input.identifier}`;
    const user = await db.user.findFirst({ where: input.identifier.includes("@") ? { email: normalized } : { phone: normalized } });
    if (!user || !(await compare(input.password, user.passwordHash))) return fail("Simu/email au nenosiri si sahihi.", 401);
    if (user.status !== "ACTIVE") return fail("Akaunti hii haipo active. Wasiliana na msaada.", 403);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession({ sub: user.id, role: user.role });
    return ok({ id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role });
  } catch (error) {
    return handleApiError(error);
  }
}
