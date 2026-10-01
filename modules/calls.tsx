"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle, ArrowLeft, Calendar, CheckCircle2, ChevronDown, Edit3, FileText, Flag, MapPin, Phone,
  RefreshCw, Shield, UserCheck, Users, X, Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SearchInput, Segmented, SH,
  SkeletonList, StatCard, StatGrid, ToneBadge, Toolbar, Dot,
} from "@/components/app/kit"
import { DateRangeBar } from "@/components/app/shared"
import { DueTodayPanel } from "@/components/app/widgets"
import { useNav, useSession } from "@/components/app/session"
import { AssignControl } from "@/modules/vip-contact"
import { sb } from "@/lib/supabase"
import { CALL_STATUS_OPTIONS, fmtDate, normaliseStatus, statusMeta, todayISO } from "@/lib/format"
import { useInfiniteReveal, useRoleUsers } from "@/lib/hooks"
import type { Tone } from "@/lib/nav"
import { cn } from "@/lib/utils"

export const CONNECT_CENTERS = [
  "Agege", "Aboru/Iyana Ipaja", "Akute", "Ayobo", "Berger", "Command/Ikeja", "Egbeda", "Iju-Ishaga",
  "Magboro", "Mile 12", "Ogba", "Ojoo", "OPIC Estates", "Redemption City",
]
export const NATURAL_GROUPS = ["Interphaze", "Solid Rock", "Royal Diadem"]

export function genderTag(row: any) {
  const g = (row?.gender || "").trim().toLowerCase()
  return g === "male" ? " (M)" : g === "female" ? " (F)" : ""
}

export function callerProfileTag(row: any) {
  if (!row) return ""
  const g = (row.gender || "").trim().toLowerCase()
  const gender = g === "male" ? "Male" : g === "female" ? "Female" : ""
  const marital = ({ married: "M", single: "S", divorced: "D", widowed: "W" } as any)[(row.marital_status || "").trim().toLowerCase()] || ""
  const l = (row.life_stage || "").trim().toLowerCase()
  const life = l === "employee" || l === "employed" ? "E" : l === "business owner" || l === "businessowner" ? "B" : l === "student" ? "S" : ""
  let tag = gender ? ` (${gender})` : ""
  const extras = [marital, life].filter(Boolean)
  if (extras.length) tag += ` - ${extras.join(" - ")}`
  return tag
}

export function weeksLogged(fbRows: any[]) {
  const weeks = new Set<number>()
  ;(fbRows || []).forEach((r) => r.week_number && weeks.add(r.week_number))
  return weeks
}
export function nextWeek(fbRows: any[]) {
  const done = weeksLogged(fbRows)
  for (let w = 1; w <= 3; w++) if (!done.has(w)) return w
  return null
}
export const pipelineComplete = (fbRows: any[]) => nextWeek(fbRows) === null

const STATUS_FILL: Record<string, string> = {
  Reached: "bg-primary text-primary-foreground",
  "Call Back": "bg-gold text-on-gold",
  "Incorrect Contact": "bg-danger text-white",
}

export function PipelineBar({ fbRows, compact = false }: { fbRows: any[]; compact?: boolean }) {
  const done = weeksLogged(fbRows)
  const complete = pipelineComplete(fbRows)
  const cls = (w: number) => {
    if (!done.has(w)) return "border border-dashed border-border-strong text-muted-foreground"
    const row = (fbRows || []).find((r) => r.week_number === w)
    return STATUS_FILL[normaliseStatus(row?.call_status) || ""] || "bg-primary text-primary-foreground"
  }
  if (compact)
    return (
      <div className="flex items-center gap-1" aria-label={`Pipeline: ${done.size} of 3 weeks logged`}>
        {[1, 2, 3].map((w) => (
          <span key={w} className={cn("grid h-5 w-7 place-items-center rounded-[5px] text-[9.5px] font-bold", cls(w))}>W{w}</span>
        ))}
        {complete && <CheckCircle2 className="ml-0.5 size-3.5 text-primary" aria-label="Complete" />}
      </div>
    )
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[1, 2, 3].map((w) => {
        const row = done.has(w) ? (fbRows || []).find((r) => r.week_number === w) : null
        return (
          <span
            key={w}
            title={row ? `Week ${w}: ${row.call_status} — ${row.caller_name || "—"}` : `Week ${w}: not logged`}
            className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-bold whitespace-nowrap", cls(w))}
          >
            Week {w}
            {row && (
              <span className="font-medium opacity-90">
                · {normaliseStatus(row.call_status)}
                {row.church_attendance ? ` · ${row.church_attendance === "Present" ? "In church" : "Absent"}` : ""}
              </span>
            )}
          </span>
        )
      })}
      {complete ? (
        <ToneBadge tone="brand" icon={CheckCircle2}>Pipeline complete</ToneBadge>
      ) : (
        <span className="text-[11px] text-muted-foreground">Next: Week {nextWeek(fbRows)}</span>
      )}
    </div>
  )
}

export function useCallData(dateFrom?: string, dateTo?: string) {
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
        let q = "first_timers?order=created_at.desc&limit=500"
        if (dateFrom) q += `&service_date=gte.${dateFrom}`
        if (dateTo) q += `&service_date=lte.${dateTo}`
        const [ftRows, fbRows, asgRows, ovRows] = await Promise.all([
          sb(q),
          sb("call_feedback?select=*&order=created_at.asc"),
          sb("call_assignments?select=*").catch(() => []),
          sb("pipeline_overviews?select=*").catch(() => []),
        ])
        const fbMap: Record<string, any[]> = {}
        ;(fbRows || []).forEach((f: any) => (fbMap[f.first_timer_id] ||= []).push(f))
        const asgMap: Record<string, any> = {}
        ;(asgRows || []).forEach((a: any) => (asgMap[a.first_timer_id] = a))
        const ovMap: Record<string, any> = {}
        ;(ovRows || []).forEach((o: any) => (ovMap[o.first_timer_id] = o))
        if (!cancelled) setData((ftRows || []).map((r: any) => ({ ...r, fbRows: fbMap[r.id] || [], assignment: asgMap[r.id] || null, overview: ovMap[r.id] || null })))
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tick, dateFrom, dateTo])
  return { data, loading, err, reload }
}

const fmtStamp = (iso: string) => {
  const d = new Date(iso)
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

function CallLogItem({ fb, onEdit }: { fb: any; onEdit?: () => void }) {
  const fsm = statusMeta(fb.call_status)
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <ToneBadge tone={fsm.tone}>Week {fb.week_number || "?"} · {fsm.label}</ToneBadge>
            {fb.church_attendance && <ToneBadge tone={fb.church_attendance === "Present" ? "brand" : "danger"}>{fb.church_attendance === "Present" ? "In church" : fb.church_attendance}</ToneBadge>}
            {fb.flagged_for_pastoral && <ToneBadge tone="danger" icon={Flag}>Flagged</ToneBadge>}
          </div>
          <p className="text-xs text-ink-secondary">
            {fb.created_at && <span className="mr-1 text-muted-foreground">{fmtStamp(fb.created_at)} ·</span>}
            Called by <strong>{fb.caller_name || "—"}</strong>
            {fb.experience_rating && <> · Rating: {fb.experience_rating}</>}
            {fb.returning && <> · Returning: {fb.returning}</>}
            {fb.follow_up_date && <span className="text-warning"> · Call back {fmtDate(fb.follow_up_date)}</span>}
          </p>
          {fb.notes && <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{fb.notes}</p>}
          {fb.flagged_for_pastoral && fb.flag_reason && (
            <p className="mt-1.5 flex gap-1.5 rounded-sm bg-danger-tint px-2 py-1 text-xs text-danger"><Flag className="mt-0.5 size-3 shrink-0" />{fb.flag_reason}</p>
          )}
        </div>
        {onEdit && <Button size="xs" variant="ghost" onClick={onEdit}><Edit3 />Edit</Button>}
      </div>
    </div>
  )
}

function OverviewSummary({ overview }: { overview: any }) {
  return (
    <div className="mt-3 rounded-md border border-primary/25 bg-brand-tint px-3.5 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary-strong"><CheckCircle2 className="size-3.5" />VIP retention overview</div>
      <dl className="grid gap-0.5 text-xs text-ink-secondary">
        <div><dt className="inline font-semibold">Move to membership: </dt><dd className={cn("inline font-bold", overview.move_to_membership ? "text-primary" : "text-danger")}>{overview.move_to_membership ? "Yes" : "No"}</dd></div>
        {overview.natural_groups?.length > 0 && <div><dt className="inline font-semibold">Natural groups: </dt><dd className="inline">{overview.natural_groups.join(", ")}</dd></div>}
        {overview.connect_center && <div><dt className="inline font-semibold">Connect centre: </dt><dd className="inline">{overview.connect_center}</dd></div>}
        {overview.overview_notes && <div><dt className="inline font-semibold">Notes: </dt><dd className="inline">{overview.overview_notes}</dd></div>}
      </dl>
    </div>
  )
}

function ContactHead({ r, name, sub, children }: { r: any; name: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <PersonAvatar name={r.full_name} size={40} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] leading-5 font-semibold">{name}</h3>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <PhoneLink phone={r.phone} withWhatsApp />
          <span>· {fmtDate(r.service_date)}</span>
          {sub}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

const Footer = ({ shown, total, noun }: { shown: number; total: number; noun: string }) =>
  total > 0 ? <p className="mt-4 text-right text-xs text-muted-foreground">Showing <strong>{Math.min(shown, total)}</strong> of <strong>{total}</strong> {noun}{total !== 1 ? "s" : ""}</p> : null

// ── Assign calls ───────────────────────────────────────────────────────────
export function AssignCallsView() {
  const { user: currentUser } = useSession()
  const nav = useNav()
  const { data, loading, err, reload } = useCallData()
  const { options: teamOptions, loading: teamLoading } = useRoleUsers("expteam")
  const [selectedMember, setSelectedMember] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("unassigned")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [msgType, setMsgType] = useState<"success" | "error" | "warn">("success")

  const filtered = data.filter((r) => {
    const m = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
    if (filter === "unassigned") return m && !r.assignment
    if (filter === "assigned") return m && !!r.assignment
    if (filter === "complete") return m && pipelineComplete(r.fbRows)
    return m
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${filter}`, filtered.length, 20)
  const assignedCount = data.filter((r) => !!r.assignment).length
  const unassignedCount = data.length - assignedCount
  const completeCount = data.filter((r) => pipelineComplete(r.fbRows)).length

  const bulkAssign = async () => {
    if (!selectedMember) { setMsg("Select a team member first."); setMsgType("warn"); return }
    const targets = data.filter((r) => !r.assignment)
    if (!targets.length) { setMsg("No unassigned contacts to assign."); setMsgType("warn"); return }
    setSaving(true); setMsg("")
    try {
      const payload = targets.map((r) => ({ first_timer_id: r.id, assigned_to: selectedMember, assigned_by: currentUser }))
      for (let i = 0; i < payload.length; i += 50)
        await sb("call_assignments", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify(payload.slice(i, i + 50)) })
      setMsg(`${targets.length} contact${targets.length !== 1 ? "s" : ""} assigned to ${selectedMember}.`); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  const saveAssignment = async (ftId: any, member: string) => {
    setSaving(true)
    try {
      const existing = data.find((r) => r.id === ftId)?.assignment
      if (existing) await sb(`call_assignments?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify({ assigned_to: member, assigned_by: currentUser }) })
      else await sb("call_assignments", { method: "POST", body: JSON.stringify({ first_timer_id: ftId, assigned_to: member, assigned_by: currentUser }) })
      setMsg(`Assigned to ${member}.`); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  const removeAssignment = async (asgId: any) => {
    setSaving(true)
    try {
      await sb(`call_assignments?id=eq.${asgId}`, { method: "DELETE", prefer: "return=minimal" })
      setMsg("Assignment removed."); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  return (
    <div className="animate-page-in">
      <PageHeader
        eyebrow="Experience Team"
        title="Assign calls"
        subtitle="Allocate first-timer contacts to Experience Team members for follow-up."
        action={<Button variant="outline" onClick={() => nav("completed_pipelines")}><FileText />Completed pipelines</Button>}
      />
      <StatGrid cols={3}>
        <StatCard label="Total contacts" value={data.length} icon={Users} tone="brand" />
        <StatCard label="Assigned" value={assignedCount} icon={UserCheck} tone="info" />
        <StatCard label="Unassigned" value={unassignedCount} icon={AlertCircle} tone="gold" sub={unassignedCount > 0 ? "Need assignment" : "All assigned"} />
      </StatGrid>

      <Panel className="mb-5 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-1.5 eyebrow"><Zap className="size-3.5" />Bulk assignment</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-[13px] text-ink-secondary">
            <span>Assign all <strong>{unassignedCount}</strong> unassigned contacts to:</span>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} disabled={teamLoading} className="h-9 rounded-sm border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30">
              <option value="">{teamLoading ? "Loading…" : "Select caller"}</option>
              {teamOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <Button onClick={bulkAssign} disabled={saving || !selectedMember || unassignedCount === 0}>
            {saving ? <Spinner /> : <UserCheck />}{saving ? "Saving…" : `Assign ${unassignedCount} contacts`}
          </Button>
        </div>
      </Panel>

      <Notice type={msgType} msg={msg} onClose={() => setMsg("")} />
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "unassigned", label: "Unassigned", count: unassignedCount },
          { value: "assigned", label: "Assigned", count: assignedCount },
          { value: "complete", label: "Pipeline complete", count: completeCount },
          { value: "all", label: "All", count: data.length },
        ]} />
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} className="sm:w-56" />
          <Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </div>
      </Toolbar>

      {loading ? <SkeletonList /> : err ? <Notice type="error" msg={err} /> : filtered.length === 0 ? (
        <EmptyState icon={UserCheck} title="No contacts in this category" />
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {filtered.slice(0, count).map((r) => {
            const complete = pipelineComplete(r.fbRows)
            return (
              <Panel key={r.id} className="p-4 sm:p-4">
                <ContactHead r={r} name={`${r.full_name}${callerProfileTag(r)}`} />
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                  <PipelineBar fbRows={r.fbRows} compact />
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    {r.assignment && complete ? (
                      <>
                        <ToneBadge tone="info" icon={UserCheck}>{r.assignment.assigned_to}</ToneBadge>
                        <ToneBadge tone="muted" icon={Shield}>Locked</ToneBadge>
                      </>
                    ) : (
                      <>
                        <AssignControl current={r.assignment?.assigned_to} options={teamOptions} loading={teamLoading} saving={saving} onSave={(v) => saveAssignment(r.id, v)} />
                        {r.assignment && <Button size="xs" variant="ghost" className="text-danger" onClick={() => removeAssignment(r.assignment.id)} disabled={saving}><X />Unassign</Button>}
                      </>
                    )}
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && <Footer shown={count} total={filtered.length} noun="contact" />}
    </div>
  )
}

// ── Call queue ─────────────────────────────────────────────────────────────
function CallQueue({ onLogFeedback }: { onLogFeedback: (r: any) => void }) {
  const { user: currentUser, role } = useSession()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { data, loading, err, reload } = useCallData(dateFrom, dateTo)
  const [filter, setFilter] = useState("pending")
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<any>(null)
  const isAdmin = role === "experienceadmin" || role === "admin"

  const categorise = (r: any) => {
    if (pipelineComplete(r.fbRows)) return "complete"
    const latest = r.fbRows[r.fbRows.length - 1]
    if (!latest) return "pending"
    const norm = normaliseStatus(latest.call_status)
    return norm === "Reached" ? "reached" : norm === "Call Back" ? "callback" : norm === "Incorrect Contact" ? "incorrect" : "pending"
  }
  const searched = data.filter((r) => !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search))
  const visible = isAdmin ? searched : searched.filter((r) => r.assignment?.assigned_to === currentUser || r.fbRows.some((f: any) => f.caller_name === currentUser))
  const groups: Record<string, any[]> = { pending: [], reached: [], callback: [], incorrect: [], complete: [] }
  visible.forEach((r) => groups[categorise(r)].push(r))
  const filtered = filter === "all" ? visible : groups[filter] || visible
  const { count, sentinel, hasMore } = useInfiniteReveal(`${filter}|${search}|${dateFrom}|${dateTo}`, filtered.length, 20)

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Experience Team" title="Call queue" subtitle="The three-week follow-up pipeline for every first-timer." />
      <DateRangeBar label="Service date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "pending", label: "Pending", count: groups.pending.length },
          { value: "callback", label: "Call back", count: groups.callback.length },
          { value: "reached", label: "Reached", count: groups.reached.length },
          { value: "incorrect", label: "Incorrect", count: groups.incorrect.length },
          { value: "complete", label: "Complete", count: groups.complete.length },
          { value: "all", label: "All", count: visible.length },
        ]} />
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} className="sm:w-56" />
          <Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </div>
      </Toolbar>
      <Notice type="error" msg={err} />

      {loading ? <SkeletonList /> : filtered.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No records in this category" />
      ) : (
        <div className="grid gap-2.5">
          {filtered.slice(0, count).map((r) => {
            const latest = r.fbRows[r.fbRows.length - 1]
            const complete = pipelineComplete(r.fbRows)
            const sm: { label: string; tone: Tone } = latest ? statusMeta(latest.call_status) : { label: "Pending", tone: "gold" }
            const isOpen = expanded === r.id
            const isMine = isAdmin || r.assignment?.assigned_to === currentUser || r.fbRows.some((f: any) => f.caller_name === currentUser)
            return (
              <Panel key={r.id} className={cn("overflow-hidden p-0 sm:p-0", isOpen && "ring-1 ring-primary/30")}>
                <div className={cn("p-4", isAdmin && "cursor-pointer")} onClick={() => isAdmin && setExpanded(isOpen ? null : r.id)}>
                  <ContactHead
                    r={r}
                    name={`${r.full_name}${callerProfileTag(r)}`}
                    sub={<>{r.membership_decision && <span>· {r.membership_decision}</span>}{r.assignment && <span className="text-info">· Assigned to <strong>{r.assignment.assigned_to}</strong></span>}</>}
                  >
                    {complete ? (
                      <ToneBadge tone="brand" icon={CheckCircle2}>Complete</ToneBadge>
                    ) : isMine ? (
                      <>
                        <ToneBadge tone={sm.tone} dot>{sm.label}</ToneBadge>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); onLogFeedback(r) }}><Phone />Log week {nextWeek(r.fbRows)}</Button>
                      </>
                    ) : (
                      <ToneBadge tone="muted">Not assigned to you</ToneBadge>
                    )}
                    {isAdmin && <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-label={isOpen ? "Collapse" : "Expand"} />}
                  </ContactHead>
                  <div className="mt-3"><PipelineBar fbRows={r.fbRows} /></div>
                </div>
                {isAdmin && isOpen && (
                  <div className="grid gap-2 border-t bg-card p-4">
                    {r.fbRows.length === 0 ? <p className="text-xs text-muted-foreground">No call logs yet.</p> : r.fbRows.map((fb: any) => <CallLogItem key={fb.id} fb={fb} />)}
                    {r.overview && <OverviewSummary overview={r.overview} />}
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && <Footer shown={count} total={filtered.length} noun="record" />}
    </div>
  )
}

// ── Call backs ─────────────────────────────────────────────────────────────
function CallBackQueue({ onLogFeedback }: { onLogFeedback: (r: any) => void }) {
  const { user: currentUser } = useSession()
  const { data, loading, err, reload } = useCallData()
  const callbacks = data.filter((r) => {
    if (pipelineComplete(r.fbRows)) return false
    const latest = r.fbRows[r.fbRows.length - 1]
    if (!latest) return false
    return normaliseStatus(latest.call_status) === "Call Back" && (r.assignment?.assigned_to === currentUser || r.fbRows.some((f: any) => f.caller_name === currentUser))
  })
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Experience Team" title="Call backs" subtitle={`${callbacks.length} contact${callbacks.length !== 1 ? "s" : ""} waiting for a follow-up call.`}
        action={<Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>} />
      <Notice type="error" msg={err} />
      {loading ? <SkeletonList /> : callbacks.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No call backs pending" description="All follow-up calls are up to date." />
      ) : (
        <div className="masonry">
          {callbacks.map((r) => {
            const latest = r.fbRows[r.fbRows.length - 1]
            return (
              <Panel key={r.id} className="border-gold/40 p-4 sm:p-4">
                <ContactHead r={r} name={`${r.full_name}${genderTag(r)}`} />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <ToneBadge tone="warning" dot>Call back</ToneBadge>
                  {latest?.follow_up_date && <ToneBadge tone="warning" icon={Calendar}>{fmtDate(latest.follow_up_date)}</ToneBadge>}
                </div>
                {latest?.notes && <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{latest.notes}</p>}
                <div className="mt-3"><PipelineBar fbRows={r.fbRows} /></div>
                <Button size="sm" className="mt-3 w-full" onClick={() => onLogFeedback(r)}><Phone />Log week {nextWeek(r.fbRows)}</Button>
              </Panel>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── My calls ───────────────────────────────────────────────────────────────
function MyCallsView({ onLogFeedback, onEditWeekFeedback, onEditOverview }: { onLogFeedback: (r: any) => void; onEditWeekFeedback: (r: any, w: number) => void; onEditOverview: (r: any) => void }) {
  const { user: currentUser } = useSession()
  const { data, loading, err, reload } = useCallData()
  const [filter, setFilter] = useState("all")
  const mine = data.filter((r) => r.assignment?.assigned_to === currentUser || r.fbRows.some((f: any) => f.caller_name === currentUser))
  const reached = mine.filter((r) => r.fbRows.some((f: any) => normaliseStatus(f.call_status) === "Reached"))
  const callback = mine.filter((r) => { const last = r.fbRows[r.fbRows.length - 1]; return last && normaliseStatus(last.call_status) === "Call Back" })
  const complete = mine.filter((r) => pipelineComplete(r.fbRows))
  const flagged = mine.filter((r) => r.fbRows.some((f: any) => f.flagged_for_pastoral))
  const views: Record<string, any[]> = { all: mine, reached, callback, complete, flagged }
  const filtered = views[filter] || mine
  const { count, sentinel, hasMore } = useInfiniteReveal(filter, filtered.length, 16)

  const today = todayISO()
  const dueEntries = mine
    .filter((r) => !pipelineComplete(r.fbRows))
    .map((r) => {
      const last = r.fbRows[r.fbRows.length - 1]
      if (!last?.follow_up_date || last.follow_up_date > today) return null
      return { id: r.id, row: r, name: r.full_name, phone: r.phone, dueDate: last.follow_up_date, note: last.notes }
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate)) as any[]

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Experience Team" title="My calls" subtitle={`${mine.length} contact${mine.length !== 1 ? "s" : ""} assigned to you.`}
        action={<Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>} />
      <DueTodayPanel entries={dueEntries} actionLabel="Log call" onAction={onLogFeedback} />
      <StatGrid>
        <StatCard label="Assigned to me" value={mine.length} icon={Phone} tone="brand" />
        <StatCard label="Pipeline complete" value={complete.length} icon={CheckCircle2} tone="brand" />
        <StatCard label="Call backs" value={callback.length} icon={RefreshCw} tone="warning" />
        <StatCard label="Flagged" value={flagged.length} icon={Flag} tone="danger" sub={flagged.length > 0 ? "Needs pastoral attention" : ""} />
      </StatGrid>
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "all", label: "All", count: mine.length },
          { value: "reached", label: "Reached", count: reached.length },
          { value: "callback", label: "Call back", count: callback.length },
          { value: "complete", label: "Complete", count: complete.length },
          { value: "flagged", label: "Flagged", count: flagged.length },
        ]} />
      </Toolbar>
      <Notice type="error" msg={err} />
      {loading ? <SkeletonList /> : filtered.length === 0 ? (
        <EmptyState icon={Phone} title={mine.length === 0 ? "No contacts assigned to you yet" : "No contacts in this category"} description={mine.length === 0 ? "Ask your Experience Admin to assign contacts to you." : undefined} />
      ) : (
        <div className="masonry [columns:360px]">
          {filtered.slice(0, count).map((r) => {
            const isComplete = pipelineComplete(r.fbRows)
            const lastFb = r.fbRows[r.fbRows.length - 1]
            const sm: { label: string; tone: Tone } = lastFb ? statusMeta(lastFb.call_status) : { label: "Pending", tone: "gold" }
            const anyFlagged = r.fbRows.some((f: any) => f.flagged_for_pastoral)
            return (
              <Panel key={r.id} className="p-4 sm:p-4">
                <ContactHead r={r} name={`${r.full_name}${genderTag(r)}`} />
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {anyFlagged && <ToneBadge tone="danger" icon={Flag}>Flagged</ToneBadge>}
                  {isComplete ? (
                    <ToneBadge tone="brand" icon={CheckCircle2}>Pipeline complete</ToneBadge>
                  ) : (
                    <ToneBadge tone={sm.tone} dot>{sm.label}</ToneBadge>
                  )}
                  {r.overview && <ToneBadge tone="brand" icon={CheckCircle2}>Overview submitted</ToneBadge>}
                </div>
                <div className="mt-3"><PipelineBar fbRows={r.fbRows} /></div>
                {r.fbRows.length > 0 ? (
                  <div className="mt-3 grid gap-1.5">
                    {r.fbRows.map((fb: any) => <CallLogItem key={fb.id} fb={fb} onEdit={fb.caller_name === currentUser ? () => onEditWeekFeedback(r, fb.week_number) : undefined} />)}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">No call logs yet. Start with Week 1.</p>
                )}
                {r.overview && <OverviewSummary overview={r.overview} />}
                <div className="mt-3 border-t pt-3">
                  {isComplete ? (
                    r.overview ? (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => onEditOverview(r)}><Edit3 />Edit overview</Button>
                    ) : (
                      <Button size="sm" variant="gold" className="w-full" onClick={() => onLogFeedback(r)}><FileText />Submit overview</Button>
                    )
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => onLogFeedback(r)}><Phone />Log week {nextWeek(r.fbRows)}</Button>
                  )}
                </div>
              </Panel>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && <Footer shown={count} total={filtered.length} noun="contact" />}
    </div>
  )
}

// ── Log feedback ───────────────────────────────────────────────────────────
function DoneCard({ title, children, onBack, backLabel = "Back to queue" }: { title: React.ReactNode; children?: React.ReactNode; onBack: () => void; backLabel?: string }) {
  return (
    <Panel className="mx-auto max-w-lg animate-page-in py-12 text-center">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brand-tint text-primary"><CheckCircle2 className="size-7" /></span>
      <h2 className="font-display text-xl font-extrabold">{title}</h2>
      {children && <div className="mt-3 text-[13.5px] text-ink-secondary">{children}</div>}
      <Button variant="outline" className="mt-6" onClick={onBack}><ArrowLeft />{backLabel}</Button>
    </Panel>
  )
}

function SessionNameField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (e: any) => void }) {
  return name ? (
    <div className="mb-4 flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-secondary">{label}</span>
      <div className="flex h-9 items-center gap-2 rounded-sm border border-primary/30 bg-brand-tint px-3 text-sm font-semibold text-primary-strong">
        <UserCheck className="size-4" />{name}<span className="ml-auto text-[11px] font-normal text-muted-foreground italic">Logged as you</span>
      </div>
    </div>
  ) : (
    <FieldInput label={label} required value={value} onChange={onChange} placeholder="Enter your name" hint="Your name could not be loaded from the session — type it manually" />
  )
}

export function LogFeedback({ person, onBack, editWeek = null }: { person: any; onBack: () => void; editWeek?: number | null }) {
  const { user: callerName } = useSession()
  const fbRows = person.fbRows || []
  const weekToLog = editWeek !== null ? editWeek : nextWeek(fbRows)
  const displayName = `${person.full_name}${genderTag(person)}`
  const [form, setForm] = useState<any>({
    call_status: "", experience_rating: "", returning_likelihood: "", notes: "", follow_up_date: "",
    caller_name: callerName, flagged_for_pastoral: false, flag_reason: "", church_attendance: "",
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [done, setDone] = useState(false)
  const [showOverview, setShowOverview] = useState(false)
  const [err, setErr] = useState("")
  const [existingRow, setExistingRow] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      setFetching(true)
      if (weekToLog === null) { setFetching(false); return }
      try {
        const rows = await sb(`call_feedback?first_timer_id=eq.${person.id}&week_number=eq.${weekToLog}&order=created_at.desc&limit=1`)
        if (rows?.length) {
          const r = rows[0]
          setExistingRow(r)
          setForm({
            call_status: r.call_status || "", experience_rating: r.experience_rating || "", returning_likelihood: r.returning || "",
            notes: r.notes || "", follow_up_date: r.follow_up_date || "", caller_name: callerName || r.caller_name || "",
            flagged_for_pastoral: r.flagged_for_pastoral || false, flag_reason: r.flag_reason || "", church_attendance: r.church_attendance || "",
          })
        }
      } catch {}
      setFetching(false)
    })()
  }, [person.id, weekToLog, callerName])

  const set = (key: string) => (e: any) => {
    const val = e && e.target !== undefined ? e.target.value : e
    setForm((f: any) => ({ ...f, [key]: val }))
  }
  const isReached = form.call_status === "Reached"

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.call_status) { setErr("Call status is required."); return }
    if (!form.caller_name?.trim()) { setErr("Caller name is missing — please contact your admin."); return }
    if (form.flagged_for_pastoral && !form.flag_reason.trim()) { setErr("Please describe the reason for flagging."); return }
    setLoading(true); setErr("")
    try {
      const payload = {
        first_timer_id: person.id, week_number: weekToLog, call_status: form.call_status,
        experience_rating: isReached ? form.experience_rating || null : null,
        returning: isReached ? form.returning_likelihood || null : null,
        notes: form.notes || null, follow_up_date: form.follow_up_date || null, caller_name: form.caller_name.trim(),
        flagged_for_pastoral: !!form.flagged_for_pastoral, flag_reason: form.flagged_for_pastoral ? form.flag_reason || null : null,
        church_attendance: (weekToLog || 0) >= 2 ? form.church_attendance || null : null,
      }
      if (existingRow) await sb(`call_feedback?id=eq.${existingRow.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      else await sb("call_feedback", { method: "POST", body: JSON.stringify(payload) })
      if (weekToLog === 3 && !editWeek && !person.overview) setShowOverview(true)
      else setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  if (showOverview) return <PipelineOverviewForm person={person} onBack={onBack} onDone={onBack} />
  if (!fetching && weekToLog === null && editWeek === null)
    return (
      <DoneCard title={`Pipeline complete for ${displayName}`} onBack={onBack} backLabel="Back">
        <p>All three weeks have been logged.</p>
        <div className="mt-4 flex justify-center"><PipelineBar fbRows={fbRows} /></div>
        {!person.overview && <Button variant="gold" className="mt-4" onClick={() => setShowOverview(true)}><FileText />Submit VIP retention overview</Button>}
      </DoneCard>
    )
  if (fetching) return <Panel className="grid place-items-center py-16"><Spinner className="size-6 text-primary" /></Panel>
  if (done)
    return (
      <DoneCard title={`Week ${weekToLog} feedback ${existingRow ? "updated" : "logged"} for ${displayName}`} onBack={onBack}>
        {form.flagged_for_pastoral && <ToneBadge tone="danger" icon={Flag}>Flagged for Pastoral Team</ToneBadge>}
        {(weekToLog || 0) < 3 && <p className="mt-3">Next step: <strong>Week {(weekToLog || 0) + 1}</strong> call</p>}
      </DoneCard>
    )

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl animate-page-in">
      <PageHeader
        eyebrow={editWeek ? `Edit week ${weekToLog}` : `Week ${weekToLog} call`}
        title={displayName}
        subtitle={<span className="inline-flex flex-wrap items-center gap-2"><PhoneLink phone={person.phone} withWhatsApp /> · visited {fmtDate(person.service_date)}</span>}
        action={<Button type="button" variant="outline" onClick={onBack}><ArrowLeft />Back</Button>}
      />
      <Panel className="mb-4 p-4 sm:p-4">
        <div className="eyebrow mb-2">Pipeline progress</div>
        <PipelineBar fbRows={fbRows} />
      </Panel>
      {existingRow && <Notice type="warn" msg={`You're editing the existing Week ${weekToLog} entry. Saving overwrites it.`} />}
      <Notice type="error" msg={err} onClose={() => setErr("")} />

      <Panel>
        <SessionNameField label="Your name (caller)" name={callerName} value={form.caller_name} onChange={set("caller_name")} />
        {(weekToLog || 0) >= 2 && (
          <div className="mb-4 rounded-md bg-muted/60 p-4 pb-0">
            <div className="eyebrow mb-2 flex items-center gap-1.5"><Calendar className="size-3.5" />Church attendance — week {weekToLog}</div>
            <FieldInput label="Was this person in church on Sunday?" type="select" value={form.church_attendance} onChange={set("church_attendance")}
              options={[{ value: "Present", label: "Present" }, { value: "Absent", label: "Absent" }, { value: "Unknown", label: "Unknown" }]} />
          </div>
        )}
        <FieldInput label="Call status" type="select" required value={form.call_status} onChange={set("call_status")} options={CALL_STATUS_OPTIONS} />
        {form.call_status && (() => {
          const sm = statusMeta(form.call_status)
          return <p className="-mt-2 mb-4 flex items-center gap-1.5 text-xs text-ink-secondary"><Dot tone={sm.tone} />Will be logged as <strong>{sm.label}</strong></p>
        })()}
        {isReached && (
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldInput label="Experience rating" type="select" value={form.experience_rating} onChange={set("experience_rating")}
              options={["Excellent", "Good", "Average", "Poor"].map((v) => ({ value: v, label: v }))} />
            <FieldInput label="Returning?" type="select" value={form.returning_likelihood} onChange={set("returning_likelihood")}
              options={[
                { value: "Yes", label: "Yes: will return next week" }, { value: "Maybe", label: "Maybe: on special services" },
                { value: "No", label: "No: came to visit" }, { value: "Undecided", label: "Undecided" },
              ]} />
          </div>
        )}
        {!isReached && form.call_status && (
          <FieldInput label="Scheduled call-back date" type="date" value={form.follow_up_date} onChange={set("follow_up_date")} hint="Set a date to remind the team to call back" />
        )}
        <FieldInput label="Notes" type="textarea" rows={4} value={form.notes} onChange={set("notes")} placeholder={isReached ? "Key points from the conversation" : "Reason or any context for the team"} />
        <div className="rounded-md border border-danger/20 bg-danger-tint/50 p-4 pb-0">
          <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-danger"><Flag className="size-3.5" />Flag for Pastoral Team</div>
          <FieldInput label="Flag this person for Pastoral Team attention" type="toggle" value={form.flagged_for_pastoral} onChange={set("flagged_for_pastoral")}
            hint="Use this if the visitor raised a concern, prayer request, or needs pastoral follow-up" />
          {form.flagged_for_pastoral && (
            <FieldInput label="Reason for flagging" type="textarea" required value={form.flag_reason} onChange={set("flag_reason")} placeholder="Describe the concern that needs pastoral attention" />
          )}
        </div>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={loading}>
          {loading && <Spinner />}{loading ? "Saving…" : `${existingRow ? "Update" : "Save"} week ${weekToLog} feedback`}
        </Button>
      </Panel>
    </form>
  )
}

// ── Pipeline overview ──────────────────────────────────────────────────────
export function PipelineOverviewForm({ person, onBack, onDone }: { person: any; onBack: () => void; onDone: () => void }) {
  const { user: callerName } = useSession()
  const existing = person.overview || null
  const displayName = `${person.full_name}${genderTag(person)}`
  const [form, setForm] = useState<any>({
    move_to_membership: existing ? existing.move_to_membership : null,
    natural_groups: existing?.natural_groups || [],
    connect_center: existing?.connect_center || "",
    overview_notes: existing?.overview_notes || "",
    submitted_by: existing?.submitted_by || callerName,
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const isEditing = !!existing
  const set = (key: string) => (v: any) => setForm((f: any) => ({ ...f, [key]: v && v.target !== undefined ? v.target.value : v }))

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (form.move_to_membership === null) { setErr("Please indicate whether to move this person to Membership."); return }
    setLoading(true); setErr("")
    try {
      const payload = {
        first_timer_id: person.id, submitted_by: form.submitted_by || callerName, move_to_membership: !!form.move_to_membership,
        natural_groups: form.natural_groups.length > 0 ? form.natural_groups : null,
        connect_center: form.connect_center || null, overview_notes: form.overview_notes || null,
      }
      if (isEditing) await sb(`pipeline_overviews?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      else {
        const ex = await sb(`pipeline_overviews?first_timer_id=eq.${person.id}&select=id&limit=1`).catch(() => [])
        if (ex?.length) await sb(`pipeline_overviews?id=eq.${ex[0].id}`, { method: "PATCH", body: JSON.stringify(payload) })
        else await sb("pipeline_overviews", { method: "POST", body: JSON.stringify(payload) })
      }
      if (form.move_to_membership)
        await sb(`first_timers?id=eq.${person.id}`, { method: "PATCH", body: JSON.stringify({ membership_decision: "Member" }) }).catch(() => {})
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  if (done)
    return (
      <DoneCard title={isEditing ? "Overview updated" : "VIP retention overview submitted"} onBack={onDone} backLabel="Back to My Calls">
        {displayName}&apos;s retention overview has been {isEditing ? "updated" : "recorded"}.
        {form.move_to_membership && " Their membership decision is now Member."}
      </DoneCard>
    )

  const choice = (val: boolean, label: string, tone: "brand" | "danger") => {
    const on = form.move_to_membership === val
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setForm((f: any) => ({ ...f, move_to_membership: val }))}
        className={cn(
          "flex-1 rounded-md border-2 px-4 py-3 text-left text-[13.5px] font-semibold transition-colors",
          on ? (tone === "brand" ? "border-primary bg-brand-tint text-primary-strong" : "border-danger bg-danger-tint text-danger") : "border-border bg-card text-ink-secondary hover:border-border-strong",
        )}
      >
        {on && <CheckCircle2 className="mr-1.5 inline size-4" />}{label}
      </button>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl animate-page-in">
      <PageHeader eyebrow={isEditing ? "Edit retention overview" : "VIP retention overview"} title={displayName}
        subtitle={isEditing ? "Update your assessment. Saving overwrites the existing overview." : "Submit your three-week assessment to help the team decide on membership."}
        action={<Button type="button" variant="outline" onClick={onBack}><ArrowLeft />Back</Button>} />
      {!isEditing && <Notice type="success" msg="All three weeks have been logged. Submit your final overview below." />}
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <Panel className="grid gap-6">
        <section>
          <SH title="Membership recommendation" icon={UserCheck} />
          <p className="mb-3 text-[13px] text-ink-secondary">Based on your three weeks of contact, do you recommend moving <strong>{displayName}</strong> to full membership?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {choice(true, "Yes — move to membership", "brand")}
            {choice(false, "No — not ready for membership yet", "danger")}
          </div>
        </section>
        <section>
          <SH title="Natural groups eligibility" icon={Users} />
          <FieldInput label="Select any natural groups this person is eligible for (optional)" type="multicheck" value={form.natural_groups} onChange={set("natural_groups")} options={NATURAL_GROUPS.map((g) => ({ value: g, label: g }))} className="mb-0" />
        </section>
        <section>
          <SH title="Recommended connect centre" icon={MapPin} />
          <FieldInput label="Connect centre" type="select" value={form.connect_center} onChange={set("connect_center")} options={CONNECT_CENTERS.map((c) => ({ value: c, label: c }))} hint="Pick the connect centre closest to where this person lives" className="mb-0" />
        </section>
        <section>
          <SH title="Overview notes" icon={FileText} />
          <FieldInput label="Additional notes (optional)" type="textarea" rows={4} value={form.overview_notes} onChange={set("overview_notes")} placeholder="Observations or context to share with the pastoral team" className="mb-0" />
        </section>
        <SessionNameField label="Submitted by" name={callerName} value={form.submitted_by} onChange={set("submitted_by")} />
        <Button type="submit" size="lg" variant="gold" className="w-full" disabled={loading}>
          {loading && <Spinner />}{loading ? "Saving…" : isEditing ? "Save changes to overview" : "Submit VIP retention overview"}
        </Button>
      </Panel>
    </form>
  )
}

// ── Screens (own the sub-view state the legacy App held) ───────────────────
export function MyCallsScreen() {
  const [feedback, setFeedback] = useState<any>(null)
  const [editWeek, setEditWeek] = useState<{ person: any; week: number } | null>(null)
  const [editOverview, setEditOverview] = useState<any>(null)
  if (editOverview) return <PipelineOverviewForm person={editOverview} onBack={() => setEditOverview(null)} onDone={() => setEditOverview(null)} />
  if (editWeek) return <LogFeedback person={editWeek.person} editWeek={editWeek.week} onBack={() => setEditWeek(null)} />
  if (feedback) return <LogFeedback person={feedback} onBack={() => setFeedback(null)} />
  return <MyCallsView onLogFeedback={setFeedback} onEditWeekFeedback={(person, week) => setEditWeek({ person, week })} onEditOverview={setEditOverview} />
}

export function CallQueueScreen() {
  const [feedback, setFeedback] = useState<any>(null)
  if (feedback) return <LogFeedback person={feedback} onBack={() => setFeedback(null)} />
  return <CallQueue onLogFeedback={setFeedback} />
}

export function CallBacksScreen() {
  const [feedback, setFeedback] = useState<any>(null)
  if (feedback) return <LogFeedback person={feedback} onBack={() => setFeedback(null)} />
  return <CallBackQueue onLogFeedback={setFeedback} />
}
