import { logClientEvent } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { readSessionId } from "@/server/session-cookie";
import { eventSchema } from "@/server/validation";

/** Client-side funnel events. Names are whitelisted to keep analytics clean. */
export const POST = handler(async (request: Request) => {
  const { name, props } = await parseJson(request, eventSchema);
  await logClientEvent(await readSessionId(), name, props);
});
