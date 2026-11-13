import { checkout } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";
import { checkoutSchema } from "@/server/validation";

/** Simulated payment: no real provider, no card data stored beyond the last 4 digits. */
export const POST = handler(async (request: Request) =>
  checkout(await requireSessionId(), await parseJson(request, checkoutSchema)),
);
