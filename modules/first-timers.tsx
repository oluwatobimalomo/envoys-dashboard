"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle, ArrowLeft, Download, Edit3, Info, RefreshCw, Search, Star, Upload, Users, CalendarDays,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  DataTable, EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SH, SearchInput,
  SkeletonBoard, SkeletonList, ToneBadge, Toolbar, ViewToggle, td, th, usePersistentState,
} from "@/components/app/kit"
import { DateRangeBar, QRCodePage } from "@/components/app/shared"
import { PublicShell, ThankYou } from "@/components/app/public-shell"
import { CREDS_MISSING, sb } from "@/lib/supabase"
import { csvCell, downloadBlob, fmtDate, parseAreas, parseCSVText, phoneKey, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import type { Tone } from "@/lib/nav"
import { cn } from "@/lib/utils"

export const AREAS = [
  { value: "billionpreneur", label: "Billionpreneur Hub" },
  { value: "ceos", label: "CEOs Hub" },
  { value: "directors", label: "Directors Hub" },
  { value: "scholars", label: "Scholars Hub" },
  { value: "creatives", label: "Creatives Hub" },
  { value: "ministry", label: "Ministry Hub" },
  { value: "indecisive", label: "Indecisive" },
]
const areaLabel = (v: string) => AREAS.find((a) => a.value === v)?.label || v

export const FEEDBACK_FOCUS_POINTS = [
  "Spiritual Growth & Discipleship", "Message/Teaching", "Worship Experience", "Community & Belonging",
  "Leadership & Stewardship", "Volunteer/Service Opportunities", "Events & Special Programs",
  "Service Flow & Timing", "Church Environment", "Digital Engagement",
].map((v) => ({ value: v, label: v }))

const BLANK_FT = () => ({
  full_name: "", phone: "", gender: "", email: "", dob: "",
  marital_status: "", house_address: "", nearest_landmark: "",
  membership_decision: "", life_stage: "", heard_from: "",
  areas_of_interest: [] as string[], service_feedback: "",
  service_date: todayISO(),
})

export const DECISION_TONE: Record<string, Tone> = { Member: "brand", Visitor: "gold", Undecided: "warning" }

export const GENDER_OPTS = [{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]
export const MARITAL_OPTS = ["Single", "Married", "Divorced", "Widowed"].map((v) => ({ value: v, label: v }))
export const LIFE_STAGE_OPTS = ["Student", "Employee", "Business Owner"].map((v) => ({ value: v, label: v }))

export async function findFirstTimerDupes(phone: string, excludeId: any) {
  const key = phoneKey(phone)
  if (!key) return []
  const rows = await sb("first_timers?select=id,full_name,phone,service_date,membership_decision&limit=3000").catch(() => [])
  return (rows || []).filter((r: any) => r.id !== excludeId && phoneKey(r.phone) === key)
}

// ── Form ───────────────────────────────────────────────────────────────────
export function FirstTimerForm({ onSuccess, editData, onCancel, publicMode = false }: { onSuccess: () => void; editData?: any; onCancel?: () => void; publicMode?: boolean }) {
  const [form, setForm] = useState<any>(() => (editData ? { ...editData, areas_of_interest: parseAreas(editData.areas_of_interest) } : BLANK_FT()))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (v: any) => {
    const val = v && v.target !== undefined ? v.target.value : v
    setForm((f: any) => ({ ...f, [key]: val }))
  }

  const [dupes, setDupes] = useState<any[]>([])
  const [checkingDupes, setChecking] = useState(false)
  const [saveAnyway, setSaveAnyway] = useState(false)
  useEffect(() => {
    setSaveAnyway(false)
    if (!phoneKey(form.phone)) { setDupes([]); return }
    let cancelled = false
    setChecking(true)
    const t = setTimeout(async () => {
      const found = await findFirstTimerDupes(form.phone, editData?.id || null)
      if (!cancelled) { setDupes(found); setChecking(false) }
    }, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [form.phone, editData?.id])

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.full_name?.trim() || !form.phone?.trim() || !form.gender) { setErr("Full name, phone and gender are required."); return }
    if (!editData && !publicMode && dupes.length > 0 && !saveAnyway) {
      setSaveAnyway(true)
      setErr("This phone number may already be registered (see the warning below). If this is genuinely a different person, press the button again to save anyway.")
      return
    }
    setLoading(true); setErr("")
    try {
      const n = (v: any) => (v === "" || v === undefined || v === null ? null : v)
      const payload = {
        full_name: form.full_name.trim(), phone: form.phone.trim(), email: n(form.email), gender: n(form.gender),
        dob: n(form.dob), marital_status: n(form.marital_status), house_address: n(form.house_address),
        nearest_landmark: n(form.nearest_landmark), membership_decision: n(form.membership_decision),
        life_stage: n(form.life_stage), heard_from: n(form.heard_from),
        areas_of_interest: JSON.stringify(form.areas_of_interest || []), service_feedback: n(form.service_feedback),
        service_date: form.service_date || todayISO(),
      }
      if (editData?.id) await sb(`first_timers?id=eq.${editData.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      else await sb("first_timers", { method: "POST", body: JSON.stringify(payload) })
      if (!publicMode) toast.success(editData ? "Record updated" : "First-timer saved")
      onSuccess()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  return (
    <form onSubmit={submit} noValidate className="animate-page-in">
      {!publicMode && (
        <PageHeader
          eyebrow="First-Timers"
          title={editData ? "Edit record" : "New first-timer"}
          subtitle={`Service date: ${fmtDate(form.service_date)}`}
          action={onCancel && <Button type="button" variant="outline" onClick={onCancel}><ArrowLeft />Back</Button>}
        />
      )}
      {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
      <Notice type="error" msg={err} onClose={() => setErr("")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SH title="Personal information" icon={Users} />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldInput label="Full name" required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Okafor" />
            <FieldInput label="Phone number" type="tel" required value={form.phone} onChange={set("phone")} placeholder="+234 xxx xxx xxxx" />
          </div>
          {checkingDupes && <p className="-mt-2 mb-3 text-xs text-muted-foreground">Checking for existing records…</p>}
          {!checkingDupes && dupes.length > 0 &&
            (publicMode ? (
              <div className="-mt-1 mb-4 flex gap-2 rounded-sm bg-gold-tint px-3.5 py-2.5 text-[13px] text-gold-ink">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>It looks like this phone number may already be registered with us. No problem: you can still submit, and our team will make sure your details are up to date.</span>
              </div>
            ) : (
              <div className="-mt-1 mb-4 rounded-sm border border-warning/30 bg-warning-tint px-3.5 py-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-warning"><AlertCircle className="size-3.5" />Possible duplicate: this number is already on record</div>
                <ul className="grid gap-1 text-xs text-ink-secondary">
                  {dupes.slice(0, 3).map((d) => (
                    <li key={d.id}><strong>{d.full_name}</strong> · {d.phone} · registered {d.service_date || "—"}{d.membership_decision ? ` · ${d.membership_decision}` : ""}</li>
                  ))}
                  {dupes.length > 3 && <li className="text-muted-foreground">…and {dupes.length - 3} more</li>}
                </ul>
                <p className="mt-1.5 text-[11.5px] text-muted-foreground">If this is the same person, edit their existing record from the First-Timers list instead.</p>
              </div>
            ))}
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldInput label="Gender" type="select" required value={form.gender} onChange={set("gender")} options={GENDER_OPTS} />
            <FieldInput label="Email address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            <FieldInput label="Date of birth" type="date" value={form.dob} onChange={set("dob")} />
            <FieldInput label="Marital status" type="select" value={form.marital_status} onChange={set("marital_status")} options={MARITAL_OPTS} />
          </div>
          <FieldInput label="House address" value={form.house_address} onChange={set("house_address")} placeholder="Street, City" />
          <FieldInput label="Nearest landmark" value={form.nearest_landmark} onChange={set("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout" className="mb-0" />
        </Panel>

        <Panel>
          <SH title="Visit details" icon={Star} />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <FieldInput label="Membership decision" type="select" required value={form.membership_decision} onChange={set("membership_decision")} options={["Member", "Visitor", "Undecided"].map((v) => ({ value: v, label: v }))} />
            <FieldInput label="Life stage" type="select" value={form.life_stage} onChange={set("life_stage")} options={LIFE_STAGE_OPTS} />
          </div>
          <FieldInput label="How did you hear about us?" value={form.heard_from} onChange={set("heard_from")} placeholder="e.g. Friend, social media, flyer" />
          <FieldInput label="Area of interest" type="multicheck" value={form.areas_of_interest} onChange={set("areas_of_interest")} options={AREAS} />
          <FieldInput label="Service feedback" type="textarea" rows={4} value={form.service_feedback} onChange={set("service_feedback")} placeholder="What was your experience like today?" className="mb-0" />
        </Panel>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" variant={saveAnyway && dupes.length > 0 ? "gold" : "default"} className="w-full sm:w-auto sm:min-w-48" disabled={loading}>
          {loading && <Spinner />}
          {loading ? "Saving…" : saveAnyway && dupes.length > 0 ? "Save anyway (possible duplicate)" : editData ? "Update record" : "Submit"}
        </Button>
      </div>
    </form>
  )
}

export function PublicRegistrationPage() {
  const [done, setDone] = useState(false)
  if (done)
    return (
      <ThankYou title={<>Thank you for worshipping with us!<br />We honour you. You&apos;re amazing!</>}>
        We&apos;re glad you joined us today. Our Envoys Experience Team will be in touch shortly.
      </ThankYou>
    )
  return (
    <PublicShell title="Welcome to" accent="The Envoys" subtitle="Fill in your details so we can stay connected with you." width="max-w-4xl">
      <FirstTimerForm onSuccess={() => setDone(true)} publicMode />
    </PublicShell>
  )
}

export function FirstTimersQR() {
  return (
    <QRCodePage
      eyebrow="First-Timers"
      title="Registration QR code"
      subtitle="Display or print this QR code. Visitors scan it to open the first-timer registration form."
      path="/register"
      fileName="envoys-registration-qr.png"
      label="Registration URL"
    />
  )
}

// ── Registry (board + table) ───────────────────────────────────────────────
function FirstTimerCard({ r, selected, onToggle, onEdit }: { r: any; selected: boolean; onToggle: () => void; onEdit: () => void }) {
  const areas = parseAreas(r.areas_of_interest)
  return (
    <article className={cn("group relative rounded-lg border bg-card p-4 shadow-xs transition-[translate,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-md", selected && "border-primary ring-1 ring-primary/40")}>
      <div className="absolute top-3 right-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${r.full_name}`} className="bg-card" />
      </div>
      <div className="mb-3 flex items-center gap-2.5 pr-7">
        <PersonAvatar name={r.full_name} size={38} />
        <div className="min-w-0">
          <h3 className="truncate text-[14px] leading-5 font-semibold">{r.full_name}</h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3" />{fmtDate(r.service_date)}</div>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        <ToneBadge tone={DECISION_TONE[r.membership_decision] || "muted"} dot>{r.membership_decision || "Undecided"}</ToneBadge>
        {r.life_stage && <ToneBadge tone="muted">{r.life_stage}</ToneBadge>}
        {r.gender && <ToneBadge tone="muted">{r.gender}</ToneBadge>}
      </div>
      {r.service_feedback && <p className="mb-2 line-clamp-4 text-[13px] leading-5 text-ink-secondary">&ldquo;{r.service_feedback}&rdquo;</p>}
      {areas.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {areas.map((a) => <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-ink-secondary">{areaLabel(a)}</span>)}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <PhoneLink phone={r.phone} withWhatsApp />
        <Button size="xs" variant="ghost" onClick={onEdit}><Edit3 />Edit</Button>
      </div>
    </article>
  )
}

export function FirstTimersList({ onEdit }: { onEdit: (r: any) => void }) {
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  const [view, setView] = usePersistentState<"board" | "table">("envoys_view_firsttimers", "board")

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      let q = "first_timers?order=created_at.desc&limit=300"
      if (dateFrom) q += `&service_date=gte.${dateFrom}`
      if (dateTo) q += `&service_date=lte.${dateTo}`
      setData((await sb(q)) || [])
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [dateFrom, dateTo])
  useEffect(() => { load() }, [load])

  const s = search.toLowerCase()
  const filtered = data.filter((r) => r.full_name?.toLowerCase().includes(s) || r.phone?.includes(search))
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${dateFrom}|${dateTo}|${view}`, filtered.length, 24)

  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length

  const downloadCSV = () => {
    const rows = filtered.filter((r) => selected.has(r.id))
    if (!rows.length) return
    const header = ["Full Name", "Phone", "Email", "Gender", "Service Date", "Membership Decision", "How Heard", "Address"]
    const csv = [header.join(","), ...rows.map((r) => [r.full_name, r.phone, r.email, r.gender, r.service_date, r.membership_decision, r.how_heard, r.house_address].map(csvCell).join(","))]
    downloadBlob(`first_timers_${todayISO()}.csv`, csv.join("\r\n"))
  }

  return (
    <div className="animate-page-in">
      {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
      <PageHeader
        eyebrow="First-Timers"
        title="First-timers registry"
        subtitle={`${data.length} record${data.length !== 1 ? "s" : ""}${dateFrom || dateTo ? " in date range" : " total"}`}
        action={<Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>}
      />
      <DateRangeBar label="Service date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
          <Button variant="gold" size="sm" onClick={downloadCSV} disabled={selectedCount === 0}><Download />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}</Button>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />

      {loading ? (view === "board" ? <SkeletonBoard /> : <SkeletonList />) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No records found" description={search ? "Try a different name or number." : "First-timers you register will appear here."} />
      ) : view === "board" ? (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => (
            <FirstTimerCard key={r.id} r={r} selected={selected.has(r.id)} onToggle={() => toggleRow(r.id)} onEdit={() => onEdit(r)} />
          ))}
        </div>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th className={cn(th, "w-10")}><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th>
              <th className={th}>Name</th><th className={th}>Phone</th><th className={th}>Service date</th><th className={th}>Decision</th><th className={th}>Life stage</th><th className={th} />
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, count).map((r) => (
              <tr key={r.id} className={cn("hover:bg-muted/50", selected.has(r.id) && "bg-brand-tint/50")}>
                <td className={td}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} /></td>
                <td className={td}><div className="flex items-center gap-2.5"><PersonAvatar name={r.full_name} size={28} /><span className="font-semibold">{r.full_name}</span></div></td>
                <td className={td}><PhoneLink phone={r.phone} withWhatsApp /></td>
                <td className={cn(td, "whitespace-nowrap text-muted-foreground")}>{fmtDate(r.service_date)}</td>
                <td className={td}><ToneBadge tone={DECISION_TONE[r.membership_decision] || "muted"} dot>{r.membership_decision || "–"}</ToneBadge></td>
                <td className={cn(td, "text-ink-secondary")}>{r.life_stage || "—"}</td>
                <td className={cn(td, "text-right")}><Button size="xs" variant="ghost" onClick={() => onEdit(r)}><Edit3 />Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && (
        <p className="mt-4 text-right text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong></p>
      )}
    </div>
  )
}

export function FirstTimersScreen() {
  const [edit, setEdit] = useState<any>(null)
  if (edit) return <FirstTimerForm editData={edit} onCancel={() => setEdit(null)} onSuccess={() => setEdit(null)} />
  return <FirstTimersList onEdit={setEdit} />
}

// ── Bulk CSV import (used on Admin Overview) ───────────────────────────────
const sanitize = {
  marital: (s: any) => ({ single: "Single", married: "Married", divorced: "Divorced", widowed: "Widowed" } as any)[String(s || "").trim().toLowerCase()] || null,
  gender: (g: any) => ({ male: "Male", female: "Female" } as any)[String(g || "").trim().toLowerCase()] || null,
  decision: (d: any) => ({ member: "Member", visitor: "Visitor", undecided: "Undecided" } as any)[String(d || "").trim().toLowerCase()] || null,
  lifeStage: (ls: any) => ({ student: "Student", employee: "Employee", "business owner": "Business Owner", businessowner: "Business Owner" } as any)[String(ls || "").trim().toLowerCase()] || null,
}
export const cleanDate = (dateStr: any) => {
  if (!dateStr) return null
  const parts = dateStr.toString().trim().split(/[/-]/)
  if (parts.length === 3) {
    const [a, b, c2] = parts
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c2.padStart(2, "0")}`
    return `${c2}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`
  }
  return null
}

export function CSVImport({ onDone }: { onDone?: () => void }) {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [success, setSuccess] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setRows(parseCSVText(String(ev.target?.result || ""))); setErr(""); setSuccess("") }
    reader.readAsText(file)
  }

  const importAll = async () => {
    if (!rows.length) return
    setLoading(true); setErr("")
    try {
      const today = todayISO()
      const n = (v: any) => (v === "" || v === undefined || v === null ? null : v)
      const payload = rows
        .map((r) => ({
          full_name: (r.full_name || r.name || "").toString().trim(),
          phone: (r.phone || r.phone_number || "").toString().trim(),
          email: n(r.email?.toString().trim()),
          house_address: n((r.house_address || r.address || "").toString().trim()),
          nearest_landmark: n((r.nearest_landmark || r.landmark || "").toString().trim()),
          heard_from: n(r.heard_from?.toString().trim()),
          service_feedback: n(r.service_feedback?.toString().trim()),
          gender: sanitize.gender(r.gender),
          marital_status: sanitize.marital(r.marital_status),
          membership_decision: sanitize.decision(r.membership_decision) || "Visitor",
          life_stage: sanitize.lifeStage(r.life_stage),
          dob: cleanDate(r.dob || r.date_of_birth),
          service_date: n(r.service_date) || today,
          areas_of_interest: "[]",
        }))
        .filter((r) => r.full_name && r.phone)
      if (!payload.length) { setErr("No valid rows found. Each row needs at least full_name and phone."); setLoading(false); return }
      await sb("first_timers", { method: "POST", body: JSON.stringify(payload) })
      setSuccess(`${payload.length} records imported successfully.`)
      toast.success("Import complete.")
      setRows([])
      onDone?.()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }

  const cols = rows[0] ? Object.keys(rows[0]) : []
  return (
    <Panel>
      <SH title="Bulk CSV import" icon={Upload} />
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Import many first-timers at once. Required columns: <code className="rounded bg-muted px-1">full_name</code>, <code className="rounded bg-muted px-1">phone</code>.
        Optional: gender, email, house_address, nearest_landmark, marital_status, life_stage, membership_decision, service_date.
      </p>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <Notice type="success" msg={success} onClose={() => setSuccess("")} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />Choose CSV file</Button>
        {rows.length > 0 && <Button onClick={importAll} disabled={loading}>{loading && <Spinner />}{loading ? "Importing…" : `Import ${rows.length} rows`}</Button>}
      </div>
      {rows.length > 0 && (
        <DataTable>
          <thead><tr>{cols.slice(0, 6).map((h) => <th key={h} className={th}>{h}</th>)}{cols.length > 6 && <th className={th}>…</th>}</tr></thead>
          <tbody>
            {rows.slice(0, 5).map((r, i) => (
              <tr key={i}>{Object.values(r).slice(0, 6).map((v: any, j) => <td key={j} className={td}>{v || "—"}</td>)}{cols.length > 6 && <td className={td}>…</td>}</tr>
            ))}
            {rows.length > 5 && <tr><td colSpan={7} className={cn(td, "text-muted-foreground italic")}>…and {rows.length - 5} more rows</td></tr>}
          </tbody>
        </DataTable>
      )}
    </Panel>
  )
}

export function AddFirstTimerScreen({ onDone }: { onDone: () => void }) {
  return <FirstTimerForm onSuccess={onDone} />
}
