import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getSession } from "@/lib/session"
import { SessionProvider } from "@/components/app/session"
import { AppFrame } from "@/components/app/app-frame"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  return (
    <SessionProvider session={session}>
      <AppFrame defaultOpen={sidebarOpen}>{children}</AppFrame>
    </SessionProvider>
  )
}
