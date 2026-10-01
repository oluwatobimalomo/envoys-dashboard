"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Download, MapPin, RefreshCw, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DataTable, EmptyState, Notice, PageHeader, PersonAvatar, PhoneLink, SearchInput, Segmented, SkeletonBoard, StatCard, StatGrid,
  ToneBadge, Toolbar, ViewToggle, td, th, usePersistentState,
} from "@/components/app/kit"
import { useSession } from "@/components/app/session"
import { CONNECT_CENTERS } from "@/modules/calls"
import { sb } from "@/lib/supabase"
import { csvCell, downloadBlob, fmtDate, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import { cn } from "@/lib/utils"

export function ConnectCentreProspects() {
  const { user: currentUser } = useSession()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [fCentre, setFCentre] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  const [savingId, setSavingId] = useState<any>(null)
  const [view, setView] = usePersistentState<"board" | "table">("envoys_view_ccp", "board")

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try { setRows((await sb("connect_centre_prospects?order=created_at.desc&limit=2000")) || []) } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const toggleConfirmed = async (row: any) => {
    setSavingId(row.id)
    try {
      const next = !row.confirmed
      await sb(`connect_centre_prospects?id=eq.${row.id}`, { method: "PATCH", body: JSON.stringify({ confirmed: next, confirmed_by: next ? currentUser || null : null, confirmed_at: next ? new Date().toISOString() : null }) })
      toast.success(next ? `${row.full_name} marked as confirmed.` : `${row.full_name} unmarked.`)
      load()
    } catch (e: any) { toast.error(e.message) }
    setSavingId(null)
  }

  const filtered = rows.filter((r) => {
    if (fCentre && r.connect_center !== fCentre) return false
    if (filter === "confirmed" && !r.confirmed) return false
    if (filter === "unconfirmed" && r.confirmed) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.full_name?.toLowerCase().includes(q) && !r.phone?.includes(search)) return false
    }
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${fCentre}|${filter}|${view}`, filtered.length, 30)
  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const confirmedCount = rows.filter((r) => r.confirmed).length
  const selectedCount = filtered.filter((r) => selected.has(r.id)).length

  const downloadCSV = () => {
    const out = filtered.filter((r) => selected.has(r.id))
    if (!out.length) return
    const header = ["Full Name", "Phone", "Gender", "DOB", "Marital Status", "Life Stage", "Connect Centre", "Natural Groups", "Confirmed", "Confirmed By", "Confirmed At", "Submitted At"]
    const lines = out.map((r) => [r.full_name, r.phone, r.gender, r.dob, r.marital_status, r.life_stage, r.connect_center, Array.isArray(r.natural_groups) ? r.natural_groups.join("; ") : r.natural_groups || "", r.confirmed ? "Yes" : "No", r.confirmed_by, r.confirmed_at ? r.confirmed_at.slice(0, 10) : "", r.created_at ? r.created_at.slice(0, 10) : ""].map(csvCell).join(","))
    const centre = fCentre ? `_${fCentre.replace(/[^a-z0-9]/gi, "_")}` : "_all_centres"
    downloadBlob(`prospective_connect_members${centre}_${todayISO()}.csv`, [header.join(","), ...lines].join("\r\n"))
  }

  const ConfirmBtn = ({ r }: { r: any }) =>
    r.confirmed ? (
      <button onClick={() => toggleConfirmed(r)} disabled={savingId === r.id} title="Click to unmark" className="rounded-full"><ToneBadge tone="brand" icon={CheckCircle2}>Confirmed</ToneBadge></button>
    ) : (
      <Button size="xs" variant="soul" onClick={() => toggleConfirmed(r)} disabled={savingId === r.id}>{savingId === r.id ? "Saving…" : "Mark confirmed"}</Button>
    )
  const groupsOf = (r: any) => (Array.isArray(r.natural_groups) ? r.natural_groups : r.natural_groups ? [r.natural_groups] : [])

  return (
    <div className="animate-page-in">
      <PageHeader
        eyebrow="Connect Centre"
        title="Prospective connect members"
        subtitle="VIPs recommended to a connect centre. Confirm each one once they're in the centre's WhatsApp group."
        action={<>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>
          <Button onClick={downloadCSV} disabled={!selectedCount}><Download />Download{selectedCount ? ` (${selectedCount})` : ""}</Button>
        </>}
      />
      <StatGrid cols={3}>
        <StatCard label="Total prospects" value={rows.length} icon={Users} tone="soul" />
        <StatCard label="Confirmed" value={confirmedCount} icon={CheckCircle2} tone="brand" />
        <StatCard label="Awaiting confirmation" value={rows.length - confirmedCount} icon={AlertCircle} tone="gold" />
      </StatGrid>
      <Toolbar>
        <select value={fCentre} onChange={(e) => setFCentre(e.target.value)} aria-label="Connect centre" className="h-9 w-52 rounded-sm border border-input bg-card px-3 text-sm">
          <option value="">All connect centres</option>
          {CONNECT_CENTERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Segmented value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "unconfirmed", label: "Awaiting" }, { value: "confirmed", label: "Confirmed" }]} />
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone" className="sm:w-56" />
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title={rows.length === 0 ? "No connect centre recommendations yet" : "No prospects match your filters"} />
      ) : view === "board" ? (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => (
            <article key={r.id} className={cn("relative rounded-lg border bg-card p-4 shadow-xs", selected.has(r.id) && "border-primary ring-1 ring-primary/40")}>
              <Checkbox className="absolute top-3 right-3 bg-card" checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} />
              <div className="mb-3 flex items-center gap-2.5 pr-7">
                <PersonAvatar name={r.full_name} size={38} />
                <div className="min-w-0"><h3 className="truncate text-[14px] font-semibold">{r.full_name}</h3><p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{r.connect_center || "—"}</p></div>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {groupsOf(r).map((g: string) => <ToneBadge key={g} tone="soul">{g}</ToneBadge>)}
                {[r.gender, r.life_stage].filter(Boolean).map((x: string) => <ToneBadge key={x} tone="muted">{x}</ToneBadge>)}
              </div>
              {r.confirmed && r.confirmed_by && <p className="mb-2 text-xs text-muted-foreground">Confirmed by {r.confirmed_by} · {fmtDate(r.confirmed_at)}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"><PhoneLink phone={r.phone} withWhatsApp /><ConfirmBtn r={r} /></div>
            </article>
          ))}
        </div>
      ) : (
        <DataTable maxHeight={640}>
          <thead><tr><th className={cn(th, "w-10")}><Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" /></th>{["Full name", "Phone", "Gender", "DOB", "Life stage", "Connect centre", "Natural groups", "Confirmed"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.slice(0, count).map((r) => (
              <tr key={r.id} className={cn("hover:bg-muted/50", selected.has(r.id) && "bg-brand-tint/50")}>
                <td className={td}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleRow(r.id)} aria-label={`Select ${r.full_name}`} /></td>
                <td className={td}><div className="flex items-center gap-2"><PersonAvatar name={r.full_name} size={26} /><span className="font-semibold whitespace-nowrap">{r.full_name}</span></div></td>
                <td className={td}><PhoneLink phone={r.phone} withWhatsApp /></td>
                <td className={td}>{r.gender || "—"}</td>
                <td className={cn(td, "whitespace-nowrap")}>{r.dob || "—"}</td>
                <td className={td}>{r.life_stage || "—"}</td>
                <td className={td}>{r.connect_center || "—"}</td>
                <td className={td}>{groupsOf(r).join(", ") || "—"}</td>
                <td className={td}><ConfirmBtn r={r} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> prospects</p>}
    </div>
  )
}
