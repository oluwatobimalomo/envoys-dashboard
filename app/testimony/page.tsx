import type { Metadata } from "next"
import { PublicTestimonyPage } from "@/modules/testimonies"

export const metadata: Metadata = { title: "Share your testimony" }

export default function Page() {
  return <PublicTestimonyPage />
}
