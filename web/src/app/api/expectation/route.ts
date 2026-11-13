import { saveExpectation } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";
import { expectationSchema } from "@/server/validation";

export const POST = handler(async (request: Request) => {
  await saveExpectation(await requireSessionId(), await parseJson(request, expectationSchema));
});
