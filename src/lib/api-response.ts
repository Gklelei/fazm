import { NextResponse } from "next/server";

/**
 * Shared JSON error/success envelope for API route handlers, so responses
 * are consistent (always JSON, always the right status code) instead of the
 * previous mix of `{error}`, `{ok:false,error}`, and bare-string responses
 * scattered across route handlers.
 */
export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
