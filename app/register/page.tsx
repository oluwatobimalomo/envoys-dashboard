import type { Metadata } from "next"
import { PublicRegistrationPage } from "@/modules/first-timers"

export const metadata: Metadata = { title: "Welcome" }

export default function Page() {
  return <PublicRegistrationPage />
}
