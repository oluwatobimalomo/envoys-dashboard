// Thin PostgREST client for the existing Supabase project.
// Query strings are identical to the legacy app so behaviour (and the database) stay the same.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bhtbypqzukugnenyqvlg.supabase.co"
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodGJ5cHF6dWt1Z25lbnlxdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTE4NjYsImV4cCI6MjA5Nzg2Nzg2Nn0.eAsuBENwgtbj_RsNpOPdNrYZkULEuJv7pnwclIM_ito"

export const CREDS_MISSING =
  !SUPABASE_URL || SUPABASE_URL.includes("your-project-id") || SUPABASE_ANON_KEY === "your-anon-key"

export const PHOTO_BUCKET = "visit-photos"

type SbOpts = RequestInit & { prefer?: string; headers?: Record<string, string> }

export async function sb<T = any>(path: string, opts: SbOpts = {}): Promise<T> {
  if (CREDS_MISSING) throw new Error("CREDS_MISSING")
  const { prefer, headers, ...rest } = opts
  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...rest,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: prefer || "return=representation",
        ...headers,
      },
      cache: "no-store",
    })
  } catch (e: any) {
    throw new Error(`Network error — cannot reach Supabase. (${e.message})`)
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error(b.message || b.error_description || b.hint || `HTTP ${res.status} ${res.statusText}`)
  }
  if (res.status === 204) return null as T
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}

export async function uploadVisitPhoto(file: File): Promise<string> {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  const objectPath = `public/${uniqueName}`
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${objectPath}`
  let res: Response
  try {
    res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert": "true",
      },
      body: file,
    })
  } catch (netErr: any) {
    throw new Error(`Network error during photo upload: ${netErr.message}`)
  }
  if (!res.ok) {
    let detail = ""
    try {
      const b = await res.json()
      detail = b.message || b.error || JSON.stringify(b)
    } catch {
      detail = `HTTP ${res.status}`
    }
    throw new Error(`Upload failed (${res.status}): ${detail}`)
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${objectPath}`
}

// Salted SHA-256, matching the SQL migration: digest(lower(username) || ':' || password, 'sha256')
export async function hashPassword(username: string, password: string) {
  const salted = `${(username || "").trim().toLowerCase()}:${password}`
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Assignments & history are keyed by display-name strings, so a rename must cascade.
export async function cascadeRename(oldName: string, newName: string) {
  const enc = encodeURIComponent(oldName)
  const targets = [
    ["call_assignments", "assigned_to"],
    ["call_feedback", "caller_name"],
    ["pipeline_overviews", "submitted_by"],
  ]
  for (const [table, col] of targets) {
    await sb(`${table}?${col}=eq.${enc}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ [col]: newName }),
    }).catch(() => {})
  }
}
