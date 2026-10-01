"use client"

import { useCallback, useEffect, useState } from "react"
import { Calendar, CheckCircle2, Download, FileText, Filter, MessageSquareQuote, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, SearchInput, SkeletonBoard, StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { DateRangeBar, QRCodePage } from "@/components/app/shared"
import { PublicShell, ThankYou } from "@/components/app/public-shell"
import { FEEDBACK_FOCUS_POINTS } from "@/modules/first-timers"
import { CREDS_MISSING, sb } from "@/lib/supabase"
import { csvCell, downloadBlob, fmtDate, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import { cn } from "@/lib/utils"

function FeedbackBoard({ mode }: { mode: "research" | "general" }) {
  const research = mode === "research"
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [source, setSource] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      const [ftRows, subRows] = await Promise.all([
        research ? sb("first_timers?select=id,full_name,service_feedback,service_date,gender,phone&order=service_date.desc&limit=1000").catch(() => []) : Promise.resolve([]),
        sb("feedback_submissions?select=*&order=submitted_at.desc&limit=1000").catch(() => []),
      ])
      const merged: any[] = []
      ;(ftRows || []).forEach((r: any) => { if (r.service_feedback?.trim()) merged.push({ id: `ft-${r.id}`, display_name: r.full_name || "Anonymous", gender: r.gender || null, phone: r.phone || null, feedback: r.service_feedback, date: r.service_date || "", source: "First-Timer Form", focus: [] }) })
      ;(subRows || []).forEach((r: any) => { if (r.feedback?.trim()) merged.push({ id: research ? `sub-${r.id}` : r.id, display_name: r.name || "Anonymous", gender: r.gender || null, phone: r.phone || null, feedback: r.feedback, date: r.submitted_at ? r.submitted_at.slice(0, 10) : "", source: "Feedback Form", focus: r.feedback_focus_points || [], status: r.membership_status }) })
      merged.sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      setRows(merged)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [research])
  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    if (source && r.source !== source) return false
    if (search) { const q = search.toLowerCase(); if (!r.display_name.toLowerCase().includes(q) && !r.feedback.toLowerCase().includes(q)) return false }
    if (dateFrom && r.date < dateFrom) return false
    if (dateTo && r.date > dateTo) return false
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${dateFrom}|${dateTo}|${source}`, filtered.length, 24)
  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const chosen = filtered.filter((r) => selected.has(r.id))

  const downloadCSV = () => {
    if (!chosen.length) return
    const header = research ? ["Name", "Gender", "Phone", "Date", "Source", "Feedback"] : ["Name", "Gender", "Phone", "Date", "Feedback"]
    const lines = chosen.map((r) => (research ? [r.display_name, r.gender, r.phone, r.date, r.source, r.feedback] : [r.display_name, r.gender, r.phone, r.date, r.feedback]).map(csvCell).join(","))
    const label = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${todayISO()}`
    downloadBlob(`envoys_${research ? "service" : "general"}_feedback${label}.csv`, [header.join(","), ...lines].join("\r\n"))
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Research" title={research ? "Service feedback" : "General feedback"}
        subtitle={research ? `${rows.length} response${rows.length !== 1 ? "s" : ""} from first-timer and feedback forms.` : `${rows.length} response${rows.length !== 1 ? "s" : ""} submitted through the feedback QR form.`}
        action={<>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>
          <Button onClick={downloadCSV} disabled={!chosen.length}><Download />Download{chosen.length ? ` (${chosen.length})` : ""}</Button>
        </>} />
      <StatGrid cols={3}>
        <StatCard label="Total responses" value={rows.length} icon={FileText} tone="research" />
        <StatCard label="Matching filter" value={filtered.length} icon={Filter} tone="brand" />
        <StatCard label="Selected" value={chosen.length} icon={CheckCircle2} tone={chosen.length ? "research" : "muted"} sub={chosen.length ? "Ready to download" : "Select cards below"} />
      </StatGrid>
      <DateRangeBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}>
        {research && (
          <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source" className="h-8 rounded-sm border border-input bg-card px-2 text-[13px]">
            <option value="">All sources</option><option>First-Timer Form</option><option>Feedback Form</option>
          </select>
        )}
      </DateRangeBar>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or feedback" />
        <Button size="sm" variant="outline" className="ml-auto" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={rows.length === 0 ? "No feedback responses yet" : "No responses match your filters"} description={rows.length === 0 ? "Share the feedback QR code so members can respond." : undefined} />
      ) : (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => {
            const on = selected.has(r.id)
            return (
              <article key={r.id} onClick={() => toggleRow(r.id)} className={cn("relative cursor-pointer rounded-lg border bg-card p-5 shadow-xs transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md", on && "border-research ring-2 ring-research/30")}>
                <Checkbox className="absolute top-4 right-4 bg-card" checked={on} onCheckedChange={() => toggleRow(r.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select feedback from ${r.display_name}`} />
                <MessageSquareQuote className="mb-2 size-5 text-research" aria-hidden />
                <p className="mb-3 text-[14px] leading-relaxed whitespace-pre-line">{r.feedback}</p>
                {r.focus?.length > 0 && <div className="mb-3 flex flex-wrap gap-1">{r.focus.map((f: string) => <span key={f} className="rounded-full bg-research-tint px-2 py-0.5 text-[11px] text-research">{f}</span>)}</div>}
                <div className="flex items-center gap-2.5 border-t pt-3">
                  <PersonAvatar name={r.display_name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{r.display_name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="size-3" />{r.date ? fmtDate(r.date) : "—"}{r.gender ? ` · ${r.gender}` : ""}{r.status ? ` · ${r.status}` : ""}</div>
                  </div>
                  {research && <ToneBadge tone={r.source === "Feedback Form" ? "research" : "brand"}>{r.source === "Feedback Form" ? "Feedback" : "First-timer"}</ToneBadge>}
                </div>
              </article>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong> responses. Click cards to select, then download as CSV.</p>}
    </div>
  )
}

export const ResearchFeedback = () => <FeedbackBoard mode="research" />
export const GeneralFeedback = () => <FeedbackBoard mode="general" />

export function FeedbackQR() {
  return <QRCodePage eyebrow="Research" title="Feedback QR code" subtitle="Members scan this to submit anonymous service feedback. Only the feedback itself is required." path="/feedback" fileName="envoys-feedback-qr.png" color="#0e7490" label="Feedback URL" />
}

export function PublicFeedbackPage() {
  const [form, setForm] = useState<any>({ name: "", gender: "", phone: "", membership_status: "", focus_points: [], feedback: "" })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (e: any) => setForm((f: any) => ({ ...f, [key]: e && e.target ? e.target.value : e }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.membership_status) { setErr("Select your membership status."); return }
    if (!form.focus_points.length) { setErr("Select at least one feedback focus point."); return }
    if (!form.feedback.trim()) { setErr("Feedback is required."); return }
    setLoading(true); setErr("")
    try {
      await sb("feedback_submissions", { method: "POST", body: JSON.stringify({ name: form.name.trim() || null, gender: form.gender || null, phone: form.phone.trim() || null, membership_status: form.membership_status, feedback_focus_points: form.focus_points, feedback: form.feedback.trim() }) })
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  if (done) return <ThankYou tone="research" title="Thank you for your feedback!">Your feedback has been received. We appreciate you taking the time to share your thoughts with us.</ThankYou>
  return (
    <PublicShell title="Share your" accent="feedback" subtitle="Your feedback helps us serve you better. You may submit anonymously." width="max-w-xl">
      <Panel>
        {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <form onSubmit={submit} noValidate>
          <FieldInput label="Your name" value={form.name} onChange={set("name")} placeholder="Optional — leave blank to stay anonymous" />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldInput label="Gender" type="select" value={form.gender} onChange={set("gender")} options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
            <FieldInput label="Phone number" type="tel" value={form.phone} onChange={set("phone")} placeholder="Optional" />
          </div>
          <FieldInput label="Membership status" type="select" required value={form.membership_status} onChange={set("membership_status")} options={[{ value: "Member", label: "Member" }, { value: "Steward", label: "Steward" }]} />
          <FieldInput label="Feedback focus points" type="multicheck" required value={form.focus_points} onChange={set("focus_points")} options={FEEDBACK_FOCUS_POINTS} />
          <FieldInput label="Your feedback" type="textarea" rows={5} required value={form.feedback} onChange={set("feedback")} placeholder="Share your experience, suggestions or thoughts about our services" />
          <Button type="submit" size="lg" className="w-full bg-research text-white hover:bg-research/90 dark:text-[#041b20]" disabled={loading}>{loading && <Spinner />}{loading ? "Submitting…" : "Submit feedback"}</Button>
        </form>
      </Panel>
    </PublicShell>
  )
}
