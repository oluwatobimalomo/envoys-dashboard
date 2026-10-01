"use client"

import * as React from "react"
import { CheckCircle2 } from "lucide-react"
import { Logo } from "@/components/app/kit"
import { ThemeToggleCompact } from "@/components/app/theme-toggle"
import { cn } from "@/lib/utils"

/** Layout for the public, QR-linked forms: brand header, single column, generous spacing. */
export function PublicShell({ title, accent, subtitle, children, width = "max-w-2xl" }: {
  title: React.ReactNode; accent?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; width?: string
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="absolute top-3 right-3"><ThemeToggleCompact /></div>
      <div className={cn("mx-auto px-4 pt-10 pb-16 sm:pt-14", width)}>
        <header className="mb-8 flex flex-col items-center text-center">
          <Logo size={76} tile className="mb-5" />
          <h1 className="font-display text-[26px] leading-8 font-extrabold tracking-[-0.015em] sm:text-[30px] sm:leading-9">
            {title} {accent && <span className="text-primary">{accent}</span>}
          </h1>
          {subtitle && <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">{subtitle}</p>}
        </header>
        {children}
      </div>
    </div>
  )
}

export function ThankYou({ title, children, tone = "brand" }: { title: React.ReactNode; children?: React.ReactNode; tone?: "brand" | "soul" | "gold" | "research" }) {
  const well = { brand: "bg-brand-tint text-primary", soul: "bg-soul-tint text-soul", gold: "bg-gold-tint text-gold-ink", research: "bg-research-tint text-research" }[tone]
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-md animate-page-in rounded-lg border bg-card px-8 py-12 text-center shadow-xs">
        <Logo size={56} tile className="mx-auto mb-6" />
        <span className={cn("mx-auto mb-4 grid size-14 place-items-center rounded-full", well)}><CheckCircle2 className="size-7" /></span>
        <h2 className="font-display text-[22px] leading-7 font-extrabold">{title}</h2>
        {children && <div className="mt-3 text-[14px] leading-relaxed text-ink-secondary">{children}</div>}
      </div>
    </div>
  )
}
