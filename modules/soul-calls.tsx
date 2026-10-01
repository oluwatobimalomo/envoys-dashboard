"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle, ArrowLeft, Calendar, CheckCircle2, Clock, Download, FileText, Flag, Heart, Phone, Star, TrendingUp,
  UserCheck, Users, X, Zap,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SearchInput, Segmented, SkeletonList, SkeletonReport,
  StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { DateRangeBar } from "@/components/app/shared"
import { BarRow, ChartCard, ChartEmpty, Donut, Lines, SectionLabel, SummaryPanel, VBars } from "@/components/app/charts"
import { useSession } from "@/components/app/session"
import { MemberProfile } from "@/modules/care"
import { ncCheckinsLogged, ncComplete, useNewConvertData } from "@/modules/new-converts"
import { AssignControl } from "@/modules/vip-contact"
import { sb } from "@/lib/supabase"
import { SC_STATUS_TONE, csvCell, daysSince, downloadBlob, fmtDate, todayISO } from "@/lib/format"
import { useInfiniteReveal, useRoleUsers } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const SC_STATUSES = ["Reached", "No Answer", "Call Back Requested", "Wrong Number"]
const SC_COLOR: Record<string, string> = { Reached: "var(--primary)", "No Answer": "var(--gold)", "Call Back Requested": "var(--info)", "Wrong Number": "var(--danger)" }

function useSoulCallData() {
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
        const [stewards, members, assignments, logs] = await Promise.all([
          sb("stewards?select=id,full_name,phone,gender,marital_status,life_stage,position,membership_status&order=full_name.asc&limit=3000"),
          sb("church_members?select=id,full_name,phone,gender,marital_status,life_stage,membership_status&order=full_name.asc&limit=3000"),
          sb("soul_call_assignments?select=*").catch(() => []),
          sb("soul_call_logs?select=person_table,person_id,call_date,call_status&order=call_date.asc").catch(() => []),
        ])
        const asg: Record<string, any> = {}
        ;(assignments || []).forEach((a: any) => (asg[`${a.person_table}:${a.person_id}`] = a))
        const last: Record<string, string> = {}, lastStatus: Record<string, string> = {}, cnt: Record<string, number> = {}
        ;(logs || []).forEach((l: any) => {
          const k = `${l.person_table}:${l.person_id}`
          if (!last[k] || l.call_date >= last[k]) { last[k] = l.call_date; lastStatus[k] = l.call_status }
          cnt[k] = (cnt[k] || 0) + 1
        })
        const merged = [
          ...(stewards || []).map((m: any) => ({ ...m, _table: "stewards", category: "Steward" })),
          ...(members || []).map((m: any) => ({ ...m, _table: "church_members", category: "Member" })),
        ].map((m) => { const k = `${m._table}:${m.id}`; return { ...m, assignment: asg[k] || null, lastCalled: last[k] || null, lastStatus: lastStatus[k] || null, callCount: cnt[k] || 0 } })
        if (!cancelled) setData(merged)
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tick])
  return { data, loading, err, reload }
}

function sortByCallPriority(rows: any[]) {
  return [...rows].sort((a, b) => {
    if (!a.lastCalled && !b.lastCalled) return (a.full_name || "").localeCompare(b.full_name || "")
    if (!a.lastCalled) return -1
    if (!b.lastCalled) return 1
    return a.lastCalled < b.lastCalled ? -1 : a.lastCalled > b.lastCalled ? 1 : 0
  })
}
function detailLine(r: any) {
  const parts = [r.gender, r.marital_status, r.life_stage].filter(Boolean)
  if (r._table === "stewards" && r.position && r.position !== "Steward") parts.push(r.position)
  return parts.join(" · ")
}
function CategoryToggle({ value, onChange, counts }: { value: string; onChange: (v: string) => void; counts?: Record<string, number> }) {
  return <Segmented size="default" className="mb-5" value={value} onChange={onChange} options={[{ value: "Steward", label: "Stewards", count: counts?.Steward }, { value: "Member", label: "Members", count: counts?.Member }]} />
}
function SinceBadge({ lastCalled }: { lastCalled: string | null }) {
  const ds = daysSince(lastCalled)
  return <ToneBadge tone={ds === null ? "danger" : ds > 30 ? "warning" : "muted"} icon={Clock}>{ds === null ? "Never called" : `${ds}d ago`}</ToneBadge>
}

function HistoryItem({ h }: { h: any }) {
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2.5">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <ToneBadge tone={SC_STATUS_TONE[h.call_status] || "muted"}>{h.call_status}</ToneBadge>
        <span className="text-xs text-ink-secondary">{fmtDate(h.call_date)}</span>
        <span className="text-xs text-muted-foreground">· by {h.called_by || "—"}</span>
        {h.flagged_for_pastoral && <ToneBadge tone="danger" icon={Flag}>Flagged</ToneBadge>}
        {h.visitation_availability && <ToneBadge tone={h.visitation_availability === "Available" ? "brand" : "muted"}>Visit: {h.visitation_availability}</ToneBadge>}
      </div>
      {h.visitation_availability === "Available" && (h.visitation_date || h.visitation_time) && <p className="text-xs text-primary">Proposed: {h.visitation_date ? fmtDate(h.visitation_date) : "date TBC"}{h.visitation_time ? ` at ${h.visitation_time.slice(0, 5)}` : ""}</p>}
      {h.flag_reason && <p className="text-xs text-danger"><strong>Flagged:</strong> {h.flag_reason}</p>}
      {h.notes && <p className="text-xs leading-relaxed text-ink-secondary">{h.notes}</p>}
    </div>
  )
}

// ── Log a soul call ────────────────────────────────────────────────────────
function LogSoulCallForm({ person, onCancel, onDone }: { person: any; onCancel: () => void; onDone: () => void }) {
  const { user: loggedBy } = useSession()
  const [status, setStatus] = useState("Reached")
  const [notes, setNotes] = useState("")
  const [flag, setFlag] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const [visit, setVisit] = useState<string | null>(null)
  const [visitDate, setVisitDate] = useState("")
  const [visitTime, setVisitTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingHistory(true)
      try { const logs = await sb(`soul_call_logs?person_table=eq.${person._table}&person_id=eq.${person.id}&select=*&order=call_date.desc,created_at.desc&limit=5`); if (!cancelled) setHistory(logs || []) } catch { if (!cancelled) setHistory([]) }
      if (!cancelled) setLoadingHistory(false)
    })()
    return () => { cancelled = true }
  }, [person._table, person.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (flag && !flagReason.trim()) { setErr("Describe the reason for flagging."); return }
    setSaving(true); setErr("")
    try {
      await sb("soul_call_logs", {
        method: "POST",
        body: JSON.stringify({
          person_table: person._table, person_id: String(person.id), called_by: loggedBy || null, call_status: status, notes: notes.trim() || null,
          flagged_for_pastoral: flag, flag_reason: flag ? flagReason.trim() : null, visitation_availability: visit,
          visitation_date: visit === "Available" ? visitDate || null : null, visitation_time: visit === "Available" ? visitTime || null : null,
        }),
      })
      toast.success(`Call logged for ${person.full_name}.`)
      onDone()
    } catch (e: any) { setErr(e.message) }
    setSaving(false)
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Log call" title={person.full_name} subtitle={<span className="inline-flex flex-wrap items-center gap-2">{person.category} · <PhoneLink phone={person.phone} withWhatsApp /></span>}
        action={<Button variant="outline" onClick={onCancel}><ArrowLeft />Back</Button>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <form onSubmit={submit} noValidate>
          <Panel>
            <Notice type="error" msg={err} onClose={() => setErr("")} />
            <div className="mb-4 flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-secondary">Call status</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Call status">
                {SC_STATUSES.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={status === s} onClick={() => setStatus(s)}
                    className={cn("rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors", status === s ? "border-transparent text-white" : "border-border-strong bg-card text-ink-secondary hover:bg-muted")}
                    style={status === s ? { background: SC_COLOR[s] } : undefined}>{s}</button>
                ))}
              </div>
            </div>
            <FieldInput label="Notes (optional)" type="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Prayer requests, welfare notes, anything worth remembering" />
            <div className="mb-4 flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-secondary">Open to a visit from the Visitation Team? <span className="font-normal text-muted-foreground">(optional)</span></span>
              <Segmented size="default" value={visit || ""} onChange={(v) => setVisit((cur) => (cur === v ? null : v))} options={[{ value: "Available", label: "Available" }, { value: "Unavailable", label: "Unavailable" }]} />
              {visit === "Available" && (
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">Preferred date<Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="bg-card" /></label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">Preferred time<Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="bg-card" /></label>
                </div>
              )}
            </div>
            <div className="mb-4 rounded-md border border-danger/20 bg-danger-tint/50 p-4 pb-0">
              <div className="mb-3 flex items-center gap-1.5 text-[13px] font-bold text-danger"><Flag className="size-3.5" />Flag for Pastoral Team</div>
              <FieldInput label="Flag this person for Pastoral Team attention" type="toggle" value={flag} onChange={setFlag} hint="Use this if the person raised a concern, prayer request, or needs pastoral follow-up" />
              {flag && <FieldInput label="Reason for flagging" type="textarea" required value={flagReason} onChange={(e) => setFlagReason(e.target.value)} placeholder="Describe the concern that needs pastoral attention" />}
            </div>
            <Button type="submit" variant="soul" size="lg" className="w-full" disabled={saving}>{saving && <Spinner />}{saving ? "Saving…" : "Save call log"}</Button>
          </Panel>
        </form>
        <aside>
          <h2 className="mb-3 flex items-center justify-between font-display text-[15px] font-bold">Before you call<span className="text-xs font-normal text-muted-foreground">{history.length >= 5 ? "last 5" : ""}</span></h2>
          {loadingHistory ? <SkeletonList rows={2} /> : history.length === 0 ? (
            <Panel className="p-4 text-[13px] text-muted-foreground sm:p-4">No previous calls on record. This will be the first.</Panel>
          ) : <div className="grid gap-2">{history.map((h) => <HistoryItem key={h.id} h={h} />)}</div>}
        </aside>
      </div>
    </div>
  )
}

// ── Assign ─────────────────────────────────────────────────────────────────
function AssignSoulCalls({ onViewProfile }: { onViewProfile: (m: any) => void }) {
  const { user: currentUser } = useSession()
  const { data, loading, err, reload } = useSoulCallData()
  const { options: teamOptions, loading: teamLoading } = useRoleUsers("soulcare")
  const [category, setCategory] = useState("Steward")
  const [selectedMember, setSelectedMember] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("unassigned")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [msgType, setMsgType] = useState<"success" | "error" | "warn">("success")
  const [selected, setSelected] = useState<Set<any>>(new Set())

  const byCat = data.filter((r) => r.category === category)
  const filtered = sortByCallPriority(byCat.filter((r) => {
    const m = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
    if (filter === "unassigned") return m && !r.assignment
    if (filter === "assigned") return m && !!r.assignment
    return m
  }))
  const { count, sentinel, hasMore } = useInfiniteReveal(`${category}|${search}|${filter}`, filtered.length, 20)
  const assignedCount = byCat.filter((r) => !!r.assignment).length
  const unassignedCount = byCat.length - assignedCount
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length
  const visibleIds = filtered.slice(0, count).map((r) => r.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); visibleIds.forEach((id) => (allVisibleSelected ? n.delete(id) : n.add(id))); return n })
  const noun = category === "Steward" ? "steward" : "member"

  const bulkAssign = async () => {
    if (!selectedMember) { setMsg("Select a team member first."); setMsgType("warn"); return }
    const targets = selectedCount > 0 ? byCat.filter((r) => selected.has(r.id)) : byCat.filter((r) => !r.assignment)
    if (!targets.length) { setMsg("No contacts to assign."); setMsgType("warn"); return }
    setSaving(true); setMsg("")
    try {
      const payload = targets.map((r) => ({ person_table: r._table, person_id: String(r.id), assigned_to: selectedMember, assigned_by: currentUser }))
      for (let i = 0; i < payload.length; i += 50) await sb("soul_call_assignments", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify(payload.slice(i, i + 50)) })
      setMsg(`${targets.length} ${noun}${targets.length !== 1 ? "s" : ""} assigned to ${selectedMember}.`); setMsgType("success"); setSelected(new Set()); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }
  const saveAssignment = async (person: any, member: string) => {
    setSaving(true)
    try {
      if (person.assignment) await sb(`soul_call_assignments?id=eq.${person.assignment.id}`, { method: "PATCH", body: JSON.stringify({ assigned_to: member, assigned_by: currentUser }) })
      else await sb("soul_call_assignments", { method: "POST", body: JSON.stringify({ person_table: person._table, person_id: String(person.id), assigned_to: member, assigned_by: currentUser }) })
      setMsg(`Assigned to ${member}.`); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }
  const removeAssignment = async (id: any) => {
    setSaving(true)
    try { await sb(`soul_call_assignments?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }); setMsg("Assignment removed."); setMsgType("success"); reload() } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Assign soul calls" subtitle="Allocate stewards and members to Soul Care team members for calling." />
      <CategoryToggle value={category} onChange={(c) => { setCategory(c); setSelected(new Set()) }} counts={{ Steward: data.filter((r) => r.category === "Steward").length, Member: data.filter((r) => r.category === "Member").length }} />
      <StatGrid cols={3}>
        <StatCard label={`Total ${noun}s`} value={byCat.length} icon={Users} tone="soul" />
        <StatCard label="Assigned" value={assignedCount} icon={UserCheck} tone="brand" />
        <StatCard label="Unassigned" value={unassignedCount} icon={AlertCircle} tone="gold" sub={unassignedCount > 0 ? "Need assignment" : "All assigned"} />
      </StatGrid>
      <Panel className="mb-5 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-1.5 eyebrow"><Zap className="size-3.5" />Bulk assignment</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-[13px] text-ink-secondary">
            <span>{selectedCount > 0 ? <>Assign <strong>{selectedCount}</strong> selected {noun}{selectedCount !== 1 ? "s" : ""} to:</> : <>Assign all <strong>{unassignedCount}</strong> unassigned {noun}s to:</>}</span>
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} disabled={teamLoading} className="h-9 rounded-sm border border-input bg-card px-3 text-sm">
              <option value="">{teamLoading ? "Loading…" : "Select caller"}</option>
              {teamOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <Button onClick={bulkAssign} disabled={saving || !selectedMember || (selectedCount === 0 && unassignedCount === 0)}><Zap />{selectedCount > 0 ? `Assign (${selectedCount})` : "Assign all"}</Button>
        </div>
      </Panel>
      <Notice type={msgType} msg={msg} onClose={() => setMsg("")} />
      <Notice type="error" msg={err} />
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[{ value: "unassigned", label: "Unassigned", count: unassignedCount }, { value: "assigned", label: "Assigned", count: assignedCount }, { value: "all", label: "All", count: byCat.length }]} />
        <Button size="sm" variant="outline" onClick={toggleAll}>{allVisibleSelected ? "Deselect all" : "Select all"}</Button>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" className="ml-auto sm:w-60" />
      </Toolbar>
      {loading ? <SkeletonList /> : filtered.length === 0 ? <EmptyState icon={Users} title="Nothing here" /> : (
        <div className="grid gap-2.5 lg:grid-cols-2">
          {filtered.slice(0, count).map((r) => (
            <Panel key={r.id} className={cn("p-4 sm:p-4", selected.has(r.id) && "border-primary ring-1 ring-primary/30")}>
              <div className="flex items-start gap-3">
                <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} className="mt-2.5" />
                <PersonAvatar name={r.full_name} size={38} />
                <div className="min-w-0 flex-1">
                  <button onClick={() => onViewProfile(r)} className="text-left text-[14px] font-semibold hover:text-primary">{r.full_name}</button>
                  <div className="text-xs"><PhoneLink phone={r.phone} withWhatsApp /></div>
                  {detailLine(r) && <p className="text-[11.5px] text-muted-foreground">{detailLine(r)}</p>}
                </div>
                <SinceBadge lastCalled={r.lastCalled} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                <AssignControl tone="brand" current={r.assignment?.assigned_to} options={teamOptions} loading={teamLoading} saving={saving} onSave={(v) => saveAssignment(r, v)} />
                {r.assignment && <Button size="xs" variant="ghost" className="text-danger" onClick={() => removeAssignment(r.assignment.id)}><X />Remove</Button>}
              </div>
            </Panel>
          ))}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
    </div>
  )
}

// ── Queue ──────────────────────────────────────────────────────────────────
function SoulCallQueue({ onLogCall, onViewProfile }: { onLogCall: (r: any) => void; onViewProfile: (r: any) => void }) {
  const { user: currentUser, role } = useSession()
  const { data, loading, err } = useSoulCallData()
  const [category, setCategory] = useState("Steward")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const isAdmin = role === "soulcareadmin" || role === "admin"
  const mine = isAdmin ? data : data.filter((r) => r.assignment?.assigned_to === currentUser)
  const searched = mine.filter((r) => r.category === category).filter((r) => !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search))
  const byStatus = searched.filter((r) => statusFilter === "all" || (statusFilter === "never" ? !r.lastStatus : r.lastStatus === statusFilter))
  const ranked = sortByCallPriority(byStatus)
  const { count, sentinel, hasMore } = useInfiniteReveal(`${category}|${search}|${statusFilter}`, ranked.length, 20)
  const neverCalled = searched.filter((r) => !r.lastCalled).length
  const overdue30 = searched.filter((r) => { const d = daysSince(r.lastCalled); return d !== null && d > 30 }).length

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title={isAdmin ? "Soul call queue" : "My assigned calls"}
        subtitle={isAdmin ? "Every steward and member, ranked by how long it's been since their last call." : "Your assigned stewards and members, longest since last call first."}
        action={<SearchInput value={search} onChange={setSearch} className="sm:w-56" />} />
      <CategoryToggle value={category} onChange={setCategory} counts={{ Steward: mine.filter((r) => r.category === "Steward").length, Member: mine.filter((r) => r.category === "Member").length }} />
      <StatGrid cols={3}>
        <StatCard label={`Total ${category === "Steward" ? "stewards" : "members"}`} value={searched.length} icon={Users} tone="soul" />
        <StatCard label="Never called" value={neverCalled} icon={AlertCircle} tone="danger" sub={neverCalled > 0 ? "Highest priority" : ""} />
        <StatCard label="30+ days since call" value={overdue30} icon={Clock} tone="warning" />
      </StatGrid>
      <Toolbar>
        <Segmented value={statusFilter} onChange={setStatusFilter} options={[
          { value: "all", label: "All", count: searched.length }, { value: "never", label: "Never called", count: searched.filter((r) => !r.lastStatus).length },
          ...SC_STATUSES.map((s) => ({ value: s, label: s, count: searched.filter((r) => r.lastStatus === s).length })),
        ]} />
      </Toolbar>
      <Notice type="error" msg={err} />
      {loading ? <SkeletonList /> : ranked.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing in this queue" /> : (
        <div className="masonry">
          {ranked.slice(0, count).map((r) => {
            const ds = daysSince(r.lastCalled)
            return (
              <Panel key={`${r._table}-${r.id}`} className={cn("p-4 sm:p-4", (ds === null || ds > 30) && "border-gold/40")}>
                <div className="mb-3 flex items-start gap-3">
                  <PersonAvatar name={r.full_name} size={40} />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => onViewProfile(r)} className="text-left text-[14px] font-semibold hover:text-primary">{r.full_name}</button>
                    <div className="text-xs"><PhoneLink phone={r.phone} withWhatsApp /></div>
                    {detailLine(r) && <p className="text-[11.5px] text-muted-foreground">{detailLine(r)}</p>}
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <SinceBadge lastCalled={r.lastCalled} />
                  {r.lastStatus && <ToneBadge tone={SC_STATUS_TONE[r.lastStatus] || "muted"} dot>{r.lastStatus}</ToneBadge>}
                  {r.membership_status && r.membership_status !== "Active" && <ToneBadge tone="warning">{r.membership_status}</ToneBadge>}
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {r.callCount} call{r.callCount !== 1 ? "s" : ""} logged
                  {isAdmin && (r.assignment ? <> · Assigned to <strong className="text-ink-secondary">{r.assignment.assigned_to}</strong></> : <span className="text-gold-ink"> · Unassigned</span>)}
                </p>
                <Button size="sm" variant="soul" className="w-full" onClick={() => onLogCall(r)}><Phone />Log call</Button>
              </Panel>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
    </div>
  )
}

// ── Available for visitation ───────────────────────────────────────────────
export function AvailableForVisitation() {
  const [logs, setLogs] = useState<any[]>([])
  const [stewards, setStewards] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [category, setCategory] = useState("Steward")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [decision, setDecision] = useState("Available")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        const [lg, sw, cm] = await Promise.all([sb("soul_call_logs?visitation_availability=not.is.null&select=*&order=call_date.asc"), sb("stewards?select=id,full_name,phone"), sb("church_members?select=id,full_name,phone")])
        if (!cancelled) { setLogs(lg || []); setStewards(sw || []); setMembers(cm || []) }
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])
  const table = category === "Steward" ? "stewards" : "church_members"
  const people: Record<string, any> = {}
  ;(category === "Steward" ? stewards : members).forEach((p) => (people[String(p.id)] = p))
  const latest: Record<string, any> = {}
  logs.filter((l) => l.person_table === table && (!dateFrom || l.call_date >= dateFrom) && (!dateTo || l.call_date <= dateTo)).forEach((l) => {
    if (!latest[l.person_id] || l.call_date >= latest[l.person_id].call_date) latest[l.person_id] = l
  })
  const rows = Object.values(latest)
    .map((l: any) => ({ ...l, person: people[String(l.person_id)] || {} }))
    .filter((r) => r.person.full_name)
    .filter((r) => decision === "All" || r.visitation_availability === decision)
    .filter((r) => !search || r.person.full_name?.toLowerCase().includes(search.toLowerCase()) || r.person.phone?.includes(search))
    .sort((a, b) => (a.person.full_name || "").localeCompare(b.person.full_name || ""))
  const availableCount = Object.values(latest).filter((l: any) => l.visitation_availability === "Available").length
  const unavailableCount = Object.values(latest).filter((l: any) => l.visitation_availability === "Unavailable").length
  const ids = rows.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const selectedCount = rows.filter((r) => selected.has(r.id)).length
  const downloadCSV = () => {
    const out = rows.filter((r) => selected.has(r.id))
    if (!out.length) return
    const header = ["Full Name", "Phone", "Category", "Decision", "Proposed Visit Date", "Proposed Visit Time", "Date Recorded", "Notes"]
    const lines = out.map((r) => [r.person.full_name, r.person.phone, category, r.visitation_availability, r.visitation_date, r.visitation_time?.slice(0, 5), r.call_date, r.notes].map(csvCell).join(","))
    downloadBlob(`visitation_availability_${category.toLowerCase()}_${todayISO()}.csv`, [header.join(","), ...lines].join("\r\n"))
  }
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Available for visitation" subtitle="The hand-off list for the church's Visitation Team." action={<SearchInput value={search} onChange={setSearch} className="sm:w-56" />} />
      <CategoryToggle value={category} onChange={setCategory} counts={{ Steward: logs.filter((l) => l.person_table === "stewards").length, Member: logs.filter((l) => l.person_table === "church_members").length }} />
      <DateRangeBar label="Date recorded" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <StatGrid cols={2}>
        <StatCard label="Available" value={availableCount} icon={CheckCircle2} tone="brand" />
        <StatCard label="Unavailable" value={unavailableCount} icon={X} tone="muted" />
      </StatGrid>
      <Toolbar>
        <Segmented value={decision} onChange={setDecision} options={["Available", "Unavailable", "All"].map((k) => ({ value: k, label: k }))} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
          <Button size="sm" variant="gold" onClick={downloadCSV} disabled={!selectedCount}><Download />Download{selectedCount ? ` (${selectedCount})` : ""}</Button>
        </div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList /> : rows.length === 0 ? <EmptyState icon={Users} title="No records for this filter yet" /> : (
        <div className="masonry">
          {rows.map((r) => (
            <article key={r.id} className={cn("relative rounded-lg border bg-card p-4 shadow-xs", selected.has(r.id) && "border-primary ring-1 ring-primary/40")}>
              <Checkbox className="absolute top-3 right-3 bg-card" checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.person.full_name}`} />
              <div className="mb-3 flex items-center gap-2.5 pr-7">
                <PersonAvatar name={r.person.full_name} size={38} />
                <div className="min-w-0"><h3 className="truncate text-[14px] font-semibold">{r.person.full_name}</h3><div className="text-xs"><PhoneLink phone={r.person.phone} withWhatsApp /></div></div>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <ToneBadge tone={r.visitation_availability === "Available" ? "brand" : "muted"} dot>{r.visitation_availability}</ToneBadge>
                <span className="text-xs text-muted-foreground">Recorded {fmtDate(r.call_date)}</span>
              </div>
              {r.visitation_availability === "Available" && (r.visitation_date || r.visitation_time) && (
                <p className="flex items-center gap-1 text-[13px] font-semibold text-primary"><Calendar className="size-3.5" />{r.visitation_date ? fmtDate(r.visitation_date, { weekday: "short", day: "numeric", month: "short" }) : "Date TBC"}{r.visitation_time ? ` · ${r.visitation_time.slice(0, 5)}` : ""}</p>
              )}
              {r.notes && <p className="mt-2 line-clamp-3 text-xs text-ink-secondary">{r.notes}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Calls analytics ────────────────────────────────────────────────────────
function generateSoulCallInsights(s: any) {
  if (!s || s.total === 0) return "No Stewards or Members in this category yet."
  const out: string[] = []
  if (s.neverCalled === s.total) out.push(`None of the ${s.total} ${s.categoryLabel} have been called yet — this is a clean slate for the calling rotation.`)
  else out.push(`${s.coveragePct}% of ${s.categoryLabel} (${s.total - s.neverCalled} of ${s.total}) have been called at least once, leaving ${s.neverCalled} who have never received a call.`)
  if (s.unassigned > 0) out.push(`${s.unassigned} ${s.categoryLabel} are still unassigned and won't show up in anyone's "My Assigned Calls" list until assigned.`)
  else out.push(`Every ${s.categorySingular} currently has a caller assigned.`)
  if (s.totalCalls > 0) {
    out.push(`${s.totalCalls} call${s.totalCalls !== 1 ? "s have" : " has"} been logged in total, with a ${s.reachedPct}% reached rate.`)
    if (s.reachedPct < 40 && s.totalCalls >= 5) out.push(`A reached rate under 40% may be worth a closer look — try varying call times, or confirming phone numbers are current.`)
    else if (s.reachedPct >= 70) out.push(`A ${s.reachedPct}% reached rate is a strong sign the calling rotation is working well.`)
  }
  if (s.topCaller) out.push(`${s.topCaller.name} leads the caller leaderboard with ${s.topCaller.total} call${s.topCaller.total !== 1 ? "s" : ""} logged.`)
  if (s.flaggedCount > 0) out.push(`${s.flaggedCount} call${s.flaggedCount !== 1 ? "s have" : " has"} been flagged for pastoral attention and ${s.flaggedCount !== 1 ? "are" : "is"} waiting in Flagged Records.`)
  if (s.overdue30 > 0) out.push(`${s.overdue30} ${s.categoryLabel} ${s.overdue30 !== 1 ? "haven't" : "hasn't"} been called in 30+ days — they're at the top of the Call Queue.`)
  return out.join(" ")
}

export function SoulCallsAnalyticsDashboard() {
  const [raw, setRaw] = useState<{ stewards: any[]; members: any[]; assignments: any[]; logs: any[] }>({ stewards: [], members: [], assignments: [], logs: [] })
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [category, setCategory] = useState("Steward")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        const [sw, cm, asg, lg] = await Promise.all([sb("stewards?select=id,full_name,phone&limit=3000"), sb("church_members?select=id,full_name,phone&limit=3000"), sb("soul_call_assignments?select=*").catch(() => []), sb("soul_call_logs?select=*&order=call_date.asc").catch(() => [])])
        if (!cancelled) setRaw({ stewards: sw || [], members: cm || [], assignments: asg || [], logs: lg || [] })
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])
  const table = category === "Steward" ? "stewards" : "church_members"
  const roster = category === "Steward" ? raw.stewards : raw.members
  const personMap: Record<string, any> = {}
  roster.forEach((r) => (personMap[String(r.id)] = r))
  const catLogs = raw.logs.filter((l) => l.person_table === table)
  const periodLogs = catLogs.filter((l) => (!dateFrom || l.call_date >= dateFrom) && (!dateTo || l.call_date <= dateTo))
  const last: Record<string, string> = {}
  catLogs.forEach((l) => { if (!last[l.person_id] || l.call_date > last[l.person_id]) last[l.person_id] = l.call_date })
  const total = roster.length
  const assignedIds = new Set(raw.assignments.filter((a) => a.person_table === table).map((a) => a.person_id))
  const unassigned = total - roster.filter((r) => assignedIds.has(String(r.id))).length
  const neverCalled = roster.filter((r) => !last[String(r.id)]).length
  const overdue30 = roster.filter((r) => { const d = daysSince(last[String(r.id)]); return d !== null && d > 30 }).length
  const coveragePct = total > 0 ? Math.round(((total - neverCalled) / total) * 100) : 0
  const now = new Date()
  const sow = new Date(now); sow.setDate(now.getDate() - now.getDay()); sow.setHours(0, 0, 0, 0)
  const som = new Date(now.getFullYear(), now.getMonth(), 1)
  const callsThisWeek = catLogs.filter((l) => new Date(l.call_date) >= sow).length
  const callsThisMonth = catLogs.filter((l) => new Date(l.call_date) >= som).length
  const tally: Record<string, number> = {}
  SC_STATUSES.forEach((k) => (tally[k] = 0))
  periodLogs.forEach((l) => (tally[l.call_status] = (tally[l.call_status] || 0) + 1))
  const outcome = Object.entries(tally).map(([k, v]) => ({ name: k, value: v, color: SC_COLOR[k] || "var(--muted-foreground)" }))
  const totalCalls = periodLogs.length
  const reachedPct = totalCalls > 0 ? Math.round(((tally.Reached || 0) / totalCalls) * 100) : 0
  const flaggedCount = periodLogs.filter((l) => l.flagged_for_pastoral).length
  const callers: Record<string, { total: number; reached: number }> = {}
  periodLogs.forEach((l) => { const n = l.called_by || "Unknown"; callers[n] ||= { total: 0, reached: 0 }; callers[n].total++; if (l.call_status === "Reached") callers[n].reached++ })
  const board = Object.entries(callers).sort((a, b) => b[1].total - a[1].total)
  const maxCaller = Math.max(...board.map(([, s]) => s.total), 1)
  const weeks: Record<string, number> = {}
  periodLogs.forEach((l) => { const d = new Date(l.call_date); const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); mon.setHours(0, 0, 0, 0); const k = mon.toISOString().slice(0, 10); weeks[k] = (weeks[k] || 0) + 1 })
  const trend = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([w, c]) => ({ week: fmtDate(w, { day: "numeric", month: "short" }), Calls: c }))
  const label = category === "Steward" ? "Stewards" : "Members"
  const insight = generateSoulCallInsights({ total, unassigned, neverCalled, coveragePct, totalCalls, reachedPct, flaggedCount, overdue30, topCaller: board[0] ? { name: board[0][0], total: board[0][1].total } : null, categoryLabel: label, categorySingular: category.toLowerCase() })
  const downloadCSV = () => {
    if (!periodLogs.length) return
    const header = ["Full Name", "Phone", "Call Date", "Called By", "Call Status", "Flagged for Pastoral", "Notes"]
    const lines = periodLogs.map((l) => { const p = personMap[String(l.person_id)]; return [p?.full_name || "Unknown", p?.phone, l.call_date, l.called_by, l.call_status, l.flagged_for_pastoral ? "Yes" : "No", l.notes].map(csvCell).join(",") })
    downloadBlob(`soul_care_calls_${category.toLowerCase()}_${todayISO()}.csv`, [header.join(","), ...lines].join("\r\n"))
  }
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Calls analytics" subtitle="Soul Care calling activity, outcomes and caller performance." action={<Button variant="gold" onClick={downloadCSV} disabled={!periodLogs.length}><Download />Download CSV</Button>} />
      <DateRangeBar label="Call activity" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <CategoryToggle value={category} onChange={setCategory} counts={{ Steward: raw.stewards.length, Member: raw.members.length }} />
      <Notice type="error" msg={err} />
      {loading ? <SkeletonReport /> : (
        <>
          <StatGrid>
            <StatCard label={`Total ${label.toLowerCase()}`} value={total} icon={Users} tone="soul" />
            <StatCard label="Unassigned" value={unassigned} icon={AlertCircle} tone="gold" sub={unassigned > 0 ? "Need assignment" : "All assigned"} />
            <StatCard label="Calls this week" value={callsThisWeek} icon={Phone} tone="brand" sub={`${callsThisMonth} this month`} />
            <StatCard label="Flagged for pastoral" value={flaggedCount} icon={Flag} tone="danger" sub={flaggedCount > 0 ? "Needs attention" : ""} />
          </StatGrid>
          <StatGrid cols={3}>
            <StatCard label="Coverage" value={`${coveragePct}%`} icon={CheckCircle2} tone="brand" sub={`${neverCalled} never called`} />
            <StatCard label="Reached rate" value={`${reachedPct}%`} icon={UserCheck} tone="info" sub={`${totalCalls} calls logged`} />
            <StatCard label="30+ days overdue" value={overdue30} icon={Clock} tone="warning" />
          </StatGrid>
          <div className="mb-4"><SummaryPanel title="Insights">{insight}</SummaryPanel></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Call outcomes">{totalCalls === 0 ? <ChartEmpty label="No calls logged yet" /> : <VBars data={outcome} valueLabel="Calls" />}</ChartCard>
            <ChartCard title="Coverage">{total === 0 ? <ChartEmpty label="No records in this category" /> : <Donut data={[{ name: "Called at least once", value: total - neverCalled, color: "var(--primary)" }, { name: "Never called", value: neverCalled, color: "var(--danger)" }].filter((d) => d.value > 0)} centerValue={`${coveragePct}%`} centerLabel="coverage" />}</ChartCard>
            <ChartCard title="Weekly call activity" className="lg:col-span-2">{trend.length === 0 ? <ChartEmpty label="No calls logged yet" /> : <Lines rows={trend} xKey="week" series={[{ key: "Calls", color: "var(--soul)" }]} />}</ChartCard>
            <ChartCard title="Caller leaderboard" className="lg:col-span-2">{board.length === 0 ? <ChartEmpty label="No calls logged yet" /> : board.slice(0, 8).map(([n, s]) => <BarRow key={n} label={n} value={s.total} max={maxCaller} color="var(--soul)" sub={`${s.reached}/${s.total} reached (${Math.round((s.reached / s.total) * 100)}%)`} />)}</ChartCard>
          </div>
        </>
      )}
    </div>
  )
}

// ── Soul Care reporting dashboard ──────────────────────────────────────────
function useSoulCareFunnelData(dateFrom: string, dateTo: string) {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        const range = (q: string, col: string) => q + (dateFrom ? `&${col}=gte.${dateFrom}` : "") + (dateTo ? `&${col}=lte.${dateTo}T23:59:59` : "")
        const [ov, pe, ev] = await Promise.all([
          sb(range("pipeline_overviews?select=id,move_to_membership,submitted_at", "submitted_at")).catch(() => []),
          sb(range("potential_envoys?select=id,promoted_to_membership,created_at", "created_at")).catch(() => []),
          sb(range("envoys_visitors?select=id,moved_at", "moved_at")).catch(() => []),
        ])
        const totalOverviews = (ov || []).length
        const recommended = (ov || []).filter((r: any) => r.move_to_membership).length
        const totalPE = (pe || []).length
        const graduated = (pe || []).filter((r: any) => r.promoted_to_membership).length
        const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
        if (!cancelled) setStats({ totalOverviews, recommended, declined: totalOverviews - recommended, recommendationRate: pct(recommended, totalOverviews), totalPE, graduated, stillActivePE: totalPE - graduated, graduationRate: pct(graduated, totalPE), overallConversionRate: pct(graduated, totalOverviews), envoysVisitorsArchived: (ev || []).length })
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [dateFrom, dateTo])
  return { stats, loading, err }
}

function generateSoulCareSummary(f: any, n: any) {
  if (!f) return "Not enough data yet to generate a summary for this period."
  const out: string[] = []
  if (f.totalOverviews === 0) out.push("No VIP Retention Overviews were submitted in this period, so there's no funnel data to report on yet.")
  else {
    out.push(`This period, ${f.totalOverviews} VIP Retention Overview${f.totalOverviews !== 1 ? "s were" : " was"} submitted, with ${f.recommended} (${f.recommendationRate}%) recommended for membership.`)
    if (f.totalPE > 0) out.push(`Of those recommended, ${f.graduated} of ${f.totalPE} Potential Envoys have completed Membership Training, a ${f.graduationRate}% graduation rate — bringing the overall VIP-to-Member conversion to ${f.overallConversionRate}%.`)
    if (f.recommendationRate >= 60) out.push(`A ${f.recommendationRate}% recommendation rate is a strong sign the Experience Team's 3-week follow-up is genuinely connecting with first-timers.`)
    else if (f.recommendationRate > 0 && f.recommendationRate < 40) out.push(`A ${f.recommendationRate}% recommendation rate may be worth a closer look at what's happening during the 3-week call window.`)
    if (f.stillActivePE > 0) out.push(`${f.stillActivePE} Potential Envoy${f.stillActivePE !== 1 ? "s are" : " is"} still awaiting Membership Training — worth checking in on their progress.`)
  }
  if (n.total === 0) out.push("No New Converts were logged in this period.")
  else {
    out.push(`Separately, ${n.total} New Convert${n.total !== 1 ? "s were" : " was"} logged, with ${n.completed} (${n.retentionPct}%) fully discipled through the 3-week process and Envoys Training.`)
    if (n.retentionPct >= 60) out.push("That retention rate reflects healthy discipleship follow-through for new believers.")
    else if (n.retentionPct < 40 && n.total >= 3) out.push("A retention rate under 40% suggests some New Converts may be disengaging before completing training — worth checking whether Week 2 and 3 check-ins are happening consistently.")
  }
  return out.join(" ")
}

async function fetchLogoDataUri() {
  try {
    const res = await fetch("/logo.png")
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(blob) })
  } catch { return null }
}

export function SoulCareReportingDashboard() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { stats: f, loading: fl, err } = useSoulCareFunnelData(dateFrom, dateTo)
  const { data: nc, loading: nl } = useNewConvertData(dateFrom, dateTo)
  const [pdfBusy, setPdfBusy] = useState(false)
  const vipDecisionRef = useRef<HTMLDivElement>(null)
  const vipFunnelRef = useRef<HTMLDivElement>(null)
  const ncTypeRef = useRef<HTMLDivElement>(null)
  const ncMonthRef = useRef<HTMLDivElement>(null)
  const ncTotal = nc.length
  const ncCompleted = nc.filter((r) => ncComplete(r.fbRows) && r.envoys_training_completed).length
  const ncStats = { total: ncTotal, completed: ncCompleted, trainingDone: nc.filter((r) => r.envoys_training_completed).length, retentionPct: ncTotal > 0 ? Math.round((ncCompleted / ncTotal) * 100) : 0 }
  const loading = fl || nl
  const summary = loading ? "" : generateSoulCareSummary(f, ncStats)
  const decision = [{ name: "Recommended", value: f?.recommended || 0, color: "var(--primary)" }, { name: "Not recommended", value: f?.declined || 0, color: "var(--gold)" }].filter((d) => d.value > 0)
  const funnel = f ? [{ name: "Overviews", value: f.totalOverviews, color: "var(--chart-6)" }, { name: "Recommended", value: f.recommended, color: "var(--chart-2)" }, { name: "Graduated", value: f.graduated, color: "var(--chart-3)" }] : []
  const byType: Record<string, number> = { "New Salvation": 0, Rededication: 0 }
  nc.forEach((r) => { if (byType[r.conversion_type] !== undefined) byType[r.conversion_type]++ })
  const typeDonut = Object.entries(byType).map(([k, v]) => ({ name: k, value: v, color: k === "New Salvation" ? "var(--soul)" : "var(--gold)" })).filter((d) => d.value > 0)
  const reach = [1, 2, 3].map((m) => ({ name: `Week ${m}`, value: nc.filter((r) => ncCheckinsLogged(r.fbRows).has(m)).length, color: "var(--soul)" }))

  const downloadPdf = async () => {
    setPdfBusy(true)
    try {
      const [{ default: html2canvas }, { renderSoulCarePdf }] = await Promise.all([import("html2canvas-pro"), import("@/modules/soul-care-report-pdf")])
      const cap = async (r: React.RefObject<HTMLDivElement | null>) => (r.current ? (await html2canvas(r.current, { backgroundColor: "#ffffff", scale: 2 })).toDataURL("image/png") : null)
      const [vipDecision, vipFunnel, ncType, ncMonth, logoDataUri] = await Promise.all([cap(vipDecisionRef), cap(vipFunnelRef), cap(ncTypeRef), cap(ncMonthRef), fetchLogoDataUri()])
      const blob = await renderSoulCarePdf({ funnelStats: f, ncStats, summary, dateFrom, dateTo, chartImages: { vipDecision, vipFunnel, ncType, ncMonth }, logoDataUri })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `soul_care_report_${todayISO()}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) { toast.error(`Could not generate PDF: ${e.message}`) }
    setPdfBusy(false)
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Retention dashboard" subtitle="Turning information into insight and insight into impact."
        action={!loading && <Button onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? <Spinner /> : <Download />}{pdfBusy ? "Preparing…" : "Download PDF"}</Button>} />
      <DateRangeBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <Notice type="error" msg={err} />
      {loading ? <SkeletonReport /> : (
        <>
          <SectionLabel>VIP → membership funnel</SectionLabel>
          <StatGrid>
            <StatCard label="Overviews submitted" value={f?.totalOverviews ?? 0} icon={FileText} tone="info" />
            <StatCard label="Recommended (yes)" value={f?.recommended ?? 0} icon={CheckCircle2} tone="brand" sub={`${f?.recommendationRate ?? 0}% of overviews`} />
            <StatCard label="Potential Envoys graduated" value={f?.graduated ?? 0} icon={Star} tone="gold" sub={`${f?.graduationRate ?? 0}% graduation rate`} />
            <StatCard label="Overall VIP → member" value={`${f?.overallConversionRate ?? 0}%`} icon={TrendingUp} tone="soul" sub="End-to-end conversion" />
          </StatGrid>
          <SectionLabel>New converts</SectionLabel>
          <StatGrid>
            <StatCard label="Total new converts" value={ncStats.total} icon={Heart} tone="soul" />
            <StatCard label="Fully discipled" value={ncStats.completed} icon={CheckCircle2} tone="brand" />
            <StatCard label="Training completed" value={ncStats.trainingDone} icon={Star} tone="gold" />
            <StatCard label="Retention rate" value={`${ncStats.retentionPct}%`} icon={TrendingUp} tone="soul" />
          </StatGrid>
          <SectionLabel>Visual breakdown</SectionLabel>
          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <ChartCard title="VIP decision split"><div ref={vipDecisionRef}>{decision.length === 0 ? <ChartEmpty label="No VIP overviews in this range" /> : <Donut data={decision} centerValue={f?.totalOverviews ?? 0} centerLabel="Overviews submitted" />}</div></ChartCard>
            <ChartCard title="VIP funnel stages"><div ref={vipFunnelRef}><VBars data={funnel} valueLabel="People" /></div></ChartCard>
            <ChartCard title="New converts by type"><div ref={ncTypeRef}>{typeDonut.length === 0 ? <ChartEmpty label="No new converts in this range" /> : <Donut data={typeDonut} centerValue={ncStats.total} centerLabel="New converts" />}</div></ChartCard>
            <ChartCard title="New converts — weekly reach"><div ref={ncMonthRef}><VBars data={reach} valueLabel="Reached" /></div></ChartCard>
          </div>
          <SummaryPanel>{summary}</SummaryPanel>
          <p className="mt-4 text-xs text-muted-foreground">For the weekly call-outcome breakdown, see the Pastoral Report. For a full breakdown of new converts, see New Converts Retention.</p>
        </>
      )}
    </div>
  )
}

// ── Screens ────────────────────────────────────────────────────────────────
export function AssignSoulCallsScreen() {
  const [profile, setProfile] = useState<any>(null)
  if (profile) return <MemberProfile member={profile} onBack={() => setProfile(null)} />
  return <AssignSoulCalls onViewProfile={setProfile} />
}
export function SoulCallQueueScreen() {
  const [profile, setProfile] = useState<any>(null)
  const [logTarget, setLogTarget] = useState<any>(null)
  const [key, setKey] = useState(0)
  if (profile) return <MemberProfile member={profile} onBack={() => setProfile(null)} />
  if (logTarget) return <LogSoulCallForm person={logTarget} onCancel={() => setLogTarget(null)} onDone={() => { setLogTarget(null); setKey((k) => k + 1) }} />
  return <SoulCallQueue key={key} onLogCall={setLogTarget} onViewProfile={setProfile} />
}
