import type { Metadata } from "next"
import { PublicNewConvertPage } from "@/modules/new-converts"

export const metadata: Metadata = { title: "Welcome to new life" }

export default function Page() {
  return <PublicNewConvertPage />
}
