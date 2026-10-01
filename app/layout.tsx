import type { Metadata, Viewport } from "next"
import { Providers } from "@/components/app/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "The Envoys", template: "%s · The Envoys" },
  description: "Membership retention for RCCG The Envoys — every first-timer welcomed, every member cared for.",
  icons: { icon: "/favicon.ico", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Envoys", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1410" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@500,700,800&f[]=satoshi@400,500,700&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
