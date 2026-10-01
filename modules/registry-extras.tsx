"use client"

import { useNav } from "@/components/app/session"
import { FirstTimerForm } from "@/modules/first-timers"

export function AddRecordScreen() {
  const nav = useNav()
  return <FirstTimerForm onSuccess={() => nav("firsttimers")} />
}
