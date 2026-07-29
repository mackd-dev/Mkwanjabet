import { hash } from "bcryptjs";
import { z } from "zod";
import { createSession } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { fail, handleApiError, ok } from "@/lib/server/http";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^\+?255\d{9}$/, "Tumia namba ya Tanzania, mfano 2557XXXXXXXX"),
  email: z.string().trim().email().optional().or(z.literal("")),
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  try {
    const input = schema.parse(await request.json());
    const phone = input.phone.startsWith("+") ? input.phone : `+${input.phone}`;
    const existing = await db.user.findFirst({ where: { OR: [{ phone }, ...(input.email ? [{ email: input.email.toLowerCase() }] : [])] } });
    if (existing) return fail("Akaunti yenye simu au barua pepe hiyo tayari ipo.", 409);

    const user = await db.user.create({
      data: { name: input.name, phone, email: input.email ? input.email.toLowerCase() : null, passwordHash: await hash(input.password, 12) },
      select: { id: true, name: true, phone: true, email: true, role: true },
    });
    await createSession({ sub: user.id, role: user.role });
    return ok(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
