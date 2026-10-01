"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ArrowLeft, CheckCircle2, Download, FileText, Filter, MapPin, Phone, RefreshCw, RotateCcw, Star, Users,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DataTable, EmptyState, Notice, PageHeader, PersonAvatar, PhoneLink, SearchInput, SkeletonBoard, SkeletonList, SkeletonReport,
  StatCard, StatGrid, ToneBadge, Toolbar, ViewToggle, td, th, usePersistentState,
} from "@/components/app/kit"
import { DateRangeBar, SortableHead } from "@/components/app/shared"
import { BarRow, ChartCard, ChartEmpty, Donut, SectionLabel, SummaryPanel, VBars } from "@/components/app/charts"
import { useNav, useSession } from "@/components/app/session"
import { genderTag } from "@/modules/calls"
import { sb } from "@/lib/supabase"
import { csvCell, downloadBlob, fmtDate, genericSort, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import { cn } from "@/lib/utils"

// ── Envoys Visitors ────────────────────────────────────────────────────────
export function EnvoysVisitors() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  const [restoring, setRestoring] = useState<any>(null)
  const [confirm, setConfirm] = useState<any>(null)
  const [view, setView] = usePersistentState<"board" | "table">("envoys_view_visitors", "board")
  const [sortKey, setSortKey] = useState("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try { setRows((await sb("envoys_visitors?select=*&order=moved_at.desc&limit=3000")) || []) } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const q = search.toLowerCase()
  const filtered = rows.filter((r) => !search || r.full_name?.toLowerCase().includes(q) || r.phone?.includes(search))
  const GET: Record<string, (r: any) => any> = {
    name: (r) => r.full_name?.toLowerCase(), phone: (r) => r.phone, gender: (r) => r.gender, dob: (r) => r.dob,
    marital: (r) => r.marital_status, life: (r) => r.life_stage, service_date: (r) => r.service_date,
    decision: (r) => r.membership_decision, moved: (r) => r.moved_at,
  }
  const sorted = sortKey ? genericSort(filtered, GET[sortKey], sortDir) : filtered
  const onSort = (k: string) => { if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setSortDir("asc") } }
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${view}|${sortKey}|${sortDir}`, sorted.length, 30)

  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length

  const restoreVisitor = async (r: any) => {
    setRestoring(r.id); setErr("")
    try {
      if (r.original_first_timer_id) await sb(`first_timers?id=eq.${r.original_first_timer_id}`, { method: "PATCH", body: JSON.stringify({ is_active: true }) })
      await sb(`envoys_visitors?id=eq.${r.id}`, { method: "PATCH", body: JSON.stringify({ restored_at: new Date().toISOString() }) })
      toast.success(`${r.full_name} restored to the active pipeline.`)
      load()
    } catch (e: any) { setErr(e.message) }
    setRestoring(null)
  }

  const downloadCSV = () => {
    const out = filtered.filter((r) => selected.has(r.id))
    if (!out.length) return
    const header = ["Full Name", "Phone", "Gender", "DOB", "Marital Status", "Life Stage", "Service Date", "Membership Decision", "House Address", "Nearest Landmark", "Service Feedback", "Connect Center", "Natural Groups", "Moved At", "Restored At"]
    const lines = out.map((r) => [
      r.full_name, r.phone, r.gender, r.dob, r.marital_status, r.life_stage, r.service_date, r.membership_decision, r.house_address, r.nearest_landmark,
      r.service_feedback, r.connect_center, Array.isArray(r.natural_groups) ? r.natural_groups.join("; ") : r.natural_groups || "",
      r.moved_at ? r.moved_at.slice(0, 10) : "", r.restored_at ? r.restored_at.slice(0, 10) : "",
    ].map(csvCell).join(","))
    downloadBlob(`envoys_visitors_${todayISO()}.csv`, [header.join(","), ...lines].join("\r\n"))
  }

  const RestoreBtn = ({ r }: { r: any }) =>
    r.restored_at ? (
      <ToneBadge tone="brand" icon={CheckCircle2}>Restored {fmtDate(r.restored_at)}</ToneBadge>
    ) : (
      <Button size="xs" variant="soul" onClick={() => setConfirm(r)} disabled={restoring === r.id}><RotateCcw />{restoring === r.id ? "Restoring…" : "Restore"}</Button>
    )

  return (
    <div className="animate-page-in">
      <PageHeader
        eyebrow="VIP Retention Funnel"
        title="Envoys visitors"
        subtitle="First-timers not recommended for membership, kept for reference, export or restoration."
        action={<>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>
          <Button onClick={downloadCSV} disabled={selectedCount === 0}><Download />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}</Button>
        </>}
      />
      <StatGrid cols={3}>
        <StatCard label="Total visitors" value={rows.length} icon={Users} tone="muted" />
        <StatCard label="Matching search" value={filtered.length} icon={Filter} tone="brand" />
        <StatCard label="Selected" value={selectedCount} icon={Download} tone={selectedCount ? "info" : "muted"} />
      </StatGrid>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />

      {loading ? (view === "board" ? <SkeletonBoard /> : <SkeletonList />) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={rows.length === 0 ? "No one has been archived here yet" : "No results match your search"} />
      ) : view === "board" ? (
        <div className="masonry">
          {sorted.slice(0, count).map((r) => (
            <article key={r.id} className={cn("relative rounded-lg border bg-card p-4 shadow-xs", selected.has(r.id) && "border-primary ring-1 ring-primary/40")}>
              <Checkbox className="absolute top-3 right-3 bg-card" checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} />
              <div className="mb-3 flex items-center gap-2.5 pr-7">
                <PersonAvatar name={r.full_name} size={38} />
                <div className="min-w-0">
                  <h3 className="truncate text-[14px] font-semibold">{r.full_name}</h3>
                  <p className="text-xs text-muted-foreground">Moved {fmtDate(r.moved_at)}</p>
                </div>
              </div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[r.gender, r.marital_status, r.life_stage].filter(Boolean).map((x: string) => <ToneBadge key={x} tone="muted">{x}</ToneBadge>)}
              </div>
              {r.service_feedback && <p className="mb-2 line-clamp-4 text-[13px] text-ink-secondary">&ldquo;{r.service_feedback}&rdquo;</p>}
              <p className="text-xs text-muted-foreground">First visit {fmtDate(r.service_date)}{r.membership_decision ? ` · ${r.membership_decision}` : ""}</p>
              <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs">
                <PhoneLink phone={r.phone} withWhatsApp />
                <RestoreBtn r={r} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <DataTable maxHeight={640}>
          <thead>
            <tr>
              <th className={cn(th, "w-10")}><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th>
              {[["Full name", "name"], ["Phone", "phone"], ["Gender", "gender"], ["DOB", "dob"], ["Marital", "marital"], ["Life stage", "life"], ["Service date", "service_date"], ["Decision", "decision"], ["Moved", "moved"]].map(([l, k]) => (
                <th key={k} className={th}><SortableHead label={l} sortKey={k} activeKey={sortKey} dir={sortDir} onSort={onSort} /></th>
              ))}
              <th className={th}>Feedback</th><th className={th}>Restore</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, count).map((r) => (
              <tr key={r.id} className={cn("hover:bg-muted/50", selected.has(r.id) && "bg-brand-tint/50")}>
                <td className={td}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} /></td>
                <td className={cn(td, "sticky left-0 bg-card")}><div className="flex items-center gap-2"><PersonAvatar name={r.full_name} size={26} /><span className="font-semibold whitespace-nowrap">{r.full_name}</span></div></td>
                <td className={td}><PhoneLink phone={r.phone} withWhatsApp /></td>
                <td className={td}>{r.gender || "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.dob || "—"}</td>
                <td className={td}>{r.marital_status || "—"}</td>
                <td className={td}>{r.life_stage || "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{fmtDate(r.service_date)}</td>
                <td className={td}>{r.membership_decision || "—"}</td>
                <td className={cn(td, "whitespace-nowrap text-muted-foreground")}>{fmtDate(r.moved_at)}</td>
                <td className={cn(td, "min-w-56 text-ink-secondary")}>{r.service_feedback || "—"}</td>
                <td className={td}><RestoreBtn r={r} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> archived visitors</p>}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore {confirm?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>They&apos;ll return to the active call pipeline and reappear in Assign Calls and Call Queue.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const r = confirm; setConfirm(null); restoreVisitor(r) }}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Completed pipelines ────────────────────────────────────────────────────
export function CompletedPipelines() {
  const { role } = useSession()
  const nav = useNav()
  const onBack = () => nav(role === "soulcareadmin" ? "envoys_visitors" : "assign_calls")
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())

  useEffect(() => {
    ;(async () => {
      setLoading(true); setErr("")
      try { setRows((await sb("pipeline_overviews?select=*,first_timers(full_name,phone,service_date,gender)&order=submitted_at.desc&limit=500")) || []) } catch (e: any) { setErr(e.message) }
      setLoading(false)
    })()
  }, [])

  const filtered = rows.filter((r) => {
    const ft = r.first_timers || {}
    if (search) {
      const q = search.toLowerCase()
      if (!ft.full_name?.toLowerCase().includes(q) && !r.submitted_by?.toLowerCase().includes(q)) return false
    }
    const d = r.submitted_at ? r.submitted_at.slice(0, 10) : ""
    if (dateFrom && d < dateFrom) return false
    if (dateTo && d > dateTo) return false
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${dateFrom}|${dateTo}`, filtered.length, 30)
  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length

  const downloadCSV = () => {
    const out = filtered.filter((r) => selected.has(r.id))
    if (!out.length) return
    const header = ["VIP Name", "Gender", "Phone", "Service Date", "Move to Membership", "Natural Groups", "Connect Center", "Submitted By", "Submitted At"]
    const lines = out.map((r) => {
      const ft = r.first_timers || {}
      return [ft.full_name, ft.gender || "", ft.phone, ft.service_date, r.move_to_membership ? "Yes" : "No",
        Array.isArray(r.natural_groups) ? r.natural_groups.join("; ") : r.natural_groups || "", r.connect_center, r.submitted_by,
        r.submitted_at ? r.submitted_at.slice(0, 10) : ""].map(csvCell).join(",")
    })
    const label = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${todayISO()}`
    downloadBlob(`envoys_completed_pipelines${label}.csv`, [header.join(","), ...lines].join("\r\n"))
  }

  return (
    <div className="animate-page-in">
      <PageHeader
        eyebrow="VIP Retention Funnel"
        title="Completed pipelines"
        subtitle="Overview submissions after each three-week follow-up cycle."
        action={<>
          <Button variant="outline" onClick={onBack}><ArrowLeft />Back</Button>
          <Button onClick={downloadCSV} disabled={selectedCount === 0}><Download />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}</Button>
        </>}
      />
      <StatGrid cols={3}>
        <StatCard label="Total overviews" value={rows.length} icon={FileText} tone="info" />
        <StatCard label="Matching filter" value={filtered.length} icon={Filter} tone="brand" />
        <StatCard label="Selected" value={selectedCount} icon={Download} tone={selectedCount ? "info" : "muted"} sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </StatGrid>
      <DateRangeBar label="Submission date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or caller" className="sm:w-56" />
      </DateRangeBar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={rows.length === 0 ? "No pipeline overviews submitted yet" : "No results match your filters"} />
      ) : (
        <DataTable maxHeight={680}>
          <thead>
            <tr>
              <th className={cn(th, "w-10")}><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th>
              <th className={th}>VIP</th><th className={th}>Membership</th><th className={th}>Connect centre</th><th className={th}>Natural groups</th><th className={th}>Submitted by</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, count).map((r) => {
              const ft = r.first_timers || {}
              const groups = Array.isArray(r.natural_groups) ? r.natural_groups : r.natural_groups ? [r.natural_groups] : []
              return (
                <tr key={r.id} onClick={() => toggleRow(r.id)} className={cn("cursor-pointer hover:bg-muted/50", selected.has(r.id) && "bg-brand-tint/50")}>
                  <td className={td} onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${ft.full_name}`} /></td>
                  <td className={td}>
                    <div className="flex items-center gap-2.5">
                      <PersonAvatar name={ft.full_name} size={30} />
                      <div><div className="font-semibold">{ft.full_name}{genderTag(ft)}</div><div className="text-xs text-muted-foreground">{ft.phone} · {fmtDate(ft.service_date)}</div></div>
                    </div>
                  </td>
                  <td className={td}><ToneBadge tone={r.move_to_membership ? "brand" : "danger"}>{r.move_to_membership ? "Yes" : "No"}</ToneBadge></td>
                  <td className={cn(td, "text-ink-secondary")}>{r.connect_center || "—"}</td>
                  <td className={td}><div className="flex flex-wrap gap-1">{groups.length ? groups.map((g: string) => <ToneBadge key={g} tone="brand">{g}</ToneBadge>) : "—"}</div></td>
                  <td className={cn(td, "text-ink-secondary")}>{r.submitted_by || "—"}<div className="text-xs text-muted-foreground">{fmtDate(r.submitted_at)}</div></td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && (
        <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong> overviews (of {rows.length} total). Click rows to select, then download as CSV.</p>
      )}
    </div>
  )
}

// ── VIP Journey ────────────────────────────────────────────────────────────
function useVipJourneyStats(dateFrom: string, dateTo: string) {
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
        const [ftRows, fbRows, ovRows, peRows, ccpRows] = await Promise.all([
          sb(ftQ).catch(() => []),
          sb("call_feedback?select=first_timer_id,created_at,church_attendance").catch(() => []),
          sb("pipeline_overviews?select=first_timer_id,move_to_membership").catch(() => []),
          sb("potential_envoys?select=original_first_timer_id,training_completed,promoted_to_membership").catch(() => []),
          sb("connect_centre_prospects?select=original_first_timer_id,confirmed").catch(() => []),
        ])
        const ftIds = new Set((ftRows || []).map((f: any) => f.id))
        const ftMap: Record<string, any> = {}
        ;(ftRows || []).forEach((f: any) => (ftMap[f.id] = f))
        const earliest: Record<string, string> = {}
        ;(fbRows || []).forEach((f: any) => {
          if (!ftIds.has(f.first_timer_id) || !f.created_at) return
          if (!earliest[f.first_timer_id] || f.created_at < earliest[f.first_timer_id]) earliest[f.first_timer_id] = f.created_at
        })
        let contactedWithin48 = 0
        Object.entries(earliest).forEach(([id, t]) => {
          const ft = ftMap[id]
          if (ft?.service_date && (new Date(t).getTime() - new Date(ft.service_date).getTime()) / 36e5 <= 48) contactedWithin48++
        })
        const returned = new Set<string>()
        ;(fbRows || []).forEach((f: any) => { if (ftIds.has(f.first_timer_id) && f.church_attendance === "Present") returned.add(f.first_timer_id) })
        const ov = (ovRows || []).filter((o: any) => ftIds.has(o.first_timer_id))
        const recommended = ov.filter((o: any) => o.move_to_membership).length
        const ccp = (ccpRows || []).filter((c: any) => ftIds.has(c.original_first_timer_id))
        const connectConfirmed = ccp.filter((c: any) => c.confirmed).length
        const pe = (peRows || []).filter((p: any) => ftIds.has(p.original_first_timer_id))
        const graduated = pe.filter((p: any) => p.promoted_to_membership).length
        const total = (ftRows || []).length
        const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0)
        if (!cancelled)
          setStats({
            totalRegistered: total, anyCalled: Object.keys(earliest).length, contactedWithin48, contactedWithin48Pct: pct(contactedWithin48, total),
            returnedCount: returned.size, returnedPct: pct(returned.size, total), overviewsSubmitted: ov.length, recommended, declined: ov.length - recommended,
            connectTotal: ccp.length, connectConfirmed, connectConfirmedPct: pct(connectConfirmed, ccp.length), peTotal: pe.length,
            trainingDone: pe.filter((p: any) => p.training_completed).length, graduated, graduatedPct: pct(graduated, recommended), overallConversionPct: pct(graduated, total),
          })
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [dateFrom, dateTo])
  return { stats, loading, err }
}

function generateVipJourneySummary(s: any) {
  if (!s || s.totalRegistered === 0) return "No First-Timers registered in this period."
  const out: string[] = []
  out.push(`This period, ${s.totalRegistered} First-Timer${s.totalRegistered !== 1 ? "s" : ""} registered, with ${s.contactedWithin48} (${s.contactedWithin48Pct}%) contacted within the first 48 hours.`)
  if (s.contactedWithin48Pct >= 70) out.push(`A ${s.contactedWithin48Pct}% same-window contact rate reflects strong responsiveness from the Experience Team.`)
  else if (s.contactedWithin48Pct < 40) out.push(`A ${s.contactedWithin48Pct}% contact-within-48-hours rate may be worth a closer look — first impressions matter most in this early window.`)
  if (s.overviewsSubmitted > 0) out.push(`${s.overviewsSubmitted} VIP Retention Overview${s.overviewsSubmitted !== 1 ? "s were" : " was"} submitted, recommending ${s.recommended} for membership.`)
  if (s.connectTotal > 0) out.push(`Of those recommended to a Connect Centre, ${s.connectConfirmed} of ${s.connectTotal} (${s.connectConfirmedPct}%) have been confirmed as added to their centre's WhatsApp group.`)
  if (s.recommended > 0) out.push(`${s.graduated} of ${s.recommended} Potential Envoys (${s.graduatedPct}%) have completed the full journey and graduated to Membership.`)
  return out.join(" ")
}

export function VipJourneyDashboard() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { stats, loading, err } = useVipJourneyStats(dateFrom, dateTo)
  const header = (
    <>
      <PageHeader eyebrow="VIP Retention Funnel" title="VIP journey" subtitle="The full eight-week journey, from first contact to membership." />
      <DateRangeBar label="Service date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
    </>
  )
  if (loading || !stats) return <div className="animate-page-in">{header}<SkeletonReport /></div>

  const funnel = [
    { name: "Registered", value: stats.totalRegistered },
    { name: "Contacted (48h)", value: stats.contactedWithin48 },
    { name: "Overview", value: stats.overviewsSubmitted },
    { name: "Recommended", value: stats.recommended },
    { name: "Connect confirmed", value: stats.connectConfirmed },
    { name: "Graduated", value: stats.graduated },
  ].map((d, i) => ({ ...d, color: i === 5 ? "var(--gold)" : "var(--primary)" }))
  const decision = [
    { name: "Recommended", value: stats.recommended, color: "var(--primary)" },
    { name: "Not recommended", value: stats.declined, color: "var(--gold)" },
  ].filter((d) => d.value > 0)

  return (
    <div className="animate-page-in">
      {header}
      <Notice type="error" msg={err} />
      <SectionLabel>Handover metrics</SectionLabel>
      <StatGrid>
        <StatCard label="Contacted within 48h" value={`${stats.contactedWithin48Pct}%`} icon={Phone} tone="soul" sub={`${stats.contactedWithin48} of ${stats.totalRegistered}`} />
        <StatCard label="Returned to service" value={`${stats.returnedPct}%`} icon={CheckCircle2} tone="brand" sub={`${stats.returnedCount} of ${stats.totalRegistered}`} />
        <StatCard label="Connected to cells" value={`${stats.connectConfirmedPct}%`} icon={MapPin} tone="research" sub={`${stats.connectConfirmed} of ${stats.connectTotal} recommended`} />
        <StatCard label="Active after 8 weeks" value={`${stats.overallConversionPct}%`} icon={Star} tone="gold" sub={`${stats.graduated} graduated to membership`} />
      </StatGrid>
      <SectionLabel>Journey funnel</SectionLabel>
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <ChartCard title="First-timer to member, stage by stage" className="lg:col-span-2">
          {stats.totalRegistered === 0 ? <ChartEmpty label="No first-timers registered in this range" /> : <VBars data={funnel} height={260} valueLabel="People" />}
        </ChartCard>
        <ChartCard title="VIP decision split">
          {decision.length === 0 ? <ChartEmpty label="No overviews submitted in this range" /> : <Donut data={decision} centerValue={stats.overviewsSubmitted} centerLabel="Overviews submitted" />}
        </ChartCard>
        <ChartCard title="Potential Envoys progress">
          {stats.peTotal === 0 ? <ChartEmpty label="No Potential Envoys in this range" /> : (
            <div className="pt-2">
              <BarRow label="Training completed" value={stats.trainingDone} max={stats.peTotal} color="var(--gold)" sub={`${stats.trainingDone} of ${stats.peTotal}`} />
              <BarRow label="Graduated to membership" value={stats.graduated} max={stats.peTotal} sub={`${stats.graduated} of ${stats.peTotal}`} />
            </div>
          )}
        </ChartCard>
      </div>
      <SummaryPanel>{generateVipJourneySummary(stats)}</SummaryPanel>
      <p className="mt-4 text-xs text-muted-foreground">For call-level detail, see the Pastoral Report or the Analytics Dashboard. For Connect Centre specifics, see Prospective Members.</p>
    </div>
  )
}
