"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle, ArrowLeft, CheckCircle2, Clock, Download, Edit3, Flag, Heart, Info, Phone, RefreshCw, Search, Star, TrendingUp,
  UserCheck, UserPlus, X, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  DataTable, EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SearchInput, Segmented, SkeletonBoard,
  SkeletonList, SkeletonReport, StatCard, StatGrid, ToneBadge, Toolbar, ViewToggle, td, th, usePersistentState,
} from "@/components/app/kit"
import { DateRangeBar, QRCodePage } from "@/components/app/shared"
import { ChartCard, Donut, VBars } from "@/components/app/charts"
import { DueTodayPanel } from "@/components/app/widgets"
import { PublicShell, ThankYou } from "@/components/app/public-shell"
import { useSession } from "@/components/app/session"
import { AssignControl } from "@/modules/vip-contact"
import { sb, CREDS_MISSING } from "@/lib/supabase"
import { CALL_STATUS_OPTIONS, csvCell, downloadBlob, fmtDate, normaliseStatus, phoneKey, statusMeta, todayISO } from "@/lib/format"
import { useInfiniteReveal, useRoleUsers } from "@/lib/hooks"
import { cn } from "@/lib/utils"

export function ncCheckinsLogged(fbRows: any[]) {
  const done = new Set<number>()
  ;(fbRows || []).forEach((r) => r.checkin_number && done.add(r.checkin_number))
  return done
}
export function ncNextCheckin(fbRows: any[]) {
  const done = ncCheckinsLogged(fbRows)
  for (let m = 1; m <= 3; m++) if (!done.has(m)) return m
  return null
}
export const ncComplete = (fbRows: any[]) => ncNextCheckin(fbRows) === null

const FILL: Record<string, string> = { Reached: "bg-primary text-primary-foreground", "Call Back": "bg-gold text-on-gold", "Incorrect Contact": "bg-danger text-white" }

export function NCPipelineBar({ fbRows, trainingCompleted }: { fbRows: any[]; trainingCompleted: boolean }) {
  const done = ncCheckinsLogged(fbRows)
  const complete = ncComplete(fbRows)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[1, 2, 3].map((m) => {
        const row = (fbRows || []).find((r) => r.checkin_number === m)
        return (
          <span key={m} className={cn("rounded-sm px-2 py-1 text-[11px] font-bold", done.has(m) ? FILL[normaliseStatus(row?.call_status) || ""] || "bg-primary text-primary-foreground" : "border border-dashed border-border-strong text-muted-foreground")}>
            Week {m}
          </span>
        )
      })}
      <ToneBadge tone={trainingCompleted ? "brand" : "gold"} icon={trainingCompleted ? CheckCircle2 : Clock}>Training {trainingCompleted ? "complete" : "pending"}</ToneBadge>
      {complete ? <ToneBadge tone="brand" icon={CheckCircle2}>3 weeks complete</ToneBadge> : <span className="text-[11px] text-muted-foreground">Next: Week {ncNextCheckin(fbRows)}</span>}
    </div>
  )
}

export function useNewConvertData(dateFrom?: string, dateTo?: string) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        let q = "new_converts?order=created_at.desc&limit=1000"
        if (dateFrom) q += `&conversion_date=gte.${dateFrom}`
        if (dateTo) q += `&conversion_date=lte.${dateTo}`
        const [ncRows, ciRows, asgRows] = await Promise.all([
          sb(q), sb("new_converts_checkins?select=*&order=created_at.asc"), sb("new_converts_assignments?select=*").catch(() => []),
        ])
        const ciMap: Record<string, any[]> = {}
        ;(ciRows || []).forEach((c: any) => (ciMap[c.new_convert_id] ||= []).push(c))
        const asgMap: Record<string, any> = {}
        ;(asgRows || []).forEach((a: any) => (asgMap[a.new_convert_id] = a))
        if (!cancelled) setData((ncRows || []).map((r: any) => ({ ...r, fbRows: ciMap[r.id] || [], assignment: asgMap[r.id] || null })))
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tick, dateFrom, dateTo])
  return { data, loading, err, reload }
}

export function usePotentialEnvoyData() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try { const rows = await sb("potential_envoys?order=created_at.desc&limit=500"); if (!cancelled) setData(rows || []) } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tick])
  return { data, loading, err, reload }
}

async function findNewConvertDupes(phone: string) {
  const key = phoneKey(phone)
  if (!key) return []
  const rows = await sb("new_converts?select=id,full_name,phone,conversion_date&limit=2000").catch(() => [])
  return (rows || []).filter((r: any) => phoneKey(r.phone) === key)
}

function useDupes(phone: string) {
  const [dupes, setDupes] = useState<any[]>([])
  useEffect(() => {
    if (!phoneKey(phone)) { setDupes([]); return }
    let cancelled = false
    const t = setTimeout(async () => { const f = await findNewConvertDupes(phone); if (!cancelled) setDupes(f) }, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [phone])
  return dupes
}

const GENDERS = [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]

// ── Public form ────────────────────────────────────────────────────────────
export function PublicNewConvertPage() {
  const [form, setForm] = useState({ full_name: "", phone: "", gender: "", conversion_type: "New Salvation" })
  const dupes = useDupes(form.phone)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (e: any) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim()) { setErr("Full name and phone are required."); return }
    setLoading(true); setErr("")
    try {
      await sb("new_converts", { method: "POST", body: JSON.stringify({ full_name: form.full_name.trim(), phone: form.phone.trim(), gender: form.gender || null, conversion_type: form.conversion_type, source: "QR" }) })
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  if (done) return <ThankYou tone="soul" title="Welcome to the family!">We&apos;re so glad you took this step. Our Soul Care team will reach out to walk this journey with you.</ThankYou>
  return (
    <PublicShell title="Welcome to" accent="new life" subtitle="Tell us a little about yourself so our team can support you." width="max-w-lg">
      <Panel>
        {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <form onSubmit={submit} noValidate>
          <FieldInput label="Full name" required value={form.full_name} onChange={set("full_name")} />
          <FieldInput label="Phone number" type="tel" required value={form.phone} onChange={set("phone")} />
          {dupes.length > 0 && (
            <div className="-mt-1 mb-4 flex gap-2 rounded-sm bg-soul-tint px-3.5 py-2.5 text-[13px] text-soul">
              <Info className="mt-0.5 size-4 shrink-0" />Looks like we may already have your details. Go ahead and submit, and our team will make sure everything&apos;s up to date.
            </div>
          )}
          <FieldInput label="Gender" type="select" value={form.gender} onChange={set("gender")} options={GENDERS} />
          <FieldInput label="This was my…" type="select" value={form.conversion_type} onChange={set("conversion_type")}
            options={[{ value: "New Salvation", label: "First time giving my life to Christ" }, { value: "Rededication", label: "Rededication of my life to Christ" }]} />
          <Button type="submit" variant="soul" size="lg" className="w-full" disabled={loading}>{loading && <Spinner />}{loading ? "Submitting…" : "Submit"}</Button>
        </form>
      </Panel>
    </PublicShell>
  )
}

export function NewConvertQR() {
  return <QRCodePage eyebrow="New Converts" title="New convert QR code" subtitle="Display this at the altar-call station. New believers scan it to connect with Soul Care." path="/new-convert" fileName="envoys-new-convert-qr.png" color="#5b21b6" label="New convert URL" />
}

// ── Add (manual) ───────────────────────────────────────────────────────────
function AddNewConvertPage({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const { user: currentUser } = useSession()
  const [form, setForm] = useState({ full_name: "", phone: "", gender: "", conversion_type: "New Salvation", conversion_date: todayISO() })
  const dupes = useDupes(form.phone)
  const [saveAnyway, setSaveAnyway] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  useEffect(() => setSaveAnyway(false), [form.phone])
  const set = (key: string) => (e: any) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim()) { setErr("Full name and phone are required."); return }
    if (dupes.length > 0 && !saveAnyway) { setSaveAnyway(true); setErr("This phone number may already be on record. Press the button again to save anyway if this is genuinely a new person."); return }
    setLoading(true); setErr("")
    try {
      await sb("new_converts", { method: "POST", body: JSON.stringify({ full_name: form.full_name.trim(), phone: form.phone.trim(), gender: form.gender || null, conversion_type: form.conversion_type, conversion_date: form.conversion_date, source: "Manual", added_by: currentUser || null }) })
      toast.success("New convert added.")
      onDone()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl animate-page-in">
      <PageHeader eyebrow="New Converts" title="Add new convert" subtitle="Log someone who gave their life to Christ or rededicated at a service." action={<Button type="button" variant="outline" onClick={onCancel}><ArrowLeft />Back</Button>} />
      <Panel>
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FieldInput label="Full name" required value={form.full_name} onChange={set("full_name")} />
          <FieldInput label="Phone number" type="tel" required value={form.phone} onChange={set("phone")} />
        </div>
        {dupes.length > 0 && (
          <div className="-mt-1 mb-4 rounded-sm border border-warning/30 bg-warning-tint px-3.5 py-2.5">
            <div className="mb-1 text-xs font-bold text-warning">Possible duplicate</div>
            {dupes.slice(0, 3).map((d) => <div key={d.id} className="text-xs text-ink-secondary"><strong>{d.full_name}</strong> · {d.phone} · {fmtDate(d.conversion_date)}</div>)}
          </div>
        )}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FieldInput label="Gender" type="select" value={form.gender} onChange={set("gender")} options={GENDERS} />
          <FieldInput label="Conversion date" type="date" value={form.conversion_date} onChange={set("conversion_date")} />
        </div>
        <FieldInput label="Type" type="select" value={form.conversion_type} onChange={set("conversion_type")} options={[{ value: "New Salvation", label: "New Salvation" }, { value: "Rededication", label: "Rededication" }]} />
        <Button type="submit" size="lg" variant={saveAnyway && dupes.length ? "gold" : "soul"} className="w-full" disabled={loading}>
          {loading && <Spinner />}{loading ? "Saving…" : saveAnyway && dupes.length ? "Save anyway" : "Add new convert"}
        </Button>
      </Panel>
    </form>
  )
}

// ── Assign ─────────────────────────────────────────────────────────────────
export function NewConvertsAssignView() {
  const { user: currentUser, role } = useSession()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { data, loading, err, reload } = useNewConvertData(dateFrom, dateTo)
  const { options: teamOptions, loading: teamLoading } = useRoleUsers(["soulcare", "soulcareadmin"])
  const [selectedMember, setSelectedMember] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("unassigned")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [msgType, setMsgType] = useState<"success" | "error" | "warn">("success")
  const [showAdd, setShowAdd] = useState(false)

  const isDone = (r: any) => ncComplete(r.fbRows) && r.envoys_training_completed
  const filtered = data.filter((r) => {
    const m = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
    if (filter === "unassigned") return m && !r.assignment
    if (filter === "assigned") return m && !!r.assignment
    if (filter === "completed") return m && isDone(r)
    return m
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${filter}|${dateFrom}|${dateTo}`, filtered.length, 20)
  const assignedCount = data.filter((r) => !!r.assignment).length
  const unassignedCount = data.length - assignedCount
  const completedCount = data.filter(isDone).length

  const bulkAssign = async () => {
    if (!selectedMember) { setMsg("Select a team member first."); setMsgType("warn"); return }
    const targets = data.filter((r) => !r.assignment)
    if (!targets.length) { setMsg("No unassigned New Converts to assign."); setMsgType("warn"); return }
    setSaving(true); setMsg("")
    try {
      const payload = targets.map((r) => ({ new_convert_id: r.id, assigned_to: selectedMember, assigned_by: currentUser }))
      for (let i = 0; i < payload.length; i += 50) await sb("new_converts_assignments", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify(payload.slice(i, i + 50)) })
      setMsg(`${targets.length} assigned to ${selectedMember}.`); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }
  const saveAssignment = async (ncId: any, member: string) => {
    setSaving(true)
    try {
      const existing = data.find((r) => r.id === ncId)?.assignment
      if (existing) await sb(`new_converts_assignments?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify({ assigned_to: member, assigned_by: currentUser }) })
      else await sb("new_converts_assignments", { method: "POST", body: JSON.stringify({ new_convert_id: ncId, assigned_to: member, assigned_by: currentUser }) })
      setMsg(`Assigned to ${member}.`); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }
  const removeAssignment = async (asgId: any) => {
    setSaving(true)
    try { await sb(`new_converts_assignments?id=eq.${asgId}`, { method: "DELETE", prefer: "return=minimal" }); setMsg("Assignment removed."); setMsgType("success"); reload() } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  if (showAdd) return <AddNewConvertPage onCancel={() => setShowAdd(false)} onDone={() => { setShowAdd(false); reload() }} />

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="New Converts" title="Assign new converts" subtitle="Three weeks of discipleship follow-up, then Envoys Training." action={<Button variant="soul" onClick={() => setShowAdd(true)}><UserPlus />Add new convert</Button>} />
      <DateRangeBar label="Conversion date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <StatGrid>
        <StatCard label="Total" value={data.length} icon={Heart} tone="soul" />
        <StatCard label="Assigned" value={assignedCount} icon={UserCheck} tone="brand" />
        <StatCard label="Unassigned" value={unassignedCount} icon={AlertCircle} tone="gold" />
        <StatCard label="Completed" value={completedCount} icon={Star} tone="gold" sub="3 weeks + training" />
      </StatGrid>
      {role !== "dofficer" && (
        <Panel className="mb-5 border-soul/20 bg-soul-tint/40 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-soul uppercase"><Zap className="size-3.5" />Bulk assignment</div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-[13px] text-ink-secondary">
              <span>Assign all <strong>{unassignedCount}</strong> unassigned to:</span>
              <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} disabled={teamLoading} className="h-9 rounded-sm border border-input bg-card px-3 text-sm">
                <option value="">{teamLoading ? "Loading…" : "Select caller"}</option>
                {teamOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <Button variant="soul" onClick={bulkAssign} disabled={saving || !selectedMember || unassignedCount === 0}>{saving ? <Spinner /> : <UserCheck />}{saving ? "Saving…" : `Assign ${unassignedCount}`}</Button>
          </div>
        </Panel>
      )}
      <Notice type={msgType} msg={msg} onClose={() => setMsg("")} />
      <Notice type="error" msg={err} />
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "unassigned", label: "Unassigned", count: unassignedCount },
          { value: "assigned", label: "Assigned", count: assignedCount },
          { value: "completed", label: "Completed", count: completedCount },
          { value: "all", label: "All", count: data.length },
        ]} />
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} className="sm:w-56" />
          <Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </div>
      </Toolbar>
      {loading ? <SkeletonList /> : filtered.length === 0 ? <EmptyState icon={Heart} title="No new converts in this category" /> : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {filtered.slice(0, count).map((r) => (
            <Panel key={r.id} className="p-4 sm:p-4">
              <div className="flex items-start gap-3">
                <PersonAvatar name={r.full_name} size={40} />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-semibold">{r.full_name}</h3>
                  <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground"><PhoneLink phone={r.phone} withWhatsApp /><span>· {r.conversion_type}</span><span>· {fmtDate(r.conversion_date)}</span>{r.source === "QR" && <span>· via QR</span>}</div>
                </div>
              </div>
              <div className="mt-3"><NCPipelineBar fbRows={r.fbRows} trainingCompleted={r.envoys_training_completed} /></div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                <AssignControl tone="soul" current={r.assignment?.assigned_to} options={teamOptions} loading={teamLoading} saving={saving} onSave={(v) => saveAssignment(r.id, v)} />
                {r.assignment && <Button size="xs" variant="ghost" className="text-danger" onClick={() => removeAssignment(r.assignment.id)} disabled={saving}><X />Unassign</Button>}
              </div>
            </Panel>
          ))}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
    </div>
  )
}

// ── Training block ─────────────────────────────────────────────────────────
function NCTrainingBlock({ nc, onSaved }: { nc: any; onSaved: () => void }) {
  const [editing, setEditing] = useState(false)
  const [completed, setCompleted] = useState(!!nc.envoys_training_completed)
  const [date, setDate] = useState(nc.envoys_training_completed_date || todayISO())
  const [scheduled, setScheduled] = useState(nc.training_scheduled_date || "")
  const [trainer, setTrainer] = useState(nc.trainer_name || "")
  const [notes, setNotes] = useState(nc.envoys_training_notes || "")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const save = async () => {
    setSaving(true); setErr("")
    try {
      await sb(`new_converts?id=eq.${nc.id}`, { method: "PATCH", body: JSON.stringify({ envoys_training_completed: completed, envoys_training_completed_date: completed ? date : null, training_scheduled_date: scheduled || null, trainer_name: trainer || null, envoys_training_notes: notes || null }) })
      toast.success("Training status updated."); setEditing(false); onSaved()
    } catch (e: any) { setErr(e.message) }
    setSaving(false)
  }
  if (!editing)
    return (
      <div className="mt-3 flex items-center gap-2 rounded-md bg-gold-tint px-3 py-2">
        {nc.envoys_training_completed ? <CheckCircle2 className="size-4 text-primary" /> : <Clock className="size-4 text-gold-ink" />}
        <span className="flex-1 text-xs text-ink-secondary">Envoys Training: <strong>{nc.envoys_training_completed ? `Completed ${fmtDate(nc.envoys_training_completed_date)}` : nc.training_scheduled_date ? `Scheduled ${fmtDate(nc.training_scheduled_date)}` : "Not yet scheduled"}</strong></span>
        <Button size="xs" variant="ghost" onClick={() => setEditing(true)}><Edit3 />{nc.envoys_training_completed || nc.training_scheduled_date ? "Edit" : "Schedule training"}</Button>
      </div>
    )
  return (
    <div className="mt-3 rounded-md border border-gold/30 bg-gold-tint p-4 pb-1">
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FieldInput label="Scheduled training date" type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} hint="Coordinate with the Training Department" />
        <FieldInput label="Trainer / facilitator" value={trainer} onChange={(e) => setTrainer(e.target.value)} />
      </div>
      <FieldInput label="Envoys Training completed" type="bool-toggle" value={completed} onChange={setCompleted} />
      {completed && <FieldInput label="Date completed" type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
      <FieldInput label="Notes" type="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="mb-3 flex gap-2">
        <Button size="sm" variant="gold" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  )
}

// ── My new converts / admin call queue ─────────────────────────────────────
function MyNewConverts({ onLogCheckin }: { onLogCheckin: (r: any) => void }) {
  const { user: currentUser, role } = useSession()
  const { data, loading, err, reload } = useNewConvertData()
  const [filter, setFilter] = useState("active")
  const isAdmin = role === "soulcareadmin" || role === "admin"
  const mine = isAdmin ? data : data.filter((r) => r.assignment?.assigned_to === currentUser)
  const isDone = (r: any) => ncComplete(r.fbRows) && r.envoys_training_completed
  const active = mine.filter((r) => !isDone(r))
  const completed = mine.filter(isDone)
  const flagged = mine.filter((r) => r.fbRows.some((f: any) => f.flagged_for_pastoral))
  const views: Record<string, any[]> = { active, completed, flagged, all: mine }
  const filtered = views[filter] || mine
  const today = todayISO()
  const dueEntries = active
    .map((r) => { const last = r.fbRows[r.fbRows.length - 1]; if (!last?.follow_up_date || last.follow_up_date > today) return null; return { id: r.id, row: r, name: r.full_name, phone: r.phone, dueDate: last.follow_up_date, note: last.notes } })
    .filter(Boolean)
    .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate)) as any[]

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="New Converts" title={isAdmin ? "Call queue" : "My new converts"} subtitle={isAdmin ? `${mine.length} new convert${mine.length !== 1 ? "s" : ""} in total.` : `${mine.length} assigned to you.`}
        action={<Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>} />
      {!isAdmin && <DueTodayPanel entries={dueEntries} actionLabel="Log check-in" onAction={onLogCheckin} />}
      <StatGrid cols={3}>
        <StatCard label={isAdmin ? "Total" : "Assigned to me"} value={mine.length} icon={Heart} tone="soul" />
        <StatCard label="Completed" value={completed.length} icon={Star} tone="brand" />
        <StatCard label="Flagged" value={flagged.length} icon={Flag} tone="danger" sub={flagged.length > 0 ? "Needs pastoral attention" : ""} />
      </StatGrid>
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "active", label: "Active", count: active.length }, { value: "completed", label: "Completed", count: completed.length },
          { value: "flagged", label: "Flagged", count: flagged.length }, { value: "all", label: "All", count: mine.length },
        ]} />
      </Toolbar>
      <Notice type="error" msg={err} />
      {loading ? <SkeletonBoard cards={6} /> : filtered.length === 0 ? (
        <EmptyState icon={Heart} title={mine.length === 0 ? "No new converts assigned to you yet" : "Nothing in this category"} />
      ) : (
        <div className="masonry [columns:340px]">
          {filtered.map((r) => {
            const isComplete = ncComplete(r.fbRows)
            const fullyDone = isComplete && r.envoys_training_completed
            return (
              <Panel key={r.id} className={cn("p-4 sm:p-4", fullyDone && "border-primary/30")}>
                <div className="flex items-start gap-3">
                  <PersonAvatar name={r.full_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold">{r.full_name}</h3>
                    <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground"><PhoneLink phone={r.phone} withWhatsApp /><span>· {r.conversion_type}</span></div>
                    {isAdmin && <div className={cn("mt-0.5 text-[11.5px]", r.assignment ? "text-muted-foreground" : "text-gold-ink")}>{r.assignment ? <>Assigned to <strong>{r.assignment.assigned_to}</strong></> : "Unassigned"}</div>}
                  </div>
                  {fullyDone && <ToneBadge tone="brand" icon={Star}>Fully discipled</ToneBadge>}
                </div>
                <div className="mt-3"><NCPipelineBar fbRows={r.fbRows} trainingCompleted={r.envoys_training_completed} /></div>
                {isComplete && <NCTrainingBlock nc={r} onSaved={reload} />}
                {r.fbRows.length > 0 && (
                  <div className="mt-3 grid gap-1.5">
                    {r.fbRows.map((fb: any) => {
                      const fsm = statusMeta(fb.call_status)
                      return (
                        <div key={fb.id} className="rounded-md bg-muted/60 px-3 py-2">
                          <ToneBadge tone={fsm.tone}>Week {fb.checkin_number} · {fsm.label}</ToneBadge>
                          {fb.notes && <p className="mt-1 text-xs text-ink-secondary">{fb.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
                {!isComplete && <Button size="sm" variant="soul" className="mt-3 w-full" onClick={() => onLogCheckin(r)}><Phone />Log week {ncNextCheckin(r.fbRows)}</Button>}
              </Panel>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LogNewConvertCheckin({ person, onBack }: { person: any; onBack: () => void }) {
  const { user: callerName } = useSession()
  const nxt = ncNextCheckin(person.fbRows)
  const [form, setForm] = useState<any>({ call_status: "", notes: "", follow_up_date: "", flagged_for_pastoral: false, flag_reason: "" })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (e: any) => setForm((f: any) => ({ ...f, [key]: e && e.target !== undefined ? e.target.value : e }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.call_status) { setErr("Status is required."); return }
    if (form.flagged_for_pastoral && !form.flag_reason.trim()) { setErr("Describe the reason for flagging."); return }
    setLoading(true); setErr("")
    try {
      await sb("new_converts_checkins", { method: "POST", body: JSON.stringify({ new_convert_id: person.id, checkin_number: nxt, call_status: form.call_status, notes: form.notes || null, follow_up_date: form.follow_up_date || null, caller_name: callerName, flagged_for_pastoral: !!form.flagged_for_pastoral, flag_reason: form.flagged_for_pastoral ? form.flag_reason : null }) })
      toast.success(`Week ${nxt} logged.`); setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  if (done)
    return (
      <Panel className="mx-auto max-w-lg animate-page-in py-12 text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-soul-tint text-soul"><CheckCircle2 className="size-7" /></span>
        <h2 className="font-display text-xl font-extrabold">Week {nxt} logged for {person.full_name}</h2>
        <Button variant="outline" className="mt-6" onClick={onBack}><ArrowLeft />Back</Button>
      </Panel>
    )
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl animate-page-in">
      <PageHeader eyebrow={`Week ${nxt} check-in`} title={person.full_name} subtitle={<PhoneLink phone={person.phone} withWhatsApp />} action={<Button type="button" variant="outline" onClick={onBack}><ArrowLeft />Back</Button>} />
      <Panel>
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <FieldInput label="Status" type="select" required value={form.call_status} onChange={set("call_status")} options={CALL_STATUS_OPTIONS} />
        {form.call_status && form.call_status !== "Reached" && <FieldInput label="Follow-up date" type="date" value={form.follow_up_date} onChange={set("follow_up_date")} />}
        <FieldInput label="Notes" type="textarea" rows={4} value={form.notes} onChange={set("notes")} placeholder="How is their walk with Christ progressing? Any questions, struggles or victories shared?" />
        <div className="mb-4 rounded-md border border-danger/20 bg-danger-tint/50 p-4 pb-0">
          <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-danger"><Flag className="size-3.5" />Flag for Pastoral Team</div>
          <FieldInput label="Flag this person for pastoral attention" type="toggle" value={form.flagged_for_pastoral} onChange={set("flagged_for_pastoral")} />
          {form.flagged_for_pastoral && <FieldInput label="Reason" type="textarea" required value={form.flag_reason} onChange={set("flag_reason")} />}
        </div>
        <Button type="submit" size="lg" variant="soul" className="w-full" disabled={loading}>{loading && <Spinner />}{loading ? "Saving…" : `Save week ${nxt}`}</Button>
      </Panel>
    </form>
  )
}

export function NewConvertsQueueScreen() {
  const [target, setTarget] = useState<any>(null)
  if (target) return <LogNewConvertCheckin person={target} onBack={() => setTarget(null)} />
  return <MyNewConverts onLogCheckin={setTarget} />
}

// ── Registry ───────────────────────────────────────────────────────────────
export function NewConvertsRegistry({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  const [typeFilter, setTypeFilter] = useState("all")
  const [trainingFilter, setTrainingFilter] = useState("all")
  const [togglingId, setTogglingId] = useState<any>(null)
  const [view, setView] = usePersistentState<"board" | "table">("envoys_view_ncregistry", "board")

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      let q = "new_converts?order=created_at.desc&limit=300"
      if (dateFrom) q += `&conversion_date=gte.${dateFrom}`
      if (dateTo) q += `&conversion_date=lte.${dateTo}`
      setData((await sb(q)) || [])
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [dateFrom, dateTo])
  useEffect(() => { load() }, [load])

  const toggleTraining = async (r: any) => {
    setTogglingId(r.id)
    try {
      const next = !r.envoys_training_completed
      await sb(`new_converts?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ envoys_training_completed: next, envoys_training_completed_date: next ? todayISO() : null }) })
      toast.success(next ? `${r.full_name} marked training complete.` : `${r.full_name} marked pending.`)
      load()
    } catch (e: any) { toast.error(e.message) }
    setTogglingId(null)
  }

  const filtered = data.filter((r) => {
    if (!(r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search))) return false
    if (typeFilter !== "all" && r.conversion_type !== typeFilter) return false
    if (trainingFilter === "pending" && r.envoys_training_completed) return false
    if (trainingFilter === "completed" && !r.envoys_training_completed) return false
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${dateFrom}|${dateTo}|${typeFilter}|${trainingFilter}|${view}`, filtered.length, 24)
  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length

  const downloadCSV = () => {
    const out = filtered.filter((r) => selected.has(r.id))
    if (!out.length) return
    const header = ["Full Name", "Phone", "Conversion Type", "Conversion Date", "Gender", "Address", "Training Status", "Training Scheduled Date", "Trainer", "Training Completed Date"]
    const lines = out.map((r) => [r.full_name, r.phone, r.conversion_type, r.conversion_date, r.gender, r.house_address, r.envoys_training_completed ? "Completed" : "Pending", r.training_scheduled_date, r.trainer_name, r.envoys_training_completed_date].map(csvCell).join(","))
    downloadBlob(`new_converts_${todayISO()}.csv`, [header.join(","), ...lines].join("\r\n"))
  }

  const TrainingBtn = ({ r }: { r: any }) => (
    <button onClick={() => toggleTraining(r)} disabled={togglingId === r.id} title="Toggle training status" className="rounded-full">
      <ToneBadge tone={r.envoys_training_completed ? "brand" : "gold"} icon={r.envoys_training_completed ? CheckCircle2 : Clock}>
        {togglingId === r.id ? "Saving…" : r.envoys_training_completed ? "Training completed" : "Pending training"}
      </ToneBadge>
    </button>
  )
  const typeTone = (t: string) => (t === "New Salvation" ? "brand" : t === "Rededication" ? "gold" : "muted") as any

  return (
    <div className={cn(!embedded && "animate-page-in")}>
      {!embedded && <PageHeader eyebrow="New Converts" title="Registry" subtitle={`${data.length} record${data.length !== 1 ? "s" : ""}${dateFrom || dateTo ? " in date range" : " total"}`} action={<Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>} />}
      <DateRangeBar label="Conversion date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <Toolbar>
        <Segmented value={typeFilter} onChange={setTypeFilter} options={[
          { value: "all", label: "All", count: data.length },
          { value: "New Salvation", label: "Converts", count: data.filter((r) => r.conversion_type === "New Salvation").length },
          { value: "Rededication", label: "Rededication", count: data.filter((r) => r.conversion_type === "Rededication").length },
        ]} />
        <Segmented value={trainingFilter} onChange={setTrainingFilter} options={[
          { value: "all", label: "All training", count: data.length },
          { value: "pending", label: "Pending", count: data.filter((r) => !r.envoys_training_completed).length },
          { value: "completed", label: "Completed", count: data.filter((r) => r.envoys_training_completed).length },
        ]} />
      </Toolbar>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
          <Button variant="gold" size="sm" onClick={downloadCSV} disabled={!selectedCount}><Download />Download{selectedCount ? ` (${selectedCount})` : ""}</Button>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? <EmptyState icon={Search} title="No records found" /> : view === "board" ? (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => (
            <article key={r.id} className={cn("relative rounded-lg border bg-card p-4 shadow-xs", selected.has(r.id) && "border-primary ring-1 ring-primary/40")}>
              <Checkbox className="absolute top-3 right-3 bg-card" checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} />
              <div className="mb-3 flex items-center gap-2.5 pr-7">
                <PersonAvatar name={r.full_name} size={38} />
                <div className="min-w-0"><h3 className="truncate text-[14px] font-semibold">{r.full_name}</h3><p className="text-xs text-muted-foreground">{fmtDate(r.conversion_date)}</p></div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <ToneBadge tone={typeTone(r.conversion_type)} dot>{r.conversion_type || "–"}</ToneBadge>
                {r.gender && <ToneBadge tone="muted">{r.gender}</ToneBadge>}
              </div>
              {r.trainer_name && <p className="mb-2 text-xs text-muted-foreground">Trainer: {r.trainer_name}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"><PhoneLink phone={r.phone} withWhatsApp /><TrainingBtn r={r} /></div>
            </article>
          ))}
        </div>
      ) : (
        <DataTable>
          <thead><tr><th className={cn(th, "w-10")}><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th><th className={th}>Name</th><th className={th}>Phone</th><th className={th}>Date</th><th className={th}>Type</th><th className={th}>Training</th></tr></thead>
          <tbody>
            {filtered.slice(0, count).map((r) => (
              <tr key={r.id} className={cn("hover:bg-muted/50", selected.has(r.id) && "bg-brand-tint/50")}>
                <td className={td}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} /></td>
                <td className={td}><div className="flex items-center gap-2"><PersonAvatar name={r.full_name} size={26} /><span className="font-semibold">{r.full_name}</span></div></td>
                <td className={td}><PhoneLink phone={r.phone} withWhatsApp /></td>
                <td className={cn(td, "whitespace-nowrap")}>{fmtDate(r.conversion_date)}</td>
                <td className={td}><ToneBadge tone={typeTone(r.conversion_type)} dot>{r.conversion_type || "–"}</ToneBadge></td>
                <td className={td}><TrainingBtn r={r} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-right text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong></p>}
    </div>
  )
}

// ── Training module ────────────────────────────────────────────────────────
function PotentialEnvoysTrainingList() {
  const { data, loading, err, reload } = usePotentialEnvoyData()
  const [search, setSearch] = useState("")
  const [trainingFilter, setTrainingFilter] = useState("all")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  const [togglingId, setTogglingId] = useState<any>(null)
  const toggle = async (r: any) => {
    setTogglingId(r.id)
    try {
      const next = !r.training_completed
      await sb(`potential_envoys?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ training_completed: next, training_completed_date: next ? todayISO() : null }) })
      toast.success(next ? `${r.full_name} marked training complete.` : `${r.full_name} marked pending.`)
      reload()
    } catch (e: any) { toast.error(e.message) }
    setTogglingId(null)
  }
  const filtered = data.filter((r) => {
    if (search && !(r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search))) return false
    if (trainingFilter === "pending" && r.training_completed) return false
    if (trainingFilter === "completed" && !r.training_completed) return false
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${trainingFilter}`, filtered.length, 24)
  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length
  const downloadCSV = () => {
    const out = filtered.filter((r) => selected.has(r.id))
    if (!out.length) return
    const header = ["Full Name", "Phone", "Gender", "DOB", "Marital Status", "Life Stage", "Connect Center", "Training Status", "Graduated"]
    const lines = out.map((r) => [r.full_name, r.phone, r.gender, r.dob, r.marital_status, r.life_stage, r.connect_center, r.training_completed ? "Completed" : "Pending", r.promoted_to_membership ? "Yes" : "No"].map(csvCell).join(","))
    downloadBlob(`potential_envoys_training_${todayISO()}.csv`, [header.join(","), ...lines].join("\r\n"))
  }
  return (
    <div>
      <Toolbar>
        <Segmented value={trainingFilter} onChange={setTrainingFilter} options={[
          { value: "all", label: "All", count: data.length },
          { value: "pending", label: "Pending training", count: data.filter((r) => !r.training_completed).length },
          { value: "completed", label: "Training completed", count: data.filter((r) => r.training_completed).length },
        ]} />
      </Toolbar>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
          <Button variant="gold" size="sm" onClick={downloadCSV} disabled={!selectedCount}><Download />Download{selectedCount ? ` (${selectedCount})` : ""}</Button>
          <Button variant="outline" size="icon-sm" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </div>
      </Toolbar>
      <Notice type="error" msg={err} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? <EmptyState icon={Search} title="No records found" /> : (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => (
            <article key={r.id} className={cn("relative rounded-lg border bg-card p-4 shadow-xs", selected.has(r.id) && "border-primary ring-1 ring-primary/40")}>
              <Checkbox className="absolute top-3 right-3 bg-card" checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} />
              <div className="mb-3 flex items-center gap-2.5 pr-7">
                <PersonAvatar name={r.full_name} size={38} />
                <div className="min-w-0"><h3 className="truncate text-[14px] font-semibold">{r.full_name}</h3><p className="text-xs text-muted-foreground">{r.connect_center || "No connect centre yet"}</p></div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {r.promoted_to_membership && <ToneBadge tone="brand" icon={Star}>Graduated</ToneBadge>}
                {[r.gender, r.life_stage].filter(Boolean).map((x: string) => <ToneBadge key={x} tone="muted">{x}</ToneBadge>)}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
                <PhoneLink phone={r.phone} withWhatsApp />
                <button onClick={() => toggle(r)} disabled={togglingId === r.id} className="rounded-full">
                  <ToneBadge tone={r.training_completed ? "brand" : "gold"} icon={r.training_completed ? CheckCircle2 : Clock}>{togglingId === r.id ? "Saving…" : r.training_completed ? "Training completed" : "Pending training"}</ToneBadge>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
    </div>
  )
}

export function TrainingModule() {
  const [tab, setTab] = useState("VIPs")
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="New Converts" title="Training module" subtitle="Everyone due for Envoys Training: VIPs (Potential Envoys) and new converts." />
      <Segmented size="default" className="mb-5" value={tab} onChange={setTab} options={[{ value: "VIPs", label: "VIPs" }, { value: "Converts", label: "Converts" }]} />
      {tab === "VIPs" ? <PotentialEnvoysTrainingList /> : <NewConvertsRegistry embedded />}
    </div>
  )
}

// ── Retention report ───────────────────────────────────────────────────────
export function NewConvertsRetentionReport() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { data, loading, err } = useNewConvertData(dateFrom, dateTo)
  const total = data.length
  const completed = data.filter((r) => ncComplete(r.fbRows) && r.envoys_training_completed).length
  const trainingDone = data.filter((r) => r.envoys_training_completed).length
  const retentionPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const byType: Record<string, number> = { "New Salvation": 0, Rededication: 0 }
  data.forEach((r) => { if (byType[r.conversion_type] !== undefined) byType[r.conversion_type]++ })
  const typeDonut = Object.entries(byType).map(([k, v]) => ({ name: k, value: v, color: k === "New Salvation" ? "var(--soul)" : "var(--gold)" }))
  const weekReach = [1, 2, 3].map((m) => ({ name: `Week ${m}`, value: data.filter((r) => ncCheckinsLogged(r.fbRows).has(m)).length, color: "var(--soul)" }))
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="New Converts" title="New converts retention" subtitle="Three-week discipleship and training completion." />
      <DateRangeBar label="Conversion date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      {loading ? <SkeletonReport /> : (
        <>
          <StatGrid>
            <StatCard label="Total new converts" value={total} icon={Heart} tone="soul" />
            <StatCard label="Retention rate" value={`${retentionPct}%`} icon={TrendingUp} tone="gold" sub={`${completed} of ${total} completed both`} />
            <StatCard label="Training completed" value={trainingDone} icon={Star} tone="brand" />
            <StatCard label="Fully discipled" value={completed} icon={CheckCircle2} tone="brand" />
          </StatGrid>
          <Notice type="error" msg={err} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="New salvation vs rededication"><Donut data={typeDonut} centerValue={total} centerLabel="New converts" /></ChartCard>
            <ChartCard title="Check-in reach by week" subtitle="A drop from Week 1 to Week 3 shows where people disengage from follow-up."><VBars data={weekReach} valueLabel="Reached" /></ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
