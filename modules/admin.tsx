"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft, ArrowRight, BarChart2, CheckCircle2, Clock, Edit3, Flag, Phone, QrCode, RefreshCw, Shield, UserPlus, Users, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, SH, Segmented, SkeletonList, StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { BirthdaysWidget } from "@/components/app/widgets"
import { SectionLabel } from "@/components/app/charts"
import { useNav, useSession } from "@/components/app/session"
import { CSVImport } from "@/modules/first-timers"
import { ROLE_META } from "@/lib/nav"
import { cascadeRename, hashPassword, sb } from "@/lib/supabase"
import { fmtDate } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import { cn } from "@/lib/utils"

// ── My profile ─────────────────────────────────────────────────────────────
export function MyProfilePage() {
  const { user: currentUser, username, role, setUser } = useSession()
  const ri = ROLE_META[role] || ROLE_META.expteam
  const [account, setAccount] = useState<any>(null)
  const [loadErr, setLoadErr] = useState("")
  const [newName, setNewName] = useState(currentUser || "")
  const [namePwd, setNamePwd] = useState("")
  const [nameMsg, setNameMsg] = useState("")
  const [nameErr, setNameErr] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [curPwd, setCurPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confPwd, setConfPwd] = useState("")
  const [pwdMsg, setPwdMsg] = useState("")
  const [pwdErr, setPwdErr] = useState("")
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        let rows: any[] = []
        if (username) rows = await sb(`app_users?username=eq.${encodeURIComponent(username)}&select=*&limit=1`)
        if (!rows?.length && currentUser) rows = await sb(`app_users?display_name=eq.${encodeURIComponent(currentUser)}&select=*&limit=2`)
        if (rows?.length === 1) setAccount(rows[0])
        else setLoadErr("Could not uniquely identify your account. Sign out and back in, then try again.")
      } catch (e: any) { setLoadErr(e.message) }
    })()
  }, [username, currentUser])

  const verifyCurrent = async (pwd: string) => {
    const hashed = await hashPassword(account.username, pwd)
    return account.password_hash === hashed || account.password_hash === pwd
  }
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) { setNameErr("Display name cannot be empty."); return }
    if (trimmed === account.display_name) { setNameErr("That's already your display name."); return }
    if (!namePwd.trim()) { setNameErr("Enter your current password to confirm."); return }
    setSavingName(true); setNameErr(""); setNameMsg("")
    try {
      if (!(await verifyCurrent(namePwd.trim()))) { setNameErr("Current password is incorrect."); setSavingName(false); return }
      await cascadeRename(account.display_name, trimmed)
      await sb(`app_users?id=eq.${account.id}`, { method: "PATCH", body: JSON.stringify({ display_name: trimmed }) })
      setAccount((a: any) => ({ ...a, display_name: trimmed }))
      setNamePwd("")
      setNameMsg("Display name updated. Your assignments and call history have moved with it.")
      toast.success("Display name updated.")
      await setUser(trimmed)
    } catch (e: any) { setNameErr(e.message) }
    setSavingName(false)
  }
  const savePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!curPwd.trim() || !newPwd.trim()) { setPwdErr("Fill in all password fields."); return }
    if (newPwd.trim().length < 6) { setPwdErr("New password must be at least 6 characters."); return }
    if (newPwd.trim() !== confPwd.trim()) { setPwdErr("New passwords don't match."); return }
    setSavingPwd(true); setPwdErr(""); setPwdMsg("")
    try {
      if (!(await verifyCurrent(curPwd.trim()))) { setPwdErr("Current password is incorrect."); setSavingPwd(false); return }
      await sb(`app_users?id=eq.${account.id}`, { method: "PATCH", body: JSON.stringify({ password_hash: await hashPassword(account.username, newPwd.trim()) }) })
      setCurPwd(""); setNewPwd(""); setConfPwd("")
      setPwdMsg("Password updated. Use it from your next sign-in.")
      toast.success("Password updated.")
    } catch (e: any) { setPwdErr(e.message) }
    setSavingPwd(false)
  }

  if (loadErr) return <Notice type="error" msg={loadErr} />
  if (!account) return <SkeletonList rows={2} />
  return (
    <div className="mx-auto max-w-3xl animate-page-in">
      <PageHeader eyebrow="Account" title="My profile" subtitle="Manage your own account details." />
      <Panel className="mb-4 flex items-center gap-4">
        <PersonAvatar name={account.display_name || account.username} size={56} />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-extrabold">{account.display_name}</div>
          <div className="text-xs text-muted-foreground">@{account.username}</div>
        </div>
        <ToneBadge tone={ri.tone}>{ri.label}</ToneBadge>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <SH title="Change display name" icon={Edit3} />
          <Notice type="error" msg={nameErr} onClose={() => setNameErr("")} />
          <Notice type="success" msg={nameMsg} onClose={() => setNameMsg("")} />
          <form onSubmit={saveName}>
            <FieldInput label="Display name" value={newName} onChange={(e) => setNewName(e.target.value)} hint="Shown across the dashboard. Your assignments and history move with it automatically." />
            <FieldInput label="Current password" type="password" value={namePwd} onChange={(e) => setNamePwd(e.target.value)} placeholder="Confirm it's you" />
            <Button type="submit" disabled={savingName}>{savingName && <Spinner />}{savingName ? "Saving…" : "Update display name"}</Button>
          </form>
        </Panel>
        <Panel>
          <SH title="Change password" icon={Shield} />
          <Notice type="error" msg={pwdErr} onClose={() => setPwdErr("")} />
          <Notice type="success" msg={pwdMsg} onClose={() => setPwdMsg("")} />
          <form onSubmit={savePwd}>
            <FieldInput label="Current password" type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} />
            <FieldInput label="New password" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} hint="At least 6 characters" />
            <FieldInput label="Confirm new password" type="password" value={confPwd} onChange={(e) => setConfPwd(e.target.value)} />
            <Button type="submit" disabled={savingPwd}>{savingPwd && <Spinner />}{savingPwd ? "Saving…" : "Update password"}</Button>
          </form>
        </Panel>
      </div>
    </div>
  )
}

// ── Overview ───────────────────────────────────────────────────────────────
export function AdminOverview() {
  const nav = useNav()
  const { user } = useSession()
  const [counts, setCounts] = useState({ ft: 0, fb: 0, flagged: 0, users: 0, pending: 0 })
  useEffect(() => {
    ;(async () => {
      try {
        const [ft, fb, fl, us, pend] = await Promise.all([
          sb("first_timers?select=id"), sb("call_feedback?select=id"), sb("call_feedback?flagged_for_pastoral=eq.true&select=id"),
          sb("app_users?select=id"), sb("app_users?is_pending=eq.true&select=id").catch(() => []),
        ])
        setCounts({ ft: (ft || []).length, fb: (fb || []).length, flagged: (fl || []).length, users: (us || []).length, pending: (pend || []).length })
      } catch {}
    })()
  }, [])
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const actions = [
    { id: "admin_users", label: "Manage users", icon: Users, desc: "View, edit and deactivate staff accounts", tone: "bg-brand-tint text-primary" },
    { id: "admin_adduser", label: "Add new user", icon: UserPlus, desc: "Create a staff account and assign a role", tone: "bg-brand-tint text-primary" },
    { id: "firsttimers", label: "First-timers", icon: Users, desc: "Browse and edit all visitor records", tone: "bg-info-tint text-info" },
    { id: "report", label: "Full report", icon: BarChart2, desc: "Open the pastoral retention dashboard", tone: "bg-gold-tint text-gold-ink" },
    { id: "appraisal_qr", label: "Appraisal QR", icon: QrCode, desc: "Get the stewards appraisal link and QR code", tone: "bg-soul-tint text-soul" },
    { id: "flagged", label: "Flagged records", icon: Flag, desc: "Review escalated cases", tone: "bg-danger-tint text-danger" },
  ]
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Administration" title={`${greeting}, ${user.split(" ")[0]}`} subtitle="A system-wide summary of retention across The Envoys." />
      {counts.pending > 0 && (
        <Panel className="mb-5 flex flex-wrap items-center gap-3 border-gold/40 bg-gold-tint p-4 sm:p-4">
          <span className="grid size-9 place-items-center rounded-sm bg-gold text-on-gold"><UserPlus className="size-4" /></span>
          <span className="flex-1 text-[13.5px] font-semibold text-gold-ink">{counts.pending} account request{counts.pending !== 1 ? "s" : ""} waiting for your approval</span>
          <Button size="sm" variant="gold" onClick={() => nav("admin_users")}>Review requests<ArrowRight /></Button>
        </Panel>
      )}
      <StatGrid>
        <StatCard label="First-timers" value={counts.ft} icon={Users} tone="brand" onClick={() => nav("firsttimers")} />
        <StatCard label="Calls logged" value={counts.fb} icon={Phone} tone="brand" onClick={() => nav("callqueue")} />
        <StatCard label="Flagged" value={counts.flagged} icon={Flag} tone="danger" onClick={() => nav("flagged")} />
        <StatCard label="System users" value={counts.users} icon={Shield} tone="gold" onClick={() => nav("admin_users")} />
      </StatGrid>
      <div className="mb-8"><BirthdaysWidget /></div>
      <SectionLabel>Quick actions</SectionLabel>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((a) => (
          <button key={a.id} onClick={() => nav(a.id)} className="group flex items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-xs transition-[translate,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", a.tone)}><a.icon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[14px] font-bold">{a.label}</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">{a.desc}</span>
            </span>
            <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </div>
      <SectionLabel>Bulk data import</SectionLabel>
      <CSVImport />
    </div>
  )
}

// ── Users ──────────────────────────────────────────────────────────────────
const ROLE_GROUPS: Record<string, string> = { soulcare: "soulcare", soulcareadmin: "soulcare", expteam: "expteam", experienceadmin: "expteam" }
const GROUP_LABELS: Record<string, string> = { soulcare: "Soul Care", expteam: "Experience Team" }
const ADMIN_VARIANTS = new Set(["soulcareadmin", "experienceadmin"])
const groupOf = (u: any) => ROLE_GROUPS[u.role] || u.role
const groupLabel = (g: string) => GROUP_LABELS[g] || ROLE_META[g]?.label || g

function AdminUsers({ onEdit }: { onEdit: (u: any) => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [msg, setMsg] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers((await sb("app_users?order=created_at.desc")) || []) } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const toggleActive = async (u: any) => {
    try { await sb(`app_users?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) }); toast.success(`${u.username} ${u.is_active ? "deactivated" : "reactivated"}.`); load() } catch (e: any) { setErr(e.message) }
  }
  const approve = async (u: any) => {
    try { await sb(`app_users?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: true, is_pending: false }) }); setMsg(`${u.display_name || u.username} approved. They can sign in now.`); toast.success(`${u.display_name || u.username} approved.`); load() } catch (e: any) { setErr(e.message) }
  }
  const reject = async (u: any) => {
    try { await sb(`app_users?id=eq.${u.id}`, { method: "DELETE", prefer: "return=minimal" }); setMsg("Request rejected."); toast.info("Account request rejected."); load() } catch (e: any) { setErr(e.message) }
  }

  const pendingCount = users.filter((u) => u.is_pending).length
  const roleCounts: Record<string, number> = {}
  users.forEach((u) => { const g = groupOf(u); roleCounts[g] = (roleCounts[g] || 0) + 1 })
  const filters = [{ value: "all", label: "All", count: users.length }, ...Object.keys(roleCounts).sort((a, b) => groupLabel(a).localeCompare(groupLabel(b))).map((g) => ({ value: g, label: groupLabel(g), count: roleCounts[g] }))]
  const scoped = roleFilter === "all" ? users : users.filter((u) => groupOf(u) === roleFilter)
  const tier = (u: any) => (u.is_pending ? 0 : u.is_active ? 1 : 2)
  const sorted = [...scoped].sort((a, b) => tier(a) - tier(b) || (ADMIN_VARIANTS.has(a.role) ? 0 : 1) - (ADMIN_VARIANTS.has(b.role) ? 0 : 1) || (a.display_name || a.username || "").localeCompare(b.display_name || b.username || ""))
  const { count, sentinel, hasMore } = useInfiniteReveal(roleFilter, sorted.length, 30)

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Administration" title="System users" subtitle={`${sorted.length} of ${users.length} account${users.length !== 1 ? "s" : ""}${pendingCount ? ` · ${pendingCount} waiting for approval` : ""}`}
        action={<Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>} />
      <Toolbar><Segmented value={roleFilter} onChange={setRoleFilter} options={filters} /></Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <Notice type="success" msg={msg} onClose={() => setMsg("")} />
      {loading ? <SkeletonList rows={5} /> : sorted.length === 0 ? <EmptyState icon={Users} title="No users in this team" /> : (
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {sorted.slice(0, count).map((u) => {
            const rm = ROLE_META[u.role] || ROLE_META.dofficer
            return (
              <Panel key={u.id} className={cn("flex flex-col p-4 sm:p-4", u.is_pending && "border-gold/50", !u.is_active && !u.is_pending && "opacity-70")}>
                <div className="flex items-center gap-3">
                  <PersonAvatar name={u.display_name || u.username} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{u.display_name || u.username}</div>
                    <div className="truncate text-xs text-muted-foreground">@{u.username}{u.created_at ? ` · Joined ${fmtDate(u.created_at)}` : ""}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <ToneBadge tone={rm.tone}>{rm.label}</ToneBadge>
                  {u.is_pending && <ToneBadge tone="gold" icon={Clock}>Pending approval</ToneBadge>}
                  {!u.is_active && !u.is_pending && <ToneBadge tone="danger">Inactive</ToneBadge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                  {u.is_pending ? (
                    <>
                      <Button size="sm" onClick={() => approve(u)}><CheckCircle2 />Approve</Button>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setRejectTarget(u)}><X />Reject</Button>
                      <Button size="sm" variant="ghost" onClick={() => onEdit(u)}><Edit3 />Edit role</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onEdit(u)}><Edit3 />Edit</Button>
                      <Button size="sm" variant="ghost" className={cn(u.is_active && "text-danger")} onClick={() => toggleActive(u)}>{u.is_active ? "Deactivate" : "Reactivate"}</Button>
                    </>
                  )}
                </div>
              </Panel>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      <AlertDialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this request?</AlertDialogTitle>
            <AlertDialogDescription>The account request from &ldquo;{rejectTarget?.display_name || rejectTarget?.username}&rdquo; will be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { const u = rejectTarget; setRejectTarget(null); reject(u) }}>Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const ROLE_OPTIONS = [
  ["dofficer", "Data Officer", "Add and edit first-timer records, generate QR codes"],
  ["expteam", "Experience Team", "My Calls, call queue, log feedback, flag for pastoral"],
  ["pasteam", "Pastoral Team", "Report, all feedback, flagged records"],
  ["soulcare", "Soul Care", "Members and Stewards Care, care priority list, My New Converts"],
  ["research", "Research Team", "View and download service feedback"],
  ["testimonyteam", "Testimony Team", "View, project and download the Testimony Bank"],
  ["trainingteam", "Training Team", "The Training Module (Potential Envoys and new converts due for training)"],
  ["admin", "Admin", "Everything above, plus user management and bulk import"],
  ["experienceadmin", "Experience Admin", "Assign contacts, view the call queue and all feedback"],
  ["soulcareadmin", "Soul Care Admin", "Care channels, new convert assignment, retention dashboards"],
  ["connectcentre", "Connect Centre", "Confirm prospective connect centre members"],
]

export function AdminAddUser({ editUser, onSuccess, onCancel }: { editUser?: any; onSuccess: () => void; onCancel?: () => void }) {
  const [form, setForm] = useState<any>({ username: editUser?.username || "", password: "", display_name: editUser?.display_name || "", role: editUser?.role || "expteam", is_active: editUser?.is_active ?? true })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (v: any) => setForm((f: any) => ({ ...f, [key]: v && v.target !== undefined ? v.target.value : v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username.trim()) { setErr("Username is required."); return }
    if (!editUser && !form.password.trim()) { setErr("Password is required for new users."); return }
    const uname = form.username.trim().toLowerCase()
    if (editUser && uname !== editUser.username && !form.password.trim()) { setErr("Changing a username requires setting the password again (enter it in the password field)."); return }
    setLoading(true); setErr("")
    try {
      const payload = { username: uname, display_name: form.display_name.trim() || form.username.trim(), role: form.role, is_active: form.is_active, ...(form.password.trim() ? { password_hash: await hashPassword(uname, form.password.trim()) } : {}) }
      if (editUser?.id) await sb(`app_users?id=eq.${editUser.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      else await sb("app_users", { method: "POST", body: JSON.stringify(payload) })
      toast.success(editUser ? "User updated." : "User created.")
      onSuccess()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-4xl animate-page-in">
      <PageHeader eyebrow="Administration" title={editUser ? "Edit user" : "Add new user"} action={onCancel && <Button type="button" variant="outline" onClick={onCancel}><ArrowLeft />Back</Button>} />
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Panel>
          <SH title="Account" icon={UserPlus} />
          <FieldInput label="Username" required value={form.username} onChange={set("username")} placeholder="e.g. soulcare1" hint="Lowercase, no spaces. Used to sign in." />
          <FieldInput label="Display name" value={form.display_name} onChange={set("display_name")} placeholder="e.g. Tunde Adeyemi" hint="Full name shown on the dashboard" />
          <FieldInput label={editUser ? "New password (leave blank to keep current)" : "Password"} type="password" required={!editUser} value={form.password} onChange={set("password")} />
          <FieldInput label="Account active" type="bool-toggle" value={form.is_active} onChange={set("is_active")} />
          <Button type="submit" size="lg" className="mt-2 w-full" disabled={loading}>{loading && <Spinner />}{loading ? "Saving…" : editUser ? "Update user" : "Create user"}</Button>
        </Panel>
        <Panel>
          <SH title="Role" icon={Shield} />
          <div className="grid gap-2" role="radiogroup" aria-label="Role">
            {ROLE_OPTIONS.map(([value, label, desc]) => {
              const on = form.role === value
              return (
                <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setForm((f: any) => ({ ...f, role: value }))}
                  className={cn("flex items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors", on ? "border-primary bg-brand-tint" : "border-border hover:bg-muted")}>
                  <span className={cn("mt-1 grid size-4 shrink-0 place-items-center rounded-full border-2", on ? "border-primary" : "border-border-strong")}>{on && <span className="size-2 rounded-full bg-primary" />}</span>
                  <span>
                    <span className={cn("block text-[13.5px] font-semibold", on && "text-primary-strong")}>{label}</span>
                    <span className="block text-xs text-muted-foreground">{desc}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Panel>
      </div>
    </form>
  )
}

export function AdminUsersScreen() {
  const [edit, setEdit] = useState<any>(null)
  if (edit) return <AdminAddUser editUser={edit} onCancel={() => setEdit(null)} onSuccess={() => setEdit(null)} />
  return <AdminUsers onEdit={setEdit} />
}
export function AdminAddUserScreen() {
  const nav = useNav()
  return <AdminAddUser onSuccess={() => nav("admin_users")} onCancel={() => nav("admin_overview")} />
}
