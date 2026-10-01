"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, MessageCircle, RefreshCw, UserCheck, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  EmptyState, Notice, PageHeader, PersonAvatar, PhoneLink, SearchInput, Segmented, SkeletonBoard, StatCard, StatGrid, ToneBadge, Toolbar,
} from "@/components/app/kit"
import { DateRangeBar } from "@/components/app/shared"
import { useSession } from "@/components/app/session"
import { sb } from "@/lib/supabase"
import { fmtDate, normalizePhone, firstName } from "@/lib/format"
import { useInfiniteReveal, useRoleUsers } from "@/lib/hooks"
import { cn } from "@/lib/utils"

const VIP_WHATSAPP_TEMPLATE = (first: string, teamFirst: string) =>
  `Dearly beloved ${first},

On behalf of our lead pastor, Pastor Daniel Olawande and the entire RCCG The Envoys family, we sincerely thank you for worshipping with us on Sunday.

It is not by chance that you came. God ordered your feet here, and we are so glad you obeyed His call to worship with us at The Home of Supernatural Upgrades.

We seam our faith with yours, trusting God for a manifestation of the prophetic words you have received and praying for divine encounters for you and your household.
Our Experience Team will call to check up on you this week.

We can't wait to welcome you to church next Sunday.
The Lord bless you!

I honour you and you're super amazing!
...${teamFirst} from the EnvoysByte Team`

function vipWhatsAppLink(fullName: string, phone: string, assignedTo?: string, currentUser?: string) {
  const tel = normalizePhone(phone)
  if (!tel) return null
  const msg = VIP_WHATSAPP_TEMPLATE(firstName(fullName), firstName(assignedTo || currentUser) || "our team")
  return `https://api.whatsapp.com/send?phone=${tel.replace("+", "")}&text=${encodeURIComponent(msg)}`
}

function useVipMessageData(dateFrom: string, dateTo: string) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setErr("")
      try {
        let q = "first_timers?is_active=eq.true&order=created_at.desc&limit=500"
        if (dateFrom) q += `&service_date=gte.${dateFrom}`
        if (dateTo) q += `&service_date=lte.${dateTo}`
        const [ftRows, vmRows] = await Promise.all([sb(q), sb("vip_message_assignments?select=*").catch(() => [])])
        const vmMap: Record<string, any> = {}
        ;(vmRows || []).forEach((v: any) => (vmMap[v.first_timer_id] = v))
        if (!cancelled) setData((ftRows || []).map((r: any) => ({ ...r, vip: vmMap[r.id] || null })))
      } catch (e: any) { if (!cancelled) setErr(e.message) }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tick, dateFrom, dateTo])
  return { data, loading, err, reload }
}

/** Inline "assign to" control: shows the assignee chip, or a select + save. */
export function AssignControl({ current, options, loading, onSave, saving, placeholder = "Select caller", tone = "info" }: {
  current?: string | null; options: { value: string; label: string }[]; loading?: boolean; onSave: (v: string) => Promise<void> | void; saving?: boolean; placeholder?: string; tone?: "info" | "soul" | "brand"
}) {
  const [pending, setPending] = useState<string | null>(null)
  if (current && pending === null)
    return (
      <button onClick={() => setPending(current)} title="Change who's assigned" className="rounded-full">
        <ToneBadge tone={tone} icon={UserCheck}>{current}</ToneBadge>
      </button>
    )
  if (loading) return <span className="text-xs text-muted-foreground">Loading…</span>
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={pending ?? ""}
        onChange={(e) => setPending(e.target.value)}
        aria-label={placeholder}
        className="h-8 w-40 rounded-sm border border-input bg-card px-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {pending && pending !== current && (
        <Button size="sm" disabled={saving} onClick={async () => { await onSave(pending); setPending(null) }}>{saving ? "…" : "Save"}</Button>
      )}
      {pending !== null && (
        <Button size="icon-sm" variant="ghost" aria-label="Cancel" onClick={() => setPending(null)}><X /></Button>
      )}
    </div>
  )
}

export function VipContactView() {
  const { user: currentUser } = useSession()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const { data, loading, err, reload } = useVipMessageData(dateFrom, dateTo)
  const { options: teamOptions, loading: teamLoading } = useRoleUsers("expteam")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("unassigned")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")
  const [msgType, setMsgType] = useState<"success" | "error" | "warn">("success")

  const filtered = data.filter((r) => {
    const m = !search || r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
    if (filter === "unassigned") return m && !r.vip?.assigned_to
    if (filter === "assigned") return m && !!r.vip?.assigned_to
    if (filter === "messaged") return m && !!r.vip?.messaged
    if (filter === "notmessaged") return m && !r.vip?.messaged
    return m
  })
  const { count, sentinel, hasMore } = useInfiniteReveal(`${search}|${filter}|${dateFrom}|${dateTo}`, filtered.length, 24)

  const assignedCount = data.filter((r) => !!r.vip?.assigned_to).length
  const messagedCount = data.filter((r) => !!r.vip?.messaged).length
  const notMessagedCount = data.length - messagedCount

  const saveAssignment = async (ftId: any, member: string) => {
    setSaving(true)
    try {
      const existing = data.find((r) => r.id === ftId)?.vip
      if (existing) await sb(`vip_message_assignments?id=eq.${existing.id}`, { method: "PATCH", body: JSON.stringify({ assigned_to: member, assigned_by: currentUser }) })
      else await sb("vip_message_assignments", { method: "POST", body: JSON.stringify({ first_timer_id: ftId, assigned_to: member, assigned_by: currentUser }) })
      setMsg(`Assigned to ${member}.`); setMsgType("success"); reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  const setMessaged = async (r: any, newVal: boolean) => {
    setSaving(true)
    try {
      const now = new Date().toISOString()
      if (r.vip)
        await sb(`vip_message_assignments?id=eq.${r.vip.id}`, {
          method: "PATCH",
          body: JSON.stringify({ messaged: newVal, messaged_by: newVal ? currentUser : r.vip.messaged_by, messaged_at: newVal ? now : r.vip.messaged_at }),
        })
      else
        await sb("vip_message_assignments", {
          method: "POST",
          body: JSON.stringify({ first_timer_id: r.id, messaged: newVal, messaged_by: newVal ? currentUser : null, messaged_at: newVal ? now : null }),
        })
      reload()
    } catch (e: any) { setMsg(e.message); setMsgType("error") }
    setSaving(false)
  }

  const sendWhatsApp = (r: any) => {
    const link = vipWhatsAppLink(r.full_name, r.phone, r.vip?.assigned_to, currentUser)
    if (!link) { setMsg("This VIP has no valid phone number to message."); setMsgType("warn"); return }
    window.open(link, "_blank")
    if (!r.vip?.messaged) setMessaged(r, true)
  }

  return (
    <div className="animate-page-in">
      <PageHeader eyebrow="First-Timers" title="VIP contact" subtitle="Send a personal WhatsApp welcome message to every first-timer." />
      <DateRangeBar label="Service date" dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} />
      <StatGrid>
        <StatCard label="Total VIPs" value={data.length} icon={Users} tone="brand" />
        <StatCard label="Assigned" value={assignedCount} icon={UserCheck} tone="info" />
        <StatCard label="Messaged" value={messagedCount} icon={MessageCircle} tone="brand" sub={data.length > 0 ? `${Math.round((messagedCount / data.length) * 100)}% contacted` : ""} />
        <StatCard label="Not messaged" value={notMessagedCount} icon={AlertCircle} tone="warning" sub={notMessagedCount > 0 ? "Needs a message" : "All caught up"} />
      </StatGrid>
      <Notice type={msgType} msg={msg} onClose={() => setMsg("")} />
      <Toolbar>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "unassigned", label: "Unassigned", count: data.length - assignedCount },
            { value: "assigned", label: "Assigned", count: assignedCount },
            { value: "messaged", label: "Messaged", count: messagedCount },
            { value: "notmessaged", label: "Not messaged", count: notMessagedCount },
            { value: "all", label: "All", count: data.length },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} className="sm:w-56" />
          <Button variant="outline" size="icon" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </div>
      </Toolbar>

      {loading ? <SkeletonBoard /> : err ? <Notice type="error" msg={err} /> : filtered.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No contacts in this category" />
      ) : (
        <div className="masonry">
          {filtered.slice(0, count).map((r) => {
            const isMessaged = !!r.vip?.messaged
            return (
              <article key={r.id} className={cn("rounded-lg border bg-card p-4 shadow-xs", isMessaged && "border-primary/30")}>
                <div className="mb-3 flex items-start gap-2.5">
                  <PersonAvatar name={r.full_name} size={38} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14px] font-semibold">{r.full_name}</h3>
                    <div className="text-xs text-muted-foreground">First visit {fmtDate(r.service_date)}</div>
                  </div>
                  <ToneBadge tone={isMessaged ? "brand" : "warning"} dot>{isMessaged ? "Messaged" : "Not messaged"}</ToneBadge>
                </div>
                <div className="mb-3 text-xs"><PhoneLink phone={r.phone} /></div>
                {r.vip?.messaged_at && (
                  <p className="mb-3 flex items-center gap-1 text-[11.5px] text-primary">
                    <CheckCircle2 className="size-3" />Messaged {fmtDate(r.vip.messaged_at)}{r.vip.messaged_by ? ` by ${r.vip.messaged_by}` : ""}
                  </p>
                )}
                <div className="mb-3">
                  <AssignControl current={r.vip?.assigned_to} options={teamOptions} loading={teamLoading} saving={saving} onSave={(v) => saveAssignment(r.id, v)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <Button size="sm" className="bg-[#25D366] text-[#05290f] hover:bg-[#1fbe5a]" onClick={() => sendWhatsApp(r)} disabled={saving}>
                    <MessageCircle />Send WhatsApp
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMessaged(r, !isMessaged)} disabled={saving}>
                    {isMessaged ? "Mark not messaged" : "Mark messaged"}
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {!loading && hasMore && <div ref={sentinel} className="h-10" />}
      {!loading && filtered.length > 0 && <p className="mt-4 text-right text-xs text-muted-foreground">Showing <strong>{Math.min(count, filtered.length)}</strong> of <strong>{filtered.length}</strong> VIPs</p>}
    </div>
  )
}
