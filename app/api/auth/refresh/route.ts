import { NextResponse } from "next/server"
import { getSession, setSessionCookie } from "@/lib/session"

// Re-issues the session cookie after a display-name change (My Profile).
export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const { user } = await req.json().catch(() => ({}))
  const next = { ...s, user: String(user || s.user).trim() || s.user }
  await setSessionCookie(next)
  return NextResponse.json({ ok: true, session: next })
}
