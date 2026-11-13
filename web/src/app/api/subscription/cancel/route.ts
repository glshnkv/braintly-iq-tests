import { cancelSubscription } from "@/server/funnel";
import { handler } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";

export const POST = handler(async () => cancelSubscription(await requireSessionId()));
