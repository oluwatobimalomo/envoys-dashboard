import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { homeFor } from "@/lib/nav"

export default async function Home() {
  const s = await getSession()
  redirect(s ? homeFor(s.role) : "/login")
}
