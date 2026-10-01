"use client"

import { useCallback, useEffect, useState } from "react"
import { sb } from "@/lib/supabase"

export function useRoleUsers(role: string | string[]) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const roleKey = Array.isArray(role) ? role.join(",") : role || ""
  useEffect(() => {
    if (!roleKey) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const roleFilter = roleKey.includes(",") ? `role=in.(${roleKey})` : `role=eq.${roleKey}`
        const rows = await sb(`app_users?${roleFilter}&is_active=eq.true&select=display_name,username&order=display_name.asc`)
        if (!cancelled)
          setOptions((rows || []).map((u: any) => ({ value: u.display_name || u.username, label: u.display_name || u.username })))
      } catch (e: any) {
        console.warn(`useRoleUsers(${roleKey}) fetch failed:`, e.message)
        if (!cancelled) setOptions([])
      }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [roleKey])
  return { options, loading }
}

// Reveals rows `pageSize` at a time as a scroll container nears its bottom.
export function usePagedScroll(resetSignal: any, totalLength: number, pageSize = 10) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  useEffect(() => { setVisibleCount(pageSize) }, [resetSignal, pageSize])
  const onScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      const el = e.currentTarget
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80)
        setVisibleCount((c) => Math.min(c + pageSize, totalLength || 0))
    },
    [pageSize, totalLength],
  )
  return { visibleCount, onScroll }
}

// Reveals more items as a sentinel enters the viewport (for page-scrolled boards).
export function useInfiniteReveal(resetSignal: any, total: number, pageSize = 24) {
  const [count, setCount] = useState(pageSize)
  useEffect(() => { setCount(pageSize) }, [resetSignal, pageSize])
  const sentinel = useCallback(
    (node: HTMLElement | null) => {
      if (!node) return
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) setCount((c) => Math.min(c + pageSize, total))
      }, { rootMargin: "400px" })
      io.observe(node)
      return () => io.disconnect()
    },
    [total, pageSize],
  )
  return { count, sentinel, hasMore: count < total }
}
