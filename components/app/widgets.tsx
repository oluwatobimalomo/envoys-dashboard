"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Calendar, CheckCircle2, Clock, Gift, MessageCircle, Phone, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PersonAvatar, PhoneLink, ToneBadge } from "@/components/app/kit"
import { sb } from "@/lib/supabase"
import {
  birthdayWhatsAppLink, fetchBirthdayWishesSet, logBirthdayWish, nextBirthdayInfo, phoneKey, todayISO,
} from "@/lib/format"
import { cn } from "@/lib/utils"

// ── Birthdays ──────────────────────────────────────────────────────────────
function BirthdayCard({ upcoming, daysAhead, wishedSet, onWish }: { upcoming: any[]; daysAhead: number; wishedSet: Set<string>; onWish: (p: any, link: string) => void }) {
  return (
    <section aria-label="Birthdays this week" className="rounded-lg border border-gold/30 bg-gold-tint p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-sm bg-gold text-on-gold"><Gift className="size-4" aria-hidden /></span>
        <h2 className="font-display text-[15px] font-bold text-gold-ink">Birthdays this week</h2>
        {upcoming.length > 0 && <span className="rounded-full bg-card px-2 text-xs font-bold text-gold-ink tabular">{upcoming.length}</span>}
        {upcoming.length === 0 && <span className="ml-auto text-xs text-muted-foreground">None in the next {daysAhead} days</span>}
      </div>
      {upcoming.length > 0 && (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-thin">
          {upcoming.map((p) => {
            const isToday = p.daysUntil === 0
            const waLink = birthdayWhatsAppLink(p.full_name, p.phone)
            const key = phoneKey(p.phone)
            const wished = key && wishedSet.has(key)
            return (
              <article key={p.id} className={cn("flex w-56 shrink-0 snap-start flex-col gap-2 rounded-md border bg-card p-3 shadow-xs", isToday && "border-gold ring-1 ring-gold/40")}>
                <div className="flex items-center gap-2.5">
                  <PersonAvatar name={p.full_name} size={34} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{p.full_name}</div>
                    <div className="text-[11.5px] text-gold-ink">{isToday ? `Today · turns ${p.turning}` : `${p.dateLabel} · turns ${p.turning}`}</div>
                  </div>
                </div>
                <div className="text-xs"><PhoneLink phone={p.phone} /></div>
                {waLink &&
                  (wished ? (
                    <ToneBadge tone="brand" icon={CheckCircle2}>Wished</ToneBadge>
                  ) : (
                    <Button size="xs" variant="gold" className="self-start" onClick={() => onWish(p, waLink)}>
                      <MessageCircle />Send wishes
                    </Button>
                  ))}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function useWishes() {
  const currentYear = new Date().getFullYear()
  const [wishedSet, setWishedSet] = useState<Set<string>>(new Set())
  useEffect(() => {
    let cancelled = false
    fetchBirthdayWishesSet(currentYear).then((s) => !cancelled && setWishedSet(s))
    return () => { cancelled = true }
  }, [currentYear])
  const onWish = (p: any, link: string) => {
    window.open(link, "_blank", "noreferrer")
    const key = phoneKey(p.phone)
    if (key) {
      setWishedSet((prev) => new Set(prev).add(key))
      logBirthdayWish(p.phone, currentYear).catch(() => {})
    }
  }
  return { wishedSet, setWishedSet, onWish }
}

const upcomingFrom = (rows: any[], daysAhead: number) =>
  (rows || [])
    .map((r) => {
      const info = nextBirthdayInfo(r.dob)
      return info && info.daysUntil < daysAhead ? { ...r, ...info } : null
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.daysUntil - b.daysUntil || (a.full_name || "").localeCompare(b.full_name || ""))

export function BirthdaysWidget({ daysAhead = 7, showEmpty = true }: { daysAhead?: number; showEmpty?: boolean }) {
  const [people, setPeople] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { wishedSet, onWish } = useWishes()
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [ftRows, cmRows] = await Promise.all([
          sb("first_timers?select=id,full_name,phone,dob&dob=not.is.null&limit=2000").catch(() => []),
          sb("church_members?select=id,full_name,phone,dob&dob=not.is.null&limit=3000").catch(() => []),
        ])
        if (cancelled) return
        const seen = new Set<string>()
        const rows: any[] = []
        const take = (list: any[], prefix: string) =>
          (list || []).forEach((r) => {
            const k = phoneKey(r.phone) || `${prefix}-${r.id}`
            if (!seen.has(k)) { seen.add(k); rows.push({ ...r, id: `${prefix}-${r.id}` }) }
          })
        take(cmRows, "cm")
        take(ftRows, "ft")
        setPeople(upcomingFrom(rows, daysAhead))
      } catch { if (!cancelled) setPeople([]) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [daysAhead])
  if (loading) return null
  if (people.length === 0 && !showEmpty) return null
  return <BirthdayCard upcoming={people} daysAhead={daysAhead} wishedSet={wishedSet} onWish={onWish} />
}

export function BirthdaysFromList({ people, daysAhead = 7, showEmpty = true }: { people: any[]; daysAhead?: number; showEmpty?: boolean }) {
  const { wishedSet, onWish } = useWishes()
  const upcoming = upcomingFrom(people, daysAhead)
  if (upcoming.length === 0 && !showEmpty) return null
  return <BirthdayCard upcoming={upcoming} daysAhead={daysAhead} wishedSet={wishedSet} onWish={onWish} />
}

// ── Follow-ups due ─────────────────────────────────────────────────────────
export function DueTodayPanel({ entries, actionLabel = "Log call", actionIcon: ActionIcon = Phone, onAction }: {
  entries: { id: any; row: any; name: string; phone: any; dueDate: string; note?: string }[]
  actionLabel?: string; actionIcon?: LucideIcon; onAction: (row: any) => void
}) {
  if (!entries?.length) return null
  const todayStr = todayISO()
  const overdueCount = entries.filter((e) => e.dueDate < todayStr).length
  const todayCount = entries.length - overdueCount
  return (
    <section aria-label="Follow-ups due" className="mb-6 rounded-lg border border-warning/30 bg-warning-tint p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-sm bg-card text-warning"><Clock className="size-4" aria-hidden /></span>
        <h2 className="font-display text-[15px] font-bold text-warning">Follow-ups due</h2>
        {overdueCount > 0 && <ToneBadge tone="danger" icon={AlertCircle}>{overdueCount} overdue</ToneBadge>}
        {todayCount > 0 && <ToneBadge tone="warning" icon={Calendar} className="bg-card">{todayCount} due today</ToneBadge>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((e) => {
          const isOverdue = e.dueDate < todayStr
          const days = isOverdue ? Math.max(1, Math.floor((Date.now() - new Date(e.dueDate).getTime()) / 86400000)) : 0
          return (
            <div key={e.id} className={cn("flex flex-col gap-2 rounded-md border bg-card p-3", isOverdue ? "border-danger/40" : "border-warning/40")}>
              <div className="flex items-center gap-2.5">
                <PersonAvatar name={e.name} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">{e.name}</div>
                  <div className="text-xs"><PhoneLink phone={e.phone} /></div>
                </div>
                <ToneBadge tone={isOverdue ? "danger" : "warning"}>{isOverdue ? `${days}d overdue` : "Due today"}</ToneBadge>
              </div>
              {e.note && <p className="line-clamp-2 text-xs text-muted-foreground">{e.note}</p>}
              <Button size="xs" className="self-start" onClick={() => onAction(e.row)}><ActionIcon />{actionLabel}</Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
