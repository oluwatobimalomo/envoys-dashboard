import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase"
import { setSessionCookie } from "@/lib/session"
import { homeFor } from "@/lib/nav"

const rest = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  })

const hash = (u: string, p: string) => createHash("sha256").update(`${u.trim().toLowerCase()}:${p}`).digest("hex")

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}))
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 })
  }
  const uname = String(username).trim().toLowerCase()
  const pwd = String(password).trim()
  try {
    const r = await rest(`app_users?username=eq.${encodeURIComponent(uname)}&is_active=eq.true&select=*`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const rows = await r.json()
    if (!rows?.length) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 })
    const account = rows[0]
    const hashed = hash(uname, pwd)
    if (account.password_hash !== hashed) {
      if (account.password_hash === pwd) {
        // Legacy plain-text password: upgrade to the salted hash on first sign-in.
        await rest(`app_users?id=eq.${account.id}`, {
          method: "PATCH",
          body: JSON.stringify({ password_hash: hashed }),
        }).catch(() => {})
      } else {
        return NextResponse.json({ error: "Incorrect password." }, { status: 401 })
      }
    }
    const session = { role: account.role, user: account.display_name || account.username, username: account.username }
    await setSessionCookie(session)
    return NextResponse.json({ ok: true, session, redirect: homeFor(account.role) })
  } catch (e: any) {
    return NextResponse.json({ error: `Login failed: ${e.message}` }, { status: 500 })
  }
}
