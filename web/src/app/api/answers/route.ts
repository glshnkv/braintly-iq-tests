import { recordAnswer } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";
import { answerSchema } from "@/server/validation";

export const POST = handler(async (request: Request) =>
  recordAnswer(await requireSessionId(), await parseJson(request, answerSchema)),
);
