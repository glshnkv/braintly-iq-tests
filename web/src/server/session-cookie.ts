import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/config/product";
import { ApiError } from "./http";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readSessionId(): Promise<string | null> {
  const value = (await cookies()).get(SESSION_COOKIE.name)?.value;
  return value && UUID_RE.test(value) ? value : null;
}

export async function requireSessionId(): Promise<string> {
  const id = await readSessionId();
  if (!id) throw new ApiError("no_session");
  return id;
}

export async function writeSessionId(id: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE.name, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_COOKIE.maxAgeSeconds,
  });
}
