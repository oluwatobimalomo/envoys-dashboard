import type { Metadata } from "next"
import { PublicFeedbackPage } from "@/modules/research"

export const metadata: Metadata = { title: "Share your feedback" }

export default function Page() {
  return <PublicFeedbackPage />
}
