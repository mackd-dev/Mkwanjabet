import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, error: { message, details } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) return fail("Taarifa ulizoweka hazijakamilika au si sahihi.", 422, error.flatten());
  console.error(error);
  return fail("Hitilafu imetokea kwenye seva. Jaribu tena.", 500);
}
