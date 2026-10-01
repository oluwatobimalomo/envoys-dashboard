"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { QRCodeCanvas } from "qrcode.react"
import { AlertCircle, Calendar, Camera, ChevronDown, ChevronUp, Copy, Download, ExternalLink, Lightbulb, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { FieldInput, PageHeader, Panel } from "@/components/app/kit"
import { uploadVisitPhoto } from "@/lib/supabase"
import { cn } from "@/lib/utils"

// ── Date range ─────────────────────────────────────────────────────────────
export function DateRangeBar({ dateFrom, setDateFrom, dateTo, setDateTo, label = "Date range", children, className }: {
  dateFrom: string; setDateFrom: (v: string) => void; dateTo: string; setDateTo: (v: string) => void; label?: string; children?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2.5 shadow-xs", className)}>
      <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="mr-1 text-[13px] font-semibold text-ink-secondary">{label}</span>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        From
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[150px] bg-card" />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        To
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[150px] bg-card" />
      </label>
      {(dateFrom || dateTo) && (
        <Button variant="ghost" size="xs" onClick={() => { setDateFrom(""); setDateTo("") }}><X />Clear</Button>
      )}
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

// ── QR code page (rendered locally — no third-party QR service) ────────────
export function QRCodePage({ title, subtitle, path, fileName, color = "#1a7a3c", label = "Form URL", eyebrow }: {
  title: string; subtitle: string; path: string; fileName: string; color?: string; label?: string; eyebrow?: string
}) {
  const [liveUrl, setLiveUrl] = useState("")
  const [custom, setCustom] = useState("")
  const [display, setDisplay] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const u = window.location.origin + path
    setLiveUrl(u); setCustom(u); setDisplay(u)
  }, [path])

  const download = () => {
    const canvas = wrapRef.current?.querySelector("canvas[data-hi]") as HTMLCanvasElement | null
    if (!canvas) return
    const a = document.createElement("a")
    a.href = canvas.toDataURL("image/png")
    a.download = fileName
    a.click()
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(display); toast.success("Link copied") } catch { toast.error("Couldn't copy the link") }
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]" ref={wrapRef}>
        <Panel className="flex flex-col items-center text-center">
          <div className="rounded-md bg-white p-3 ring-1 ring-black/5">
            {display ? <QRCodeCanvas value={display} size={240} fgColor={color} bgColor="#ffffff" level="M" marginSize={1} /> : <div className="size-60" />}
          </div>
          <div className="hidden">
            {display && <QRCodeCanvas data-hi="1" value={display} size={1024} fgColor={color} bgColor="#ffffff" level="M" marginSize={2} />}
          </div>
          <div className="mt-3 max-w-60 text-[11px] break-all text-muted-foreground">{display}</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={download}><Download />Download PNG</Button>
            <Button variant="outline" size="icon" onClick={copy} aria-label="Copy link"><Copy /></Button>
            <Button variant="outline" size="icon" onClick={() => window.open(display, "_blank")} aria-label="Open link"><ExternalLink /></Button>
          </div>
        </Panel>
        <Panel>
          <h2 className="font-display text-[15px] font-bold">{label}</h2>
          <p className="mt-1 mb-4 text-[13px] text-muted-foreground">Set to your live site automatically. Change it below if the address has moved.</p>
          <FieldInput label={label} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={liveUrl} />
          <Button variant="gold" className="w-full" onClick={() => setDisplay(custom)} disabled={!custom || custom === display}>Update QR code</Button>
          <div className="mt-5 flex gap-3 rounded-md bg-brand-tint p-4 text-[13px] text-ink-secondary">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>Download the PNG and print it on a card, banner or welcome screen. Print it at least <strong>5 × 5 cm</strong> so it scans reliably.</p>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ── Photo upload ───────────────────────────────────────────────────────────
export function PhotoUpload({ value, onChange, existingUrl, label = "Visit photo" }: { value?: string; onChange: (url: string) => void; existingUrl?: string | null; label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(existingUrl || value || null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState("")
  const [over, setOver] = useState(false)

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) { setErr("Please select an image file."); return }
    if (file.size > 10 * 1024 * 1024) { setErr("Image must be under 10 MB."); return }
    setErr("")
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      onChange(await uploadVisitPhoto(file))
    } catch (e: any) {
      setErr(`Upload failed: ${e.message}`)
      setPreview(existingUrl || null)
      onChange(existingUrl || "")
    }
    setUploading(false)
  }
  const clear = () => { setPreview(null); onChange(""); if (fileRef.current) fileRef.current.value = "" }

  return (
    <div className="mb-4 flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-secondary">{label} <span className="font-normal text-muted-foreground">(optional)</span></span>
      {preview ? (
        <div className="relative w-full max-w-sm">
          <img src={preview} alt="Visit upload preview" className="h-52 w-full rounded-md object-cover" />
          {uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-brand-deep/70 text-white">
              <Spinner className="size-6" /><span className="text-xs font-semibold">Uploading…</span>
            </div>
          )}
          {!uploading && (
            <div className="mt-2 flex gap-2">
              <Button type="button" size="xs" variant="outline" onClick={() => fileRef.current?.click()}><Camera />Change photo</Button>
              <Button type="button" size="xs" variant="ghost" className="text-danger" onClick={clear}>Remove</Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onDrop={(e) => { e.preventDefault(); setOver(false); handleFile(e.dataTransfer.files[0]) }}
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onClick={() => fileRef.current?.click()}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md border-2 border-dashed px-5 py-7 text-center transition-colors",
            over ? "border-primary bg-brand-tint" : "border-border-strong bg-muted/50 hover:border-primary hover:bg-brand-tint",
          )}
        >
          <Camera className="mb-1 size-7 text-primary opacity-80" aria-hidden />
          <span className="text-[13px] font-semibold text-ink-secondary">Upload a visit photo</span>
          <span className="text-xs text-muted-foreground">Click to browse or drag and drop · JPG, PNG, HEIC · Max 10 MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      {err && <p className="flex items-center gap-1 text-xs text-danger"><AlertCircle className="size-3" />{err}</p>}
    </div>
  )
}

// ── Sortable table header ──────────────────────────────────────────────────
export function SortableHead({ label, sortKey, activeKey, dir, onSort, className }: {
  label: React.ReactNode; sortKey: string; activeKey: string; dir: "asc" | "desc"; onSort: (k: string) => void; className?: string
}) {
  const active = activeKey === sortKey
  return (
    <button onClick={() => onSort(sortKey)} className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", active && "text-foreground", className)}>
      {label}
      {active && dir === "desc" ? <ChevronDown className="size-3" /> : <ChevronUp className={cn("size-3", !active && "opacity-30")} />}
    </button>
  )
}
