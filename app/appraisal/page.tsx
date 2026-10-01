import type { Metadata } from "next"
import { PublicAppraisalPage } from "@/modules/nom-appraisal"

export const metadata: Metadata = { title: "Steward appraisal" }

export default function Page() {
  return <PublicAppraisalPage />
}
