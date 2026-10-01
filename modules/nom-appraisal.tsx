"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Award, Check, CheckCircle2, ChevronDown, Info, Moon, RefreshCw, Shield, TrendingUp, Trophy, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Spinner } from "@/components/ui/spinner"
import {
  EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SH, SearchInput, Segmented, SkeletonBoard, SkeletonList,
  StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { DateRangeBar, QRCodePage } from "@/components/app/shared"
import { PublicShell, ThankYou } from "@/components/app/public-shell"
import { useSession } from "@/components/app/session"
import { GENDER_OPTS, LIFE_STAGE_OPTS, MARITAL_OPTS } from "@/modules/first-timers"
import { CREDS_MISSING, sb } from "@/lib/supabase"
import { fmtDate, phoneKey, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import { cn } from "@/lib/utils"

// ── Night of Mercy ─────────────────────────────────────────────────────────
const BLANK_NOM = () => ({ full_name: "", phone: "", gender: "", marital_status: "", life_stage: "", house_address: "", nearest_landmark: "", service_date: todayISO() })

async function findNOMDupes(phone: string) {
  const key = phoneKey(phone)
  if (!key) return []
  const rows = await sb("nom_first_timers?select=id,full_name,phone,service_date&limit=3000").catch(() => [])
  return (rows || []).filter((r: any) => phoneKey(r.phone) === key)
}

export function PublicNOMPage() {
  const [form, setForm] = useState<any>(BLANK_NOM())
  const [dupes, setDupes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (e: any) => setForm((f: any) => ({ ...f, [key]: e && e.target ? e.target.value : e }))
  useEffect(() => {
    if (!phoneKey(form.phone)) { setDupes([]); return }
    let cancelled = false
    const t = setTimeout(async () => { const f = await findNOMDupes(form.phone); if (!cancelled) setDupes(f) }, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [form.phone])
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.phone.trim()) { setErr("Full name and phone are required."); return }
    setLoading(true); setErr("")
    try {
      const n = (v: any) => (v === "" || v === undefined ? null : v)
      await sb("nom_first_timers", { method: "POST", body: JSON.stringify({ full_name: form.full_name.trim(), phone: form.phone.trim(), gender: n(form.gender), marital_status: n(form.marital_status), life_stage: n(form.life_stage), house_address: n(form.house_address), nearest_landmark: n(form.nearest_landmark), service_date: form.service_date || todayISO(), source: "QR" }) })
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  if (done) return <ThankYou tone="gold" title="Thank you!">We&apos;re glad you joined us for Night of Mercy. Someone from our team will be in touch soon.</ThankYou>
  return (
    <PublicShell title="Welcome to" accent="Night of Mercy" subtitle="So glad you came! Tell us a little about yourself." width="max-w-lg">
      <Panel>
        {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <form onSubmit={submit} noValidate>
          <FieldInput label="Full name" required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Okafor" />
          <FieldInput label="Phone number" type="tel" required value={form.phone} onChange={set("phone")} placeholder="+234 xxx xxx xxxx" />
          {dupes.length > 0 && <div className="-mt-1 mb-4 flex gap-2 rounded-sm bg-gold-tint px-3.5 py-2.5 text-[13px] text-gold-ink"><Info className="mt-0.5 size-4 shrink-0" />Looks like we may already have your details. No problem, go ahead and submit.</div>}
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldInput label="Gender" type="select" value={form.gender} onChange={set("gender")} options={GENDER_OPTS} />
            <FieldInput label="Marital status" type="select" value={form.marital_status} onChange={set("marital_status")} options={MARITAL_OPTS} />
          </div>
          <FieldInput label="Life stage" type="select" value={form.life_stage} onChange={set("life_stage")} options={LIFE_STAGE_OPTS} />
          <FieldInput label="House address" value={form.house_address} onChange={set("house_address")} placeholder="Street, City" />
          <FieldInput label="Nearest landmark" value={form.nearest_landmark} onChange={set("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout" />
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>{loading && <Spinner />}{loading ? "Submitting…" : "Submit"}</Button>
        </form>
      </Panel>
    </PublicShell>
  )
}

export function NOMQR() {
  return <QRCodePage eyebrow="Night of Mercy" title="Night of Mercy QR code" subtitle="Display this at Night of Mercy services. First-timers scan it to register." path="/nom-register" fileName="envoys-nom-qr.png" color="#8a5a10" label="NOM registration URL" />
}

export function NOMFirstTimersList() {
  const { user: currentUser } = useSession()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [filter, setFilter] = useState("all")
  const [savingId, setSavingId] = useState<any>(null)
  const reload = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      let q = "nom_first_timers?select=*&order=created_at.desc&limit=3000"
      if (dateFrom) q += `&service_date=gte.${dateFrom}`
      if (dateTo) q += `&service_date=lte.${dateTo}`
      setData((await sb(q)) || [])
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [dateFrom, dateTo])
  useEffect(() => { reload() }, [reload])
  const filtered = data.filter((r) => {
    const m = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
    if (filter === "contacted") return m && r.contacted
    if (filter === "uncontacted") return m && !r.contacted
    return m
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${filter}|${dateFrom}|${dateTo}`, filtered.length, 24)
  const contacted = data.filter((r) => r.contacted).length
  const toggle = async (row: any) => {
    setSavingId(row.id)
    try {
      const next = !row.contacted
      await sb(`nom_first_timers?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ contacted: next, contacted_by: next ? currentUser || null : null, contacted_at: next ? new Date().toISOString() : null }) })
      toast.success(next ? `${row.full_name} marked as contacted.` : `${row.full_name} marked as not contacted.`)
      reload()
    } catch (e: any) { toast.error(e.message) }
    setSavingId(null)
  }
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Night of Mercy" title="Night of Mercy" subtitle="First-timers registered at Night of Mercy services." action={<Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>} />
      <DateRangeBar label="NOM service date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <StatGrid cols={3}>
        <StatCard label="Total" value={data.length} icon={Moon} tone="gold" />
        <StatCard label="Contacted" value={contacted} icon={CheckCircle2} tone="brand" />
        <StatCard label="Not contacted" value={data.length - contacted} icon={AlertCircle} tone="warning" />
      </StatGrid>
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: data.length }, { value: "uncontacted", label: "Not contacted", count: data.length - contacted }, { value: "contacted", label: "Contacted", count: contacted }]} />
        <SearchInput value={search} onChange={setSearch} className="ml-auto sm:w-56" />
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? <EmptyState icon={Moon} title="No records in this category" /> : (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => (
            <article key={r.id} className={cn("rounded-lg border bg-card p-4 shadow-xs", r.contacted && "border-primary/30")}>
              <div className="mb-3 flex items-center gap-2.5">
                <PersonAvatar name={r.full_name} size={38} />
                <div className="min-w-0 flex-1"><h3 className="truncate text-[14px] font-semibold">{r.full_name}</h3><p className="text-xs text-muted-foreground">{fmtDate(r.service_date)}{r.source === "QR" ? " · via QR" : ""}</p></div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <ToneBadge tone={r.contacted ? "brand" : "gold"} dot>{r.contacted ? "Contacted" : "Not contacted"}</ToneBadge>
                {[r.gender, r.marital_status, r.life_stage].filter(Boolean).map((x: string) => <ToneBadge key={x} tone="muted">{x}</ToneBadge>)}
              </div>
              {r.house_address && <p className="mb-2 text-xs text-ink-secondary">{r.house_address}{r.nearest_landmark ? ` · ${r.nearest_landmark}` : ""}</p>}
              {r.contacted && r.contacted_by && <p className="mb-2 text-xs text-primary">Contacted by {r.contacted_by}</p>}
              <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs">
                <PhoneLink phone={r.phone} withWhatsApp />
                <Button size="xs" variant={r.contacted ? "ghost" : "gold"} onClick={() => toggle(r)} disabled={savingId === r.id}>{savingId === r.id ? "…" : r.contacted ? "Mark not contacted" : <><Check />Mark contacted</>}</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
    </div>
  )
}

// ── Stewards appraisal ─────────────────────────────────────────────────────
const METRICS = [
  { key: "compliance_score", label: "Compliance to instructions" },
  { key: "attendance_score", label: "Attendance at meetings and duty" },
  { key: "punctuality_score", label: "Service punctuality" },
  { key: "dressing_score", label: "Comportment and dress code" },
  { key: "teamwork_score", label: "Team spirit and cooperation" },
  { key: "initiative_score", label: "Initiative and proactiveness" },
  { key: "courtesy_score", label: "Courtesy and communication" },
  { key: "diligence_score", label: "Diligence in assigned duty" },
  { key: "spiritual_score", label: "Spiritual disposition" },
  { key: "conduct_score", label: "Overall conduct" },
]
const MAX = METRICS.length * 10
const BLANK_SCORES = () => METRICS.reduce((a, m) => ({ ...a, [m.key]: 5 }), {} as Record<string, number>)
const currentMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01` }
const monthLabel = (iso: string) => { if (!iso) return "—"; const [y, m] = iso.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }) }

export function PublicAppraisalPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [stewards, setStewards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [department, setDepartment] = useState("")
  const [lead, setLead] = useState("")
  const [stewardId, setStewardId] = useState("")
  const [scores, setScores] = useState<Record<string, number>>(BLANK_SCORES())
  const [comments, setComments] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")
  const [done, setDone] = useState(false)
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const rows = (await sb("stewards?select=id,full_name,department,position&membership_status=eq.Active&order=full_name.asc")) || []
        setLeads(rows.filter((s: any) => (s.position || "Steward") !== "Steward"))
        setStewards(rows.filter((s: any) => (s.position || "Steward") === "Steward"))
      } catch (e: any) { setErr(e.message) }
      setLoading(false)
    })()
  }, [])
  const departments = [...new Set(leads.map((t) => t.department).filter(Boolean))].sort()
  const stewardOpts = stewards.filter((s) => s.department === department)
  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!department || !lead || !stewardId) { setErr("Please select your department, your name, and the steward you're appraising."); return }
    setSaving(true); setErr("")
    try {
      await sb("steward_appraisals", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify({ steward_id: stewardId, department, team_lead_name: lead, appraisal_month: currentMonth(), comments: comments.trim() || null, ...scores }) })
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setSaving(false)
  }
  if (done)
    return (
      <ThankYou tone="gold" title="Appraisal submitted!">
        Thank you for taking the time to score your steward for {monthLabel(currentMonth())}.
        <div className="mt-5"><Button variant="gold" onClick={() => { setStewardId(""); setScores(BLANK_SCORES()); setComments(""); setDone(false) }}>Score another steward</Button></div>
      </ThankYou>
    )
  return (
    <PublicShell title="Steward" accent="appraisal" subtitle={`${monthLabel(currentMonth())} · Score your steward across 10 areas (0–10 each, ${MAX} points in total).`} width="max-w-xl">
      <Panel>
        {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        {loading ? <SkeletonList rows={3} /> : (
          <form onSubmit={submit} noValidate>
            <FieldInput label="Your department" type="select" required value={department} onChange={(e) => { setDepartment(e.target.value); setLead(""); setStewardId("") }} options={departments.map((d) => ({ value: d, label: d }))} />
            {department && <FieldInput label="Your name (team lead or assistant)" type="select" required value={lead} onChange={(e) => setLead(e.target.value)} options={leads.filter((t) => t.department === department).map((t) => ({ value: t.full_name, label: t.position && t.position !== "Team Lead" ? `${t.full_name} (${t.position})` : t.full_name }))} />}
            {department && <FieldInput label="Steward being appraised" type="select" required value={stewardId} onChange={(e) => setStewardId(e.target.value)} options={stewardOpts.map((s) => ({ value: s.id, label: s.full_name }))} hint={stewardOpts.length === 0 ? "No stewards found for this department yet." : undefined} />}
            {department && lead && stewardId && (
              <div className="mt-6">
                <SH title="Score each area (0–10)" icon={Award} />
                <div className="grid gap-5">
                  {METRICS.map((m) => (
                    <div key={m.key}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="text-[13px] font-semibold text-ink-secondary" id={`lbl-${m.key}`}>{m.label}</label>
                        <span className="min-w-12 rounded-full bg-gold-tint px-2 py-0.5 text-center text-xs font-bold text-gold-ink tabular">{scores[m.key]}/10</span>
                      </div>
                      <Slider aria-labelledby={`lbl-${m.key}`} min={0} max={10} step={1} value={[scores[m.key]]} onValueChange={([v]) => setScores((s) => ({ ...s, [m.key]: v }))} />
                    </div>
                  ))}
                </div>
                <FieldInput className="mt-6" label="Comments (optional)" type="textarea" value={comments} onChange={(e) => setComments(e.target.value)} />
                <div className="mb-4 flex items-center justify-between rounded-md bg-gold-tint px-4 py-3">
                  <span className="font-display text-[13px] font-bold text-gold-ink">Total score</span>
                  <span className="font-display text-xl font-extrabold text-gold-ink tabular">{total} / {MAX}</span>
                </div>
                <Button type="submit" variant="gold" size="lg" className="w-full" disabled={saving}>{saving && <Spinner />}{saving ? "Submitting…" : "Submit appraisal"}</Button>
              </div>
            )}
          </form>
        )}
      </Panel>
    </PublicShell>
  )
}

export function AppraisalQR() {
  return <QRCodePage eyebrow="Stewards Appraisal" title="Stewards appraisal QR code" subtitle="Share this link or QR code with team leads so they can submit monthly appraisals." path="/appraisal" fileName="envoys-appraisal-qr.png" color="#8a5a10" label="Appraisal form URL" />
}

export function StewardAppraisalDashboard() {
  const [month, setMonth] = useState(currentMonth())
  const [rows, setRows] = useState<any[]>([])
  const [readiness, setReadiness] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [dept, setDept] = useState("")
  const [expanded, setExpanded] = useState<any>(null)
  const [origin, setOrigin] = useState("")
  useEffect(() => setOrigin(window.location.origin), [])
  const reload = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      const [data, all] = await Promise.all([sb(`steward_appraisals?select=*,stewards(full_name)&appraisal_month=eq.${month}&order=total_score.desc`), sb("stewards?select=position,department")])
      setRows(data || [])
      const rs = all || []
      setReadiness({ stewardCount: rs.filter((s: any) => (s.position || "Steward") === "Steward" && s.department).length, leadCount: rs.filter((s: any) => (s.position || "Steward") !== "Steward" && s.department).length })
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [month])
  useEffect(() => { reload() }, [reload])
  const departments = [...new Set(rows.map((r) => r.department).filter(Boolean))].sort()
  const scoped = dept ? rows.filter((r) => r.department === dept) : rows
  const agg: Record<string, any> = {}
  scoped.forEach((r) => { (agg[r.steward_id] ||= { steward_id: r.steward_id, full_name: r.stewards?.full_name || "Unknown", department: r.department, votes: [] }).votes.push(r) })
  const board = Object.values(agg).map((s: any) => ({ ...s, voteCount: s.votes.length, avgScore: Math.round((s.votes.reduce((a: number, v: any) => a + v.total_score, 0) / s.votes.length) * 10) / 10 })).sort((a, b) => b.avgScore - a.avgScore)
  const ready = readiness && readiness.stewardCount > 0 && readiness.leadCount > 0
  const avg = board.length ? Math.round((board.reduce((a, s) => a + s.avgScore, 0) / board.length) * 10) / 10 : 0
  const medal = ["bg-gold text-on-gold", "bg-muted-foreground/20 text-foreground", "bg-warning-tint text-warning"]
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Stewards Appraisal" title="Stewards appraisal" subtitle="Team lead scores, ranked by average total score for the month." action={<Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>} />
      {!loading && readiness && !ready && (
        <Notice type="warn" msg={<>
          <strong>The public form ({origin}/appraisal) needs both of these, in the same department, in Stewards Care:</strong>
          <ul className="mt-1.5 grid gap-1">
            <li className="flex items-center gap-1.5">{readiness.stewardCount > 0 ? <Check className="size-3.5" /> : <X className="size-3.5" />}At least one person with Position = &ldquo;Steward&rdquo; and a department set ({readiness.stewardCount} so far)</li>
            <li className="flex items-center gap-1.5">{readiness.leadCount > 0 ? <Check className="size-3.5" /> : <X className="size-3.5" />}At least one person with another position (Team Lead, Assistant, HOD…) and a department set ({readiness.leadCount} so far)</li>
          </ul>
        </>} />
      )}
      <StatGrid>
        <StatCard label="Votes this month" value={scoped.length} icon={CheckCircle2} tone="soul" />
        <StatCard label="Stewards appraised" value={board.length} icon={Shield} tone="gold" />
        <StatCard label="Average score" value={`${avg}/${MAX}`} icon={TrendingUp} tone="brand" />
        <StatCard label="Top score" value={`${board[0]?.avgScore || 0}/${MAX}`} icon={Trophy} tone="gold" />
      </StatGrid>
      <Toolbar>
        <label className="flex items-center gap-2 text-[13px] text-ink-secondary">Month
          <input type="month" value={month.slice(0, 7)} onChange={(e) => e.target.value && setMonth(`${e.target.value}-01`)} className="h-9 rounded-sm border border-input bg-card px-3 text-sm" />
        </label>
        <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department" className="h-9 rounded-sm border border-input bg-card px-3 text-[13px]">
          <option value="">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList rows={5} /> : board.length === 0 ? (
        <EmptyState icon={Trophy} title={`No appraisals for ${monthLabel(month)} yet`} description={`Share ${origin}/appraisal with your team leads. If the form has nothing to select, set department and position for the relevant people in Stewards Care.`} />
      ) : (
        <div className="grid gap-2.5">
          {board.map((s, i) => (
            <Panel key={s.steward_id} className={cn("p-0 sm:p-0", i < 3 && "border-gold/40")}>
              <button onClick={() => setExpanded(expanded === s.steward_id ? null : s.steward_id)} className="flex w-full flex-wrap items-center gap-3 p-4 text-left">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold", i < 3 ? medal[i] : "bg-muted text-muted-foreground")}>{i < 3 ? <Trophy className="size-4" /> : `#${i + 1}`}</span>
                <PersonAvatar name={s.full_name} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">{s.department} · {s.voteCount} vote{s.voteCount !== 1 ? "s" : ""}</div>
                </div>
                <div className="hidden w-40 sm:block">
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-2 rounded-full bg-gold" style={{ width: `${(s.avgScore / MAX) * 100}%` }} /></div>
                </div>
                <span className="font-display text-base font-extrabold text-gold-ink tabular">{s.avgScore}<span className="text-xs font-semibold text-muted-foreground"> / {MAX}</span></span>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded === s.steward_id && "rotate-180")} />
              </button>
              {expanded === s.steward_id && (
                <div className="grid gap-2 border-t px-4 py-3">
                  {s.votes.map((v: any) => (
                    <div key={v.id} className="flex flex-wrap justify-between gap-2 text-xs text-ink-secondary">
                      <span><strong>{v.team_lead_name}</strong> scored <strong>{v.total_score}/{MAX}</strong></span>
                      {v.comments && <span className="text-muted-foreground italic">&ldquo;{v.comments}&rdquo;</span>}
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
