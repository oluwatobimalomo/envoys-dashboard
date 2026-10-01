import type { Metadata } from "next"
import { PresentationViewer } from "@/modules/testimonies"

export const metadata: Metadata = { title: "Testimonies" }

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <PresentationViewer slug={slug} />
}
