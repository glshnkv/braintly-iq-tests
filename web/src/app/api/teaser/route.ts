import { getTeaser } from "@/server/funnel";
import { handler } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";

/** Partial result shown before payment. Never includes the IQ score itself. */
export const GET = handler(async () => getTeaser(await requireSessionId()));
