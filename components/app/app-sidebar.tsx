"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { ChevronDown, FileText, LogOut, UserRound, ChevronsUpDown, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buildNavSections, NAV_ICONS, pathFor, ROLE_META, idFromSlug } from "@/lib/nav"
import { Logo, PersonAvatar, ToneBadge } from "@/components/app/kit"
import { useSession } from "@/components/app/session"
import { cn } from "@/lib/utils"

export function AppSidebar({ flagCount = 0 }: { flagCount?: number }) {
  const { role, user, logout } = useSession()
  const pathname = usePathname()
  const active = idFromSlug(pathname.split("/")[1] || "")
  const sections = buildNavSections(role)
  const { setOpenMobile, isMobile } = useSidebar()
  const ri = ROLE_META[role] || ROLE_META.expteam
  const { theme, setTheme } = useTheme()

  const sectionOf = (id: string) => sections.find((s) => s.items.some((i) => i.id === id))?.title ?? null
  const [open, setOpen] = useState<Set<string | null>>(() => new Set([sectionOf(active)]))
  useEffect(() => {
    const t = sectionOf(active)
    if (t) setOpen((prev) => (prev.has(t) ? prev : new Set(prev).add(t)))
  }, [active, role])

  const close = () => isMobile && setOpenMobile(false)

  const renderItem = (item: { id: string; label: string }) => {
    const Icon = NAV_ICONS[item.id] || FileText
    const on = active === item.id
    const isFlag = item.id === "flagged"
    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton asChild isActive={on} tooltip={item.label}>
          <Link href={pathFor(item.id)} onClick={close} aria-current={on ? "page" : undefined}>
            <Icon strokeWidth={on ? 2 : 1.75} />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
        {isFlag && flagCount > 0 && (
          <SidebarMenuBadge className="bg-danger font-bold text-white! rounded-full">{flagCount}</SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link href={pathFor(sections[0]?.items[0]?.id || "myprofile")} className="flex items-center gap-2.5 rounded-sm px-1 py-1 group-data-[collapsible=icon]:px-0">
          <Logo size={34} tile />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <div className="font-display text-[15px] leading-4 font-extrabold tracking-[-0.01em] text-foreground">The Envoys</div>
            <div className="text-[11px] font-semibold text-gold-ink">Retention</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin gap-0 py-1">
        {sections.map((sec) => {
          if (sec.title === null)
            return (
              <SidebarGroup key="flat">
                <SidebarGroupContent><SidebarMenu>{sec.items.map(renderItem)}</SidebarMenu></SidebarGroupContent>
              </SidebarGroup>
            )
          const isOpen = open.has(sec.title)
          const containsActive = sec.items.some((i) => i.id === active)
          const hasFlag = sec.items.some((i) => i.id === "flagged") && flagCount > 0
          return (
            <Collapsible
              key={sec.title}
              open={isOpen}
              onOpenChange={(o) => setOpen((prev) => { const n = new Set(prev); if (o) n.add(sec.title); else n.delete(sec.title); return n })}
              className="group/collapsible"
            >
              <SidebarGroup className="py-1">
                <SidebarGroupLabel asChild className="eyebrow h-7 cursor-pointer rounded-sm hover:bg-muted hover:text-foreground">
                  <CollapsibleTrigger className="w-full">
                    <span className={cn("flex-1 text-left", containsActive && "text-primary")}>{sec.title}</span>
                    {!isOpen && hasFlag && <span className="mr-1 rounded-full bg-danger px-1.5 text-[10px] text-white">{flagCount}</span>}
                    <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent><SidebarMenu>{sec.items.map(renderItem)}</SidebarMenu></SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-muted">
                  <PersonAvatar name={user} size={32} />
                  <div className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-[13px] font-semibold text-foreground">{user}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{ri.label}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="w-60">
                <DropdownMenuLabel className="flex items-center gap-2.5 py-2">
                  <PersonAvatar name={user} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{user}</div>
                    <ToneBadge tone={ri.tone} className="mt-0.5">{ri.label}</ToneBadge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/myprofile" onClick={close}><UserRound />My profile</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="eyebrow py-1">Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light"><Sun />Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark"><Moon />Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system"><Monitor />System</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} variant="destructive"><LogOut />Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
