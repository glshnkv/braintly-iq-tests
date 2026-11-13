import { headers } from "next/headers";
import { completeTest } from "@/server/funnel";
import { handler, parseJson } from "@/server/http";
import { requireSessionId } from "@/server/session-cookie";
import { profileSchema } from "@/server/validation";

/** Saves gender and age group (asked after the last question) and computes the result. */
export const POST = handler(async (request: Request) => {
  const sessionId = await requireSessionId();
  const { gender, ageGroup } = await parseJson(request, profileSchema);
  await completeTest(sessionId, { gender, ageGroup, country: (await headers()).get("x-vercel-ip-country") });
});
