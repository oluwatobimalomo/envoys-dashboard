"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session } from "@/lib/types"
import { pathFor } from "@/lib/nav"

type Ctx = Session & { setUser: (name: string) => Promise<void>; logout: () => Promise<void> }
const SessionCtx = createContext<Ctx | null>(null)

export function SessionProvider({ session, children }: { session: Session; children: React.ReactNode }) {
  const [s, setS] = useState(session)
  const router = useRouter()
  const setUser = useCallback(async (name: string) => {
    const r = await fetch("/api/auth/refresh", { method: "POST", body: JSON.stringify({ user: name }) })
    const j = await r.json().catch(() => ({}))
    if (j.session) setS(j.session)
    router.refresh()
  }, [router])
  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    try { localStorage.removeItem("envoys_last_active_v1") } catch {}
    router.replace("/login")
    router.refresh()
  }, [router])
  return <SessionCtx.Provider value={{ ...s, setUser, logout }}>{children}</SessionCtx.Provider>
}

export function useSession() {
  const c = useContext(SessionCtx)
  if (!c) throw new Error("useSession outside SessionProvider")
  return c
}

/** Navigate to a module by its legacy nav id ("members_care" → /members-care). */
export function useNav() {
  const router = useRouter()
  return useCallback((id: string) => router.push(pathFor(id)), [router])
}
