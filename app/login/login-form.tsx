"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { FieldInput, Notice } from "@/components/app/kit"
import { CREDS_MISSING, hashPassword, sb } from "@/lib/supabase"

const SIGNUP_ROLES = [
  { value: "expteam", label: "Experience Team" },
  { value: "soulcare", label: "Soul Care" },
  { value: "dofficer", label: "Data Officer" },
  { value: "pasteam", label: "Pastoral Team" },
  { value: "research", label: "Research Team" },
  { value: "testimonyteam", label: "Testimony Team" },
  { value: "trainingteam", label: "Training Team" },
  { value: "connectcentre", label: "Connect Centre" },
]

const HASH_ROUTES: Record<string, string> = {
  "#register": "/register", "#feedback": "/feedback", "#testimony": "/testimony",
  "#new-convert": "/new-convert", "#nom-register": "/nom-register", "#appraisal": "/appraisal",
}

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<"signin" | "request">("signin")
  const [u, setU] = useState("")
  const [p, setP] = useState("")
  const [err, setErr] = useState("")
  const [loading, setLoading] = useState(false)

  const [rUser, setRUser] = useState("")
  const [rName, setRName] = useState("")
  const [rRole, setRRole] = useState("")
  const [rPwd, setRPwd] = useState("")
  const [rConf, setRConf] = useState("")
  const [rErr, setRErr] = useState("")
  const [rBusy, setRBusy] = useState(false)
  const [rDone, setRDone] = useState(false)

  // Old QR codes used hash links (/#register) — forward them to the public pages.
  useEffect(() => {
    const target = HASH_ROUTES[window.location.hash]
    if (target) router.replace(target)
  }, [router])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!u.trim() || !p.trim()) { setErr("Enter your username and password."); return }
    setLoading(true); setErr("")
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) })
      const j = await r.json()
      if (!r.ok) { setErr(j.error || "Sign-in failed."); setLoading(false); return }
      const next = params.get("next")
      router.replace(next && next.startsWith("/") ? next : j.redirect)
      router.refresh()
    } catch (e: any) {
      setErr(`Login failed: ${e.message}`); setLoading(false)
    }
  }

  const requestAccess = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const uname = rUser.trim().toLowerCase()
    if (!/^[a-z0-9_.-]{3,24}$/.test(uname)) { setRErr("Username: 3–24 characters, lowercase letters, numbers, . _ - only."); return }
    if (!rRole) { setRErr("Select the team you serve on."); return }
    if (rPwd.trim().length < 6) { setRErr("Password must be at least 6 characters."); return }
    if (rPwd.trim() !== rConf.trim()) { setRErr("Passwords don't match."); return }
    setRBusy(true); setRErr("")
    try {
      const existing = await sb(`app_users?username=eq.${encodeURIComponent(uname)}&select=id&limit=1`)
      if (existing?.length) { setRErr("That username is already taken — choose another."); setRBusy(false); return }
      await sb("app_users", {
        method: "POST",
        body: JSON.stringify({
          username: uname, display_name: rName.trim() || uname, role: rRole,
          password_hash: await hashPassword(uname, rPwd.trim()), is_active: false, is_pending: true,
        }),
      })
      setRDone(true)
    } catch (e: any) { setRErr(e.message) }
    setRBusy(false)
  }

  const switchMode = (m: "signin" | "request") => { setMode(m); setErr(""); setRErr(""); setRDone(false) }

  if (mode === "signin")
    return (
      <div className="animate-page-in">
        <h2 className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.015em]">Welcome back</h2>
        <p className="mt-1.5 mb-7 text-[13.5px] text-muted-foreground">Sign in to continue to your dashboard.</p>
        {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY." />}
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <form onSubmit={submit} noValidate>
          <FieldInput label="Username" id="lu" value={u} onChange={(e) => setU(e.target.value)} placeholder="e.g. expteam1" />
          <FieldInput label="Password" id="lp" type="password" value={p} onChange={(e) => setP(e.target.value)} />
          <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
            {loading && <Spinner />}{loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          New team member?{" "}
          <button onClick={() => switchMode("request")} className="font-semibold text-primary hover:underline">Request access</button>
        </p>
      </div>
    )

  if (rDone)
    return (
      <div className="animate-page-in text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brand-tint text-primary"><CheckCircle2 className="size-7" /></span>
        <h2 className="font-display text-[22px] font-extrabold">Request submitted</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
          An admin will review and approve your account. Once approved, sign in with the username and password you chose.
        </p>
        <Button variant="outline" className="mt-5" onClick={() => switchMode("signin")}><ArrowLeft />Back to sign in</Button>
      </div>
    )

  return (
    <div className="animate-page-in">
      <h2 className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.015em]">Request access</h2>
      <p className="mt-1.5 mb-6 text-[13.5px] text-muted-foreground">Create your account. An admin approves it before you can sign in.</p>
      <Notice type="error" msg={rErr} onClose={() => setRErr("")} />
      <form onSubmit={requestAccess} noValidate>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FieldInput label="Username" id="ru" required value={rUser} onChange={(e) => setRUser(e.target.value)} placeholder="e.g. tunde.a" hint="Lowercase, no spaces" />
          <FieldInput label="Full name" id="rn" value={rName} onChange={(e) => setRName(e.target.value)} placeholder="e.g. Tunde Adeyemi" />
        </div>
        <FieldInput label="Which team do you serve on?" id="rr" type="select" required value={rRole} onChange={(e) => setRRole(e.target.value)} options={SIGNUP_ROLES} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FieldInput label="Password" id="rp" type="password" required value={rPwd} onChange={(e) => setRPwd(e.target.value)} hint="At least 6 characters" />
          <FieldInput label="Confirm password" id="rc" type="password" required value={rConf} onChange={(e) => setRConf(e.target.value)} />
        </div>
        <Button type="submit" variant="gold" size="lg" className="mt-1 w-full" disabled={rBusy}>
          {rBusy && <Spinner />}{rBusy ? "Submitting…" : "Submit request"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <button onClick={() => switchMode("signin")} className="font-semibold text-primary hover:underline">Sign in</button>
      </p>
    </div>
  )
}
