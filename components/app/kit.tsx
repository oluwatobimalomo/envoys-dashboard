"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  AlertCircle, CheckCircle2, Info, MessageCircle, Phone, Search, X, LayoutGrid, Rows3,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tone } from "@/lib/nav"
import { normalizePhone } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// ── Tone helpers ───────────────────────────────────────────────────────────
export const TONE_TEXT: Record<Tone, string> = {
  brand: "text-primary", gold: "text-gold-ink", soul: "text-soul", research: "text-research",
  info: "text-info", warning: "text-warning", danger: "text-danger", muted: "text-muted-foreground",
}
export const TONE_WELL: Record<Tone, string> = {
  brand: "bg-brand-tint text-primary", gold: "bg-gold-tint text-gold-ink", soul: "bg-soul-tint text-soul",
  research: "bg-research-tint text-research", info: "bg-info-tint text-info", warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger", muted: "bg-muted text-ink-secondary",
}
export const TONE_FILL: Record<Tone, string> = {
  brand: "bg-primary", gold: "bg-gold", soul: "bg-soul", research: "bg-research",
  info: "bg-info", warning: "bg-warning", danger: "bg-danger", muted: "bg-muted-foreground",
}
export const TONE_VAR: Record<Tone, string> = {
  brand: "var(--primary)", gold: "var(--gold)", soul: "var(--soul)", research: "var(--research)",
  info: "var(--info)", warning: "var(--warning)", danger: "var(--danger)", muted: "var(--muted-foreground)",
}

export function ToneBadge({ tone = "muted", children, className, dot = false, icon: Icon }: {
  tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean; icon?: LucideIcon
}) {
  return (
    <Badge variant={tone} className={className}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {Icon && <Icon aria-hidden />}
      {children}
    </Badge>
  )
}

// ── Surfaces ───────────────────────────────────────────────────────────────
export function Panel({ className, interactive, ...props }: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 text-card-foreground shadow-xs sm:p-6",
        interactive && "cursor-pointer transition-[translate,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        className,
      )}
      {...props}
    />
  )
}

export function PageHeader({ title, subtitle, action, eyebrow, className }: {
  title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; eyebrow?: React.ReactNode; className?: string
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8", className)}>
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h1 className="font-display text-[26px] leading-[32px] font-extrabold tracking-[-0.015em] sm:text-[28px] sm:leading-[34px]">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </header>
  )
}

export function SH({ title, icon: Icon, action, className }: { title: React.ReactNode; icon?: LucideIcon; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-center gap-2", className)}>
      {Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />}
      <h2 className="flex-1 font-display text-[17px] leading-6 font-bold">{title}</h2>
      {action}
    </div>
  )
}

// ── Numbers ────────────────────────────────────────────────────────────────
export function CountUp({ value, duration = 650 }: { value: any; duration?: number }) {
  const isPct = typeof value === "string" && /^\d+%$/.test(value)
  const target = typeof value === "number" ? value : isPct ? parseInt(value, 10) : null
  const [n, setN] = useState(0)
  useEffect(() => {
    if (target === null) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(target); return }
    let raf = 0, start = 0
    const step = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  if (target === null) return <>{value ?? "—"}</>
  return <>{n.toLocaleString()}{isPct ? "%" : ""}</>
}

export function StatCard({ label, value, icon: Icon, tone = "brand", sub, onClick, className }: {
  label: React.ReactNode; value: any; icon?: LucideIcon; tone?: Tone; sub?: React.ReactNode; onClick?: () => void; className?: string
}) {
  const Comp: any = onClick ? "button" : "div"
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3.5 rounded-md border bg-card p-4 text-left shadow-xs sm:p-5",
        onClick && "cursor-pointer transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {Icon && (
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-md", TONE_WELL[tone])}>
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="eyebrow block truncate">{label}</span>
        <span className="mt-0.5 block font-display text-[28px] leading-8 font-extrabold tracking-[-0.02em] tabular sm:text-[30px]">
          <CountUp value={value} />
        </span>
        {sub && <span className={cn("mt-0.5 block text-xs", TONE_TEXT[tone])}>{sub}</span>}
      </span>
    </Comp>
  )
}

export function StatGrid({ children, className, cols = 4 }: { children: React.ReactNode; className?: string; cols?: 2 | 3 | 4 | 5 }) {
  const map = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-3 lg:grid-cols-5" }
  return <div className={cn("mb-6 grid grid-cols-2 gap-3 sm:gap-4", map[cols], className)}>{children}</div>
}

// ── Feedback ───────────────────────────────────────────────────────────────
export function Notice({ type = "success", msg, onClose, className }: {
  type?: "error" | "warn" | "success" | "info"; msg?: React.ReactNode; onClose?: () => void; className?: string
}) {
  if (!msg) return null
  const meta = {
    error: { cls: "bg-danger-tint text-danger border-danger/25", Icon: AlertCircle },
    warn: { cls: "bg-warning-tint text-warning border-warning/25", Icon: AlertCircle },
    success: { cls: "bg-brand-tint text-primary-strong border-primary/25", Icon: CheckCircle2 },
    info: { cls: "bg-info-tint text-info border-info/25", Icon: Info },
  }[type]
  return (
    <div role={type === "error" ? "alert" : "status"} className={cn("mb-4 flex items-start gap-2.5 rounded-sm border px-3.5 py-2.5 text-[13px]", meta.cls, className)}>
      <meta.Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="flex-1 leading-relaxed">{msg}</div>
      {onClose && (
        <button onClick={onClose} aria-label="Dismiss" className="-m-1 rounded-sm p-1 opacity-70 hover:opacity-100">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon = Search, title, description, action, className }: {
  icon?: LucideIcon; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/50 px-6 py-14 text-center", className)}>
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="font-display text-base font-bold">{title}</div>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Skeletons ──────────────────────────────────────────────────────────────
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <Skeleton className="size-9 shrink-0 rounded-full" />
      <div className="flex-1">
        <Skeleton className="mb-2 h-3.5 w-2/5 max-w-56" />
        <Skeleton className="h-2.5 w-2/3 max-w-80" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  )
}
export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return <div className="grid gap-2">{Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}</div>
}
export function SkeletonBoard({ cards = 9 }: { cards?: number }) {
  const heights = [140, 190, 160, 220, 150, 180, 200, 140, 170, 210, 150, 190]
  return (
    <div className="masonry">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1"><Skeleton className="mb-1.5 h-3 w-2/3" /><Skeleton className="h-2.5 w-1/3" /></div>
          </div>
          <Skeleton style={{ height: heights[i % heights.length] - 80 }} className="w-full" />
        </div>
      ))}
    </div>
  )
}
export function SkeletonStat() {
  return (
    <div className="flex items-start gap-3.5 rounded-md border bg-card p-5">
      <Skeleton className="size-10 rounded-md" />
      <div className="flex-1"><Skeleton className="mb-2 h-2.5 w-1/2" /><Skeleton className="h-7 w-16" /></div>
    </div>
  )
}
export function SkeletonReport() {
  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <SkeletonStat key={i} />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6"><Skeleton className="mb-4 h-3 w-1/3" /><Skeleton className="h-52 w-full" /></div>
        ))}
      </div>
    </div>
  )
}

// ── People ─────────────────────────────────────────────────────────────────
const AVATAR_TONES = [
  "bg-brand-tint text-primary-strong", "bg-gold-tint text-gold-ink", "bg-research-tint text-research",
  "bg-soul-tint text-soul", "bg-info-tint text-info", "bg-danger-tint text-danger", "bg-warning-tint text-warning",
]
export function avatarTone(name: any) {
  const s = (name || "?").toString()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}
export function initials(name: any) {
  const parts = String(name || "?").trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}
export function PersonAvatar({ name, size = 36, src, className }: { name: any; size?: number; src?: string | null; className?: string }) {
  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full font-bold", avatarTone(name), className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  )
}

export function PhoneLink({ phone, withWhatsApp = false, className }: { phone: any; withWhatsApp?: boolean; className?: string; size?: number; bold?: boolean; color?: string }) {
  const tel = normalizePhone(phone)
  if (!phone) return <span className="text-muted-foreground">—</span>
  if (!tel) return <span>{phone}</span>
  return (
    <span className={cn("inline-flex items-center gap-1.5 align-middle", className)}>
      <a
        href={`tel:${tel}`}
        onClick={(e) => e.stopPropagation()}
        title={`Call ${phone}`}
        className="inline-flex items-center gap-1 font-semibold text-primary underline decoration-primary/30 decoration-dashed underline-offset-4 hover:decoration-primary"
      >
        <Phone className="size-3.5 shrink-0" aria-hidden />
        {phone}
      </a>
      {withWhatsApp && (
        <a
          href={`https://wa.me/${tel.replace("+", "")}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`WhatsApp ${phone}`}
          aria-label={`WhatsApp ${phone}`}
          className="grid size-6 place-items-center rounded-full bg-[#25D366]/15 text-[#128C4A] dark:text-[#4ade80]"
        >
          <MessageCircle className="size-3.5" />
        </a>
      )}
    </span>
  )
}

export function Logo({ size = 40, className, tile = false }: { size?: number; className?: string; tile?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <span className={cn("grid shrink-0 place-items-center rounded-full bg-primary font-display font-extrabold text-primary-foreground", className)} style={{ width: size, height: size, fontSize: size * 0.42 }}>
        E
      </span>
    )
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden", tile && "rounded-md bg-white p-0.5 ring-1 ring-black/5", className)} style={{ width: size, height: size }}>
      <Image src="/logo.png" alt="The Envoys" width={size * 2} height={size * 2} onError={() => setFailed(true)} data-no-outline className="size-full object-contain" priority />
    </span>
  )
}

// ── Form field (legacy-compatible API) ─────────────────────────────────────
type Opt = { value: string; label: string }
export function FieldInput({ label, id, type = "text", required, value, onChange, placeholder, options, hint, disabled, className, rows = 3 }: {
  label?: React.ReactNode; id?: string; type?: string; required?: boolean; value: any; onChange: (e: any) => void
  placeholder?: string; options?: Opt[]; hint?: React.ReactNode; disabled?: boolean; className?: string; rows?: number
}) {
  const autoId = React.useId()
  const fid = id || autoId
  const labelEl = label && (
    <Label htmlFor={fid} className="text-[13px] font-semibold text-ink-secondary">
      {label}
      {required && <span className="text-danger" aria-hidden> *</span>}
    </Label>
  )
  const hintEl = hint && <p className="text-xs text-muted-foreground">{hint}</p>

  if (type === "toggle" || type === "bool-toggle") {
    const flag = type === "toggle"
    return (
      <div className={cn("mb-4 flex flex-col gap-1", className)}>
        <div className="flex items-center gap-3">
          <Switch
            id={fid}
            checked={!!value}
            disabled={disabled}
            onCheckedChange={(v) => onChange(v)}
            className={flag ? "data-[state=checked]:bg-danger" : undefined}
          />
          <Label htmlFor={fid} className="text-[13px] font-semibold text-ink-secondary">{label}</Label>
          {flag && value && <ToneBadge tone="danger" icon={AlertCircle}>Will be flagged</ToneBadge>}
        </div>
        {hint && <p className="ml-12 text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  }

  let control: React.ReactNode
  if (type === "select") {
    control = (
      <select
        id={fid}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Select…</option>
        {(options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  } else if (type === "textarea") {
    control = <Textarea id={fid} value={value ?? ""} onChange={onChange} placeholder={placeholder} rows={rows} disabled={disabled} className="bg-card" />
  } else if (type === "multicheck") {
    const sel: string[] = Array.isArray(value) ? value : []
    control = (
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${fid}-label`}>
        {(options || []).map((o) => {
          const on = sel.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? sel.filter((x) => x !== o.value) : [...sel, o.value])}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                on ? "border-primary bg-brand-tint font-semibold text-primary-strong" : "border-border-strong bg-card text-ink-secondary hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    )
  } else {
    control = <Input id={fid} type={type} value={value ?? ""} onChange={onChange} required={required} placeholder={placeholder} disabled={disabled} className="bg-card" />
  }
  return (
    <div className={cn("mb-4 flex flex-col gap-1.5", className)}>
      {type === "multicheck" ? <span id={`${fid}-label`}>{labelEl}</span> : labelEl}
      {control}
      {hintEl}
    </div>
  )
}

// ── Toolbars ───────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative min-w-0 flex-1 sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="bg-card pl-9" />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear search" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options, className, size = "sm" }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode; count?: number }[]; className?: string; size?: "sm" | "default"
}) {
  return (
    <div role="tablist" className={cn("inline-flex max-w-full gap-0.5 overflow-x-auto rounded-sm bg-muted p-0.5 scrollbar-thin", className)}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-[6px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow]",
              size === "sm" ? "h-7 px-2.5 text-[12.5px]" : "h-8 px-3 text-[13px]",
              on ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn("rounded-full px-1.5 text-[11px] tabular", on ? "bg-brand-tint text-primary-strong" : "bg-background/60")}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function ViewToggle({ value, onChange }: { value: "board" | "table"; onChange: (v: "board" | "table") => void }) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as any)} variant="outline" size="sm" aria-label="Layout">
      <ToggleGroupItem value="board" aria-label="Board view"><LayoutGrid /></ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table view"><Rows3 /></ToggleGroupItem>
    </ToggleGroup>
  )
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-wrap items-center gap-2", className)}>{children}</div>
}

// Persisted per-viewer preference (board vs table, etc.)
export function usePersistentState<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial)
  const loaded = useRef(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) setV(JSON.parse(raw))
    } catch {}
    loaded.current = true
  }, [key])
  useEffect(() => {
    if (!loaded.current) return
    try { localStorage.setItem(key, JSON.stringify(v)) } catch {}
  }, [key, v])
  return [v, setV] as const
}

// Simple data table styling used across modules
export function DataTable({ children, className, maxHeight }: { children: React.ReactNode; className?: string; maxHeight?: number | string }) {
  return (
    <div className={cn("overflow-hidden rounded-md border bg-card shadow-xs", className)}>
      <div className="overflow-auto scrollbar-thin" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">{children}</table>
      </div>
    </div>
  )
}
export const th = "sticky top-0 z-[1] border-b bg-muted px-3 py-2.5 text-[11px] font-bold tracking-[0.06em] whitespace-nowrap text-muted-foreground uppercase"
export const td = "border-b px-3 py-2.5 align-middle"

export function Dot({ tone = "brand" }: { tone?: Tone }) {
  return <span className={cn("inline-block size-1.5 shrink-0 rounded-full", TONE_FILL[tone])} aria-hidden />
}
