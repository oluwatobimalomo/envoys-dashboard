import "server-only"
import { SignJWT } from "jose"
import { cookies } from "next/headers"
import type { Session } from "@/lib/types"

import { SESSION_COOKIE, decodeSession } from "@/lib/session-edge"
export { SESSION_COOKIE, decodeSession }
const TTL_SECONDS = 12 * 60 * 60 // 12 hours, as before

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s && process.env.NODE_ENV === "production") {
    console.warn("[envoys] AUTH_SECRET is not set — using an insecure fallback. Set it in Vercel project settings.")
  }
  return new TextEncoder().encode(s || "envoys-dev-secret-change-me")
}

export async function encodeSession(s: Session) {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret())
}

export async function getSession() {
  const jar = await cookies()
  return decodeSession(jar.get(SESSION_COOKIE)?.value)
}

export async function setSessionCookie(s: Session) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, await encodeSession(s), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SECONDS,
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}
