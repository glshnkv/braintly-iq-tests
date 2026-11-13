import { submitLead } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";
import { leadSchema } from "@/server/validation";

export const POST = handler(async (request: Request) => {
  await submitLead(await requireSessionId(), await parseJson(request, leadSchema));
});
