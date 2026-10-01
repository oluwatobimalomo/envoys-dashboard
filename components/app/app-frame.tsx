"use client"

import { useEffect, useState } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app/app-sidebar"
import { Topbar } from "@/components/app/topbar"
import { useSession } from "@/components/app/session"
import { sb } from "@/lib/supabase"

function useOpenFlagCount() {
  const { role } = useSession()
  const [n, setN] = useState(0)
  useEffect(() => {
    ;(async () => {
      try {
        const [cf, scl, resolutions] = await Promise.all([
          sb("call_feedback?flagged_for_pastoral=eq.true&select=id"),
          sb("soul_call_logs?flagged_for_pastoral=eq.true&select=id").catch(() => []),
          sb("pastoral_flag_resolutions?select=source_table,source_id").catch(() => []),
        ])
        const resolved = new Set((resolutions || []).map((r: any) => `${r.source_table}:${r.source_id}`))
        setN(
          (cf || []).filter((r: any) => !resolved.has(`call_feedback:${r.id}`)).length +
            (scl || []).filter((r: any) => !resolved.has(`soul_call_logs:${r.id}`)).length,
        )
      } catch {}
    })()
  }, [role])
  return n
}

export function AppFrame({ children, defaultOpen }: { children: React.ReactNode; defaultOpen: boolean }) {
  const flagCount = useOpenFlagCount()
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar flagCount={flagCount} />
      <SidebarInset className="min-w-0">
        <Topbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
