import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { homeFor } from "@/lib/nav"
import { LoginForm } from "./login-form"
import { Logo } from "@/components/app/kit"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage() {
  const s = await getSession()
  if (s) redirect(homeFor(s.role))
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side */}
      <section className="relative hidden overflow-hidden bg-brand-deep p-12 text-on-brand-deep lg:flex lg:flex-col lg:justify-between">
        <svg aria-hidden className="pointer-events-none absolute -right-24 -bottom-24 size-[520px] opacity-[0.14]" viewBox="0 0 520 520" fill="none">
          <circle cx="260" cy="260" r="180" stroke="var(--gold)" strokeWidth="2" />
          <circle cx="260" cy="260" r="240" stroke="currentColor" strokeWidth="1" />
          <circle cx="260" cy="260" r="120" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="flex items-center gap-3">
          <Logo size={48} tile />
          <div>
            <div className="font-display text-lg font-extrabold">The Envoys</div>
            <div className="text-xs font-semibold tracking-[0.08em] text-gold uppercase">Membership retention</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-[44px] leading-[46px] font-extrabold tracking-[-0.02em]">
            Every first-timer welcomed. <span className="text-gold">Every member cared for.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed opacity-80">
            &ldquo;…turning information into insight and insight into impact.&rdquo;
          </p>
        </div>
        <div className="text-[11px] font-semibold tracking-[0.12em] opacity-50">RCCG THE ENVOYS · ENVOYSBYTE</div>
      </section>

      {/* Form side */}
      <section className="flex items-start justify-center px-5 py-10 sm:items-center sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={44} tile />
            <div>
              <div className="font-display text-lg font-extrabold">The Envoys</div>
              <div className="text-xs font-semibold text-gold-ink">Membership retention</div>
            </div>
          </div>
          <Suspense><LoginForm /></Suspense>
        </div>
      </section>
    </div>
  )
}
