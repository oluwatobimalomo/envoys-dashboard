import type { Metadata } from "next"
import { PublicNOMPage } from "@/modules/nom-appraisal"

export const metadata: Metadata = { title: "Night of Mercy" }

export default function Page() {
  return <PublicNOMPage />
}
