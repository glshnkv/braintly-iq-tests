import { headers } from "next/headers";
import { createSession, getFunnelState } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { requireSessionId, writeSessionId } from "@/server/session-cookie";
import { createSessionSchema } from "@/server/validation";

/** Current funnel state, used by pages to resume progress and guard steps. */
export const GET = handler(async () => getFunnelState(await requireSessionId()));

/** Starts a new test attempt (first answer on the landing). Always creates a fresh session. */
export const POST = handler(async (request: Request) => {
  const input = await parseJson(request, createSessionSchema);
  const h = await headers();
  const id = await createSession({
    ...input,
    userAgent: h.get("user-agent"),
    country: h.get("x-vercel-ip-country"),
  });
  await writeSessionId(id);
  return { ok: true };
});
