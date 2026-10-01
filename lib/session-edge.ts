import { jwtVerify } from "jose"
import type { Session } from "@/lib/types"

export const SESSION_COOKIE = "envoys_session"

export async function decodeSession(token?: string | null): Promise<Session | null> {
  if (!token) return null
  try {
    const key = new TextEncoder().encode(process.env.AUTH_SECRET || "envoys-dev-secret-change-me")
    const { payload } = await jwtVerify(token, key)
    if (!payload.role || !payload.user) return null
    return { role: String(payload.role), user: String(payload.user), username: (payload.username as string) || null }
  } catch {
    return null
  }
}
