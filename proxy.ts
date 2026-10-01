import { NextResponse, type NextRequest } from "next/server"
import { decodeSession, SESSION_COOKIE } from "@/lib/session-edge"

const PUBLIC = ["/login", "/register", "/feedback", "/testimony", "/new-convert", "/nom-register", "/appraisal", "/present", "/api/auth", "/api/generate-insight"]

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl

  // Legacy projector links: /?present=<slug>
  const present = searchParams.get("present")
  if (pathname === "/" && present) {
    return NextResponse.redirect(new URL(`/present/${encodeURIComponent(present)}`, req.url))
  }

  if (PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next()

  const session = await decodeSession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!session) {
    const url = new URL("/login", req.url)
    if (pathname !== "/") url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|icons/|sw.js|manifest.webmanifest|robots.txt).*)"],
}
