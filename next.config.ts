import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  async redirects() {
    return [
      // Legacy hash/path links printed on QR codes keep working.
      { source: "/register/", destination: "/register", permanent: true },
    ]
  },
}

export default nextConfig
