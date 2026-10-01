"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Calendar, CheckCircle2, Copy, Download, Filter, Maximize2, Quote, RefreshCw, Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import {
  EmptyState, FieldInput, Logo, Notice, PageHeader, Panel, PersonAvatar, SearchInput, SkeletonBoard, StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { DateRangeBar, QRCodePage } from "@/components/app/shared"
import { PublicShell, ThankYou } from "@/components/app/public-shell"
import { useSession } from "@/components/app/session"
import { CREDS_MISSING, sb } from "@/lib/supabase"
import { csvCell, downloadBlob, fmtDate, generatePresentationSlug, todayISO } from "@/lib/format"
import { useInfiniteReveal } from "@/lib/hooks"
import type { Tone } from "@/lib/nav"
import { cn } from "@/lib/utils"

export const TESTIMONY_CATEGORIES = ["General Testimony", "Coronation Service Testimony", "Upgrade Service Testimony"]
const catTone = (c: string): Tone => (c === "Coronation Service Testimony" ? "soul" : c === "Upgrade Service Testimony" ? "research" : "gold")
const normalise = (r: any) => ({ id: r.id, display_name: r.name || "Anonymous", category: r.category || "General Testimony", testimony: r.testimony, date: r.submitted_at ? r.submitted_at.slice(0, 10) : "" })

function fontSizeFor(text: string) {
  const len = (text || "").length
  if (len < 120) return 56
  if (len < 260) return 46
  if (len < 420) return 37
  if (len < 650) return 29
  if (len < 900) return 23
  return 18
}

// ── Projector ──────────────────────────────────────────────────────────────
export function TestimonyProjector({ items, initialIndex = 0, shareUrl, onIndexChange, onExit }: { items: any[]; initialIndex?: number; shareUrl?: string | null; onIndexChange?: (i: number) => void; onExit: () => void }) {
  const [index, setIndex] = useState(initialIndex)
  const [copied, setCopied] = useState(false)
  const touchX = useRef<number | null>(null)
  const atEnd = index >= items.length
  const current = !atEnd ? items[index] : null
  useEffect(() => { onIndexChange?.(index) }, [index])
  const next = useCallback(() => setIndex((i) => Math.min(i + 1, items.length)), [items.length])
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onExit(); return }
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); next() }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); prev() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, onExit])
  const copy = async () => {
    if (!shareUrl) return
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (dx < -50) next(); else if (dx > 50) prev()
        touchX.current = null
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo size={32} tile />
          <div className="leading-tight">
            <div className="font-display text-[13px] font-extrabold tracking-wide">THE ENVOYS</div>
            <div className="text-[11px] text-muted-foreground italic">…the home of supernatural upgrades</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-sm font-bold text-muted-foreground tabular">{atEnd ? "—" : `${index + 1} / ${items.length}`}</span>
          {shareUrl && <Button size="sm" variant="outline" onClick={copy}>{copied ? <CheckCircle2 /> : <Copy />}{copied ? "Link copied" : "Copy presentation link"}</Button>}
          <Button size="sm" variant="ghost" onClick={onExit}><X />Exit</Button>
        </div>
      </header>
      {/* Progress */}
      <div className="h-1 bg-muted"><div className="h-1 bg-gold transition-[width] duration-300" style={{ width: `${(Math.min(index + 1, items.length) / Math.max(items.length, 1)) * 100}%` }} /></div>

      {atEnd ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-gold-tint text-gold-ink"><Star className="size-8" /></span>
          <div className="font-display text-2xl font-extrabold">That&apos;s all {items.length} testimon{items.length !== 1 ? "ies" : "y"}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIndex(0)}><RefreshCw />Start over</Button>
            <Button onClick={onExit}><X />Exit</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative flex flex-1 overflow-hidden">
            <button aria-label="Previous testimony" onClick={prev} className="absolute inset-y-0 left-0 z-[2] w-[30%] cursor-w-resize opacity-0" disabled={index === 0} />
            <button aria-label="Next testimony" onClick={next} className="absolute inset-y-0 right-0 z-[2] w-[30%] cursor-e-resize opacity-0" />
            <div key={index} className="flex flex-1 animate-page-in flex-col items-center justify-center overflow-y-auto px-[clamp(20px,6vw,60px)] py-10">
              <div className="max-w-[min(90vw,1100px)] text-center">
                <Quote className="mx-auto mb-4 size-12 text-gold" aria-hidden />
                <p className="font-display leading-[1.32] font-bold tracking-[-0.01em] text-foreground" style={{ fontSize: `clamp(18px, ${fontSizeFor(current.testimony) / 14}vw, ${fontSizeFor(current.testimony)}px)` }}>
                  {current.testimony}
                </p>
              </div>
            </div>
          </div>
          <footer className="flex flex-col items-center gap-2 border-t px-6 py-4">
            <div className="flex items-center gap-3">
              <PersonAvatar name={current.display_name} size={42} />
              <div>
                <div className="font-display text-[17px] font-extrabold">{current.display_name}</div>
                <div className="mt-0.5 flex items-center gap-2"><ToneBadge tone={catTone(current.category)}>{current.category}</ToneBadge>{current.date && <span className="text-xs text-muted-foreground">{fmtDate(current.date)}</span>}</div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Swipe, click either side, or use the arrow keys or space bar to advance · Esc to exit</p>
          </footer>
        </>
      )}
    </div>
  )
}

export function PresentationViewer({ slug }: { slug: string }) {
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "ended">("loading")
  const [items, setItems] = useState<any[]>([])
  const [initialIndex, setInitialIndex] = useState(0)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const rows = await sb(`testimony_presentations?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`)
        if (!rows?.length) { if (!cancelled) setState("notfound"); return }
        const pres = rows[0]
        const all = await sb("public_testimonies?select=*&limit=2000")
        const byId: Record<string, any> = {}
        ;(all || []).forEach((r: any) => (byId[String(r.id)] = r))
        const ordered = (pres.testimony_ids || []).map((id: any) => byId[String(id)]).filter(Boolean).map(normalise)
        if (cancelled) return
        if (!ordered.length) { setState("notfound"); return }
        setItems(ordered)
        setInitialIndex(Math.min(pres.current_index || 0, ordered.length))
        setState("ready")
      } catch { if (!cancelled) setState("notfound") }
    })()
    return () => { cancelled = true }
  }, [slug])
  const persist = useCallback((idx: number) => {
    sb(`testimony_presentations?slug=eq.${encodeURIComponent(slug)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ current_index: idx, updated_at: new Date().toISOString() }) }).catch(() => {})
  }, [slug])
  if (state === "ready") return <TestimonyProjector items={items} initialIndex={initialIndex} onIndexChange={persist} onExit={() => setState("ended")} />
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Logo size={52} tile />
        {state === "loading" && <><Spinner className="size-5 text-primary" /><p className="text-[13px] text-muted-foreground">Loading presentation…</p></>}
        {state === "notfound" && <><h1 className="font-display text-xl font-extrabold">This presentation link isn&apos;t available</h1><p className="max-w-sm text-[13px] text-muted-foreground">It may have ended, or the link was mistyped. Please check with whoever shared it with you.</p></>}
        {state === "ended" && <><h1 className="font-display text-lg font-bold">Presentation ended</h1><p className="text-[13px] text-muted-foreground">You can close this tab now.</p></>}
      </div>
    </div>
  )
}

// ── Testimony bank ─────────────────────────────────────────────────────────
export function TestimonyBank() {
  const { user: currentUser } = useSession()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selected, setSelected] = useState<Set<any>>(new Set())
  const [projector, setProjector] = useState(false)
  const [slug, setSlug] = useState<string | null>(null)
  const [presentErr, setPresentErr] = useState("")

  const load = useCallback(async () => {
    setLoading(true); setErr("")
    try {
      const data = await sb("public_testimonies?select=*&order=submitted_at.desc&limit=1000")
      setRows((data || []).filter((r: any) => r.testimony && r.testimony.trim() !== "").map(normalise))
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = rows.filter((r) => {
    if (category && r.category !== category) return false
    if (search) { const q = search.toLowerCase(); if (!r.display_name.toLowerCase().includes(q) && !r.testimony.toLowerCase().includes(q)) return false }
    if (dateFrom && r.date < dateFrom) return false
    if (dateTo && r.date > dateTo) return false
    return true
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${category}|${dateFrom}|${dateTo}`, filtered.length, 24)
  const ids = filtered.map((r) => r.id)
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id))
  const toggleRow = (id: any) => setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected((p) => { const n = new Set(p); ids.forEach((id) => (allSelected ? n.delete(id) : n.add(id))); return n })
  const chosen = filtered.filter((r) => selected.has(r.id))

  const downloadCSV = () => {
    if (!chosen.length) return
    const label = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${todayISO()}`
    downloadBlob(`envoys_testimony_bank${label}.csv`, [["Name", "Category", "Date Submitted", "Testimony"].join(","), ...chosen.map((r) => [r.display_name, r.category, r.date, r.testimony].map(csvCell).join(","))].join("\r\n"))
  }
  const updateIndex = useCallback((idx: number) => {
    if (!slug) return
    sb(`testimony_presentations?slug=eq.${slug}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ current_index: idx, updated_at: new Date().toISOString() }) }).catch(() => {})
  }, [slug])
  const startPresentation = async () => {
    if (!chosen.length) return
    setPresentErr("")
    let s = generatePresentationSlug()
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          await sb("testimony_presentations", { method: "POST", body: JSON.stringify({ slug: s, testimony_ids: chosen.map((r) => String(r.id)), current_index: 0, created_by: currentUser || null }) })
          break
        } catch (e) { if (attempt === 0) s = generatePresentationSlug(); else throw e }
      }
      setSlug(s); setProjector(true)
    } catch (e: any) { setPresentErr(`Could not start presentation: ${e.message}`) }
  }

  if (projector)
    return <TestimonyProjector items={chosen} shareUrl={slug ? `${window.location.origin}/present/${slug}` : null} onIndexChange={updateIndex} onExit={() => { setProjector(false); setSlug(null) }} />

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="Testimonies" title="Testimony bank" subtitle={`${rows.length} testimon${rows.length !== 1 ? "ies" : "y"} submitted through the testimony QR form.`}
        action={<>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh"><RefreshCw /></Button>
          <Button onClick={startPresentation} disabled={!chosen.length}><Maximize2 />Project{chosen.length ? ` (${chosen.length})` : ""}</Button>
          <Button variant="gold" onClick={downloadCSV} disabled={!chosen.length}><Download />Download{chosen.length ? ` (${chosen.length})` : ""}</Button>
        </>} />
      <StatGrid cols={3}>
        <StatCard label="Total testimonies" value={rows.length} icon={Star} tone="gold" />
        <StatCard label="Matching filter" value={filtered.length} icon={Filter} tone="brand" />
        <StatCard label="Selected" value={chosen.length} icon={CheckCircle2} tone={chosen.length ? "gold" : "muted"} sub={chosen.length ? "Ready to project or download" : "Select cards below"} />
      </StatGrid>
      <DateRangeBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}>
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Testimony type" className="h-8 rounded-sm border border-input bg-card px-2 text-[13px]">
          <option value="">All types</option>
          {TESTIMONY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </DateRangeBar>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or testimony" />
        <Button size="sm" variant="outline" className="ml-auto" onClick={toggleAll} disabled={!ids.length}>{allSelected ? "Deselect all" : "Select all"}</Button>
      </Toolbar>
      <Notice type="error" msg={err} onClose={() => setErr("")} />
      <Notice type="error" msg={presentErr} onClose={() => setPresentErr("")} />
      {loading ? <SkeletonBoard /> : filtered.length === 0 ? (
        <EmptyState icon={Star} title={rows.length === 0 ? "No testimonies yet" : "No testimonies match your filters"} description={rows.length === 0 ? "Share the testimony QR code so members can submit their testimonies." : undefined} />
      ) : (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => {
            const on = selected.has(r.id)
            return (
              <article
                key={r.id}
                onClick={() => toggleRow(r.id)}
                className={cn("relative cursor-pointer rounded-lg border bg-card p-5 shadow-xs transition-[translate,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:shadow-md", on && "border-gold ring-2 ring-gold/40")}
              >
                <Checkbox className="absolute top-4 right-4 bg-card" checked={on} onCheckedChange={() => toggleRow(r.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select testimony from ${r.display_name}`} />
                <Quote className="mb-2 size-6 text-gold" aria-hidden />
                <p className="mb-4 text-[14.5px] leading-relaxed whitespace-pre-line text-foreground">{r.testimony}</p>
                <div className="flex items-center gap-2.5 border-t pt-3">
                  <PersonAvatar name={r.display_name} size={30} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">{r.display_name}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Calendar className="size-3" />{r.date ? fmtDate(r.date) : "—"}</div>
                  </div>
                  <ToneBadge tone={catTone(r.category)} className="max-w-[45%] truncate">{r.category.replace(" Testimony", "")}</ToneBadge>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong> testimonies. Click cards to select, then project or download.</p>}
    </div>
  )
}

export function TestimonyQR() {
  return <QRCodePage eyebrow="Testimonies" title="Testimony QR code" subtitle="Members scan this to submit their testimony. Submissions can be anonymous." path="/testimony" fileName="envoys-testimony-qr.png" color="#8a5a10" label="Testimony URL" />
}

export function PublicTestimonyPage() {
  const [form, setForm] = useState({ name: "", category: "General Testimony", testimony: "" })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (key: string) => (e: any) => setForm((f) => ({ ...f, [key]: e.target ? e.target.value : e }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.testimony.trim()) { setErr("Please share your testimony."); return }
    setLoading(true); setErr("")
    try {
      await sb("public_testimonies", { method: "POST", body: JSON.stringify({ name: form.name.trim() || null, category: form.category || "General Testimony", testimony: form.testimony.trim() }) })
      setDone(true)
    } catch (e: any) { setErr(e.message) }
    setLoading(false)
  }
  if (done) return <ThankYou tone="gold" title="Testimony received!">Thank you for sharing what God has done! Your testimony is an encouragement to the whole body.</ThankYou>
  return (
    <PublicShell title="Share your" accent="testimony" subtitle="Tell us what God has done! You may submit anonymously." width="max-w-lg">
      <Panel>
        {CREDS_MISSING && <Notice type="error" msg="Supabase credentials are not configured." />}
        <Notice type="error" msg={err} onClose={() => setErr("")} />
        <form onSubmit={submit} noValidate>
          <FieldInput label="Your name" value={form.name} onChange={set("name")} placeholder="Optional — leave blank to stay anonymous" />
          <FieldInput label="Testimony category" type="select" required value={form.category} onChange={set("category")} options={TESTIMONY_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          <FieldInput label="Your testimony" type="textarea" rows={6} required value={form.testimony} onChange={set("testimony")} placeholder="Share what God has done in your life" />
          <Button type="submit" variant="gold" size="lg" className="w-full" disabled={loading}>{loading && <Spinner />}{loading ? "Submitting…" : "Share my testimony"}</Button>
        </form>
      </Panel>
    </PublicShell>
  )
}
