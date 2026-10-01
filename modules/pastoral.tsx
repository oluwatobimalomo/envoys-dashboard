"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle, Calendar, CheckCircle2, Download, FileText, Flag, Phone, RotateCcw, Shield, Star, TrendingUp, UserCheck, Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SearchInput, Segmented, SkeletonList, SkeletonReport,
  StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { DateRangeBar } from "@/components/app/shared"
import { BarRow, ChartCard, ChartEmpty, Donut, StackedArea, VBars } from "@/components/app/charts"
import { BirthdaysWidget } from "@/components/app/widgets"
import { useSession } from "@/components/app/session"
import { AREAS } from "@/modules/first-timers"
import { sb } from "@/lib/supabase"
import { SC_STATUS_TONE, csvCell, downloadBlob, fmtDate, normaliseStatus, parseAreas, statusMeta, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const STATUS_VAR: Record<string, string> = { Reached: "var(--primary)", "Call Back": "var(--gold)", "Incorrect Contact": "var(--danger)" }
const TREND_SERIES = [
  { key: "Reached", color: "var(--primary)" },
  { key: "Call Back", color: "var(--gold)" },
  { key: "Incorrect Contact", color: "var(--danger)" },
]
const weekLabel = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit" })
function buildTrend(fb: any[]) {
  const buckets: Record<string, any> = {}
  fb.filter((f) => f.created_at).forEach((f) => {
    const label = weekLabel(f.created_at)
    buckets[label] ||= { week: label, ts: new Date(f.created_at).getTime(), Reached: 0, "Call Back": 0, "Incorrect Contact": 0 }
    const n = normaliseStatus(f.call_status) || "Call Back"
    buckets[label][n] = (buckets[label][n] || 0) + 1
  })
  return Object.values(buckets).sort((a: any, b: any) => a.ts - b.ts).slice(-10)
}
function callerBoard(fb: any[]) {
  const t: Record<string, { total: number; reached: number }> = {}
  fb.forEach((f) => {
    if (!f.caller_name) return
    t[f.caller_name] ||= { total: 0, reached: 0 }
    t[f.caller_name].total++
    if (normaliseStatus(f.call_status) === "Reached") t[f.caller_name].reached++
  })
  return Object.entries(t).sort((a, b) => b[1].total - a[1].total).slice(0, 6)
}
function CallerLeaderboard({ rows }: { rows: [string, { total: number; reached: number }][] }) {
  const max = Math.max(...rows.map(([, s]) => s.total), 1)
  if (!rows.length) return <ChartEmpty label="No calls logged yet" />
  return (
    <div className="pt-1">
      {rows.map(([name, s]) => <BarRow key={name} label={name} value={s.total} max={max} sub={`${s.reached}/${s.total} reached (${Math.round((s.reached / s.total) * 100)}%)`} />)}
    </div>
  )
}

// ── Golden Envoys widget ───────────────────────────────────────────────────
function GoldenEnvoys({ rows, dateFrom, dateTo }: { rows: any[]; dateFrom: string; dateTo: string }) {
  const download = () => {
    if (!rows.length) return
    const header = ["Name", "Gender", "Phone", "Connect Center", "Natural Groups", "Submitted By", "Confirmed At"]
    const lines = rows.map((r) => {
      const ft = r.first_timers || {}
      return [ft.full_name, ft.gender || "", ft.phone, r.connect_center, Array.isArray(r.natural_groups) ? r.natural_groups.join("; ") : r.natural_groups || "", r.submitted_by, r.submitted_at ? r.submitted_at.slice(0, 10) : ""].map(csvCell).join(",")
    })
    const label = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${todayISO()}`
    downloadBlob(`envoys_new_golden_members${label}.csv`, [header.join(","), ...lines].join("\r\n"))
  }
  return (
    <ChartCard
      title={<span className="flex items-center gap-2"><Star className="size-4 text-gold" />New Golden Envoys <ToneBadge tone="gold">{rows.length} confirmed</ToneBadge></span>}
      subtitle="People whose retention overview recommended moving to membership."
      action={<Button size="sm" variant="outline" onClick={download} disabled={!rows.length}><Download />Export all</Button>}
    >
      {rows.length === 0 ? <ChartEmpty label="No confirmed members in this date range yet" height={140} /> : (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin">
          {rows.map((r) => {
            const ft = r.first_timers || {}
            const groups = Array.isArray(r.natural_groups) ? r.natural_groups : r.natural_groups ? [r.natural_groups] : []
            return (
              <article key={r.id} className="flex w-52 shrink-0 snap-start flex-col gap-2 rounded-md border border-gold/30 bg-gold-tint/60 p-3">
                <div className="flex items-center gap-2"><PersonAvatar name={ft.full_name} size={32} /><span className="truncate text-[13px] font-semibold">{ft.full_name}</span></div>
                <div className="text-xs text-ink-secondary">{[r.connect_center, groups.join(", ")].filter(Boolean).join(" · ") || "—"}</div>
                <div className="text-[11px] font-semibold text-gold-ink">{fmtDate(r.submitted_at)}</div>
              </article>
            )
          })}
        </div>
      )}
    </ChartCard>
  )
}

// ── Pastoral report ────────────────────────────────────────────────────────
export function Report() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      let ftq = "first_timers?select=membership_decision,life_stage,gender,areas_of_interest,service_date"
      if (dateFrom) ftq += `&service_date=gte.${dateFrom}`
      if (dateTo) ftq += `&service_date=lte.${dateTo}`
      const ft = (await sb(ftq)) || []
      const fb = (await sb("call_feedback?select=call_status,experience_rating,returning,caller_name,flagged_for_pastoral,created_at")) || []
      let ovq = "pipeline_overviews?select=*,first_timers(full_name,phone,gender,service_date)&order=submitted_at.desc&limit=1000"
      if (dateFrom) ovq += `&submitted_at=gte.${dateFrom}`
      if (dateTo) ovq += `&submitted_at=lte.${dateTo}T23:59:59`
      const overviews = (await sb(ovq).catch(() => [])) || []
      const tally = (arr: any[], key: string) => arr.reduce((a: any, r: any) => { const v = r[key] || "Unknown"; a[v] = (a[v] || 0) + 1; return a }, {})
      const areas: Record<string, number> = {}
      ft.forEach((r: any) => parseAreas(r.areas_of_interest).forEach((v) => (areas[v] = (areas[v] || 0) + 1)))
      const callStatus: Record<string, number> = {}
      fb.forEach((f: any) => { const n = normaliseStatus(f.call_status) || "Unknown"; callStatus[n] = (callStatus[n] || 0) + 1 })
      const yes = overviews.filter((o: any) => o.move_to_membership)
      setStats({
        total: ft.length, totalCalls: fb.length, flagged: fb.filter((f: any) => f.flagged_for_pastoral).length,
        gender: tally(ft, "gender"), callStatus, rating: tally(fb, "experience_rating"), returning: tally(fb, "returning"),
        areas, callers: callerBoard(fb), trend: buildTrend(fb), totalOverviews: overviews.length, yesCount: yes.length,
        noCount: overviews.length - yes.length, goldenEnvoys: yes,
      })
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [dateFrom, dateTo])
  useEffect(() => { load() }, [load])

  const header = (
    <>
      <PageHeader eyebrow="Pastoral" title="Pastoral report" subtitle="Membership retention at a glance." />
      <DateRangeBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
    </>
  )
  if (loading) return <div className="animate-page-in">{header}<SkeletonReport /></div>
  if (!stats) return <div>{header}<Notice type="error" msg={err} /></div>

  const conversionPct = stats.totalOverviews > 0 ? Math.round((stats.yesCount / stats.totalOverviews) * 100) : 0
  const decision = [
    { name: "Yes — move to membership", value: stats.yesCount, color: "var(--primary)" },
    { name: "No — not ready yet", value: stats.noCount, color: "var(--gold)" },
  ].filter((d) => d.value > 0)
  const outcome = Object.entries(stats.callStatus).map(([k, v]: any) => ({ name: k, value: v, color: STATUS_VAR[k] || "var(--muted-foreground)" }))
  const ratingColor: Record<string, string> = { Excellent: "var(--chart-1)", Good: "var(--chart-4)", Average: "var(--chart-3)", Poor: "var(--chart-5)" }
  const rating = Object.entries(stats.rating).map(([k, v]: any) => ({ name: k, value: v, color: ratingColor[k] || "var(--muted-foreground)" }))
  const returningColor: Record<string, string> = { Yes: "var(--chart-1)", Maybe: "var(--chart-3)", No: "var(--chart-5)", Undecided: "var(--muted-foreground)" }
  const returning = Object.entries(stats.returning).map(([k, v]: any) => ({ name: k, value: v, color: returningColor[k] || "var(--muted-foreground)" }))
  const gender = Object.entries(stats.gender).map(([k, v]: any) => ({ name: k, value: v, color: k === "Female" ? "var(--chart-3)" : k === "Male" ? "var(--chart-1)" : "var(--muted-foreground)" }))
  const topAreas = Object.entries(stats.areas).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8) as [string, number][]
  const maxArea = Math.max(...topAreas.map(([, v]) => v), 1)

  return (
    <div className="animate-page-in">
      {header}
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <StatGrid>
        <StatCard label="First-timers" value={stats.total} icon={Users} tone="brand" />
        <StatCard label="Calls logged" value={stats.totalCalls} icon={Phone} tone="brand" />
        <StatCard label="Conversion rate" value={`${conversionPct}%`} icon={TrendingUp} tone="gold" sub={stats.totalOverviews > 0 ? `${stats.yesCount} of ${stats.totalOverviews} are now Golden Envoys` : "No VIP overviews submitted yet"} />
        <StatCard label="Flagged" value={stats.flagged} icon={Flag} tone="danger" sub={stats.flagged > 0 ? "Needs attention" : ""} />
      </StatGrid>
      <div className="mb-4"><BirthdaysWidget showEmpty={false} /></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="VIPs membership decision" subtitle="From the recommendation in each VIP retention overview, submitted after the three-week follow-up.">
          <Donut data={decision} centerValue={`${conversionPct}%`} centerLabel="recommended for membership" />
        </ChartCard>
        <ChartCard title="Call outcomes"><VBars data={outcome} valueLabel="Calls" /></ChartCard>
        <ChartCard title="Weekly call activity" className="lg:col-span-2"><StackedArea rows={stats.trend} xKey="week" series={TREND_SERIES} empty="No calls logged in this range" /></ChartCard>
        <div className="lg:col-span-2"><GoldenEnvoys rows={stats.goldenEnvoys} dateFrom={dateFrom} dateTo={dateTo} /></div>
        <ChartCard title="Returning likelihood"><VBars data={returning} height={200} valueLabel="Calls" /></ChartCard>
        <ChartCard title="Experience rating"><VBars data={rating} height={200} valueLabel="Calls" /></ChartCard>
        <ChartCard title="Gender split"><Donut data={gender} centerValue={stats.total} centerLabel="First-timers" height={200} /></ChartCard>
        <ChartCard title="Caller leaderboard"><CallerLeaderboard rows={stats.callers} /></ChartCard>
        <ChartCard title="Areas of interest" className="lg:col-span-2">
          {topAreas.length === 0 ? <ChartEmpty label="No area-of-interest data yet" /> : (
            <div className="grid gap-x-8 sm:grid-cols-2">
              {topAreas.map(([k, v]) => <BarRow key={k} label={AREAS.find((a) => a.value === k)?.label || k} value={v} max={maxArea} color="var(--chart-4)" />)}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

// ── Experience analytics ───────────────────────────────────────────────────
export function ExperienceAnalyticsDashboard() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        let ftQ = "first_timers?select=id,service_date"
        if (dateFrom) ftQ += `&service_date=gte.${dateFrom}`
        if (dateTo) ftQ += `&service_date=lte.${dateTo}`
        let fbQ = "call_feedback?select=call_status,caller_name,week_number,flagged_for_pastoral,created_at"
        if (dateFrom) fbQ += `&created_at=gte.${dateFrom}`
        if (dateTo) fbQ += `&created_at=lte.${dateTo}T23:59:59`
        let ovQ = "pipeline_overviews?select=id,move_to_membership,submitted_at"
        if (dateFrom) ovQ += `&submitted_at=gte.${dateFrom}`
        if (dateTo) ovQ += `&submitted_at=lte.${dateTo}T23:59:59`
        const [ftRows, fbRows, ovRows] = await Promise.all([sb(ftQ).catch(() => []), sb(fbQ).catch(() => []), sb(ovQ).catch(() => [])])
        const tally: Record<string, number> = {}
        ;(fbRows || []).forEach((f: any) => { const n = normaliseStatus(f.call_status) || "Unknown"; tally[n] = (tally[n] || 0) + 1 })
        const total = (ovRows || []).length
        const rec = (ovRows || []).filter((o: any) => o.move_to_membership).length
        if (!cancelled)
          setStats({
            totalFirstTimers: (ftRows || []).length, totalCalls: (fbRows || []).length, callStatusTally: tally,
            flaggedCount: (fbRows || []).filter((f: any) => f.flagged_for_pastoral).length, callers: callerBoard(fbRows || []),
            trend: buildTrend(fbRows || []), totalOverviews: total, recommended: rec, recommendationRate: total > 0 ? Math.round((rec / total) * 100) : 0,
          })
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [dateFrom, dateTo])

  const header = (
    <>
      <PageHeader eyebrow="Experience Team" title="Analytics dashboard" subtitle="Call pipeline performance and trends." />
      <DateRangeBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
    </>
  )
  if (loading || !stats) return <div className="animate-page-in">{header}<SkeletonReport /></div>
  const outcome = Object.entries(stats.callStatusTally).map(([k, v]: any) => ({ name: k, value: v, color: STATUS_VAR[k] || "var(--muted-foreground)" }))
  const decision = [
    { name: "Recommended", value: stats.recommended, color: "var(--primary)" },
    { name: "Not recommended", value: stats.totalOverviews - stats.recommended, color: "var(--gold)" },
  ].filter((d) => d.value > 0)
  return (
    <div className="animate-page-in">
      {header}
      <Notice type="error" msg={err} />
      <StatGrid>
        <StatCard label="First-timers" value={stats.totalFirstTimers} icon={Users} tone="brand" />
        <StatCard label="Calls logged" value={stats.totalCalls} icon={Phone} tone="brand" />
        <StatCard label="Overviews submitted" value={stats.totalOverviews} icon={FileText} tone="info" sub={`${stats.recommendationRate}% recommended`} />
        <StatCard label="Flagged" value={stats.flaggedCount} icon={Flag} tone="danger" sub={stats.flaggedCount > 0 ? "Needs pastoral attention" : ""} />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Call outcomes">{outcome.length === 0 ? <ChartEmpty label="No calls logged in this range" /> : <VBars data={outcome} valueLabel="Calls" />}</ChartCard>
        <ChartCard title="VIP decision split">{decision.length === 0 ? <ChartEmpty label="No overviews submitted in this range" /> : <Donut data={decision} centerValue={`${stats.recommendationRate}%`} centerLabel="recommended" />}</ChartCard>
        <ChartCard title="Weekly call activity" className="lg:col-span-2"><StackedArea rows={stats.trend} xKey="week" series={TREND_SERIES} empty="No calls logged in this range" /></ChartCard>
        <ChartCard title="Caller leaderboard" className="lg:col-span-2"><CallerLeaderboard rows={stats.callers} /></ChartCard>
      </div>
    </div>
  )
}

// ── All feedback ───────────────────────────────────────────────────────────
export function AllFeedback() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [filter, setFilter] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  useEffect(() => {
    ;(async () => {
      setLoading(true); setErr("")
      try { setRows((await sb("call_feedback?select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc&limit=500")) || []) } catch (e: any) { setErr(e.message) }
      setLoading(false)
    })()
  }, [])
  const filtered = rows.filter((r) => {
    if (filter && normaliseStatus(r.call_status) !== filter) return false
    const ft = r.first_timers || {}
    if (search) {
      const q = search.toLowerCase()
      if (!ft.full_name?.toLowerCase().includes(q) && !r.caller_name?.toLowerCase().includes(q)) return false
    }
    const d = r.created_at ? r.created_at.slice(0, 10) : ""
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${filter}|${search}|${dateFrom}|${dateTo}`, filtered.length, 24)
  const reached = filtered.filter((r) => normaliseStatus(r.call_status) === "Reached").length
  const callback = filtered.filter((r) => normaliseStatus(r.call_status) === "Call Back").length
  const incorrect = filtered.filter((r) => normaliseStatus(r.call_status) === "Incorrect Contact").length
  const flagged = filtered.filter((r) => r.flagged_for_pastoral).length

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Pastoral" title="All feedback" subtitle={`${rows.length} call log${rows.length !== 1 ? "s" : ""} from the Experience Team.`} />
      <DateRangeBar label="Call date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <Toolbar>
        <Segmented value={filter} onChange={setFilter} options={[
          { value: "", label: "All", count: filtered.length }, { value: "Reached", label: "Reached", count: reached },
          { value: "Call Back", label: "Call back", count: callback }, { value: "Incorrect Contact", label: "Incorrect", count: incorrect },
        ]} />
        <ToneBadge tone="danger" icon={Flag}>{flagged} flagged</ToneBadge>
        <SearchInput value={search} onChange={setSearch} placeholder="Search VIP or caller" className="ml-auto sm:w-60" />
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList /> : filtered.length === 0 ? <EmptyState icon={FileText} title={rows.length === 0 ? "No feedback yet" : "No results match your filters"} /> : (
        <div className="masonry [columns:340px]">
          {filtered.slice(0, count).map((r) => {
            const ft = r.first_timers || {}
            const sm = statusMeta(r.call_status)
            return (
              <article key={r.id} className={cn("rounded-lg border bg-card p-4 shadow-xs", r.flagged_for_pastoral && "border-danger/40")}>
                <div className="mb-2 flex items-start gap-2.5">
                  <PersonAvatar name={ft.full_name} size={34} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14px] font-semibold">{ft.full_name || "Unknown"}</h3>
                    <p className="text-xs text-muted-foreground">Week {r.week_number || "?"} · {fmtDate(r.created_at)}{r.caller_name ? ` · ${r.caller_name}` : ""}</p>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  <ToneBadge tone={sm.tone} dot>{sm.label}</ToneBadge>
                  {r.flagged_for_pastoral && <ToneBadge tone="danger" icon={Flag}>Flagged</ToneBadge>}
                  {r.experience_rating && <ToneBadge tone="muted">Rating: {r.experience_rating}</ToneBadge>}
                  {r.returning && <ToneBadge tone="gold">Returning: {r.returning}</ToneBadge>}
                  {r.follow_up_date && <ToneBadge tone="warning" icon={Calendar}>{fmtDate(r.follow_up_date)}</ToneBadge>}
                </div>
                {r.notes && <p className="text-[13px] leading-relaxed text-ink-secondary">{r.notes}</p>}
                {r.flag_reason && <p className="mt-2 flex gap-1.5 rounded-sm bg-danger-tint px-2.5 py-1.5 text-xs text-danger"><Flag className="mt-0.5 size-3 shrink-0" />{r.flag_reason}</p>}
                <div className="mt-3 border-t pt-2 text-xs"><PhoneLink phone={ft.phone} /></div>
              </article>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-right text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong> entries</p>}
    </div>
  )
}

// ── Flagged records ────────────────────────────────────────────────────────
export function FlaggedRecords() {
  const { user: currentUser } = useSession()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [tab, setTab] = useState("open")
  const [resolvingKey, setResolvingKey] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [reopenTarget, setReopenTarget] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      const [cf, scl, resolutions] = await Promise.all([
        sb("call_feedback?flagged_for_pastoral=eq.true&select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc"),
        sb("soul_call_logs?flagged_for_pastoral=eq.true&select=*&order=created_at.desc").catch(() => []),
        sb("pastoral_flag_resolutions?select=*").catch(() => []),
      ])
      const stewardIds = [...new Set((scl || []).filter((r: any) => r.person_table === "stewards").map((r: any) => r.person_id))]
      const memberIds = [...new Set((scl || []).filter((r: any) => r.person_table === "church_members").map((r: any) => r.person_id))]
      const [sw, cm] = await Promise.all([
        stewardIds.length ? sb(`stewards?id=in.(${stewardIds.join(",")})&select=id,full_name,phone`).catch(() => []) : [],
        memberIds.length ? sb(`church_members?id=in.(${memberIds.join(",")})&select=id,full_name,phone`).catch(() => []) : [],
      ])
      const people: Record<string, any> = {}
      ;[...(sw || []), ...(cm || [])].forEach((p: any) => (people[String(p.id)] = p))
      const res: Record<string, any> = {}
      ;(resolutions || []).forEach((r: any) => (res[`${r.source_table}:${r.source_id}`] = r))
      const merged = [
        ...(cf || []).map((r: any) => ({ ...r, _source: "call", _sourceTable: "call_feedback" })),
        ...(scl || []).map((r: any) => ({ ...r, _source: "soulcare", _sourceTable: "soul_call_logs", person: people[String(r.person_id)] || {} })),
      ]
        .map((r: any) => ({ ...r, resolution: res[`${r._sourceTable}:${r.id}`] || null }))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRows(merged)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const daysOpen = (d: string) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0)
  const submitResolution = async (r: any) => {
    setSaving(true)
    try {
      await sb("pastoral_flag_resolutions", { method: "POST", body: JSON.stringify({ source_table: r._sourceTable, source_id: String(r.id), resolved_by: currentUser || null, resolution_notes: notes.trim() || null }) })
      toast.success("Case marked resolved."); setResolvingKey(null); setNotes(""); load()
    } catch (e: any) { toast.error(e.message) }
    setSaving(false)
  }
  const reopen = async (r: any) => {
    try {
      await sb(`pastoral_flag_resolutions?source_table=eq.${r._sourceTable}&source_id=eq.${r.id}`, { method: "DELETE", prefer: "return=minimal" })
      toast.success("Case reopened."); load()
    } catch (e: any) { toast.error(e.message) }
  }

  const openRows = rows.filter((r) => !r.resolution)
  const resolvedRows = rows.filter((r) => r.resolution)
  const shown = tab === "open" ? openRows : tab === "resolved" ? resolvedRows : rows
  const aging = openRows.filter((r) => daysOpen(r.created_at) >= 3).length
  const { count, sentinel, hasMore } = useInfiniteReveal(tab, shown.length, 16)

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Pastoral" title="Flagged for pastoral care" subtitle={`${openRows.length} open record${openRows.length !== 1 ? "s" : ""} needing pastoral attention.`}
        action={aging > 0 && <ToneBadge tone="danger" icon={AlertCircle}>{aging} open 3+ days</ToneBadge>} />
      <Toolbar>
        <Segmented value={tab} onChange={setTab} options={[
          { value: "open", label: "Open", count: openRows.length }, { value: "resolved", label: "Resolved", count: resolvedRows.length }, { value: "all", label: "All", count: rows.length },
        ]} />
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList /> : shown.length === 0 ? (
        <EmptyState icon={Shield} title={tab === "resolved" ? "No resolved cases yet" : "No flagged records"} description={tab === "resolved" ? "Cases you resolve will show up here." : "Nothing needs pastoral attention right now."} />
      ) : (
        <div className="masonry [columns:360px]">
          {shown.slice(0, count).map((r) => {
            const isSC = r._source === "soulcare"
            const person = isSC ? r.person || {} : r.first_timers || {}
            const tone = isSC ? SC_STATUS_TONE[r.call_status] || "muted" : statusMeta(r.call_status).tone
            const label = isSC ? r.call_status : statusMeta(r.call_status).label
            const age = daysOpen(r.created_at)
            const key = `${r._source}-${r.id}`
            return (
              <Panel key={key} className={cn("p-4 sm:p-5", r.resolution ? "border-primary/30" : age >= 3 ? "border-danger/50" : "border-danger/25")}>
                <div className="mb-3 flex items-start gap-3">
                  <PersonAvatar name={person.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold">{person.full_name || "Unknown"}</h3>
                    <div className="text-xs text-muted-foreground"><PhoneLink phone={person.phone} />{!isSC && person.service_date ? ` · ${fmtDate(person.service_date)}` : ""}</div>
                    {(r.caller_name || r.called_by) && <p className="mt-0.5 text-xs text-muted-foreground">Reported by <strong>{r.caller_name || r.called_by}</strong></p>}
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {r.resolution ? <ToneBadge tone="brand" icon={CheckCircle2}>Resolved</ToneBadge> : age >= 3 ? <ToneBadge tone="danger" icon={AlertCircle}>{age}d open</ToneBadge> : <ToneBadge tone="danger" icon={Flag}>Flagged · {age}d</ToneBadge>}
                  <ToneBadge tone={tone} dot>{label}</ToneBadge>
                  {isSC && <ToneBadge tone={r.person_table === "stewards" ? "gold" : "soul"}>{r.person_table === "stewards" ? "Steward" : "Member"}</ToneBadge>}
                </div>
                <div className="rounded-md bg-danger-tint px-3 py-2.5 text-[13px] text-foreground"><strong className="text-danger">Reason:</strong> {r.flag_reason || (isSC ? r.notes : null) || "No reason provided"}</div>
                {(r.flag_reason || !isSC) && r.notes && <p className="mt-2 text-[13px] text-ink-secondary"><strong>Call notes:</strong> {r.notes}</p>}
                {r.resolution ? (
                  <div className="mt-3 rounded-md bg-brand-tint px-3 py-2.5">
                    <p className="text-xs text-primary-strong"><strong>Resolved</strong> by {r.resolution.resolved_by || "—"} on {fmtDate(r.resolution.created_at)}</p>
                    {r.resolution.resolution_notes && <p className="mt-1 text-[13px] text-ink-secondary">{r.resolution.resolution_notes}</p>}
                    <Button size="xs" variant="ghost" className="mt-2" onClick={() => setReopenTarget(r)}><RotateCcw />Reopen case</Button>
                  </div>
                ) : resolvingKey === key ? (
                  <div className="mt-3">
                    <FieldInput label="Resolution notes (optional)" type="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done to resolve this?" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => submitResolution(r)} disabled={saving}><CheckCircle2 />{saving ? "Saving…" : "Confirm resolved"}</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setResolvingKey(null); setNotes("") }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => { setResolvingKey(key); setNotes("") }}><CheckCircle2 />Mark resolved</Button>
                )}
              </Panel>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      <AlertDialog open={!!reopenTarget} onOpenChange={(o) => !o && setReopenTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen this case?</AlertDialogTitle>
            <AlertDialogDescription>The case for {(reopenTarget?._source === "soulcare" ? reopenTarget?.person?.full_name : reopenTarget?.first_timers?.full_name) || "this record"} will move back to Open.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const r = reopenTarget; setReopenTarget(null); reopen(r) }}>Reopen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
