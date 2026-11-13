import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError, type ZodType } from "zod";
import type { ApiErrorCode } from "@/lib/api-types";

const STATUS: Record<ApiErrorCode, number> = {
  no_session: 401,
  invalid_input: 400,
  wrong_step: 409,
  not_paid: 403,
  card_declined: 402,
  insufficient_funds: 402,
  invalid_card: 400,
  internal: 500,
};

export class ApiError extends Error {
  constructor(public readonly code: ApiErrorCode) {
    super(code);
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError("invalid_input");
  }
  return schema.parse(body);
}

/** Wraps a route handler: maps domain errors to JSON responses and never leaks internals. */
export function handler<Args extends unknown[]>(fn: (...args: Args) => Promise<unknown>) {
  return async (...args: Args): Promise<Response> => {
    try {
      const data = await fn(...args);
      return Response.json(data ?? { ok: true });
    } catch (err) {
      // Let Next.js handle its own control-flow errors (e.g. request-time APIs during prerender).
      unstable_rethrow(err);
      if (err instanceof ApiError) return Response.json({ error: err.code }, { status: STATUS[err.code] });
      if (err instanceof ZodError) return Response.json({ error: "invalid_input" }, { status: 400 });
      console.error("[api] unhandled error", err);
      return Response.json({ error: "internal" }, { status: 500 });
    }
  };
}
