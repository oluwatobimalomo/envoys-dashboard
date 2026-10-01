import type { Tone } from "@/lib/nav"
import { sb } from "@/lib/supabase"

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function normalizePhone(raw: any) {
  if (!raw) return null
  const p = String(raw).replace(/[^\d+]/g, "")
  if (!p || p.replace(/\D/g, "").length < 7) return null
  if (p.startsWith("+")) return p
  if (p.startsWith("234")) return `+${p}`
  if (p.startsWith("0") && p.length === 11) return `+234${p.slice(1)}`
  return p
}

export function phoneKey(raw: any) {
  let d = String(raw || "").replace(/\D/g, "")
  if (d.startsWith("234")) d = d.slice(3)
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1)
  return d.length >= 7 ? d.slice(-10) : ""
}

export function parseAreas(raw: any): string[] {
  if (Array.isArray(raw)) return raw
  if (!raw) return []
  try {
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

export function daysSince(dateStr: any) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function fmtDate(d: any, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "—"
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString("en-GB", opts)
}

export function firstName(name: any) {
  return String(name || "").trim().split(/\s+/)[0] || ""
}

// ── Call status (VIP pipeline) ──
export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  Reached: { label: "Reached", tone: "brand" },
  "Call Back": { label: "Call Back", tone: "warning" },
  "Incorrect Contact": { label: "Incorrect Contact", tone: "danger" },
}
export const CALL_STATUS_OPTIONS = [
  { value: "Reached", label: "Reached: spoke with the VIP" },
  { value: "Not Reached", label: "Not Reached: did not answer" },
  { value: "Callback Requested", label: "Callback Requested by VIP" },
  { value: "Wrong Number", label: "Wrong Number/Invalid" },
]
export function normaliseStatus(raw: any) {
  if (!raw) return null
  if (raw === "Reached") return "Reached"
  if (raw === "Wrong Number") return "Incorrect Contact"
  return "Call Back"
}
export function statusMeta(raw: any): { label: string; tone: Tone } {
  const norm = normaliseStatus(raw) || raw
  return STATUS_META[norm] || { label: norm, tone: "muted" }
}

// ── Birthdays ──
const isLeapYear = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
export function nextBirthdayInfo(dob: any) {
  if (!dob) return null
  const [y, m, d] = String(dob).slice(0, 10).split("-").map(Number)
  if (!y || !m || !d) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const occurrence = (yr: number) => new Date(yr, m - 1, m === 2 && d === 29 && !isLeapYear(yr) ? 28 : d)
  let next = occurrence(today.getFullYear())
  if (next < today) next = occurrence(today.getFullYear() + 1)
  return {
    daysUntil: Math.round((next.getTime() - today.getTime()) / 86400000),
    turning: next.getFullYear() - y,
    dateLabel: next.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
  }
}

export const BIRTHDAY_MESSAGE = (first: string) =>
  `Happy Birthday${first ? `, ${first}` : ""}!

"This is the day the LORD has made; we will rejoice and be glad in it." — Psalm 118:24

May the Lord bless you and keep you; may He make His face shine upon you and be gracious to you; may He lift up His countenance upon you and give you peace (Numbers 6:24–26). May this new year of your life overflow with God's goodness, favour and joy.

We thank God for the gift that you are... with love from all of us at RCCG The Envoys.`

export function birthdayWhatsAppLink(name: any, phone: any) {
  const tel = normalizePhone(phone)
  if (!tel) return null
  return `https://api.whatsapp.com/send?phone=${tel.replace("+", "")}&text=${encodeURIComponent(BIRTHDAY_MESSAGE(firstName(name)))}`
}

export async function fetchBirthdayWishesSet(year: number) {
  const rows = await sb(`birthday_wishes?wish_year=eq.${year}&select=phone_key`).catch(() => [])
  return new Set<string>((rows || []).map((r: any) => r.phone_key))
}

export async function logBirthdayWish(phone: any, year: number, wishedBy?: string) {
  const key = phoneKey(phone)
  if (!key) return
  await sb("birthday_wishes", {
    method: "POST",
    body: JSON.stringify({ phone_key: key, wish_year: year, wished_by: wishedBy || null }),
  }).catch(() => {})
}

// ── CSV ──
export function parseCSVText(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n") { row.push(field); field = ""; rows.push(row); row = [] }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ""))
  if (nonEmpty.length < 2) return []
  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase())
  return nonEmpty.slice(1).map((vals) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => (obj[h] = (vals[i] ?? "").trim()))
    return obj
  })
}

export function downloadBlob(filename: string, content: string, type = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCSVTemplate(filename: string, headers: string[], example: string[]) {
  downloadBlob(filename, [headers.join(","), example.join(",")].join("\r\n"))
}

export const csvCell = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function generatePresentationSlug() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"
  let s = ""
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function genericSort<T>(rows: T[], getter: (r: T) => any, dir: "asc" | "desc") {
  const withVal = rows.map((r) => ({ r, v: getter(r) }))
  withVal.sort((a, b) => {
    const av = a.v, bv = b.v
    if (av === null || av === undefined || av === "") return 1
    if (bv === null || bv === undefined || bv === "") return -1
    if (av < bv) return dir === "asc" ? -1 : 1
    if (av > bv) return dir === "asc" ? 1 : -1
    return 0
  })
  return withVal.map((x) => x.r)
}

// ── Soul Care call statuses ──
export const SC_STATUS_TONE: Record<string, Tone> = {
  Reached: "brand",
  "No Answer": "warning",
  "Call Back Requested": "info",
  "Wrong Number": "danger",
}
