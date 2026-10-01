"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Bell, CheckCircle2, Clock, Flag, Moon, RefreshCw, Search, Sun, UserPlus, FileText, Download, X } from "lucide-react"
import { useTheme } from "next-themes"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { buildNavSections, groupFor, idFromSlug, labelFor, NAV, NAV_ICONS, pathFor } from "@/lib/nav"
import { useSession } from "@/components/app/session"
import { sb } from "@/lib/supabase"
import { todayISO } from "@/lib/format"
import { cn } from "@/lib/utils"

function useNotificationData(role: string, user: string) {
  const [data, setData] = useState({ flagCount: 0, pendingCount: 0, dueCount: 0, loading: true })
  const load = useCallback(async () => {
    try {
      const todayStr = todayISO()
      const [flagged, pending, dueCalls] = await Promise.all([
        sb("call_feedback?flagged_for_pastoral=eq.true&select=id").catch(() => []),
        role === "admin" ? sb("app_users?is_pending=eq.true&select=id").catch(() => []) : Promise.resolve([]),
        user && ["expteam", "experienceadmin", "admin"].includes(role)
          ? sb(`call_feedback?caller_name=eq.${encodeURIComponent(user)}&follow_up_date=lte.${todayStr}&select=id`).catch(() => [])
          : Promise.resolve([]),
      ])
      setData({ flagCount: (flagged || []).length, pendingCount: (pending || []).length, dueCount: (dueCalls || []).length, loading: false })
    } catch {
      setData((d) => ({ ...d, loading: false }))
    }
  }, [role, user])
  useEffect(() => {
    load()
    const id = setInterval(load, 120000)
    return () => clearInterval(id)
  }, [load])
  return { ...data, reload: load }
}

function NotificationBell() {
  const { role, user } = useSession()
  const router = useRouter()
  const { flagCount, pendingCount, dueCount, loading, reload } = useNotificationData(role, user)
  const [open, setOpen] = useState(false)
  const total = flagCount + pendingCount + dueCount
  const flagTarget = (NAV[role] || []).some((n) => n.id === "flagged") ? "flagged" : null
  const dueTarget = role === "expteam" || role === "experienceadmin" ? "mycalls" : null
  const go = (id: string | null) => { if (id) { router.push(pathFor(id)); setOpen(false); reload() } }

  const items: { key: string; cls: string; icon: any; text: string; onClick: () => void }[] = []
  if (flagCount > 0 && flagTarget)
    items.push({ key: "flag", cls: "bg-danger-tint text-danger", icon: Flag, text: `${flagCount} record${flagCount !== 1 ? "s" : ""} flagged for pastoral attention`, onClick: () => go(flagTarget) })
  if (pendingCount > 0 && role === "admin")
    items.push({ key: "pending", cls: "bg-gold-tint text-gold-ink", icon: UserPlus, text: `${pendingCount} account request${pendingCount !== 1 ? "s" : ""} awaiting approval`, onClick: () => go("admin_users") })
  if (dueCount > 0 && dueTarget)
    items.push({ key: "due", cls: "bg-warning-tint text-warning", icon: Clock, text: `${dueCount} follow-up${dueCount !== 1 ? "s" : ""} due today or overdue`, onClick: () => go(dueTarget) })

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) reload() }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${total ? ` (${total})` : ""}`}>
          <Bell className={cn(total > 0 && "text-foreground")} />
          {total > 0 && (
            <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white tabular">
              {total > 9 ? "9+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-display text-sm font-bold">Notifications</span>
          <Button variant="ghost" size="icon-xs" onClick={reload} aria-label="Refresh"><RefreshCw /></Button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-5 text-center text-xs text-muted-foreground">Checking…</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 p-6 text-center">
              <CheckCircle2 className="size-5 text-primary" />
              <div className="text-xs text-muted-foreground">You&apos;re all caught up.</div>
            </div>
          ) : (
            items.map((it) => (
              <button key={it.key} onClick={it.onClick} className="flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-sm", it.cls)}><it.icon className="size-3.5" /></span>
                <span className="text-[13px] leading-snug">{it.text}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const dark = resolvedTheme === "dark"
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  )
}

function CommandMenu() {
  const { role } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((o) => !o) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  const sections = buildNavSections(role)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden h-9 w-64 items-center gap-2 rounded-sm border bg-card px-3 text-[13px] text-muted-foreground shadow-xs transition-colors hover:border-border-strong md:flex"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Jump to…</span>
        <Kbd>⌘K</Kbd>
      </button>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Search pages"><Search /></Button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Jump to a page" description="Search every page you have access to">
        <CommandInput placeholder="Search pages…" />
        <CommandList>
          <CommandEmpty>No pages found.</CommandEmpty>
          {sections.map((s) => (
            <CommandGroup key={s.title || "pages"} heading={s.title || "Pages"}>
              {s.items.map((i) => {
                const Icon = NAV_ICONS[i.id] || FileText
                return (
                  <CommandItem key={i.id} value={`${s.title || ""} ${i.label}`} onSelect={() => { setOpen(false); router.push(pathFor(i.id)) }}>
                    <Icon />{i.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

function InstallBanner() {
  const [promptEvt, setPromptEvt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    try { setDismissed(localStorage.getItem("envoys_install_dismissed") === "1") } catch { setDismissed(false) }
    const onPrompt = (e: any) => { e.preventDefault(); setPromptEvt(e) }
    const onInstalled = () => setPromptEvt(null)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled) }
  }, [])
  if (!promptEvt || dismissed) return null
  return (
    <div className="fixed right-4 bottom-4 z-40 flex max-w-xs animate-page-in items-center gap-3 rounded-md bg-brand-deep p-3 pl-4 text-on-brand-deep shadow-md">
      <Download className="size-5 shrink-0 text-gold" />
      <div className="flex-1">
        <div className="font-display text-[13px] font-bold">Install the Envoys app</div>
        <div className="text-[11px] opacity-75">Add it to your home screen for one-tap access.</div>
      </div>
      <Button size="xs" variant="gold" onClick={async () => { promptEvt.prompt(); await promptEvt.userChoice.catch(() => {}); setPromptEvt(null) }}>Install</Button>
      <button aria-label="Dismiss" className="p-1 opacity-60 hover:opacity-100" onClick={() => { setDismissed(true); try { localStorage.setItem("envoys_install_dismissed", "1") } catch {} }}>
        <X className="size-4" />
      </button>
    </div>
  )
}

export function Topbar() {
  const { role } = useSession()
  const pathname = usePathname()
  const id = idFromSlug(pathname.split("/")[1] || "")
  const group = groupFor(role, id)
  useEffect(() => {
    try { localStorage.setItem("envoys_last_active_v1", id) } catch {}
    document.title = `${labelFor(role, id)} · The Envoys`
  }, [id, role])
  return (
    <>
      <header data-print-hide className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 sm:px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mx-1 h-5!" />
        <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
          {group && <span className="hidden truncate text-muted-foreground sm:inline">{group}</span>}
          {group && <span className="hidden text-muted-foreground/60 sm:inline" aria-hidden>/</span>}
          <span className="truncate font-semibold">{labelFor(role, id)}</span>
        </nav>
        <CommandMenu />
        <ThemeToggle />
        <NotificationBell />
      </header>
      <InstallBanner />
    </>
  )
}
