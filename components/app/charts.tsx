"use client"

import * as React from "react"
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts"
import { BarChart2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Categorical order, fixed (never cycled past 6 — fold extras into "Other"). */
export const CHART = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"]
/** Reserved status colours — always shipped with a label. */
export const STATUS_COLOR = { good: "var(--primary)", warning: "var(--gold)", critical: "var(--danger)", info: "var(--info)", soul: "var(--soul)", muted: "var(--muted-foreground)" }

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" }
const tooltipStyle: React.CSSProperties = {
  borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)",
  fontSize: 12, boxShadow: "var(--shadow-sm)", padding: "8px 10px",
}

export function ChartCard({ title, subtitle, action, children, className }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card p-5 shadow-xs sm:p-6", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function ChartEmpty({ label = "No data yet", height = 200 }: { label?: string; height?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground" style={{ height }}>
      <BarChart2 className="size-5 opacity-40" aria-hidden />
      <span className="text-xs">{label}</span>
    </div>
  )
}

type Datum = { name: string; value: number; color?: string }

export function Donut({ data, centerLabel, centerValue, height = 220 }: { data: Datum[]; centerLabel?: React.ReactNode; centerValue?: React.ReactNode; height?: number }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  if (!total) return <ChartEmpty height={height} />
  return (
    <div>
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="var(--card)" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={d.color || CHART[i % CHART.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [`${v} (${Math.round((v / total) * 100)}%)`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-2xl leading-none font-extrabold tabular">{centerValue ?? total}</div>
          {centerLabel && <div className="mt-1 max-w-28 text-center text-[11px] text-muted-foreground">{centerLabel}</div>}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-1.5 text-xs text-ink-secondary">
            <span className="size-2.5 rounded-[3px]" style={{ background: d.color || CHART[i % CHART.length] }} aria-hidden />
            {d.name} <strong className="text-foreground tabular">{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BarRow({ label, value, sub, max, color }: { label: React.ReactNode; value: number; sub?: React.ReactNode; max: number; color?: string }) {
  const pct = Math.round((value / (max || 1)) * 100)
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
        <span className="truncate font-semibold text-ink-secondary">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular">{sub ?? value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max || 1}>
        <div className="h-2 rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color || "var(--primary)" }} />
      </div>
    </div>
  )
}

export function VBars({ data, height = 220, valueLabel = "Count" }: { data: Datum[]; height?: number; valueLabel?: string }) {
  if (!data.length || !data.some((d) => d.value)) return <ChartEmpty height={height} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={axisTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} interval={0} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v: any) => [v, valueLabel]} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color || CHART[0]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HBars({ data, height, valueLabel = "Count" }: { data: Datum[]; height?: number; valueLabel?: string }) {
  if (!data.length || !data.some((d) => d.value)) return <ChartEmpty />
  const h = height || Math.max(160, data.length * 34)
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axisTick} axisLine={false} tickLine={false} width={130} />
        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v: any) => [v, valueLabel]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color || CHART[0]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Stacked areas over time. series: [{ key, color }] */
export function StackedArea({ rows, xKey, series, height = 260, empty = "No data in this range" }: { rows: any[]; xKey: string; series: { key: string; color: string; label?: string }[]; height?: number; empty?: string }) {
  if (!rows.length) return <ChartEmpty label={empty} height={height} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border-strong)" }} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} stackId="1" stroke={s.color} fill={s.color} fillOpacity={0.18} strokeWidth={2} isAnimationActive={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function Lines({ rows, xKey, series, height = 240 }: { rows: any[]; xKey: string; series: { key: string; color: string; label?: string }[]; height?: number }) {
  if (!rows.length) return <ChartEmpty height={height} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={rows} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border-strong)" }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />}
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label || s.key} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Grouped/stacked bars with several series. */
export function MultiBars({ rows, xKey, series, height = 240, stacked = false }: { rows: any[]; xKey: string; series: { key: string; color: string; label?: string }[]; height?: number; stacked?: boolean }) {
  if (!rows.length) return <ChartEmpty height={height} />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={xKey} tick={axisTick} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label || s.key} fill={s.color} stackId={stacked ? "s" : undefined} radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Written period summary, shown under dashboards. */
export function SummaryPanel({ title = "Period summary", children, action }: { title?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gold/30 bg-gold-tint p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex-1 font-display text-[15px] font-bold text-gold-ink">{title}</h3>
        {action}
      </div>
      <div className="rounded-md bg-card px-4 py-3.5 text-[14px] leading-7 whitespace-pre-line text-foreground">{children}</div>
    </section>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="eyebrow mb-3 mt-2">{children}</h2>
}
