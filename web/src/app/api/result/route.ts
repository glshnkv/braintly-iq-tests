import { getFullResult } from "@/server/funnel";
import { handler } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";

/** Full report. Returns 403 `not_paid` until the session has a subscription. */
export const GET = handler(async () => getFullResult(await requireSessionId()));
