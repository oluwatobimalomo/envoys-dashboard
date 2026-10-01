import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"
import { getSession } from "@/lib/session"
import { canAccess, homeFor, idFromSlug, labelFor } from "@/lib/nav"
import { ModuleOutlet } from "@/modules/registry"

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params
  const s = await getSession()
  return { title: s ? labelFor(s.role, idFromSlug(section)) : "The Envoys" }
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const session = await getSession()
  if (!session) redirect("/login")
  const id = idFromSlug(section)
  if (!/^[a-z_]+$/.test(id)) notFound()
  if (!canAccess(session.role, id)) redirect(homeFor(session.role))
  return <ModuleOutlet id={id} />
}
