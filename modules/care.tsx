"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertCircle, ArrowLeft, Award, Calendar, CheckCircle2, Download, Filter, Flag, Heart, Mail, MapPin, Phone, RefreshCw, Shield,
  Upload, UserPlus, Users, X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  DataTable, EmptyState, FieldInput, Notice, PageHeader, Panel, PersonAvatar, PhoneLink, SH, SearchInput, Segmented, SkeletonBoard,
  SkeletonList, StatCard, StatGrid, ToneBadge, Toolbar, ViewToggle, td, th, usePersistentState,
} from "@/components/app/kit"
import { SortableHead } from "@/components/app/shared"
import { BirthdaysFromList } from "@/components/app/widgets"
import { useSession } from "@/components/app/session"
import { sb } from "@/lib/supabase"
import { SC_STATUS_TONE, downloadCSVTemplate, fmtDate, genericSort, parseCSVText, phoneKey } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import type { Tone } from "@/lib/nav"
import { cn } from "@/lib/utils"

export const MC_STATUS_TONE: Record<string, Tone> = { Active: "brand", Inactive: "danger", Travelled: "warning" }
const STATUSES = ["Active", "Inactive", "Travelled"]
const MARITAL = ["Single", "Married", "Divorced", "Widowed"]
const LIFE = ["Student", "Employee", "Business Owner"]

export function ageOf(dob: any) {
  if (!dob) return null
  const [y, m, d] = String(dob).slice(0, 10).split("-").map(Number)
  if (!y) return null
  const t = new Date()
  let a = t.getFullYear() - y
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--
  return a
}
const dobDayMonth = (dob: any) => {
  if (!dob) return "—"
  const [, m, d] = String(dob).slice(0, 10).split("-").map(Number)
  if (!m || !d) return "—"
  return new Date(2000, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}
const oneOf = (v: any, list: string[]) => list.find((x) => x.toLowerCase() === String(v || "").trim().toLowerCase()) || null
const cleanDateLoose = (raw: any) => {
  const s = String(raw || "").trim()
  if (!s) return null
  const parts = s.split(/[/-]/)
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p.trim()))) {
    const [a, b, c] = parts.map((p) => p.trim())
    return a.length === 4 ? `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}` : `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function FilterSelect({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={cn("h-9 rounded-sm border border-input bg-card px-3 text-[13px]", value && "border-primary text-primary-strong")}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}
const opts = (l: string[]) => l.map((v) => ({ value: v, label: v }))

// ── CSV imports ────────────────────────────────────────────────────────────
function CSVPreview({ rows }: { rows: any[] }) {
  if (!rows.length) return null
  const cols = Object.keys(rows[0]).slice(0, 6)
  return (
    <DataTable className="mt-4">
      <thead><tr>{cols.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.slice(0, 5).map((r, i) => <tr key={i}>{Object.values(r).slice(0, 6).map((v: any, j) => <td key={j} className={td}>{v || "—"}</td>)}</tr>)}
        {rows.length > 5 && <tr><td colSpan={6} className={cn(td, "text-muted-foreground italic")}>…and {rows.length - 5} more rows</td></tr>}
      </tbody>
    </DataTable>
  )
}

const MEMBERS_TEMPLATE_HEADERS = ["full_name", "phone", "email", "gender", "dob", "marital_status", "life_stage", "category", "membership_status", "date_joined", "house_address", "nearest_landmark"]
const MEMBERS_TEMPLATE_EXAMPLE = ["Tunde Adeyemi", "08065554321", "tunde@example.com", "Male", "1988-11-02", "Single", "Business Owner", "Member", "Active", "2024-06-01", "5 Unity Close Ogba", "Opposite Excel Mall"]
const STEWARDS_TEMPLATE_HEADERS = ["full_name", "phone", "email", "gender", "dob", "marital_status", "life_stage", "department", "position", "membership_status", "date_joined", "house_address", "nearest_landmark"]
const STEWARDS_TEMPLATE_EXAMPLE = ["Ngozi Eze", "08099998888", "ngozi@example.com", "Female", "1990-04-18", "Married", "Employee", "Ushering", "Steward", "Active", "2023-01-15", "9 Adeola Street Ikeja", "Behind City Mall"]

function useCSVFile() {
  const [rows, setRows] = useState<any[]>([])
  const ref = useRef<HTMLInputElement>(null)
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = (ev) => setRows(parseCSVText(String(ev.target?.result || "")))
    r.readAsText(f)
  }
  return { rows, setRows, ref, onFile }
}

function MembersCareCSVImport({ onDone }: { onDone: () => void }) {
  const { user: currentUser } = useSession()
  const { rows, setRows, ref, onFile } = useCSVFile()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [success, setSuccess] = useState("")
  const importAll = async () => {
    if (!rows.length) return
    setLoading(true); setErr("")
    try {
      const n = (v: any) => (v === "" || v === undefined || v === null ? null : v)
      const strictDate = (raw: any) => {
        const parts = String(raw || "").trim().split(/[/-]/)
        if (parts.length !== 3) return null
        const [a, b, c] = parts
        return a.length === 4 ? `${a}-${b.padStart(2, "0")}-${c.padStart(2, "0")}` : `${c}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`
      }
      const payload = rows
        .map((r) => ({
          full_name: (r.full_name || r.name || "").toString().trim(), phone: (r.phone || r.phone_number || "").toString().trim(),
          email: n(r.email?.toString().trim()), gender: oneOf(r.gender, ["Male", "Female"]), dob: strictDate(r.dob || r.date_of_birth),
          marital_status: oneOf(r.marital_status, MARITAL), life_stage: oneOf(r.life_stage, LIFE), category: "Member",
          membership_status: oneOf(r.membership_status, STATUSES) || "Active", date_joined: strictDate(r.date_joined || r.joined),
          house_address: n((r.house_address || r.address || "").toString().trim()), nearest_landmark: n((r.nearest_landmark || r.landmark || "").toString().trim()),
          added_by: currentUser || null,
        }))
        .filter((r) => r.full_name && r.phone)
      if (!payload.length) { setErr("No valid rows found. Each row needs at least full_name and phone."); setLoading(false); return }
      await sb("church_members", { method: "POST", body: JSON.stringify(payload) })
      setSuccess(`${payload.length} member${payload.length !== 1 ? "s" : ""} imported.`)
      toast.success("Import complete.")
      setRows([]); onDone()
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  return (
    <Panel className="mb-5 border-soul/25">
      <SH title="Bulk CSV import — church members" icon={Upload} />
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        For regular members only. Stewards have their own registry and import under Stewards Care. Required columns: <code className="rounded bg-muted px-1">full_name</code>, <code className="rounded bg-muted px-1">phone</code>.
        Optional: email, gender, dob, marital_status, life_stage, membership_status (Active/Inactive/Travelled), date_joined, house_address, nearest_landmark.
      </p>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <Notice type="success" msg={success} onClose={() => setSuccess("")} />
      <div className="flex flex-wrap gap-2">
        <input ref={ref} type="file" accept=".csv" onChange={onFile} className="hidden" />
        <Button variant="outline" onClick={() => ref.current?.click()}><Upload />Choose CSV file</Button>
        <Button variant="ghost" onClick={() => downloadCSVTemplate("envoys_members_import_template.csv", MEMBERS_TEMPLATE_HEADERS, MEMBERS_TEMPLATE_EXAMPLE)}><Download />Download template</Button>
        {rows.length > 0 && <Button variant="soul" onClick={importAll} disabled={loading}>{loading && <Spinner />}{loading ? "Importing…" : `Import ${rows.length} rows`}</Button>}
      </div>
      <CSVPreview rows={rows} />
    </Panel>
  )
}

function StewardsCSVImport({ onDone }: { onDone: () => void }) {
  const { user: currentUser } = useSession()
  const { rows, setRows, ref, onFile } = useCSVFile()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState("")
  const [success, setSuccess] = useState("")
  const importAll = async () => {
    if (!rows.length) return
    setLoading(true); setErr(""); setSuccess("")
    try {
      const n = (v: any) => (v === "" || v === undefined || v === null ? null : v)
      const mapped = rows
        .map((r) => ({
          full_name: (r.full_name || r.name || "").toString().trim(), phone: n((r.phone || r.phone_number || "").toString().trim()),
          email: n(r.email?.toString().trim()), gender: oneOf(r.gender, ["Male", "Female"]), dob: cleanDateLoose(r.dob || r.date_of_birth),
          marital_status: oneOf(r.marital_status, MARITAL), life_stage: oneOf(r.life_stage, LIFE),
          department: n((r.department || r.dept || "").toString().trim()),
          membership_status: oneOf(r.membership_status, STATUSES) || "Active", date_joined: cleanDateLoose(r.date_joined || r.joined),
          house_address: n((r.house_address || r.address || "").toString().trim()), nearest_landmark: n((r.nearest_landmark || r.landmark || "").toString().trim()),
          added_by: currentUser || null,
        }))
        .filter((r) => r.full_name)
      if (!mapped.length) { setErr("No valid rows found. Each row needs at least full_name."); setLoading(false); return }
      const seen = new Map<string, string>()
      const payload: any[] = []
      const skipped: any[] = []
      for (const r of mapped) {
        const key = r.phone ? phoneKey(r.phone) : null
        if (key && seen.has(key)) { skipped.push({ name: r.full_name, clashesWith: seen.get(key) }); continue }
        if (key) seen.set(key, r.full_name)
        payload.push(r)
      }
      await sb("stewards?on_conflict=phone", { method: "POST", prefer: "resolution=merge-duplicates,return=representation", body: JSON.stringify(payload) })
      let msg = `${payload.length} steward record(s) imported.`
      if (skipped.length) msg += ` ${skipped.length} row(s) skipped — same phone number as someone else in this file: ${skipped.map((d) => `"${d.name}" (clashes with "${d.clashesWith}")`).join(", ")}. Fix the phone number and re-upload just those rows.`
      setSuccess(msg)
      toast.success(skipped.length ? "Import complete, with some rows skipped." : "Import complete.")
      setRows([]); onDone()
    } catch (e: any) {
      setErr(/duplicate key value violates unique constraint/i.test(e.message || "") ? `${e.message} — two rows in your file probably share a phone number, or a steward already exists under an equivalent phone number.` : e.message)
    }
    setLoading(false)
  }
  return (
    <Panel className="mb-5 border-gold/30">
      <SH title="Bulk CSV import — stewards" icon={Upload} />
      <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
        Required column: <code className="rounded bg-muted px-1">full_name</code>. Optional: phone, email, gender, dob, marital_status, life_stage, department, position, membership_status, date_joined, house_address, nearest_landmark. Rows with a phone already on file update that steward.
      </p>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <Notice type="success" msg={success} onClose={() => setSuccess("")} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => downloadCSVTemplate("envoys_stewards_import_template.csv", STEWARDS_TEMPLATE_HEADERS, STEWARDS_TEMPLATE_EXAMPLE)}><Download />Download template</Button>
        <input ref={ref} type="file" accept=".csv" onChange={onFile} className="hidden" />
        <Button variant="outline" onClick={() => ref.current?.click()}><Upload />Choose CSV file</Button>
        {rows.length > 0 && <><span className="text-[13px] text-ink-secondary">{rows.length} row(s) ready</span><Button variant="gold" onClick={importAll} disabled={loading}>{loading && <Spinner />}{loading ? "Importing…" : `Import ${rows.length}`}</Button></>}
      </div>
      <CSVPreview rows={rows} />
    </Panel>
  )
}

// ── Profile ────────────────────────────────────────────────────────────────
function InlineSave({ label, value, onChange, onSave, saving, dirty, placeholder }: { label: string; value: string; onChange: (v: string) => void; onSave: () => void; saving: boolean; dirty: boolean; placeholder: string }) {
  return (
    <label className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span className="w-20">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 w-56 bg-card text-[13px]" />
      <Button size="sm" variant="gold" onClick={onSave} disabled={saving || !dirty}>{saving ? "…" : "Save"}</Button>
    </label>
  )
}

export function MemberProfile({ member, onBack }: { member: any; onBack: () => void }) {
  const [status, setStatus] = useState(member.membership_status || "Active")
  const [savingStatus, setSavingStatus] = useState(false)
  const [department, setDepartment] = useState(member.department || "")
  const [savingDept, setSavingDept] = useState(false)
  const [position, setPosition] = useState(member.position || "")
  const [savingPos, setSavingPos] = useState(false)
  const table = member._table || "church_members"
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingHistory(true)
      try { const logs = await sb(`soul_call_logs?person_table=eq.${table}&person_id=eq.${member.id}&select=*&order=call_date.desc,created_at.desc`); if (!cancelled) setHistory(logs || []) } catch { if (!cancelled) setHistory([]) }
      if (!cancelled) setLoadingHistory(false)
    })()
    return () => { cancelled = true }
  }, [table, member.id])

  const patch = async (body: any, ok: string, setBusy: (b: boolean) => void) => {
    setBusy(true)
    try { await sb(`${table}?id=eq.${member.id}`, { method: "PATCH", body: JSON.stringify(body) }); toast.success(ok) } catch (e: any) { toast.error(e.message); setBusy(false); return false }
    setBusy(false); return true
  }
  const changeStatus = async (s: string) => {
    if (s === status) return
    if (await patch({ membership_status: s }, `${member.full_name}'s status updated to ${s}.`, setSavingStatus)) setStatus(s)
  }
  const age = ageOf(member.dob)
  const isSteward = table === "stewards"

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title={member.full_name} subtitle={`${member.category || (isSteward ? "Steward" : "Member")}${member.position && member.position !== "Steward" ? ` · ${member.position}` : ""}`}
        action={<Button variant="outline" onClick={onBack}><ArrowLeft />Back</Button>} />
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Panel className="h-fit">
          <div className="flex flex-col items-center text-center">
            <PersonAvatar name={member.full_name} size={76} />
            <h2 className="mt-3 font-display text-lg font-extrabold">{member.full_name}</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <ToneBadge tone={isSteward || member.category === "Steward" ? "gold" : "soul"}>{member.category || (isSteward ? "Steward" : "Member")}</ToneBadge>
              {isSteward && member.position && member.position !== "Steward" && <ToneBadge tone="gold">{member.position}</ToneBadge>}
              <ToneBadge tone={MC_STATUS_TONE[status] || "brand"} dot>{status}</ToneBadge>
            </div>
          </div>
          <dl className="mt-5 grid gap-2.5 border-t pt-4 text-[13px] text-ink-secondary">
            <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /><PhoneLink phone={member.phone} withWhatsApp /></div>
            <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{member.email || "No email on file"}</div>
            <div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" />{[member.gender, age !== null ? `Age ${age}` : null, member.marital_status, member.life_stage].filter(Boolean).join(" · ") || "—"}</div>
            <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{member.house_address || "No address on file"}{member.nearest_landmark ? ` · Near ${member.nearest_landmark}` : ""}</div>
          </dl>
          <div className="mt-5 border-t pt-4">
            <div className="eyebrow mb-2">Membership status</div>
            <Segmented value={status} onChange={changeStatus} options={STATUSES.map((s) => ({ value: s, label: s }))} />
            {savingStatus && <Spinner className="ml-2 inline" />}
          </div>
          {isSteward && (
            <div className="mt-4 grid gap-2 border-t pt-4">
              <InlineSave label="Department" value={department} onChange={setDepartment} placeholder="e.g. Ushering, Media, Choir" saving={savingDept} dirty={department !== (member.department || "")}
                onSave={() => patch({ department: department.trim() || null }, `Department updated for ${member.full_name}.`, setSavingDept)} />
              <InlineSave label="Position" value={position} onChange={setPosition} placeholder="Steward, Team Lead, etc." saving={savingPos} dirty={position !== (member.position || "")}
                onSave={() => patch({ position: position.trim() || "Steward" }, `Position updated for ${member.full_name}.`, setSavingPos)} />
            </div>
          )}
        </Panel>

        <section>
          <SH title="Call history" icon={Phone} action={<span className="text-xs text-muted-foreground">{loadingHistory ? "Loading…" : `${history.length} call${history.length !== 1 ? "s" : ""} logged`}</span>} />
          {loadingHistory ? <SkeletonList rows={3} /> : history.length === 0 ? (
            <EmptyState icon={Phone} title="No calls logged yet" description={`Calls logged for ${member.full_name} will appear here.`} />
          ) : (
            <ol className="relative grid gap-3 border-l-2 border-border pl-5">
              {history.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-4 -left-[27px] size-3 rounded-full border-2 border-card" style={{ background: `var(--${({ brand: "primary", warning: "warning", info: "info", danger: "danger", muted: "muted-foreground" } as any)[SC_STATUS_TONE[h.call_status] || "muted"]})` }} aria-hidden />
                  <Panel className="p-4 sm:p-4">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <ToneBadge tone={SC_STATUS_TONE[h.call_status] || "muted"}>{h.call_status}</ToneBadge>
                      <span className="text-xs text-ink-secondary">{fmtDate(h.call_date)}</span>
                      <span className="text-xs text-muted-foreground">· by {h.called_by || "—"}</span>
                      {h.flagged_for_pastoral && <ToneBadge tone="danger" icon={Flag}>Flagged</ToneBadge>}
                      {h.visitation_availability && <ToneBadge tone={h.visitation_availability === "Available" ? "brand" : "muted"}>Visit: {h.visitation_availability}</ToneBadge>}
                    </div>
                    {h.visitation_availability === "Available" && (h.visitation_date || h.visitation_time) && (
                      <p className="mb-1 flex items-center gap-1 text-[13px] text-primary"><Calendar className="size-3.5" />Proposed visit: {h.visitation_date ? fmtDate(h.visitation_date) : "date TBC"}{h.visitation_time ? ` at ${h.visitation_time.slice(0, 5)}` : ""}</p>
                    )}
                    {h.flag_reason && <p className="mb-1 text-[13px] text-danger"><strong>Flagged:</strong> {h.flag_reason}</p>}
                    {h.notes && <p className="text-[13px] leading-relaxed text-ink-secondary">{h.notes}</p>}
                  </Panel>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Registry (shared by Members Care + Stewards Care) ──────────────────────
function PersonCard({ m, lastCalled, onOpen, onToggleStatus, extra }: { m: any; lastCalled?: string; onOpen: () => void; onToggleStatus: () => void; extra?: React.ReactNode }) {
  const st = m.membership_status || "Active"
  return (
    <article className="group rounded-lg border bg-card p-4 shadow-xs transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <button onClick={onOpen} className="mb-3 flex w-full items-center gap-2.5 text-left">
        <PersonAvatar name={m.full_name} size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-semibold group-hover:text-primary">{m.full_name}</h3>
          <p className="text-xs text-muted-foreground">{[m.gender, m.dob ? `Birthday ${dobDayMonth(m.dob)}` : null].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      </button>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button onClick={onToggleStatus} title="Toggle Active / Inactive" className="rounded-full"><ToneBadge tone={MC_STATUS_TONE[st] || "brand"} dot>{st}</ToneBadge></button>
        {extra}
        {[m.marital_status, m.life_stage].filter(Boolean).map((x: string) => <ToneBadge key={x} tone="muted">{x}</ToneBadge>)}
      </div>
      <div className="flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <PhoneLink phone={m.phone} withWhatsApp />
        <span className={cn(lastCalled ? "text-ink-secondary" : "text-muted-foreground")}>Called {lastCalled ? fmtDate(lastCalled) : "never"}</span>
      </div>
    </article>
  )
}

function useRegistry(table: "stewards" | "church_members") {
  const [people, setPeople] = useState<any[]>([])
  const [lastCalled, setLastCalled] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [tick, setTick] = useState(0)
  const reload = () => setTick((t) => t + 1)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        const [rows, logs] = await Promise.all([
          sb(`${table}?select=*&order=created_at.desc&limit=3000`),
          sb(`soul_call_logs?person_table=eq.${table}&select=person_id,call_date&order=call_date.asc`).catch(() => []),
        ])
        if (cancelled) return
        const lc: Record<string, string> = {}
        ;(logs || []).forEach((l: any) => { if (!lc[l.person_id] || l.call_date > lc[l.person_id]) lc[l.person_id] = l.call_date })
        setPeople((rows || []).map((m: any) => ({ ...m, _table: table, ...(table === "stewards" ? { category: "Steward" } : {}) })))
        setLastCalled(lc)
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tick, table])
  const toggleStatus = async (m: any) => {
    const next = (m.membership_status || "Active") === "Active" ? "Inactive" : "Active"
    try { await sb(`${table}?id=eq.${m.id}`, { method: "PATCH", body: JSON.stringify({ membership_status: next }) }); toast.success(`${m.full_name} marked ${next}.`); reload() } catch (e: any) { toast.error(e.message) }
  }
  return { people, lastCalled, loading, err, setErr, reload, toggleStatus }
}

function useSort(getters: Record<string, (r: any) => any>) {
  const [sortKey, setSortKey] = useState("")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const onSort = (k: string) => { if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setSortDir("asc") } }
  const apply = (rows: any[]) => (sortKey ? genericSort(rows, getters[sortKey], sortDir) : rows)
  return { sortKey, sortDir, onSort, apply }
}

function StewardsCare({ onViewProfile }: { onViewProfile: (m: any) => void }) {
  const { people: stewards, lastCalled, loading, err, setErr, reload, toggleStatus } = useRegistry("stewards")
  const [search, setSearch] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fMarital, setFMarital] = useState("")
  const [fLife, setFLife] = useState("")
  const [fPosition, setFPosition] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [quick, setQuick] = useState({ name: "", phone: "", dept: "", position: "Steward" })
  const [savingQuick, setSavingQuick] = useState(false)
  const [view, setView] = usePersistentState<"board" | "table">("envoys_view_stewards", "board")
  const monthStart = new Date().toISOString().slice(0, 8) + "01"

  const filtered = stewards.filter((m) => {
    if (fStatus && (m.membership_status || "Active") !== fStatus) return false
    if (fMarital && m.marital_status !== fMarital) return false
    if (fLife && m.life_stage !== fLife) return false
    if (fPosition && (m.position || "Steward") !== fPosition) return false
    if (search && !m.full_name?.toLowerCase().includes(search.toLowerCase()) && !m.phone?.includes(search)) return false
    return true
  })
  const sort = useSort({
    name: (m) => m.full_name?.toLowerCase(), phone: (m) => m.phone, email: (m) => m.email?.toLowerCase(), gender: (m) => m.gender, dob: (m) => m.dob,
    status: (m) => m.membership_status || "Active", department: (m) => m.department?.toLowerCase(), position: (m) => m.position || "Steward", lastCalled: (m) => lastCalled[m.id] || null,
  })
  const sorted = sort.apply(filtered)
  const { count, sentinel, hasMore } = useInfiniteReveal(`${fStatus}|${fMarital}|${fLife}|${fPosition}|${search}|${sort.sortKey}|${sort.sortDir}|${view}`, sorted.length, 30)
  const positions = [...new Set(stewards.map((s) => s.position).filter((p) => p && p !== "Steward"))].sort()

  const addQuick = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quick.name.trim()) { toast.error("Full name is required."); return }
    setSavingQuick(true)
    try {
      await sb("stewards", { method: "POST", body: JSON.stringify({ full_name: quick.name.trim(), phone: quick.phone.trim() || null, department: quick.dept.trim() || null, position: quick.position.trim() || "Steward" }) })
      setQuick({ name: "", phone: "", dept: "", position: "Steward" }); toast.success("Steward added."); reload()
    } catch (e: any) { toast.error(e.message) }
    setSavingQuick(false)
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Stewards care" subtitle="The stewards and leadership registry." action={<Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>} />
      <div className="mb-5"><BirthdaysFromList people={stewards} /></div>
      <StatGrid>
        <StatCard label="Total stewards" value={stewards.length} icon={Shield} tone="gold" />
        <StatCard label="Active stewards" value={stewards.filter((m) => (m.membership_status || "Active") === "Active").length} icon={CheckCircle2} tone="brand" />
        <StatCard label="New this month" value={stewards.filter((m) => (m.date_joined || (m.created_at || "").slice(0, 10)) >= monthStart).length} icon={UserPlus} tone="soul" />
        <StatCard label="In leadership roles" value={stewards.filter((m) => (m.position || "Steward") !== "Steward").length} icon={Award} tone="gold" />
      </StatGrid>
      <Panel className="mb-5">
        <SH title="Quick add" icon={UserPlus} />
        <form onSubmit={addQuick} className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
          <FieldInput label="Full name" value={quick.name} onChange={(e) => setQuick((q) => ({ ...q, name: e.target.value }))} placeholder="e.g. Ngozi Eze" />
          <FieldInput label="Phone" type="tel" value={quick.phone} onChange={(e) => setQuick((q) => ({ ...q, phone: e.target.value }))} placeholder="Optional" />
          <FieldInput label="Department" value={quick.dept} onChange={(e) => setQuick((q) => ({ ...q, dept: e.target.value }))} placeholder="e.g. Ushering" />
          <FieldInput label="Position" value={quick.position} onChange={(e) => setQuick((q) => ({ ...q, position: e.target.value }))} placeholder="Steward, Team Lead, etc." />
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="gold" disabled={savingQuick}>{savingQuick ? <Spinner /> : <UserPlus />}{savingQuick ? "Saving…" : "Add steward"}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowImport((s) => !s)}><Upload />{showImport ? "Hide bulk import" : "Bulk import (CSV)"}</Button>
          </div>
        </form>
      </Panel>
      {showImport && <StewardsCSVImport onDone={reload} />}
      <Toolbar>
        <Filter className="size-4 text-muted-foreground" aria-hidden />
        <FilterSelect value={fStatus} onChange={setFStatus} label="Membership status" options={opts(STATUSES)} />
        <FilterSelect value={fMarital} onChange={setFMarital} label="Marital status" options={opts(MARITAL)} />
        <FilterSelect value={fLife} onChange={setFLife} label="Life stage" options={opts(LIFE)} />
        <FilterSelect value={fPosition} onChange={setFPosition} label="All positions" options={[{ value: "Steward", label: "Steward only" }, ...opts(positions)]} />
        {(fStatus || fMarital || fLife || fPosition) && <Button size="sm" variant="ghost" onClick={() => { setFStatus(""); setFMarital(""); setFLife(""); setFPosition("") }}><X />Clear</Button>}
        <div className="ml-auto flex items-center gap-2"><SearchInput value={search} onChange={setSearch} placeholder="Search name" className="sm:w-56" /><ViewToggle value={view} onChange={setView} /></div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? (
        <EmptyState icon={Shield} title={stewards.length === 0 ? "No stewards yet" : "No stewards match your filters"} description={stewards.length === 0 ? "Use Quick add or Bulk import (CSV) above." : undefined} />
      ) : view === "board" ? (
        <div className="masonry">
          {sorted.slice(0, count).map((m) => (
            <PersonCard key={m.id} m={m} lastCalled={lastCalled[m.id]} onOpen={() => onViewProfile(m)} onToggleStatus={() => toggleStatus(m)}
              extra={<>{m.position && m.position !== "Steward" && <ToneBadge tone="gold">{m.position}</ToneBadge>}{m.department && <ToneBadge tone="muted">{m.department}</ToneBadge>}</>} />
          ))}
        </div>
      ) : (
        <DataTable maxHeight={640}>
          <thead><tr>{[["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Gender", "gender"], ["DOB", "dob"], ["Status", "status"], ["Department", "department"], ["Position", "position"], ["Last called", "lastCalled"]].map(([l, k]) => (
            <th key={k} className={cn(th, k === "name" && "left-0 z-[2]")}><SortableHead label={l} sortKey={k} activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} /></th>
          ))}</tr></thead>
          <tbody>
            {sorted.slice(0, count).map((m) => (
              <tr key={m.id} className="hover:bg-muted/50">
                <td className={cn(td, "sticky left-0 bg-card")}><button onClick={() => onViewProfile(m)} className="flex items-center gap-2 font-semibold whitespace-nowrap hover:text-primary"><PersonAvatar name={m.full_name} size={26} />{m.full_name}</button></td>
                <td className={td}><PhoneLink phone={m.phone} withWhatsApp /></td>
                <td className={cn(td, "max-w-48 truncate text-ink-secondary")}>{m.email || "—"}</td>
                <td className={td}>{m.gender || "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{dobDayMonth(m.dob)}</td>
                <td className={td}><button onClick={() => toggleStatus(m)} className="rounded-full"><ToneBadge tone={MC_STATUS_TONE[m.membership_status || "Active"]} dot>{m.membership_status || "Active"}</ToneBadge></button></td>
                <td className={td}>{m.department || "—"}</td>
                <td className={td}>{m.position || "Steward"}</td>
                <td className={cn(td, "whitespace-nowrap", !lastCalled[m.id] && "text-muted-foreground")}>{lastCalled[m.id] ? fmtDate(lastCalled[m.id]) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{stewards.length}</strong> stewards. Open a steward to edit their department and position.</p>}
    </div>
  )
}

function MembersCare({ onViewProfile }: { onViewProfile: (m: any) => void }) {
  const { role } = useSession()
  const isAdmin = role === "soulcareadmin" || role === "admin"
  const { people: members, lastCalled, loading, err, setErr, reload, toggleStatus } = useRegistry("church_members")
  const [search, setSearch] = useState("")
  const [fStatus, setFStatus] = useState("")
  const [fMarital, setFMarital] = useState("")
  const [fLife, setFLife] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [view, setView] = usePersistentState<"board" | "table">("envoys_view_members", "board")
  const monthStart = new Date().toISOString().slice(0, 8) + "01"
  const children = members.filter((m) => { const a = ageOf(m.dob); return a !== null && a < 18 }).length

  const filtered = members.filter((m) => {
    if (fStatus && (m.membership_status || "Active") !== fStatus) return false
    if (fMarital && m.marital_status !== fMarital) return false
    if (fLife && m.life_stage !== fLife) return false
    if (search && !m.full_name?.toLowerCase().includes(search.toLowerCase()) && !m.phone?.includes(search)) return false
    return true
  })
  const sort = useSort({
    name: (m) => m.full_name?.toLowerCase(), phone: (m) => m.phone, email: (m) => m.email?.toLowerCase(), gender: (m) => m.gender, dob: (m) => m.dob,
    category: (m) => m.category, status: (m) => m.membership_status || "Active", lastCalled: (m) => lastCalled[m.id] || null,
  })
  const sorted = sort.apply(filtered)
  const { count, sentinel, hasMore } = useInfiniteReveal(`${fStatus}|${fMarital}|${fLife}|${search}|${sort.sortKey}|${sort.sortDir}|${view}`, sorted.length, 30)

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Members care" subtitle="The members registry, for consistent follow-up."
        action={<>
          {isAdmin && <Button variant="outline" onClick={() => setShowImport((s) => !s)}><Upload />{showImport ? "Hide import" : "Bulk import"}</Button>}
          <Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </>} />
      {isAdmin && showImport && <MembersCareCSVImport onDone={reload} />}
      <div className="mb-5"><BirthdaysFromList people={members} /></div>
      <StatGrid>
        <StatCard label="Total members" value={members.length} icon={Users} tone="soul" />
        <StatCard label="Active members" value={members.filter((m) => (m.membership_status || "Active") === "Active").length} icon={CheckCircle2} tone="brand" />
        <StatCard label="New this month" value={members.filter((m) => (m.date_joined || (m.created_at || "").slice(0, 10)) >= monthStart).length} icon={UserPlus} tone="brand" />
        <StatCard label="Children" value={children} icon={Heart} tone="research" sub={children === 0 && members.length > 0 ? "Counted from recorded birthdays" : ""} />
      </StatGrid>
      <Toolbar>
        <Filter className="size-4 text-muted-foreground" aria-hidden />
        <FilterSelect value={fStatus} onChange={setFStatus} label="Membership status" options={opts(STATUSES)} />
        <FilterSelect value={fMarital} onChange={setFMarital} label="Marital status" options={opts(MARITAL)} />
        <FilterSelect value={fLife} onChange={setFLife} label="Life stage" options={opts(LIFE)} />
        {(fStatus || fMarital || fLife) && <Button size="sm" variant="ghost" onClick={() => { setFStatus(""); setFMarital(""); setFLife("") }}><X />Clear</Button>}
        <div className="ml-auto flex items-center gap-2"><SearchInput value={search} onChange={setSearch} placeholder="Search name" className="sm:w-56" /><ViewToggle value={view} onChange={setView} /></div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title={members.length === 0 ? "No members yet" : "No members match your filters"} description={members.length === 0 ? "Use Bulk import to load the congregation." : undefined} />
      ) : view === "board" ? (
        <div className="masonry">
          {sorted.slice(0, count).map((m) => (
            <PersonCard key={m.id} m={m} lastCalled={lastCalled[m.id]} onOpen={() => onViewProfile(m)} onToggleStatus={() => toggleStatus(m)}
              extra={<ToneBadge tone={m.category === "Steward" ? "gold" : "soul"}>{m.category || "Member"}</ToneBadge>} />
          ))}
        </div>
      ) : (
        <DataTable maxHeight={640}>
          <thead><tr>{[["Name", "name"], ["Phone", "phone"], ["Email", "email"], ["Gender", "gender"], ["DOB", "dob"], ["Category", "category"], ["Status", "status"], ["Last called", "lastCalled"]].map(([l, k]) => (
            <th key={k} className={cn(th, k === "name" && "left-0 z-[2]")}><SortableHead label={l} sortKey={k} activeKey={sort.sortKey} dir={sort.sortDir} onSort={sort.onSort} /></th>
          ))}</tr></thead>
          <tbody>
            {sorted.slice(0, count).map((m) => (
              <tr key={m.id} className="hover:bg-muted/50">
                <td className={cn(td, "sticky left-0 bg-card")}><button onClick={() => onViewProfile(m)} className="flex items-center gap-2 font-semibold whitespace-nowrap hover:text-primary"><PersonAvatar name={m.full_name} size={26} />{m.full_name}</button></td>
                <td className={td}><PhoneLink phone={m.phone} withWhatsApp /></td>
                <td className={cn(td, "max-w-48 truncate text-ink-secondary")}>{m.email || "—"}</td>
                <td className={td}>{m.gender || "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{dobDayMonth(m.dob)}</td>
                <td className={td}><ToneBadge tone={m.category === "Steward" ? "gold" : "soul"}>{m.category || "Member"}</ToneBadge></td>
                <td className={td}><button onClick={() => toggleStatus(m)} className="rounded-full"><ToneBadge tone={MC_STATUS_TONE[m.membership_status || "Active"]} dot>{m.membership_status || "Active"}</ToneBadge></button></td>
                <td className={cn(td, "whitespace-nowrap", !lastCalled[m.id] && "text-muted-foreground")}>{lastCalled[m.id] ? fmtDate(lastCalled[m.id]) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong> matching members ({members.length} total)</p>}
    </div>
  )
}

function CarePriorityList({ onViewProfile }: { onViewProfile: (m: any) => void }) {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        const [im, is] = await Promise.all([
          sb("church_members?membership_status=eq.Inactive&order=full_name.asc&limit=1000"),
          sb("stewards?membership_status=eq.Inactive&order=full_name.asc&limit=1000"),
        ])
        if (!cancelled) setMembers([...(im || []).map((m: any) => ({ ...m, _table: "church_members" })), ...(is || []).map((m: any) => ({ ...m, _table: "stewards", category: "Steward" }))])
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])
  const filtered = members.filter((m) => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.phone?.includes(search)).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""))
  const stewardCount = members.filter((m) => m.category === "Steward").length
  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Care Channels" title="Care priority list" subtitle="Inactive members and stewards who need a caring call." action={<SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" className="sm:w-60" />} />
      <StatGrid cols={3}>
        <StatCard label="Total inactive" value={members.length} icon={AlertCircle} tone="danger" />
        <StatCard label="Inactive members" value={members.length - stewardCount} icon={Users} tone="soul" />
        <StatCard label="Inactive stewards" value={stewardCount} icon={Shield} tone="gold" />
      </StatGrid>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? <EmptyState icon={CheckCircle2} title="No one is currently marked inactive" /> : (
        <div className="masonry">
          {filtered.map((m) => (
            <article key={`${m._table}-${m.id}`} className="rounded-lg border bg-card p-4 shadow-xs">
              <div className="mb-3 flex items-center gap-2.5">
                <PersonAvatar name={m.full_name} size={40} />
                <div className="min-w-0 flex-1"><h3 className="truncate text-[14px] font-semibold">{m.full_name}</h3><div className="text-xs"><PhoneLink phone={m.phone} withWhatsApp /></div></div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                <ToneBadge tone={m.category === "Steward" ? "gold" : "soul"}>{m.category || "Member"}</ToneBadge>
                <ToneBadge tone="danger" dot>Inactive</ToneBadge>
              </div>
              <Button size="sm" variant="soul" className="w-full" onClick={() => onViewProfile(m)}>View profile</Button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

function withProfile(List: React.ComponentType<{ onViewProfile: (m: any) => void }>) {
  return function Screen() {
    const [profile, setProfile] = useState<any>(null)
    if (profile) return <MemberProfile member={profile} onBack={() => setProfile(null)} />
    return <List onViewProfile={setProfile} />
  }
}
export const StewardsCareScreen = withProfile(StewardsCare)
export const MembersCareScreen = withProfile(MembersCare)
export const CarePriorityScreen = withProfile(CarePriorityList)
