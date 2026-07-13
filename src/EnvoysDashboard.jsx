// ─────────────────────────────────────────────────────────────────────────────
// THE ENVOYS — Membership Retention Dashboard  v5.4
// Cabinet Grotesk (headings) · Satoshi (body) · Forest Green + Gold palette
// Changes v5.4:
//   • Research Team module — service-feedback viewer with date filter + CSV download
//   • New "research" role added across ROLE_META, NAV, AdminAddUser
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Users, UserPlus, Phone, RefreshCw, BarChart2, MessageSquare,
  Flag, QrCode, LogOut, Menu, X, Heart, MapPin, Calendar, ChevronRight,
  AlertCircle, CheckCircle, Clock, Clipboard, Upload, Search, ArrowLeft,
  Star, TrendingUp, Activity, Shield, Edit3, UserCheck,
  FileText, Filter, Download, ChevronDown, Info, Zap, Camera,
  MessageCircle, Gift, Maximize2, Bell, 
} from "lucide-react";

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: GLOBAL STYLES & CSS INJECTION                                     ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

(function injectGlobals() {
  if (document.getElementById("envoys-globals")) return;
  const s = document.createElement("style");
  s.id = "envoys-globals";
  s.textContent = `
    @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&f[]=satoshi@400,500,700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
    html, body, #root { height: 100%; width: 100%; overflow-x: hidden; }
    body { -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #c5d8cb; border-radius: 4px; }
    /* v6.5 — Members Care table scroller: visible on both axes */
    .mc-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
    .mc-scroll::-webkit-scrollbar-thumb { background: #a9c4b3; border-radius: 6px; }
    .mc-scroll::-webkit-scrollbar-thumb:hover { background: #8fb09c; }
    .mc-scroll { scrollbar-width: thin; scrollbar-color: #a9c4b3 transparent; }
    input, select, textarea, button { font-family: 'Satoshi', sans-serif; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .page-enter { animation: fadeIn .2s ease; }

    /* ── v5.8: skeleton shimmer ── */
    @keyframes shimmer { 0% { background-position: -468px 0 } 100% { background-position: 468px 0 } }
    /* ── v6.8: toast slide-in ── */
    @keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .toast-enter { animation: toastIn .25s ease; }
    .skeleton {
      background: linear-gradient(90deg, #E3EDE7 8%, #F4FAF6 28%, #E3EDE7 48%);
      background-size: 936px 100%;
      animation: shimmer 1.3s linear infinite;
    }
    /* ── v5.8: button press feedback ── */
    button:active:not(:disabled) { transform: scale(.97); }

    /* ── Sidebar width as a CSS variable so every breakpoint can reuse it ── */
    :root { --sidebar-w: 224px; }

    /* ── Mobile viewport-height fix: use dvh where supported so the
         sidebar's bottom edge (Sign Out button) is never hidden behind
         a collapsing browser address bar ── */
    @supports (height: 100dvh) {
      .sidebar { height: 100dvh; }
    }

    /* ── Desktop / default: sidebar fixed, content fills the rest ── */
    .main-content {
      margin-left: var(--sidebar-w);
      width: calc(100% - var(--sidebar-w));
      padding: 2rem;
      min-height: 100vh;
    }
    .content-inner { max-width: 1180px; width: 100%; margin: 0 auto; }

    /* ── Tablet (iPad / small laptop window) ── */
    @media (max-width: 1100px) {
      :root { --sidebar-w: 200px; }
      .main-content { padding: 1.5rem; }
      .content-inner { max-width: 100%; }
      .g4 { grid-template-columns: repeat(2, 1fr) !important; }
    }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      :root { --sidebar-w: 224px; }
      .sidebar      { transform: translateX(-100%); transition: transform .25s ease; }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0 !important; width: 100% !important; padding: 1rem !important; }
      .mob-header   { display: flex !important; }
      .g2           { grid-template-columns: 1fr !important; }
      .g4           { grid-template-columns: 1fr 1fr !important; }
      .greport      { grid-template-columns: 1fr !important; }
      .et-head      { flex-direction: column !important; align-items: stretch !important; }
      .et-actions   { width: 100% !important; justify-content: flex-start !important; margin-top: 2px; }
      /* v6.1 — compact StatCards on mobile */
      .statcard       { padding: .75rem .85rem !important; gap: 10px !important; }
      .statcard-icon  { width: 34px !important; height: 34px !important; border-radius: 8px !important; }
      .statcard-value { font-size: 19px !important; }
      /* v6.1 — smaller pipeline chips on mobile */
      .pbar > *       { padding: 3px 8px !important; font-size: 10px !important; }
      .notif-bell-wrap { top: 64px !important; }
    }

    @media (min-width: 769px) {
      .sidebar    { transform: translateX(0) !important; }
      .mob-header { display: none !important; }
    }

    /* ── v6.2: login layout ── */
    .login-wrap  { display: flex; min-height: 100vh; }
    .login-brand { flex: 1.15; display: flex; }
    .login-panel { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    @media (max-width: 880px) {
      .login-wrap  { flex-direction: column; }
      .login-brand { flex: none; padding: 1.75rem 1.5rem !important; }
      .login-verse { display: none; }
      .login-panel { align-items: flex-start; padding: 2rem 1.25rem 3rem; }
    }
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────────────────
// v5.7 — Click-to-call
// normalizePhone(): returns a dialable E.164-ish number.
//   "0803 123 4567"    -> "+2348031234567"   (Nigerian local format)
//   "+234 803 123 4567"-> "+2348031234567"
//   "234803..."        -> "+234803..."
//   anything else      -> digits as-is (dialer still handles most cases)
// PhoneLink: renders the number as a tel: link (+ optional WhatsApp chip).
// stopPropagation is critical — many rows have their own onClick (expand /
// select), and tapping the number must dial, not toggle the row.
// ─────────────────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  if (!raw) return null;
  const p = String(raw).replace(/[^\d+]/g, "");
  if (!p || p.replace(/\D/g, "").length < 7) return null;
  if (p.startsWith("+"))    return p;
  if (p.startsWith("234"))  return `+${p}`;
  if (p.startsWith("0") && p.length === 11) return `+234${p.slice(1)}`;
  return p;
}

function PhoneLink({ phone, withWhatsApp = false, size = 12, bold = false, color }) {
  const tel = normalizePhone(phone);
  if (!phone) return <span>—</span>;
  if (!tel)   return <span>{phone}</span>; // not dialable — show as plain text

  const linkColor = color || C.green;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, verticalAlign: "middle" }}>
      <a href={`tel:${tel}`}
        onClick={e => e.stopPropagation()}
        title={`Call ${phone}`}
        style={{
          color: linkColor, textDecoration: "none",
          fontWeight: bold ? 700 : 600,
          display: "inline-flex", alignItems: "center", gap: 4,
          borderBottom: `1px dashed ${linkColor}55`,
        }}>
        <Phone size={size} style={{ flexShrink: 0 }} />{phone}
      </a>
      {withWhatsApp && (
        <a href={`https://wa.me/${tel.replace("+", "")}`}
          target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          title={`WhatsApp ${phone}`}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 20, height: 20, borderRadius: "50%",
            background: "#25D36622", color: "#128C4A",
            flexShrink: 0, textDecoration: "none",
          }}>
          <MessageCircle size={12} />
        </a>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.0 — PWA: register the installability service worker (no-op if
// unsupported, e.g. non-HTTPS contexts).
// ─────────────────────────────────────────────────────────────────────────────

(function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
})();

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: GLOBAL STYLES & CSS INJECTION                                 ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SUPABASE CONFIG & API HELPERS                                     ║
// ║  Includes: credentials, sb() fetch wrapper, uploadVisitPhoto()             ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const SUPABASE_URL      = "https://bhtbypqzukugnenyqvlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodGJ5cHF6dWt1Z25lbnlxdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTE4NjYsImV4cCI6MjA5Nzg2Nzg2Nn0.eAsuBENwgtbj_RsNpOPdNrYZkULEuJv7pnwclIM_ito";
const CREDS_MISSING = !SUPABASE_URL || SUPABASE_URL.includes("your-project-id") || SUPABASE_ANON_KEY === "your-anon-key";

const PHOTO_BUCKET = "visit-photos";

async function sb(path, opts = {}) {
  if (CREDS_MISSING) throw new Error("CREDS_MISSING");
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: opts.prefer || "return=representation",
        ...opts.headers,
      },
      ...opts,
    });
  } catch (e) {
    throw new Error(`Network error — cannot reach Supabase. (${e.message})`);
  }
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.message || b.error_description || b.hint || `HTTP ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadVisitPhoto(file) {
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const objectPath = `public/${uniqueName}`;
  const uploadUrl  = `${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${objectPath}`;

  let res;
  try {
    res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey:         SUPABASE_ANON_KEY,
        Authorization:  `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert":     "true",
      },
      body: file,
    });
  } catch (netErr) {
    throw new Error(`Network error during photo upload: ${netErr.message}`);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const b = await res.json();
      detail = b.message || b.error || JSON.stringify(b);
    } catch { detail = `HTTP ${res.status}`; }
    throw new Error(`Upload failed (${res.status}): ${detail}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${objectPath}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// v5.9 — Password hashing (salted SHA-256 via Web Crypto).
// Salt = lowercase username, so identical passwords hash differently per user.
// Matches the SQL migration: digest(lower(username) || ':' || password, 'sha256')
// ─────────────────────────────────────────────────────────────────────────────

async function hashPassword(username, password) {
  const salted = `${(username || "").trim().toLowerCase()}:${password}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salted));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.3 — display-name rename cascade. Assignments & history are keyed by
// display-name strings, so a rename must propagate or the user's work is
// orphaned. Failures are swallowed per-table; re-running a rename repairs.
// ─────────────────────────────────────────────────────────────────────────────

async function cascadeRename(oldName, newName) {
  const enc = encodeURIComponent(oldName);
  const targets = [
    ["call_assignments",      "assigned_to"],
    ["soul_care_assignments", "assigned_to"],
    ["call_feedback",         "caller_name"],
    ["soul_care_visits",      "logged_by"],
    ["pipeline_overviews",    "submitted_by"],
  ];
  for (const [table, col] of targets) {
    await sb(`${table}?${col}=eq.${enc}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ [col]: newName }),
    }).catch(() => {});
  }
}
// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SUPABASE CONFIG & API HELPERS                                 ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SESSION PERSISTENCE                                               ║
// ║  Includes: saveSession(), loadSession(), clearSession()                    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const SESSION_KEY = "envoys_session_v2";           // v2: bump forces one clean re-login
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;        // 12 hours

function saveSession(role, user, username) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ role, user, username: username || null, exp: Date.now() + SESSION_TTL_MS }));
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.role && s.user && (!s.exp || Date.now() < s.exp)) return s;
    localStorage.removeItem(SESSION_KEY);           // expired or malformed — clear it
    return null;
  } catch { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SESSION PERSISTENCE                                           ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SHARED HOOKS                                                      ║
// ║  Includes: useRoleUsers()                                                  ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function useRoleUsers(role) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // v5.5: accepts a single role string OR an array of roles.
  const roleKey = Array.isArray(role) ? role.join(",") : (role || "");

  useEffect(() => {
    if (!roleKey) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const roleFilter = roleKey.includes(",")
          ? `role=in.(${roleKey})`
          : `role=eq.${roleKey}`;
        const rows = await sb(
          `app_users?${roleFilter}&is_active=eq.true&select=display_name,username&order=display_name.asc`
        );
        if (!cancelled) {
          setOptions(
            (rows || []).map(u => ({
              value: u.display_name || u.username,
              label: u.display_name || u.username,
            }))
          );
        }
      } catch (e) {
        console.warn(`useRoleUsers(${roleKey}) fetch failed:`, e.message);
        if (!cancelled) setOptions([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [roleKey]);

  return { options, loading };
}
// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SHARED HOOKS                                                  ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: DESIGN TOKENS — PALETTE, FONTS, SHADOWS, STYLE HELPERS           ║
// ║  Includes: C (colours), F (fonts), SHADOW, btn(), card, badge(), dot()    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const C = {
  green:        "#1A7A3C",
  greenDark:    "#0F5228",
  greenDeep:    "#1B3A2D",
  greenMid:     "#22963F",
  greenLight:   "#E6F2EB",
  greenXLight:  "#F2FAF5",
  greenBorder:  "#C8E0D0",
  gold:         "#D4922A",
  goldDark:     "#A66D15",
  goldLight:    "#FEF6E4",
  goldMid:      "#F0B84A",
  amber:        "#C97A1A",
  amberLight:   "#FFF3E0",
  blue:         "#2563EB",
  blueLight:    "#EFF6FF",
  bg:           "#F4F7F5",
  surface:      "#FFFFFF",
  border:       "#DDE8E2",
  sidebar:      "#1B3A2D",
  sidebarHover: "rgba(255,255,255,.06)",
  sidebarActive:"rgba(212,146,42,.12)",
  textPrimary:  "#0E2218",
  textSecondary:"#3D5C4A",
  textMuted:    "#7A9585",
  danger:       "#C0392B",
  dangerLight:  "#FDEDEC",
  flag:         "#DC2626",
  flagLight:    "#FEF2F2",
  soul:         "#5B21B6",
  soulLight:    "#F5F3FF",
  research:     "#0E7490",
  researchLight:"#ECFEFF",
  researchBorder:"#A5F3FC",
};

const F = {
  head: "'Cabinet Grotesk','Segoe UI',sans-serif",
  body: "'Satoshi','Inter',sans-serif",
};

const SHADOW = {
  xs: "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  sm: "0 2px 6px rgba(0,0,0,.07), 0 1px 3px rgba(0,0,0,.05)",
  md: "0 4px 12px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.05)",
};

const STATUS_META = {
  "Reached":           { label: "Reached",          color: C.green,  bg: C.greenLight  },
  "Call Back":         { label: "Call Back",         color: C.amber,  bg: C.amberLight  },
  "Incorrect Contact": { label: "Incorrect Contact", color: C.danger, bg: C.dangerLight },
};
const CALL_STATUS_OPTIONS = [
  { value: "Reached",            label: "Reached: spoke with the VIP"   },
  { value: "Not Reached",        label: "Not Reached: did not answer"       },
  { value: "Callback Requested", label: "Callback Requested by VIP" },
  { value: "Wrong Number",       label: "Wrong Number/Invalid"                  },
];
function normaliseStatus(raw) {
  if (!raw) return null;
  if (raw === "Reached")      return "Reached";
  if (raw === "Wrong Number") return "Incorrect Contact";
  return "Call Back";
}
function statusMeta(raw) {
  const norm = normaliseStatus(raw) || raw;
  return STATUS_META[norm] || { label: norm, color: C.textMuted, bg: C.bg };
}

const ROLE_META = {
  admin:    { label: "Admin",           color: C.goldDark,   bg: C.goldLight    },
  dofficer: { label: "Data Officer",    color: C.green,      bg: C.greenLight   },
  expteam:  { label: "Experience Team", color: C.green,      bg: C.greenLight   },
  pasteam:  { label: "Pastoral Team",   color: C.goldDark,   bg: C.goldLight    },
  soulcare: { label: "Soul Care",       color: C.soul,       bg: C.soulLight    },
  research:      { label: "Research Team",   color: C.research, bg: C.researchLight },
  experienceadmin: { label: "Exp. Admin",    color: C.blue,     bg: C.blueLight     },
  soulcareadmin:   { label: "Soul Care Admin", color: C.soul,   bg: C.soulLight     },
  testimonyteam:   { label: "Testimony Team",  color: C.goldDark, bg: C.goldLight   },
};

const NAV_ICONS = {
  admin_overview: Home, admin_users: Users, admin_adduser: UserPlus,
  firsttimers: Users, addmember: UserPlus, report: BarChart2,
  allfeedback: MessageSquare, flagged: Flag, qrcode: QrCode,
  callqueue: Phone, callbacks: RefreshCw, mycalls: Phone,
  sc_queue: Heart, sc_mine: Clipboard,
  visitation_tab: MapPin,
  research_feedback: FileText,
  general_feedback: MessageSquare,
  assign_calls: UserCheck,
  completed_pipelines: FileText,
  sc_assign: UserCheck,
  sc_flagged: Flag,
  sc_testimonies: Star,
  add_visit: UserPlus,
  feedback_qr: QrCode,
  testimony_qr: QrCode,
  testimony_bank: Star,
  members_care: Heart,
};

const NAV = {
  admin: [
    { id: "admin_overview", label: "Overview"     },
    { id: "admin_users",    label: "Users"         },
    { id: "admin_adduser",  label: "Add User"      },
    { id: "firsttimers",   label: "First-Timers"  },
    { id: "assign_calls",        label: "Assign Calls"        },
    { id: "completed_pipelines", label: "Completed Pipelines" },
    { id: "callqueue",           label: "Call Queue"          },
    { id: "sc_assign",     label: "Assign Visits" },
    { id: "sc_queue",      label: "Visit Queue"   },
    { id: "members_care", label: "Members Care" },
    { id: "add_visit",     label: "Add Visit"     },
    { id: "report",        label: "Report"        },
    { id: "allfeedback",   label: "All Feedback"  },
    { id: "flagged",       label: "Flagged"       },
    { id: "visitation_tab",label: "Visitations"   },
    { id: "research_feedback", label: "General Feedback"  },
    { id: "general_feedback",  label: "VIPs Feedback" },
    { id: "feedback_qr",   label: "Feedback QR"   },
    { id: "sc_testimonies", label: "Visitation Testimony"   },
    { id: "testimony_qr", label: "Testimony QR"   },
    { id: "qrcode",        label: "QR Code"       },
    { id: "testimony_bank", label: "Testimony Bank" },
  ],
  dofficer: [
    { id: "firsttimers",   label: "First-Timers"  },
    { id: "addmember",     label: "Add Record"    },
    { id: "qrcode",        label: "QR Code"       },
  ],
  expteam: [
    { id: "mycalls",       label: "My Calls"      },
    { id: "callqueue",     label: "Call Queue"    },
    { id: "callbacks",     label: "Call Backs"    },
    { id: "allfeedback",   label: "All Feedback"  },
    { id: "flagged",       label: "Flagged"       },
  ],
  pasteam: [
    { id: "report",        label: "Report"        },
    { id: "allfeedback",   label: "All Feedback"  },
    { id: "flagged",       label: "Flagged"       },
    { id: "visitation_tab",label: "Visitations"   },
  ],
  soulcare: [
    { id: "sc_queue",   label: "Visit Queue" },
    { id: "members_care", label: "Members Care" },
    { id: "add_visit",  label: "Add Visit"  },
    { id: "sc_mine",    label: "My Visits"  },
    { id: "sc_flagged", label: "Flagged"     },
  ],
  soulcareadmin: [
    { id: "sc_assign",           label: "Assign Visits"       },
    { id: "add_visit",           label: "Add Visit"           },
    { id: "sc_queue",            label: "Visit Queue"         },
    { id: "members_care", label: "Members Care" },
    { id: "completed_pipelines", label: "Completed Pipelines" },
    { id: "sc_flagged",          label: "Flagged"             },
    { id: "sc_testimonies",      label: "Testimonies"         },
  ],
  
  research: [
    { id: "research_feedback", label: "Service Feedback" },
    { id: "feedback_qr",       label: "Feedback QR" },
    { id: "general_feedback",  label: "General Feedback" },
  ],
  testimonyteam: [
    { id: "sc_testimonies", label: "Testimonies"    },
    { id: "testimony_bank", label: "Testimony Bank" },
    { id: "testimony_qr",   label: "Testimony QR"   },
  ],

  experienceadmin: [
  { id: "assign_calls",        label: "Assign Calls"        },
  { id: "completed_pipelines", label: "Completed Pipelines" },
  { id: "callqueue",           label: "Call Queue"          },
  { id: "allfeedback",         label: "All Feedback"        },
  { id: "flagged",             label: "Flagged"             },
],
};

// ─────────────────────────────────────────────────────────────────────────────
// v5.6 — Sidebar grouping. Roles listed here get labelled, collapsible
// sections; roles not listed keep the flat list. Any NAV item not covered
// by a group falls into an automatic "Other" section (safety net), so
// adding new pages to NAV can never make them disappear from the sidebar.
// ─────────────────────────────────────────────────────────────────────────────

const NAV_GROUPS = {
  admin: [
    { title: "Administration",  ids: ["admin_overview", "admin_users", "admin_adduser"] },
    { title: "First-Timers",    ids: ["firsttimers", "qrcode"] },
    { title: "Experience Team", ids: ["assign_calls", "callqueue", "completed_pipelines"] },
    { title: "Soul Care",       ids: ["sc_assign", "sc_queue", "members_care", "add_visit", "visitation_tab"] },
    { title: "Pastoral",        ids: ["report", "allfeedback", "flagged"] },
    { title: "Research",        ids: ["research_feedback", "general_feedback", "feedback_qr"] },
    { title: "Testimonies",     ids: ["sc_testimonies", "testimony_bank", "testimony_qr"] },
  ],
  soulcareadmin: [
    { title: "Visits",      ids: ["sc_assign", "sc_queue", "members_care", "add_visit"] },
    { title: "Oversight",   ids: ["completed_pipelines", "sc_flagged"] },
    { title: "Testimonies", ids: ["sc_testimonies"] },
  ],
  experienceadmin: [
    { title: "Calls",    ids: ["assign_calls", "callqueue", "completed_pipelines"] },
    { title: "Feedback", ids: ["allfeedback", "flagged"] },
  ],
};

function buildNavSections(role) {
  const items  = NAV[role] || [];
  const groups = NAV_GROUPS[role];
  if (!groups) return [{ title: null, items }]; // flat list — unchanged behaviour

  const byId = {};
  items.forEach(i => { byId[i.id] = i; });

  const used = new Set();
  const sections = groups
    .map(g => ({
      title: g.title,
      items: g.ids.map(id => byId[id]).filter(Boolean),
    }))
    .filter(s => s.items.length > 0);

  sections.forEach(s => s.items.forEach(i => used.add(i.id)));
  const leftovers = items.filter(i => !used.has(i.id));
  if (leftovers.length) sections.push({ title: "Other", items: leftovers });

  return sections;
}

const inputBase = {
  width: "100%", padding: "9px 13px", borderRadius: 8,
  border: `1.5px solid ${C.border}`, fontSize: 14, color: C.textPrimary,
  background: C.surface, outline: "none", fontFamily: F.body,
  transition: "border-color .15s, box-shadow .15s", display: "block",
};

const BTN_STYLES = {
  primary: { background: C.green,   color: "#fff", border: "none" },
  gold:    { background: C.gold,    color: "#fff", border: "none" },
  amber:   { background: C.amber,   color: "#fff", border: "none" },
  danger:  { background: C.danger,  color: "#fff", border: "none" },
  soul:    { background: C.soul,    color: "#fff", border: "none" },
  outline: { background: "transparent", color: C.green, border: `1.5px solid ${C.green}` },
  ghost:   { background: C.bg, color: C.textSecondary, border: `1.5px solid ${C.border}` },
};
const btn = (variant = "primary", extra = {}) => ({
  padding: "9px 18px", borderRadius: 8, cursor: "pointer",
  fontWeight: 600, fontSize: 14, fontFamily: F.body, lineHeight: 1.4,
  display: "inline-flex", alignItems: "center", gap: 7,
  transition: "opacity .15s, box-shadow .15s",
  boxShadow: SHADOW.xs,
  ...(BTN_STYLES[variant] || BTN_STYLES.ghost),
  ...extra,
});

const card = {
  background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
  padding: "1.4rem 1.5rem", boxShadow: SHADOW.xs,
  transition: "transform .15s ease, box-shadow .15s ease",
};

// v5.8 — spread {...lift} onto any list-row card that has no other
// onMouseOver/onMouseOut handlers of its own.
const lift = {
  onMouseOver: e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = SHADOW.md; },
  onMouseOut:  e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = SHADOW.xs; },
};

const badge = (color, bg, extra = {}) => ({
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "3px 10px", borderRadius: 20, fontSize: 12,
  fontWeight: 600, color, background: bg, whiteSpace: "nowrap",
  letterSpacing: ".01em", ...extra,
});

const dot = (color) => ({
  width: 7, height: 7, borderRadius: "50%",
  background: color, flexShrink: 0, display: "inline-block",
});

function parseAreas(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: DESIGN TOKENS — PALETTE, FONTS, SHADOWS, STYLE HELPERS       ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SHARED UI PRIMITIVES                                              ║
// ║  Includes: FieldInput, PhotoUpload, Logo, Alert, CredsBanner,             ║
// ║            PageHeader, StatCard, SH (Section Heading)                     ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function FieldInput({ label, id, type = "text", required, value, onChange,
  placeholder, options, hint, disabled }) {
  const [focused, setFocused] = useState(false);
  const base = {
    ...inputBase,
    borderColor: focused ? C.green : C.border,
    ...(focused ? { boxShadow: `0 0 0 3px ${C.greenLight}` } : {}),
    ...(disabled ? { opacity: .6, cursor: "not-allowed" } : {}),
  };

  const wrap = (children) => (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 600,
          color: C.textSecondary, marginBottom: 5, fontFamily: F.body }}>
          {label}{required && <span style={{ color: C.danger }}> *</span>}
        </label>
      )}
      {children}
      {hint && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>{hint}</div>}
    </div>
  );

  if (type === "select") return wrap(
    <select id={id} value={value} onChange={onChange} required={required}
      disabled={disabled}
      style={{ ...base, background: C.surface, cursor: disabled ? "not-allowed" : "pointer" }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <option value="">Select…</option>
      {(options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  if (type === "textarea") return wrap(
    <textarea id={id} value={value} onChange={onChange} placeholder={placeholder}
      rows={3} disabled={disabled} style={{ ...base, resize: "vertical" }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  );

  if (type === "multicheck") {
    const sel = Array.isArray(value) ? value : [];
    return wrap(
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
        {(options || []).map(o => {
          const on = sel.includes(o.value);
          return (
            <button key={o.value} type="button"
              onClick={() => onChange(on ? sel.filter(x => x !== o.value) : [...sel, o.value])}
              style={{
                padding: "6px 13px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                border: `1.5px solid ${on ? C.green : C.border}`,
                background: on ? C.greenLight : C.surface,
                color: on ? C.green : C.textSecondary,
                fontWeight: on ? 700 : 400, fontFamily: F.body, transition: "all .15s",
              }}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "toggle") {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 10,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 13, fontWeight: 600, color: C.textSecondary, fontFamily: F.body,
        }}>
          <div onClick={() => !disabled && onChange(!value)}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: value ? C.flag : C.border,
              position: "relative", transition: "background .2s", flexShrink: 0,
            }}>
            <div style={{
              position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16,
              borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: SHADOW.xs,
            }} />
          </div>
          {label}
          {value && (
            <span style={{
              fontSize: 11, color: C.flag, fontWeight: 700,
              background: C.flagLight, padding: "2px 8px", borderRadius: 10,
            }}>⚠ Will be flagged</span>
          )}
        </label>
        {hint && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginLeft: 50 }}>{hint}</div>}
      </div>
    );
  }

  if (type === "bool-toggle") {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{
          display: "flex", alignItems: "center", gap: 10,
          cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.textSecondary, fontFamily: F.body,
        }}>
          <div onClick={() => onChange(!value)}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: value ? C.green : C.border,
              position: "relative", transition: "background .2s", flexShrink: 0,
            }}>
            <div style={{
              position: "absolute", top: 3, left: value ? 20 : 3, width: 16, height: 16,
              borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: SHADOW.xs,
            }} />
          </div>
          {label}
        </label>
        {hint && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginLeft: 50 }}>{hint}</div>}
      </div>
    );
  }

  return wrap(
    <input id={id} type={type} value={value} onChange={onChange}
      required={required} placeholder={placeholder} disabled={disabled}
      style={base} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  );
}

function PhotoUpload({ value, onChange, existingUrl }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState(existingUrl || null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setErr("Image must be under 10 MB."); return; }
    setErr("");
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);
    setUploading(true);
    try {
      const remoteUrl = await uploadVisitPhoto(file);
      onChange(remoteUrl);
    } catch (e) {
      setErr(`Upload failed: ${e.message}`);
      setPreview(existingUrl || null);
      onChange(existingUrl || "");
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    onChange("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5, fontFamily: F.body }}>
        Visit Photo <span style={{ fontWeight: 400, color: C.textMuted }}>(optional)</span>
      </div>

      {preview ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img src={preview} alt="Upload visit"
            style={{
              width: "100%", maxWidth: 320, height: 200, objectFit: "cover",
              borderRadius: 10, border: `1.5px solid ${C.border}`, display: "block",
            }} />
          {uploading && (
            <div style={{
              position: "absolute", inset: 0, background: "rgba(27,58,45,.65)",
              borderRadius: 10, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <div style={{
                width: 28, height: 28, border: "3px solid rgba(255,255,255,.3)",
                borderTopColor: "#fff", borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Uploading…</span>
            </div>
          )}
          {!uploading && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" style={btn("ghost", { padding: "6px 12px", fontSize: 12 })}
                onClick={() => fileRef.current?.click()}>
                <Camera size={12} />Change Photo
              </button>
              <button type="button" style={btn("danger", { padding: "6px 12px", fontSize: 12 })}
                onClick={clear}>
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${C.greenBorder}`, borderRadius: 10,
            background: C.greenXLight, padding: "28px 20px",
            textAlign: "center", cursor: "pointer", transition: "border-color .15s, background .15s",
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = C.green;
            e.currentTarget.style.background = C.greenLight;
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = C.greenBorder;
            e.currentTarget.style.background = C.greenXLight;
          }}>
          <Camera size={28} color={C.green} style={{ marginBottom: 8, opacity: .7 }} />
          <div style={{ fontWeight: 600, fontSize: 13, color: C.textSecondary, marginBottom: 3 }}>
            Upload a visit photo
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            Click to browse or drag & drop · JPG, PNG, HEIC · Max 10 MB
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => handleFile(e.target.files[0])} />

      {err && (
        <div style={{ fontSize: 12, color: C.danger, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={12} />{err}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
        💡 Photos uploaded from{" "}
        <code style={{ background: C.bg, padding: "1px 4px", borderRadius: 3 }}>your device</code>{" "}
        are stored securely.
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Logo({ size = 48 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: C.green,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * .42, fontWeight: 800, color: "#fff", fontFamily: F.head, flexShrink: 0,
    }}>E</div>
  );
  return (
    <img src="/logo.png" alt="The Envoys" onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, display: "block" }} />
  );
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const col = type === "error" ? C.danger : type === "warn" ? C.amber : C.green;
  const bg  = type === "error" ? C.dangerLight : type === "warn" ? C.amberLight : C.greenLight;
  const Icon = type === "error" ? AlertCircle : type === "warn" ? AlertCircle : CheckCircle;
  return (
    <div style={{
      background: bg, border: `1px solid ${col}22`, borderLeft: `3px solid ${col}`,
      borderRadius: 8, padding: "10px 14px", fontSize: 13, color: col,
      display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16,
    }}>
      <Icon size={15} style={{ marginTop: 1, flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.5 }}>{msg}</span>
      {onClose && (
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer", color: col,
          fontWeight: 700, fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0, opacity: .7,
        }}>×</button>
      )}
    </div>
  );
}

function CredsBanner() {
  return (
    <Alert type="error" msg="Supabase credentials not configured — open EnvoysDashboard.jsx and replace SUPABASE_URL and SUPABASE_ANON_KEY." />
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      marginBottom: 24, flexWrap: "wrap", gap: 12,
    }}>
      <div>
        <h2 style={{
          margin: 0, fontSize: 22, fontFamily: F.head, fontWeight: 800,
          color: C.textPrimary, letterSpacing: "-.01em",
        }}>{title}</h2>
        {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent = C.green, sub, onClick }) {
  return (
    <div onClick={onClick} className="statcard"
      style={{
        ...card, padding: "1.1rem 1.25rem", borderLeft: `3px solid ${accent}`,
        cursor: onClick ? "pointer" : "default",
        display: "flex", alignItems: "center", gap: 14,
      }}
      onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = SHADOW.md; }}
      onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = SHADOW.xs; }}>
      <div className="statcard-icon" style={{
        width: 44, height: 44, borderRadius: 10, background: `${accent}14`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {Icon && <Icon size={20} color={accent} strokeWidth={1.8} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="statcard-value" style={{
          fontSize: 26, fontWeight: 800, color: accent, fontFamily: F.head, lineHeight: 1.1,
        }}><CountUp value={value} /></div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: accent, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function SH({ title, icon: Icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700,
      letterSpacing: ".08em", color: C.textMuted, textTransform: "uppercase",
      marginBottom: 16, paddingBottom: 8, borderBottom: `1.5px solid ${C.greenLight}`,
      fontFamily: F.head,
    }}>
      {Icon && <Icon size={13} strokeWidth={2} />}
      {title}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.0 — InstallBanner: appears only when the browser signals the app is
// installable (Chrome/Edge/Android). Dismissal is remembered.
// ─────────────────────────────────────────────────────────────────────────────

function InstallBanner() {
  const [promptEvt, setPromptEvt] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem("envoys_install_dismissed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPromptEvt(e); };
    const onInstalled = () => setPromptEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("envoys_install_dismissed", "1"); } catch {}
  };

  const install = async () => {
    if (!promptEvt) return;
    promptEvt.prompt();
    await promptEvt.userChoice.catch(() => {});
    setPromptEvt(null);
  };

  if (!promptEvt || dismissed) return null;

  return (
    <div style={{
      position: "fixed", bottom: 16, right: 16, left: "auto", zIndex: 300,
      background: C.sidebar, color: "#fff", borderRadius: 12,
      padding: "12px 16px", boxShadow: SHADOW.md, maxWidth: 320,
      display: "flex", alignItems: "center", gap: 12,
    }} className="page-enter">
      <Download size={18} color={C.goldMid} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, fontFamily: F.head }}>Install Envoys Retention App</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)", marginTop: 2 }}>
          Add to your home screen for one-tap access.
        </div>
      </div>
      <button style={btn("gold", { padding: "6px 12px", fontSize: 12 })} onClick={install}>Install</button>
      <button onClick={dismiss} style={{
        background: "none", border: "none", color: "rgba(255,255,255,.5)",
        cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0,
      }}>×</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.8 — Toast notification bus. No Context/Provider required: any
// component can call toast.success(...) / toast.error(...) / toast.info(...)
// once <ToastHost /> is mounted once, anywhere in the tree (see App()).
// ─────────────────────────────────────────────────────────────────────────────

let _toastListeners = [];
let _toastIdSeq = 0;

function _pushToast(message, type) {
  const t = { id: ++_toastIdSeq, message, type };
  _toastListeners.forEach(fn => fn(t));
}

const toast = {
  success: (msg) => _pushToast(msg, "success"),
  error:   (msg) => _pushToast(msg, "error"),
  info:    (msg) => _pushToast(msg, "info"),
};

function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handle = (t) => {
      setToasts(prev => [...prev, t]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4200);
    };
    _toastListeners.push(handle);
    return () => { _toastListeners = _toastListeners.filter(fn => fn !== handle); };
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const META = {
    success: { icon: CheckCircle, color: C.green,  bg: C.greenLight  },
    error:   { icon: AlertCircle, color: C.danger, bg: C.dangerLight },
    info:    { icon: Info,        color: C.blue,   bg: C.blueLight   },
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 700,
      display: "flex", flexDirection: "column", gap: 10,
      maxWidth: 360, width: "calc(100vw - 40px)",
    }}>
      {toasts.map(t => {
        const m = META[t.type] || META.info;
        const Icon = m.icon;
        return (
          <div key={t.id} className="toast-enter" style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            background: "#fff", borderRadius: 10, boxShadow: SHADOW.md,
            border: `1px solid ${m.color}30`, borderLeft: `3px solid ${m.color}`,
            padding: "12px 14px",
          }}>
            <Icon size={16} color={m.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, fontSize: 13, color: C.textPrimary, lineHeight: 1.5 }}>{t.message}</div>
            <button onClick={() => dismiss(t.id)} style={{
              background: "none", border: "none", cursor: "pointer", color: C.textMuted,
              padding: 0, lineHeight: 1, fontSize: 16, flexShrink: 0,
            }}>×</button>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.8 — Notification Bell: aggregates flagged records, pending account
// requests (admin only), and due-today follow-ups for the signed-in user.
//
// Scoping note: the "due" count here is a fast approximation (queries the
// user's own call_feedback / soul_care_visits directly) rather than the
// exact pipeline-aware logic in DueTodayPanel (v5.9) — good enough for a
// badge count. Clicking through takes you to My Calls / My Visits, where
// the precise DueTodayPanel logic applies.
// ─────────────────────────────────────────────────────────────────────────────

function useNotificationData(role, user) {
  const [data, setData] = useState({ flagCount: 0, pendingCount: 0, dueCount: 0, loading: true });

  const load = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const calls = [
        sb("call_feedback?flagged_for_pastoral=eq.true&select=id").catch(() => []),
      ];
      if (role === "admin") {
        calls.push(sb("app_users?is_pending=eq.true&select=id").catch(() => []));
      } else {
        calls.push(Promise.resolve([]));
      }
      if (user && (role === "expteam" || role === "experienceadmin" || role === "admin")) {
        calls.push(sb(`call_feedback?caller_name=eq.${encodeURIComponent(user)}&follow_up_date=lte.${todayStr}&select=id`).catch(() => []));
      } else {
        calls.push(Promise.resolve([]));
      }
      if (user && (role === "soulcare" || role === "soulcareadmin" || role === "admin")) {
        calls.push(sb(`soul_care_visits?logged_by=eq.${encodeURIComponent(user)}&follow_up_required=eq.true&next_follow_up_date=lte.${todayStr}&select=id`).catch(() => []));
      } else {
        calls.push(Promise.resolve([]));
      }

      const [flagged, pending, dueCalls, dueVisits] = await Promise.all(calls);
      setData({
        flagCount:    (flagged || []).length,
        pendingCount: (pending || []).length,
        dueCount:     (dueCalls || []).length + (dueVisits || []).length,
        loading: false,
      });
    } catch {
      setData(d => ({ ...d, loading: false }));
    }
  }, [role, user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 120000); // refresh every 2 minutes
    return () => clearInterval(interval);
  }, [load]);

  return { ...data, reload: load };
}

function NotificationBell({ role, user, setActive }) {
  const { flagCount, pendingCount, dueCount, loading, reload } = useNotificationData(role, user);
  const [open, setOpen] = useState(false);
  const total = flagCount + pendingCount + dueCount;

  const flagTargetId = (NAV[role] || []).some(n => n.id === "flagged") ? "flagged"
    : (NAV[role] || []).some(n => n.id === "sc_flagged") ? "sc_flagged" : null;
  const dueTargetId = role === "soulcare" || role === "soulcareadmin" ? "sc_mine"
    : role === "expteam" || role === "experienceadmin" ? "mycalls" : null;

  const goTo = (id) => { if (id) { setActive(id); setOpen(false); } };

  const items = [];
  if (flagCount > 0 && flagTargetId) {
    items.push({
      key: "flag", color: C.danger, bg: C.dangerLight, icon: Flag,
      text: `${flagCount} record${flagCount !== 1 ? "s" : ""} flagged for pastoral attention`,
      onClick: () => goTo(flagTargetId),
    });
  }
  if (pendingCount > 0 && role === "admin") {
    items.push({
      key: "pending", color: C.goldDark, bg: C.goldLight, icon: UserPlus,
      text: `${pendingCount} account request${pendingCount !== 1 ? "s" : ""} awaiting approval`,
      onClick: () => goTo("admin_users"),
    });
  }
  if (dueCount > 0 && dueTargetId) {
    items.push({
      key: "due", color: C.amber, bg: C.amberLight, icon: Clock,
      text: `${dueCount} follow-up${dueCount !== 1 ? "s" : ""} due today or overdue`,
      onClick: () => goTo(dueTargetId),
    });
  }

  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200 }} className="notif-bell-wrap">
      <button onClick={() => setOpen(o => !o)} style={{
        position: "relative", width: 40, height: 40, borderRadius: "50%",
        background: C.surface, border: `1px solid ${C.border}`, boxShadow: SHADOW.xs,
        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
      }}>
        <Bell size={17} color={total > 0 ? C.textPrimary : C.textMuted} />
        {total > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8,
            background: C.danger, color: "#fff", fontSize: 10, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
          }}>{total > 9 ? "9+" : total}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: -1 }} />
          <div style={{
            position: "absolute", top: 48, right: 0, width: 320, maxWidth: "calc(100vw - 32px)",
            background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
            boxShadow: SHADOW.md, overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F.head }}>Notifications</span>
              <button onClick={reload} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 4 }}>
                <RefreshCw size={13} />
              </button>
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: C.textMuted }}>Checking…</div>
              ) : items.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <CheckCircle size={22} color={C.green} style={{ marginBottom: 6, opacity: .7 }} />
                  <div style={{ fontSize: 12, color: C.textMuted }}>You're all caught up.</div>
                </div>
              ) : (
                items.map(it => {
                  const Icon = it.icon;
                  return (
                    <button key={it.key} onClick={it.onClick} style={{
                      display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
                      padding: "12px 14px", border: "none", borderBottom: `1px solid ${C.border}`,
                      background: "transparent", cursor: "pointer", textAlign: "left",
                    }}
                      onMouseOver={e => e.currentTarget.style.background = C.bg}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: it.bg,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon size={13} color={it.color} />
                      </div>
                      <span style={{ fontSize: 12.5, color: C.textPrimary, lineHeight: 1.5 }}>{it.text}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SHARED UI PRIMITIVES                                          ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// v5.8 — Skeleton loaders
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 14, r = 8, style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function SkeletonRow() {
  return (
    <div style={{ ...card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <Skeleton w={38} h={38} r="50%" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton w="42%" h={13} style={{ marginBottom: 8, maxWidth: 220 }} />
        <Skeleton w="68%" h={10} style={{ maxWidth: 320 }} />
      </div>
      <Skeleton w={90} h={26} r={20} style={{ flexShrink: 0 }} />
    </div>
  );
}

function SkeletonList({ rows = 6 }) {
  return (
    <div style={{ display: "grid", gap: 8 }} className="page-enter">
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

function SkeletonStat() {
  return (
    <div style={{ ...card, padding: "1.1rem 1.25rem", display: "flex", gap: 14, alignItems: "center" }}>
      <Skeleton w={44} h={44} r={10} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton w="45%" h={22} style={{ marginBottom: 8, maxWidth: 90 }} />
        <Skeleton w="70%" h={10} style={{ maxWidth: 140 }} />
      </div>
    </div>
  );
}

function SkeletonReport() {
  return (
    <div className="page-enter">
      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[0, 1, 2, 3].map(i => <SkeletonStat key={i} />)}
      </div>
      <div className="greport" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {[0, 1].map(i => (
          <div key={i} style={card}>
            <Skeleton w="35%" h={11} style={{ marginBottom: 16, maxWidth: 160 }} />
            <Skeleton h={200} r={10} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v5.8 — Colorful deterministic avatars
// Same name → same hue, forever. Hues stay inside the app's palette family.
// ─────────────────────────────────────────────────────────────────────────────

const AVATAR_HUES = [
  { color: "#1A7A3C", bg: "#E6F2EB" }, // forest green
  { color: "#A66D15", bg: "#FEF6E4" }, // gold
  { color: "#0E7490", bg: "#ECFEFF" }, // teal
  { color: "#5B21B6", bg: "#F5F3FF" }, // violet
  { color: "#2563EB", bg: "#EFF6FF" }, // blue
  { color: "#BE185D", bg: "#FDF2F8" }, // rose
  { color: "#C2410C", bg: "#FFF7ED" }, // rust
  { color: "#4D7C0F", bg: "#F7FEE7" }, // olive
];

function avatarHue(name) {
  const s = (name || "?").toString();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_HUES[h % AVATAR_HUES.length];
}

function Avatar({ name, size = 38 }) {
  const hue = avatarHue(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: hue.bg, border: `1.5px solid ${hue.color}35`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, color: hue.color,
      fontSize: Math.round(size * 0.38), fontFamily: F.head,
    }}>
      {(name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v5.8 — CountUp: eases a number (or "NN%") from 0 to its value in ~650ms.
// Non-numeric values ("—", null, text) render unchanged.
// ─────────────────────────────────────────────────────────────────────────────

function CountUp({ value, duration = 650 }) {
  const isPct = typeof value === "string" && /^\d+%$/.test(value);
  const target = typeof value === "number" ? value : isPct ? parseInt(value, 10) : null;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (target === null) return;
    let raf, start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  if (target === null) return <>{value ?? "—"}</>;
  return <>{n}{isPct ? "%" : ""}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// v5.9 — DueTodayPanel: overdue / due-today follow-ups for the current user.
// entries: [{ id, row, name, phone, dueDate ("YYYY-MM-DD"), note }]
// Renders nothing when entries is empty.
// ─────────────────────────────────────────────────────────────────────────────

function DueTodayPanel({ entries, actionLabel = "Log Call", actionIcon: ActionIcon = Phone, onAction }) {
  if (!entries || entries.length === 0) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = entries.filter(e => e.dueDate < todayStr).length;
  const todayCount   = entries.length - overdueCount;

  return (
    <div style={{
      ...card, marginBottom: 20, padding: "1rem 1.25rem",
      background: C.amberLight, border: `1px solid ${C.amber}30`,
      borderLeft: `3px solid ${overdueCount > 0 ? C.danger : C.amber}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Clock size={14} color={C.amber} />
        <span style={{
          fontSize: 12, fontWeight: 700, fontFamily: F.head,
          textTransform: "uppercase", letterSpacing: ".07em", color: C.amber,
        }}>
          Follow-ups Due
        </span>
        {overdueCount > 0 && (
          <span style={badge(C.danger, C.dangerLight, { fontSize: 11 })}>
            <AlertCircle size={10} />{overdueCount} overdue
          </span>
        )}
        {todayCount > 0 && (
          <span style={badge(C.amber, "#fff", { fontSize: 11 })}>
            <Calendar size={10} />{todayCount} due today
          </span>
        )}
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        {entries.map(e => {
          const isOverdue = e.dueDate < todayStr;
          const days = isOverdue
            ? Math.max(1, Math.floor((Date.now() - new Date(e.dueDate).getTime()) / 86400000))
            : 0;
          return (
            <div key={e.id} style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              background: C.surface, borderRadius: 8, padding: "8px 12px",
              border: `1px solid ${isOverdue ? C.danger : C.amber}`,
            }}>
              <Avatar name={e.name} size={30} />
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: F.head }}>{e.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  <PhoneLink phone={e.phone} />
                  {e.note ? <> · {e.note.slice(0, 60)}{e.note.length > 60 ? "…" : ""}</> : null}
                </div>
              </div>
              <span style={badge(
                isOverdue ? C.danger : C.amber,
                isOverdue ? C.dangerLight : C.amberLight,
                { fontSize: 11 }
              )}>
                <Calendar size={10} />
                {isOverdue ? `${days}d overdue` : "Due today"}
              </span>
              <button style={btn("primary", { padding: "6px 12px", fontSize: 12 })}
                onClick={() => onAction(e.row)}>
                <ActionIcon size={11} />{actionLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.0 — Birthdays This Week
// Reads first_timers.dob (client-side month/day matching — PostgREST can't
// filter by month/day across years). Feb-29 birthdays celebrate on Feb-28
// in non-leap years.
// ─────────────────────────────────────────────────────────────────────────────

const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

function nextBirthdayInfo(dob) {
  if (!dob) return null;
  const [y, m, d] = String(dob).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const occurrence = (yr) => {
    const day = (m === 2 && d === 29 && !isLeapYear(yr)) ? 28 : d;
    return new Date(yr, m - 1, day);
  };

  let next = occurrence(today.getFullYear());
  if (next < today) next = occurrence(today.getFullYear() + 1);

  return {
    daysUntil: Math.round((next - today) / 86400000),
    turning:   next.getFullYear() - y,
    dateLabel: next.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.4 — scripture-based birthday message, pre-filled into WhatsApp.
// WhatsApp allows pre-filling only — the sender taps Send (platform rule).
// ─────────────────────────────────────────────────────────────────────────────

// v6.5 — emojis as \u{...} escapes: plain-ASCII source, immune to encoding issues.
const BIRTHDAY_MESSAGE = (firstName) =>
`Happy Birthday${firstName ? `, ${firstName}` : ""}!

"This is the day the LORD has made; we will rejoice and be glad in it." — Psalm 118:24

May the Lord bless you and keep you; may He make His face shine upon you and be gracious to you; may He lift up His countenance upon you and give you peace (Numbers 6:24–26). May this new year of your life overflow with God's goodness, favour and joy.

We thank God for the gift that you are... with love from all of us at RCCG The Envoys.`;

function birthdayWhatsAppLink(name, phone) {
  const tel = normalizePhone(phone);
  if (!tel) return null;
  const first = String(name || "").trim().split(/\s+/)[0] || "";
  return `https://api.whatsapp.com/send?phone=${tel.replace("+", "")}&text=${encodeURIComponent(BIRTHDAY_MESSAGE(first))}`;
}

function BirthdaysWidget({ daysAhead = 7, showEmpty = true }) {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ftRows, scRows, cmRows] = await Promise.all([
          sb("first_timers?select=id,full_name,phone,dob&dob=not.is.null&limit=2000").catch(() => []),
          sb("soul_care_contacts?select=id,full_name,phone,dob&dob=not.is.null&limit=2000").catch(() => []),
          sb("church_members?select=id,full_name,phone,dob&dob=not.is.null&limit=3000").catch(() => []),
        ]);
        if (cancelled) return;
        // Merge all pools, dedupe by normalized phone (first source wins)
        const seen = new Set();
        const rows = [];
        const take = (list, prefix) => (list || []).forEach(r => {
          const k = phoneKey(r.phone) || `${prefix}-${r.id}`;
          if (!seen.has(k)) { seen.add(k); rows.push({ ...r, id: `${prefix}-${r.id}` }); }
        });
        take(cmRows, "cm");   // members registry first — most authoritative for member care
        take(scRows, "sc");
        take(ftRows, "ft");
        const upcoming = rows
          .map(r => {
            const info = nextBirthdayInfo(r.dob);
            return info && info.daysUntil < daysAhead ? { ...r, ...info } : null;
          })
          .filter(Boolean)
          .sort((a, b) => a.daysUntil - b.daysUntil || a.full_name.localeCompare(b.full_name));
        setPeople(upcoming);
      } catch { if (!cancelled) setPeople([]); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [daysAhead]);

  if (loading) return null;
  if (people.length === 0 && !showEmpty) return null;

  return (
    <div style={{ ...card, background: C.goldLight, border: `1px solid ${C.gold}30`, borderLeft: `3px solid ${C.gold}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: people.length ? 12 : 0 }}>
        <Gift size={14} color={C.goldDark} />
        <span style={{
          fontSize: 12, fontWeight: 700, fontFamily: F.head,
          textTransform: "uppercase", letterSpacing: ".07em", color: C.goldDark,
        }}>
          Birthdays This Week
        </span>
        {people.length > 0 && (
          <span style={badge(C.goldDark, "#fff", { fontSize: 11 })}>{people.length}</span>
        )}
        {people.length === 0 && (
          <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>
            None in the next {daysAhead} days
          </span>
        )}
      </div>

      {people.length > 0 && (
        <div style={{ display: "grid", gap: 6 }}>
          {people.map(p => {
            const isToday = p.daysUntil === 0;
            const waLink  = birthdayWhatsAppLink(p.full_name, p.phone);
            return (
              <div key={p.id} style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                background: C.surface, borderRadius: 8, padding: "8px 12px",
                border: `1px solid ${isToday ? C.gold : C.border}`,
              }}>
                <Avatar name={p.full_name} size={30} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, fontFamily: F.head }}>
                    {isToday ? "🎂 " : ""}{p.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    <PhoneLink phone={p.phone} />
                  </div>
                </div>
                <span style={badge(C.goldDark, C.goldLight, { fontSize: 11 })}>
                  <Gift size={10} />
                  {isToday ? `Today · turns ${p.turning}` : `${p.dateLabel} · turns ${p.turning}`}
                </span>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    style={{ ...btn("gold", { padding: "6px 12px", fontSize: 12 }), textDecoration: "none" }}>
                    <MessageCircle size={12} />Send Wishes
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: NAVIGATION — SIDEBAR & MOBILE HEADER                             ║
// ║  Includes: Sidebar, MobileHeader                                           ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function Sidebar({ role, active, setActive, user, onLogout, mobileOpen, onClose, flagCount = 0 }) {
  const ri = ROLE_META[role] || ROLE_META.expteam;
  const sections  = buildNavSections(role);
  const isGrouped = sections.length > 0 && sections[0].title !== null;

  const sectionOf = (id) => {
    const s = sections.find(sec => sec.items.some(i => i.id === id));
    return s ? s.title : null;
  };

  // Section containing the active page starts (and stays) expanded.
  const [openSections, setOpenSections] = useState(() => new Set([sectionOf(active)]));

  useEffect(() => {
    const t = sectionOf(active);
    if (t) {
      setOpenSections(prev => {
        if (prev.has(t)) return prev;
        const n = new Set(prev); n.add(t); return n;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, role]);

  const toggleSection = (title) =>
    setOpenSections(prev => {
      const n = new Set(prev);
      n.has(title) ? n.delete(title) : n.add(title);
      return n;
    });

  const renderItem = (item) => {
    const on = active === item.id;
    const Icon = NAV_ICONS[item.id] || FileText;
    const isFlag = item.id === "flagged" || item.id === "sc_flagged";
    return (
      <button key={item.id} onClick={() => { setActive(item.id); onClose?.(); }}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: isGrouped ? "8px 10px 8px 14px" : "9px 10px",
          border: "none", cursor: "pointer", borderRadius: 8, marginBottom: 2,
          background: on ? C.sidebarActive : "transparent",
          color: on ? C.goldMid : "rgba(255,255,255,.6)",
          fontSize: 13, fontWeight: on ? 700 : 400, fontFamily: F.body,
          textAlign: "left", transition: "all .15s",
        }}
        onMouseOver={e => !on && (e.currentTarget.style.background = C.sidebarHover)}
        onMouseOut={e => !on && (e.currentTarget.style.background = "transparent")}>
        <Icon size={15} strokeWidth={on ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{item.label}</span>
        {isFlag && flagCount > 0 && (
          <span style={{
            background: C.flag, color: "#fff", borderRadius: 10,
            fontSize: 10, fontWeight: 700, padding: "1px 7px", lineHeight: 1.6,
          }}>{flagCount}</span>
        )}
        {on && <ChevronRight size={12} style={{ opacity: .5 }} />}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && (
        <div onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 98 }} />
      )}
      <div className={`sidebar${mobileOpen ? " open" : ""}`}
        style={{
          width: "var(--sidebar-w)", background: C.sidebar,
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100,
          boxShadow: "2px 0 12px rgba(0,0,0,.15)", overflow: "hidden",
        }}>

        {/* Brand */}
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Logo size={38} />
            <div>
              <div style={{
                color: "#fff", fontWeight: 800, fontSize: 13, fontFamily: F.head,
                lineHeight: 1.2, letterSpacing: "-.01em",
              }}>THE ENVOYS</div>
              <div style={{ color: C.goldMid, fontSize: 10, letterSpacing: ".06em", marginTop: 1 }}>
                EnvoysByte
              </div>
            </div>
          </div>
          {/* User chip */}
          <div style={{
            background: "rgba(255,255,255,.07)", borderRadius: 8, padding: "8px 10px",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: `${ri.color}30`, border: `1.5px solid ${ri.color}60`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: ri.color, fontFamily: F.head, flexShrink: 0,
            }}>
              {(user || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                color: "rgba(255,255,255,.9)", fontSize: 12, fontWeight: 600,
                fontFamily: F.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {user}
              </div>
              <div style={{ ...badge(ri.color, `${ri.color}22`), fontSize: 10, padding: "1px 7px", marginTop: 2 }}>
                {ri.label}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: "1 1 auto", minHeight: 0, padding: "10px 8px", overflowY: "auto" }}>
          {sections.map((sec, idx) => {
            if (sec.title === null) {
              // Flat list — roles without grouping
              return sec.items.map(renderItem);
            }
            const isOpen = openSections.has(sec.title);
            const containsActive = sec.items.some(i => i.id === active);
            const sectionFlagCount = sec.items.some(i => i.id === "flagged" || i.id === "sc_flagged")
              ? flagCount : 0;
            return (
              <div key={sec.title} style={{ marginBottom: idx < sections.length - 1 ? 4 : 0 }}>
                <button onClick={() => toggleSection(sec.title)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 10px", border: "none", cursor: "pointer",
                    borderRadius: 8, background: "transparent",
                    color: containsActive ? C.goldMid : "rgba(255,255,255,.45)",
                    fontSize: 10, fontWeight: 700, fontFamily: F.head,
                    letterSpacing: ".08em", textTransform: "uppercase",
                    textAlign: "left", transition: "color .15s",
                  }}
                  onMouseOver={e => (e.currentTarget.style.color = "rgba(255,255,255,.75)")}
                  onMouseOut={e => (e.currentTarget.style.color = containsActive ? C.goldMid : "rgba(255,255,255,.45)")}>
                  <span style={{ flex: 1 }}>{sec.title}</span>
                  {!isOpen && sectionFlagCount > 0 && (
                    <span style={{
                      background: C.flag, color: "#fff", borderRadius: 10,
                      fontSize: 9, fontWeight: 700, padding: "1px 6px", lineHeight: 1.6,
                    }}>{sectionFlagCount}</span>
                  )}
                  {!isOpen && containsActive && <span style={dot(C.goldMid)} />}
                  <ChevronDown size={12}
                    style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                </button>
                {isOpen && <div>{sec.items.map(renderItem)}</div>}
              </div>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,.06)", flexShrink: 0 }}>
          <button onClick={onLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 10px", borderRadius: 8, border: "none",
              background: "transparent", color: "rgba(255,255,255,.4)",
              cursor: "pointer", fontSize: 13, fontFamily: F.body, transition: "all .15s",
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = C.sidebarHover;
              e.currentTarget.style.color = "rgba(255,255,255,.7)";
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(255,255,255,.4)";
            }}>
            <LogOut size={14} strokeWidth={1.8} />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>
  );
}

function MobileHeader({ onMenu, title }) {
  return (
    <div className="mob-header"
      style={{
        position: "sticky", top: 0, zIndex: 50, background: C.sidebar,
        padding: "12px 16px", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}>
      <button onClick={onMenu} style={{
        background: "none", border: "none", color: "#fff",
        fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, display: "flex",
      }}>
        <Menu size={22} />
      </button>
      <Logo size={26} />
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: F.head }}>
        {title || "The Envoys"}
      </span>
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: NAVIGATION — SIDEBAR & MOBILE HEADER                         ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: DATA OFFICER — FIRST-TIMERS REGISTRY                             ║
// ║  Includes: AREAS constant, BLANK_FT, FirstTimerForm, FirstTimersList,     ║
// ║            PublicForm (self-registration), QRCodePage, CSVImport          ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const AREAS = [
  { value: "billionpreneur", label: "Billionpreneur Hub" },
  { value: "ceos",           label: "CEOs Hub" },
  { value: "directors",      label: "Directors Hub" },
  { value: "scholars",       label: "Scholars Hub" },
  { value: "creatives",      label: "Creatives Hub" },
  { value: "ministry",       label: "Ministry Hub" },
  { value: "indecisive",     label: "Indecisive" },
];

// ─────────────────────────────────────────────────────────────────────────────
// v6.2 — duplicate detection helpers
// phoneKey(): reduces any NG phone format to a comparable 10-digit key.
//   "0803 123 4567" / "+2348031234567" / "2348031234567" -> "8031234567"
// findFirstTimerDupes(): all first_timers sharing that key (client-side
// compare — PostgREST can't normalize formats server-side).
// ─────────────────────────────────────────────────────────────────────────────

function generatePresentationSlug() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"; // no ambiguous 0/O, 1/l/I
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function tint(color, alphaHex) {
  const pct = Math.round((parseInt(alphaHex, 16) / 255) * 100);
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

function phoneKey(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return d.length >= 7 ? d.slice(-10) : "";
}

async function findFirstTimerDupes(phone, excludeId) {
  const key = phoneKey(phone);
  if (!key) return [];
  const rows = await sb(
    "first_timers?select=id,full_name,phone,service_date,membership_decision&limit=3000"
  ).catch(() => []);
  return (rows || []).filter(r => r.id !== excludeId && phoneKey(r.phone) === key);
}

const BLANK_FT = {
  full_name: "", phone: "", gender: "", email: "", dob: "",
  marital_status: "", house_address: "", nearest_landmark: "",
  membership_decision: "", life_stage: "", heard_from: "",
  areas_of_interest: [], service_feedback: "",
  service_date: new Date().toISOString().slice(0, 10),
};

function FirstTimerForm({ onSuccess, editData, onCancel, publicMode = false }) {
  const [form, setForm] = useState(() =>
    editData
      ? { ...editData, areas_of_interest: parseAreas(editData.areas_of_interest) }
      : { ...BLANK_FT }
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const settersRef = useRef({});

  const set = useCallback((key) => {
    if (!settersRef.current[key]) {
      settersRef.current[key] = (valOrEvt) => {
        const val = valOrEvt && valOrEvt.target !== undefined ? valOrEvt.target.value : valOrEvt;
        setForm(f => ({ ...f, [key]: val }));
      };
    }
    return settersRef.current[key];
  }, []);

  // ── v6.2: live duplicate check on the phone field (600ms debounce) ──
  const [dupes, setDupes]           = useState([]);
  const [checkingDupes, setChecking] = useState(false);
  const [saveAnyway, setSaveAnyway] = useState(false);

  useEffect(() => {
    setSaveAnyway(false);
    if (!phoneKey(form.phone)) { setDupes([]); return; }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      const found = await findFirstTimerDupes(form.phone, editData?.id || null);
      if (!cancelled) { setDupes(found); setChecking(false); }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.phone, editData?.id]);

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.gender) {
      setErr("Full name, phone and gender are required.");
      return;
    }
    if (!editData && !publicMode && dupes.length > 0 && !saveAnyway) {
      setSaveAnyway(true);
      setErr("This phone number may already be registered (see the warning below). If this is genuinely a different person, press the button again to save anyway.");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const nullIfEmpty = (v) => (v === "" || v === undefined || v === null) ? null : v;
      const payload = {
        full_name:           form.full_name.trim(),
        phone:               form.phone.trim(),
        email:               nullIfEmpty(form.email),
        gender:              nullIfEmpty(form.gender),
        dob:                 nullIfEmpty(form.dob),
        marital_status:      nullIfEmpty(form.marital_status),
        house_address:       nullIfEmpty(form.house_address),
        nearest_landmark:    nullIfEmpty(form.nearest_landmark),
        membership_decision: nullIfEmpty(form.membership_decision),
        life_stage:          nullIfEmpty(form.life_stage),
        heard_from:          nullIfEmpty(form.heard_from),
        areas_of_interest:   JSON.stringify(form.areas_of_interest || []),
        service_feedback:    nullIfEmpty(form.service_feedback),
        service_date:        form.service_date || new Date().toISOString().slice(0, 10),
      };
      if (editData?.id) {
        await sb(`first_timers?id=eq.${editData.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("first_timers", { method: "POST", body: JSON.stringify(payload) });
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={card} className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader
        title={editData ? "Edit Record" : "New First-Timer"}
        subtitle={`Service date: ${form.service_date}`}
        action={onCancel && (
          <button style={btn("ghost")} onClick={onCancel}>
            <ArrowLeft size={14} />Back
          </button>
        )}
      />
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <div style={{ marginBottom: 24 }}>
        <SH title="Personal Information" icon={Users} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Full Name" id="fn" required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Okafor" />
          <FieldInput label="Phone Number" id="ph" required value={form.phone} onChange={set("phone")} placeholder="+234 xxx xxx xxxx" />
        </div>

        {checkingDupes && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: -8, marginBottom: 12 }}>
            Checking for existing records…
          </div>
        )}
        {!checkingDupes && dupes.length > 0 && (
          publicMode ? (
            <div style={{
              background: C.goldLight, border: `1px solid ${C.gold}30`, borderRadius: 8,
              padding: "10px 14px", fontSize: 13, color: C.goldDark, marginTop: -6, marginBottom: 14,
              display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.6,
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>It looks like this phone number may already be registered with us — no problem! You can still submit, and our team will make sure your details are up to date.</span>
            </div>
          ) : (
            <div style={{
              background: C.amberLight, border: `1px solid ${C.amber}35`,
              borderLeft: `3px solid ${C.amber}`, borderRadius: 8,
              padding: "10px 14px", marginTop: -6, marginBottom: 14,
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: C.amber, fontFamily: F.head,
                textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <AlertCircle size={12} />Possible duplicate — this number is already on record
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {dupes.slice(0, 3).map(d => (
                  <div key={d.id} style={{ fontSize: 12, color: C.textSecondary }}>
                    <strong>{d.full_name}</strong> · {d.phone} · registered {d.service_date || "—"}
                    {d.membership_decision ? ` · ${d.membership_decision}` : ""}
                  </div>
                ))}
                {dupes.length > 3 && (
                  <div style={{ fontSize: 11, color: C.textMuted }}>…and {dupes.length - 3} more</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                If this is the same person, edit their existing record from the First-Timers list instead of creating a new one.
              </div>
            </div>
          )
        )}
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Gender" id="gd" type="select" required value={form.gender} onChange={set("gender")}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
          <FieldInput label="Email Address" id="em" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
        </div>
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Date of Birth" id="db" type="date" value={form.dob} onChange={set("dob")} />
          <FieldInput label="Marital Status" id="ms" type="select" value={form.marital_status} onChange={set("marital_status")}
            options={[
              { value: "Single", label: "Single" }, { value: "Married", label: "Married" },
              { value: "Divorced", label: "Divorced" }, { value: "Widowed", label: "Widowed" },
            ]} />
        </div>
        <FieldInput label="House Address" id="ha" value={form.house_address} onChange={set("house_address")} placeholder="Street, City" />
        <FieldInput label="Nearest Landmark" id="nl" value={form.nearest_landmark} onChange={set("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <SH title="Visit Details" icon={Star} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Membership Decision" id="md" type="select" required value={form.membership_decision} onChange={set("membership_decision")}
            options={[
              { value: "Member", label: "Member" }, { value: "Visitor", label: "Visitor" },
              { value: "Undecided", label: "Undecided" },
            ]} />
          <FieldInput label="Life Stage" id="ls" type="select" value={form.life_stage} onChange={set("life_stage")}
            options={[
              { value: "Student", label: "Student" }, { value: "Employee", label: "Employee" },
              { value: "Business Owner", label: "Business Owner" },
            ]} />
        </div>
        <FieldInput label="How did you hear about us?" id="hf" value={form.heard_from} onChange={set("heard_from")} placeholder="e.g. Friend, Social media, Flyer…" />
        <FieldInput label="Area of Interest" id="ai" type="multicheck" value={form.areas_of_interest} onChange={set("areas_of_interest")} options={AREAS} />
        <FieldInput label="Service Feedback" id="sf" type="textarea" value={form.service_feedback} onChange={set("service_feedback")} placeholder="What was your experience like today?" />
      </div>

      <button
        style={{
          ...btn(saveAnyway && dupes.length > 0 ? "amber" : "primary"),
          width: "100%", padding: "12px", fontSize: 15,
        }}
        onClick={submit}
        disabled={loading}>
        {loading
          ? "Saving…"
          : saveAnyway && dupes.length > 0
            ? "Save Anyway (Possible Duplicate)"
            : editData ? "Update Record" : "Submit"}
      </button>
    </div>
  );
}

function PublicForm() {
  const [done, setDone] = useState(false);
  if (done) return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: F.body,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }}>
      <div style={{ ...card, maxWidth: 480, textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: C.greenLight,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
        }}>
          <CheckCircle size={32} color={C.green} />
        </div>
        <h2 style={{ color: C.green, margin: "0 0 10px", fontFamily: F.head, fontWeight: 800 }}>
          Thank you for worshipping with us! <br /> We Honour You! You're Amazing!
        </h2>
        <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.7 }}>
          We're glad you joined us today. Our Envoys Experience Team will be in touch shortly.
        </p>
      </div>
    </div>
  );
  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo size={80} /></div>
          <h1 style={{ margin: 0, color: C.textPrimary, fontSize: 24, fontFamily: F.head, fontWeight: 800 }}>
            Welcome to <span style={{ color: C.green }}>The Envoys</span>
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Fill in your details so we can stay connected with you
          </p>
        </div>
        <FirstTimerForm onSuccess={() => setDone(true)} publicMode />
      </div>
    </div>
  );
}

function QRCodePage() {
  const liveUrl = window.location.origin + "/register";
  const [custom, setCustom] = useState(liveUrl);
  const [display, setDisplay] = useState(liveUrl);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=16&color=1A7A3C&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
  const download = () => {
    const a = document.createElement("a");
    a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&color=1A7A3C&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
    a.download = "envoys-registration-qr.png";
    a.target = "_blank";
    a.click();
  };
  return (
    <div className="page-enter">
      <PageHeader title="Registration QR Code" subtitle="Display or print this QR code — visitors scan it to open the first-timer registration form." />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ ...card, textAlign: "center", flex: "0 0 auto" }}>
          <img src={qrSrc} alt="QR Code" width={240} height={240}
            style={{ display: "block", borderRadius: 8, border: `1px solid ${C.border}` }} />
          <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, wordBreak: "break-all", maxWidth: 240 }}>
            {display}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button style={btn("primary")} onClick={download}><Download size={14} />Download PNG</button>
            <button style={btn("outline")} onClick={() => window.open(display, "_blank")}>Open Link</button>
          </div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head, marginBottom: 4 }}>Form URL</div>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Auto-set to your live site. Update below if your URL has changed.
          </p>
          <FieldInput label="Registration URL" id="rurl" value={custom}
            onChange={e => setCustom(e.target.value)} placeholder="https://your-site.vercel.app/#register" />
          <button style={{ ...btn("gold"), width: "100%" }} onClick={() => setDisplay(custom)}>
            Update QR Code
          </button>
          <div style={{
            marginTop: 20, padding: 14, background: C.greenXLight, borderRadius: 8,
            fontSize: 12, color: C.textSecondary, lineHeight: 1.7,
          }}>
            <strong style={{ color: C.green }}>💡 Tip</strong><br />
            Download the PNG → print on a card, banner, or welcome screen.<br />
            Recommended print size: at least <strong>5 × 5 cm</strong> for reliable scanning.
          </div>
        </div>
      </div>
    </div>
  );
}

function FirstTimersList({ onEdit }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      let q = "first_timers?order=created_at.desc&limit=300";
      if (dateFrom) q += `&service_date=gte.${dateFrom}`;
      if (dateTo)   q += `&service_date=lte.${dateTo}`;
      setData((await sb(q)) || []);
    }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }, [dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  const filtered = data.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search)
  );

  const dc = {
    Member:    [C.green,    C.greenLight],
    Visitor:   [C.goldDark, C.goldLight],
    Undecided: [C.amber,    C.amberLight],
  };

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="First-Timers Registry" subtitle={`${data.length} record${data.length !== 1 ? "s" : ""}${(dateFrom || dateTo) ? " in date range" : " total"}`}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
                style={{ ...inputBase, width: 200, paddingLeft: 32 }} />
            </div>
            <button style={btn("ghost")} onClick={load}><RefreshCw size={14} /></button>
          </div>
        } />

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.greenXLight, borderRadius: 10, border: `1px solid ${C.greenBorder}`,
      }}>
        <Calendar size={14} color={C.green} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>
          Filter by service date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}>
              <X size={12} />Clear dates
            </button>
          )}
        </div>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const [col, bg] = dc[r.membership_decision] || [C.textMuted, C.bg];
            return (
              <div key={r.id} {...lift} style={{
                ...card, display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={r.full_name} size={40} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={r.phone} withWhatsApp /> · {r.service_date}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={badge(col, bg)}><span style={dot(col)} />{r.membership_decision || "–"}</span>
                  <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={() => onEdit(r)}>
                    <Edit3 size={12} />Edit
                  </button>
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Search size={28} style={{ marginBottom: 8, opacity: .4 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>No records found</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CSVImport({ onDone }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed); setErr(""); setSuccess("");
    };
    reader.readAsText(file);
  };

  const sanitizeMaritalStatus = (s) => {
    if (!s) return null;
    const c = s.toString().trim().toLowerCase();
    if (c === "single")   return "Single";
    if (c === "married")  return "Married";
    if (c === "divorced") return "Divorced";
    if (c === "widowed")  return "Widowed";
    return null;
  };
  const sanitizeGender = (g) => {
    if (!g) return null;
    const c = g.toString().trim().toLowerCase();
    if (c === "male")   return "Male";
    if (c === "female") return "Female";
    return null;
  };
  const sanitizeDecision = (d) => {
    if (!d) return null;
    const c = d.toString().trim().toLowerCase();
    if (c === "member")    return "Member";
    if (c === "visitor")   return "Visitor";
    if (c === "undecided") return "Undecided";
    return null;
  };
  const sanitizeLifeStage = (ls) => {
    if (!ls) return null;
    const c = ls.toString().trim().toLowerCase();
    if (c === "student")  return "Student";
    if (c === "employee") return "Employee";
    if (c === "business owner" || c === "businessowner") return "Business Owner";
    return null;
  };
  const cleanDate = (dateStr) => {
    if (!dateStr) return null;
    const s = dateStr.toString().trim();
    const parts = s.split(/[/-]/);
    if (parts.length === 3) {
      const [a, b, c2] = parts;
      if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c2.padStart(2, "0")}`;
      return `${c2}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
    }
    return null;
  };

  const importAll = async () => {
    if (!rows.length) return;
    setLoading(true); setErr("");
    try {
      const today = new Date().toISOString().slice(0, 10);
      const n = (v) => (v === "" || v === undefined || v === null) ? null : v;
      const payload = rows
        .map(r => ({
          full_name:           (r.full_name || r.name || "").toString().trim(),
          phone:               (r.phone || r.phone_number || "").toString().trim(),
          email:               n(r.email?.toString().trim()),
          house_address:       n((r.house_address || r.address || "").toString().trim()),
          nearest_landmark:    n((r.nearest_landmark || r.landmark || "").toString().trim()),
          heard_from:          n(r.heard_from?.toString().trim()),
          service_feedback:    n(r.service_feedback?.toString().trim()),
          gender:              sanitizeGender(r.gender),
          marital_status:      sanitizeMaritalStatus(r.marital_status),
          membership_decision: sanitizeDecision(r.membership_decision) || "Visitor",
          life_stage:          sanitizeLifeStage(r.life_stage),
          dob:                 cleanDate(r.dob || r.date_of_birth),
          service_date:        n(r.service_date) || today,
          areas_of_interest:   "[]",
        }))
        .filter(r => r.full_name && r.phone);

      if (!payload.length) {
        setErr("No valid rows found. Each row needs at least full_name and phone.");
        setLoading(false); return;
      }

      await sb("first_timers", { method: "POST", body: JSON.stringify(payload) });
      setSuccess(` ${payload.length} records imported successfully.`);
      toast.success("Import complete.");
      setRows([]);
      onDone?.();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      <SH title="Bulk CSV Import" icon={Upload} />
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
        Upload a CSV file to import multiple members at once. Required columns:{" "}
        <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>full_name</code>,{" "}
        <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>phone</code>. Optional: gender, email,
        house_address, nearest_landmark, marital_status, life_stage, membership_decision, service_date.
      </p>
      <Alert type="error"   msg={err}     onClose={() => setErr("")} />
      <Alert type="success" msg={success} onClose={() => setSuccess("")} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
        <button style={btn("outline")} onClick={() => fileRef.current.click()}>
          <Upload size={14} />Choose CSV File
        </button>
        {rows.length > 0 && (
          <button style={btn("primary")} onClick={importAll} disabled={loading}>
            {loading ? "Importing…" : `Import ${rows.length} rows`}
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: F.body }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {Object.keys(rows[0]).slice(0, 6).map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left", fontWeight: 600,
                    color: C.textSecondary, borderBottom: `1px solid ${C.border}`,
                  }}>{h}</th>
                ))}
                {Object.keys(rows[0]).length > 6 && (
                  <th style={{ padding: "8px 12px", color: C.textMuted, borderBottom: `1px solid ${C.border}` }}>…</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {Object.values(r).slice(0, 6).map((v, j) => (
                    <td key={j} style={{ padding: "7px 12px", color: C.textPrimary }}>{v || "—"}</td>
                  ))}
                  {Object.values(r).length > 6 && (
                    <td style={{ padding: "7px 12px", color: C.textMuted }}>…</td>
                  )}
                </tr>
              ))}
              {rows.length > 5 && (
                <tr>
                  <td colSpan={7} style={{ padding: "7px 12px", color: C.textMuted, fontStyle: "italic" }}>
                    …and {rows.length - 5} more rows
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v5.5)                        ║
// ║                                                                             ║
// ║  CHANGES FROM v7.1 (internal naming):                                      ║
// ║  1. Gender shown as (M) or (F) in parentheses after every first-timer      ║
// ║     name across the entire Experience Team module:                          ║
// ║       • PipelineBar tooltip                                                 ║
// ║       • CallQueue card rows                                                 ║
// ║       • CallBackQueue card rows                                             ║
// ║       • MyCallsView card rows                                               ║
// ║       • AssignCallsView card rows                                           ║
// ║       • LogFeedback header                                                  ║
// ║       • PipelineOverviewForm header + membership recommendation button      ║
// ║       • CompletedPipelines table rows                                       ║
// ║  2. Helper genderTag(row) added — returns " (M)", " (F)", or "".           ║
// ║     Uses first_timers.gender field (already fetched by useCallData).        ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// PASTE THIS ENTIRE BLOCK to replace the section currently bounded by:
//
//   // ╔══ MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v7.1) ══╗
//   ...
//   // ╚══ END MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v7.1) ══╝
//
// in EnvoysDashboard.jsx.  All imports, design tokens, and other modules
// remain exactly as they are — only this module is replaced.
// ─────────────────────────────────────────────────────────────────────────────

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v5.5)                        ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CONNECT_CENTERS = [
  "Agege", "Aboru/Iyana Ipaja", "Akute", "Ayobo", "Berger",
  "Command/Ikeja", "Egbeda", "Iju-Ishaga", "Magboro", "Mile 12",
  "Ogba", "Ojoo", "OPIC Estates", "Redemption City",
];

const NATURAL_GROUPS = ["Interphaze", "Solid Rock", "Royal Diadem"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — gender tag
// Returns " (M)", " (F)", or "" depending on the gender field of a row.
// Used inline after every first-timer name in this module.
// ─────────────────────────────────────────────────────────────────────────────

function genderTag(row) {
  if (!row) return "";
  const g = (row.gender || "").trim().toLowerCase();
  if (g === "male")   return " (M)";
  if (g === "female") return " (F)";
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — full caller profile tag (Gender + Marital + Life Stage)
// Used ONLY on Call Queue and Assign Calls, appended after the name.
// e.g. " (Male) - M - E" · " (Female) - S - S"
// ─────────────────────────────────────────────────────────────────────────────
function callerProfileTag(row) {
  if (!row) return "";

  const g = (row.gender || "").trim().toLowerCase();
  const gender = g === "male" ? "Male" : g === "female" ? "Female" : "";

  const marital = ({ married: "M", single: "S", divorced: "D", widowed: "W" })[
    (row.marital_status || "").trim().toLowerCase()
  ] || "";

  const l = (row.life_stage || "").trim().toLowerCase();
  const life =
    (l === "employee" || l === "employed") ? "E" :
    (l === "business owner" || l === "businessowner") ? "B" :
    (l === "student") ? "S" : "";

  let tag = gender ? ` (${gender})` : "";
  const extras = [marital, life].filter(Boolean);
  if (extras.length) tag += ` - ${extras.join(" - ")}`;
  return tag;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — pipeline utilities
// ─────────────────────────────────────────────────────────────────────────────

function weeksLogged(fbRows) {
  const weeks = new Set();
  (fbRows || []).forEach(r => { if (r.week_number) weeks.add(r.week_number); });
  return weeks;
}

function nextWeek(fbRows) {
  const done = weeksLogged(fbRows);
  for (let w = 1; w <= 3; w++) { if (!done.has(w)) return w; }
  return null;
}

function pipelineComplete(fbRows) {
  return nextWeek(fbRows) === null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineBar — compact 3-week progress indicator
// ─────────────────────────────────────────────────────────────────────────────

function PipelineBar({ fbRows, compact = false }) {
  const done     = weeksLogged(fbRows);
  const complete = pipelineComplete(fbRows);

  const weekColor = (w) => {
    if (!done.has(w)) return { bg: C.border, text: C.textMuted };
    const row  = (fbRows || []).find(r => r.week_number === w);
    const norm = normaliseStatus(row?.call_status);
    if (norm === "Reached")           return { bg: C.green,  text: "#fff" };
    if (norm === "Call Back")         return { bg: C.amber,  text: "#fff" };
    if (norm === "Incorrect Contact") return { bg: C.danger, text: "#fff" };
    return { bg: C.greenMid, text: "#fff" };
  };

  if (compact) {
    return (
      <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
        {[1, 2, 3].map(w => {
          const c = weekColor(w);
          return (
            <div key={w} style={{
              width: 20, height: 20, borderRadius: 4,
              background: c.bg, color: c.text,
              fontSize: 9, fontWeight: 700, fontFamily: F.head,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${done.has(w) ? "transparent" : C.border}`,
            }}>W{w}</div>
          );
        })}
        {complete && <span style={{ fontSize: 10, color: C.green, fontWeight: 700, marginLeft: 3 }}>✓</span>}
      </div>
    );
  }

  return (
    <div className="pbar" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {[1, 2, 3].map(w => {
        const c   = weekColor(w);
        const row = done.has(w) ? (fbRows || []).find(r => r.week_number === w) : null;
        return (
          <div key={w}
            title={row ? `Week ${w}: ${row.call_status} — ${row.caller_name || "—"}` : `Week ${w}: not logged`}
            style={{
              padding: "4px 10px", borderRadius: 6,
              background: c.bg, color: c.text,
              fontSize: 11, fontWeight: 700, fontFamily: F.head,
              border: `1.5px solid ${done.has(w) ? "transparent" : C.border}`,
              cursor: row ? "help" : "default",
              whiteSpace: "nowrap",
            }}>
            Week {w}
            {row && (
              <span style={{ marginLeft: 4, fontWeight: 400, fontSize: 10 }}>
                · {normaliseStatus(row.call_status)}
                {row.church_attendance ? ` · ${row.church_attendance === "Present" ? " In church" : " Absent"}` : ""}
              </span>
            )}
          </div>
        );
      })}
      {complete
        ? <span style={{ ...badge(C.green, C.greenLight, { fontSize: 11 }), marginLeft: 2 }}><CheckCircle size={10} />Pipeline complete</span>
        : <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 2 }}>Next: Week {nextWeek(fbRows)}</span>
      }
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useCallData — shared data loader
// Returns first_timers enriched with .fbRows[], .assignment, .overview
// NOTE: gender is already present on first_timers rows — no SQL change needed.
// ─────────────────────────────────────────────────────────────────────────────

function useCallData(dateFrom, dateTo) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [tick, setTick]       = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        let ftQuery = "first_timers?order=created_at.desc&limit=500";
        if (dateFrom) ftQuery += `&service_date=gte.${dateFrom}`;
        if (dateTo)   ftQuery += `&service_date=lte.${dateTo}`;

        const [ftRows, fbRows, asgRows, ovRows] = await Promise.all([
          sb(ftQuery),
          sb("call_feedback?select=*&order=created_at.asc"),
          sb("call_assignments?select=*").catch(() => []),
          sb("pipeline_overviews?select=*").catch(() => []),
        ]);

        const fbMap  = {};
        (fbRows  || []).forEach(f => {
          if (!fbMap[f.first_timer_id])  fbMap[f.first_timer_id] = [];
          fbMap[f.first_timer_id].push(f);
        });
        const asgMap = {};
        (asgRows || []).forEach(a => { asgMap[a.first_timer_id] = a; });
        const ovMap  = {};
        (ovRows  || []).forEach(o => { ovMap[o.first_timer_id]  = o; });

        if (!cancelled) {
          setData((ftRows || []).map(r => ({
            ...r,
            fbRows:     fbMap[r.id]  || [],
            assignment: asgMap[r.id] || null,
            overview:   ovMap[r.id]  || null,
          })));
        }
      } catch (e) { if (!cancelled) setErr(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tick, dateFrom, dateTo]);

  return { data, loading, err, reload };
}

// ─────────────────────────────────────────────────────────────────────────────
// AssignCallsView — experienceadmin / admin only
// Change: name shown as "Full Name (M)" or "Full Name (F)"
// ─────────────────────────────────────────────────────────────────────────────

function AssignCallsView({ currentUser, onViewCompleted }) {
  const { data, loading, err, reload } = useCallData();
  const { options: teamOptions, loading: teamLoading } = useRoleUsers("expteam");

  const [selectedMember, setSelectedMember] = useState("");
  const [search, setSearch]                 = useState("");
  const [filter, setFilter]                 = useState("unassigned");
  const [saving, setSaving]                 = useState(false);
  const [msg, setMsg]                       = useState("");
  const [msgType, setMsgType]               = useState("success");
  const [pendingAssign, setPendingAssign]   = useState({});

  const filtered = data.filter(r => {
    const matchSearch = !search ||
      r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.phone?.includes(search);
    if (filter === "unassigned") return matchSearch && !r.assignment;
    if (filter === "assigned")   return matchSearch && !!r.assignment;
    if (filter === "complete")   return matchSearch && pipelineComplete(r.fbRows);
    if (filter === "incomplete") return matchSearch && !pipelineComplete(r.fbRows);
    return matchSearch;
  });

  const assignedCount   = data.filter(r => !!r.assignment).length;
  const unassignedCount = data.filter(r => !r.assignment).length;
  const completeCount   = data.filter(r => pipelineComplete(r.fbRows)).length;

  const bulkAssign = async () => {
    if (!selectedMember) { setMsg("Select a team member first."); setMsgType("warn"); return; }
    const targets = data.filter(r => !r.assignment);
    if (!targets.length) { setMsg("No unassigned contacts to assign."); setMsgType("warn"); return; }
    setSaving(true); setMsg("");
    try {
      const payload = targets.map(r => ({
        first_timer_id: r.id,
        assigned_to:    selectedMember,
        assigned_by:    currentUser,
      }));
      for (let i = 0; i < payload.length; i += 50) {
        await sb("call_assignments", {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=representation",
          body: JSON.stringify(payload.slice(i, i + 50)),
        });
      }
      setMsg(`${targets.length} contact${targets.length !== 1 ? "s" : ""} assigned to ${selectedMember}.`);
      setMsgType("success");
      reload();
    } catch (e) { setMsg(e.message); setMsgType("error"); }
    setSaving(false);
  };

  const saveAssignment = async (ftId) => {
    const member = pendingAssign[ftId];
    if (!member) return;
    setSaving(true);
    try {
      const existing = data.find(r => r.id === ftId)?.assignment;
      if (existing) {
        await sb(`call_assignments?id=eq.${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ assigned_to: member, assigned_by: currentUser }),
        });
      } else {
        await sb("call_assignments", {
          method: "POST",
          body: JSON.stringify({ first_timer_id: ftId, assigned_to: member, assigned_by: currentUser }),
        });
      }
      setPendingAssign(p => { const n = { ...p }; delete n[ftId]; return n; });
      setMsg(`Assigned to ${member}.`); setMsgType("success"); reload();
    } catch (e) { setMsg(e.message); setMsgType("error"); }
    setSaving(false);
  };

  const removeAssignment = async (ftId, asgId) => {
    setSaving(true);
    try {
      await sb(`call_assignments?id=eq.${asgId}`, { method: "DELETE", prefer: "return=minimal" });
      setMsg("Assignment removed."); setMsgType("success"); reload();
    } catch (e) { setMsg(e.message); setMsgType("error"); }
    setSaving(false);
  };

  const tabs = [
    { k: "unassigned", label: "Unassigned",       count: unassignedCount, col: C.gold      },
    { k: "assigned",   label: "Assigned",          count: assignedCount,   col: C.green     },
    { k: "complete",   label: "Pipeline Complete", count: completeCount,   col: C.greenMid  },
    { k: "all",        label: "All",               count: data.length,     col: C.textMuted },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader
        title="Assign Calls"
        subtitle="Allocate first-timer contacts to Experience Team members for follow-up"
        action={
          <button style={btn("primary", { background: C.blue })} onClick={onViewCompleted}>
            <FileText size={14} />Completed Pipelines
          </button>
        }
      />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Contacts"  value={data.length}      icon={Users}       accent={C.green}    />
        <StatCard label="Assigned"        value={assignedCount}    icon={UserCheck}   accent={C.greenMid} />
        <StatCard label="Unassigned"      value={unassignedCount}  icon={AlertCircle} accent={C.gold}
          sub={unassignedCount > 0 ? "Need assignment" : "All assigned"} />
      </div>

      {/* Bulk assign panel */}
      <div style={{
        ...card, marginBottom: 20, padding: "1rem 1.25rem",
        background: C.blueLight, border: `1px solid ${C.blue}22`,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 10,
          fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".07em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <Zap size={11} />Bulk Assignment
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
              Assign all <strong>{unassignedCount}</strong> unassigned contacts to:
            </div>
            {teamLoading ? (
              <div style={{ ...inputBase, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />Loading…
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)}
                style={{ ...inputBase, cursor: "pointer" }}>
                <option value="">Select team member</option>
                {teamOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </div>
          <button
            style={{
              ...btn("primary", { background: C.blue }),
              opacity: (!selectedMember || unassignedCount === 0) ? .5 : 1,
            }}
            onClick={bulkAssign}
            disabled={saving || !selectedMember || unassignedCount === 0}>
            <UserCheck size={14} />
            {saving ? "Saving…" : `Assign ${unassignedCount} contacts`}
          </button>
        </div>
      </div>

      <Alert type={msgType} msg={msg} onClose={() => setMsg("")} />

      {/* Filter tabs + search */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? (t.col || C.green) : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? (t.col || C.green) : C.border}`,
            }}>
            {t.label} ({t.count})
          </button>
        ))}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ ...inputBase, width: 180, paddingLeft: 30 }} />
        </div>
        <button style={btn("ghost", { padding: "6px 10px" })} onClick={reload}><RefreshCw size={13} /></button>
      </div>

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const complete = pipelineComplete(r.fbRows);
            const pending  = pendingAssign[r.id];
            // ── v5.6: name + gender + marital + life stage ──
            const displayName = `${r.full_name}${callerProfileTag(r)}`;
            return (
              <div key={r.id} style={{
                ...card, padding: "12px 16px",
                borderLeft: `3px solid ${complete ? C.green : r.assignment ? C.blue : C.gold}`,
              }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 220 }}>
                    <Avatar name={r.full_name} />
                    <div>
                      {/* ── gender tag in name ── */}
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={r.phone} withWhatsApp /> · {r.service_date}</div>
                      <div style={{ marginTop: 5 }}><PipelineBar fbRows={r.fbRows} compact /></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {complete && (
                      <span style={badge(C.green, C.greenLight, { fontSize: 11 })}>
                        <CheckCircle size={10} />Pipeline Complete
                      </span>
                    )}
                    {r.assignment && !pending ? (
                      <>
                        <span style={badge(C.blue, C.blueLight, { fontSize: 11 })}>
                          <UserCheck size={10} />{r.assignment.assigned_to}
                        </span>
                        {complete ? (
                          <span
                            style={badge(C.textMuted, C.bg, { fontSize: 11 })}
                            title="Locked — the 3-week pipeline is complete">
                            <Shield size={10} />Locked
                          </span>
                        ) : (
                          <>
                            <button style={btn("ghost", { padding: "5px 10px", fontSize: 11 })}
                              onClick={() => setPendingAssign(p => ({ ...p, [r.id]: r.assignment.assigned_to }))}>
                              <Edit3 size={10} />Reassign
                            </button>
                            <button style={btn("danger", { padding: "5px 10px", fontSize: 11 })}
                              onClick={() => removeAssignment(r.id, r.assignment.id)} disabled={saving}>
                              <X size={10} />Unassign
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        {teamLoading ? (
                          <span style={{ fontSize: 12, color: C.textMuted }}>Loading…</span>
                        ) : (
                          <select
                            value={pending ?? ""}
                            onChange={e => setPendingAssign(p => ({ ...p, [r.id]: e.target.value }))}
                            style={{ ...inputBase, width: 180, padding: "6px 10px", fontSize: 13 }}>
                            <option value="">Select caller</option>
                            {teamOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        )}
                        {pending && (
                          <>
                            <button style={btn("primary", { padding: "6px 14px", fontSize: 12, background: C.blue })}
                              onClick={() => saveAssignment(r.id)} disabled={saving}>
                              {saving ? "…" : "Save"}
                            </button>
                            <button style={btn("ghost", { padding: "6px 10px", fontSize: 12 })}
                              onClick={() => setPendingAssign(p => { const n = { ...p }; delete n[r.id]; return n; })}>
                              <X size={12} />
                            </button>
                          </>
                        )}
                        {!pending && !r.assignment && (
                          <span style={badge(C.gold, C.goldLight, { fontSize: 11 })}>Unassigned</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <UserCheck size={28} style={{ marginBottom: 8, opacity: .4 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>No contacts in this category</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CallQueue — role-aware; experienceadmin sees expandable week detail
// Change: name shown as "Full Name (M/F)"
// ─────────────────────────────────────────────────────────────────────────────

function CallQueue({ onLogFeedback, onEditWeek, currentUserRole = "expteam", currentUser = "" }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const { data, loading, err, reload } = useCallData(dateFrom, dateTo);
  const [filter, setFilter]     = useState("pending");
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState(null);
  const clearDates = () => { setDateFrom(""); setDateTo(""); };
  const isAdmin = currentUserRole === "experienceadmin" || currentUserRole === "admin";

  const categorise = (r) => {
    if (pipelineComplete(r.fbRows)) return "complete";
    const latestFb = r.fbRows[r.fbRows.length - 1];
    if (!latestFb) return "pending";
    const norm = normaliseStatus(latestFb.call_status);
    if (norm === "Reached")           return "reached";
    if (norm === "Call Back")         return "callback";
    if (norm === "Incorrect Contact") return "incorrect";
    return "pending";
  };

  const searched = data.filter(r =>
    !search ||
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search)
  );

  const visible = isAdmin
    ? searched
    : searched.filter(r =>
        r.assignment?.assigned_to === currentUser ||
        r.fbRows.some(f => f.caller_name === currentUser)
      );

  const pending   = visible.filter(r => categorise(r) === "pending");
  const reached   = visible.filter(r => categorise(r) === "reached");
  const callback  = visible.filter(r => categorise(r) === "callback");
  const incorrect = visible.filter(r => categorise(r) === "incorrect");
  const complete  = visible.filter(r => categorise(r) === "complete");
  const views     = { pending, reached, callback, incorrect, complete, all: visible };
  const filtered  = views[filter] || visible;

  const tabs = [
    { k: "pending",   label: "Pending",   count: pending.length,   col: C.gold      },
    { k: "callback",  label: "Call Back", count: callback.length,  col: C.amber     },
    { k: "reached",   label: "Reached",   count: reached.length,   col: C.green     },
    { k: "incorrect", label: "Incorrect", count: incorrect.length, col: C.danger    },
    { k: "complete",  label: "Complete",  count: complete.length,  col: C.greenMid  },
    { k: "all",       label: "All",       count: visible.length,   col: C.textMuted },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Call Queue" subtitle="3-week follow-up pipeline for every first-timer"
        action={
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ ...inputBase, width: 180, paddingLeft: 30 }} />
          </div>
        } />

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.greenXLight, borderRadius: 10, border: `1px solid ${C.greenBorder}`,
      }}>
        <Calendar size={14} color={C.green} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>
          Filter by service date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}>
              <X size={12} />Clear dates
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? t.col : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? t.col : C.border}`,
            }}>
            {t.label} <span style={{ opacity: .8 }}>({t.count})</span>
          </button>
        ))}
        <button style={{ ...btn("ghost", { padding: "6px 10px", marginLeft: "auto" }) }} onClick={reload}>
          <RefreshCw size={13} />
        </button>
      </div>

      <Alert type="error" msg={err} onClose={() => {}} />

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const latestFb   = r.fbRows[r.fbRows.length - 1];
            const complete   = pipelineComplete(r.fbRows);
            const sm         = latestFb
              ? statusMeta(latestFb.call_status)
              : { color: C.gold, bg: C.goldLight, label: "Pending" };
            const nxt        = nextWeek(r.fbRows);
            const isOpen     = expanded === r.id;
            const isMyContact = isAdmin ||
              r.assignment?.assigned_to === currentUser ||
              r.fbRows.some(f => f.caller_name === currentUser);
            // ── v5.6: name + gender + marital + life stage ──
            const displayName = `${r.full_name}${callerProfileTag(r)}`;

            return (
              <div key={r.id} style={{
                ...card, padding: 0, overflow: "hidden",
                borderLeft: `3px solid ${complete ? C.greenMid : sm.color}`,
              }}>
                <div className="et-head" style={{
                  display: "flex", justifyContent: "space-between", flexWrap: "wrap",
                  gap: 10, padding: "12px 16px",
                  cursor: isAdmin ? "pointer" : "default",
                }}
                  onClick={() => isAdmin && setExpanded(isOpen ? null : r.id)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: sm.color, fontSize: 14, fontFamily: F.head,
                    }}>{r.full_name?.charAt(0)}</div>
                    <div style={{ minWidth: 0 }}>
                      {/* ── gender tag in name ── */}
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        <PhoneLink phone={r.phone} withWhatsApp /> · {r.membership_decision} · {r.service_date}
                      </div>
                      {r.assignment && (
                        <div style={{ fontSize: 11, color: C.blue, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <UserCheck size={10} />Assigned to <strong>{r.assignment.assigned_to}</strong>
                        </div>
                      )}
                      <div style={{ marginTop: 6 }}><PipelineBar fbRows={r.fbRows} /></div>
                    </div>
                  </div>
                  <div className="et-actions" style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0 }}>
                    {complete ? (
                      <span style={badge(C.greenMid, C.greenLight, { fontSize: 11 })}>
                        <CheckCircle size={10} />Complete
                      </span>
                    ) : isMyContact ? (
                      <>
                        <span style={badge(sm.color, sm.bg, { fontSize: 11 })}>
                          <span style={dot(sm.color)} />{sm.label}
                        </span>
                        <button style={btn("primary", { padding: "7px 14px", fontSize: 13 })}
                          onClick={e => { e.stopPropagation(); onLogFeedback(r); }}>
                          <Phone size={13} />Log Week {nxt}
                        </button>
                      </>
                    ) : (
                      <span style={badge(C.textMuted, C.bg, { fontSize: 11 })}>Not assigned to you</span>
                    )}
                    {isAdmin && (
                      <ChevronDown size={14} color={C.textMuted}
                        style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", alignSelf: "center" }} />
                    )}
                  </div>
                </div>

                {/* Expandable week detail — experienceadmin / admin only */}
                {isAdmin && isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
                    {r.fbRows.length === 0 ? (
                      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>No call logs yet.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                        {r.fbRows.map(fb => {
                          const fsm = statusMeta(fb.call_status);
                          return (
                            <div key={fb.id} style={{
                              background: C.bg, borderRadius: 8, padding: "10px 14px",
                              border: `1px solid ${C.border}`,
                            }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                                <span style={badge(fsm.color, fsm.bg, { fontSize: 11, fontFamily: F.head })}>
                                  Week {fb.week_number || "?"} · {fsm.label}
                                </span>
                                {fb.church_attendance && (
                                  <span style={badge(
                                    fb.church_attendance === "Present" ? C.green : C.danger,
                                    fb.church_attendance === "Present" ? C.greenLight : C.dangerLight,
                                    { fontSize: 11 }
                                  )}>
                                    {fb.church_attendance === "Present" ? " In church" : " Absent"}
                                  </span>
                                )}
                                {fb.flagged_for_pastoral && (
                                  <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={10} />Flagged</span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>
                                Called by <strong>{fb.caller_name || "—"}</strong>
                                {fb.experience_rating && <span style={{ marginLeft: 8 }}>· Rating: {fb.experience_rating}</span>}
                                {fb.returning && <span style={{ marginLeft: 8 }}>· Returning: {fb.returning}</span>}
                                {fb.follow_up_date && (
                                  <span style={{ marginLeft: 8, color: C.amber }}>
                                    · <Calendar size={10} style={{ verticalAlign: "middle" }} /> {fb.follow_up_date}
                                  </span>
                                )}
                              </div>
                              {fb.notes && (
                                <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{fb.notes}</div>
                              )}
                              {fb.flagged_for_pastoral && fb.flag_reason && (
                                <div style={{
                                  fontSize: 12, color: C.flag, marginTop: 6,
                                  background: C.flagLight, padding: "5px 8px", borderRadius: 5,
                                }}>🚩 {fb.flag_reason}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {r.overview && (
                      <div style={{
                        marginTop: 12, background: C.greenXLight, borderRadius: 8, padding: "10px 14px",
                        border: `1px solid ${C.greenBorder}`,
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6,
                          fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <CheckCircle size={11} />VIP Retention Overview
                        </div>
                        <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.8 }}>
                          <strong>Move to Membership:</strong>{" "}
                          <span style={{ color: r.overview.move_to_membership ? C.green : C.danger, fontWeight: 700 }}>
                            {r.overview.move_to_membership ? "Yes" : "No"}
                          </span>
                          {r.overview.natural_groups?.length > 0 && (
                            <><br /><strong>Natural Groups:</strong>{" "}{r.overview.natural_groups.join(", ")}</>
                          )}
                          {r.overview.connect_center && (
                            <><br /><strong>Connect Center:</strong>{" "}{r.overview.connect_center}</>
                          )}
                          {r.overview.overview_notes && (
                            <><br /><strong>Notes:</strong>{" "}{r.overview.overview_notes}</>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <CheckCircle size={28} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>No records in this category</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CallBackQueue — with assignment guard
// Change: name shown as "Full Name (M/F)"
// ─────────────────────────────────────────────────────────────────────────────

function CallBackQueue({ onLogFeedback, currentUser = "" }) {
  const { data, loading, err, reload } = useCallData();

  const callbacks = data.filter(r => {
    if (pipelineComplete(r.fbRows)) return false;
    const latest = r.fbRows[r.fbRows.length - 1];
    if (!latest) return false;
    const isCallBack = normaliseStatus(latest.call_status) === "Call Back";
    const isMine = r.assignment?.assigned_to === currentUser ||
      r.fbRows.some(f => f.caller_name === currentUser);
    return isCallBack && isMine;
  });

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Call Backs" subtitle={`${callbacks.length} contacts requesting a follow-up call`}
        action={<button style={btn("ghost", { padding: "6px 10px" })} onClick={reload}><RefreshCw size={13} /></button>} />
      <Alert type="error" msg={err} onClose={() => {}} />

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {callbacks.map(r => {
            const latest = r.fbRows[r.fbRows.length - 1];
            const nxt    = nextWeek(r.fbRows);
            // ── v5.5: name with gender tag ──
            const displayName = `${r.full_name}${genderTag(r)}`;
            return (
              <div key={r.id} style={{ ...card, padding: "12px 16px", borderLeft: `3px solid ${C.amber}` }}>
                <div className="et-head" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* ── gender tag in name ── */}
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={r.phone} withWhatsApp /> · {r.service_date}</div>
                    {latest?.follow_up_date && (
                      <div style={{ fontSize: 12, color: C.amber, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} />Follow-up: {latest.follow_up_date}
                      </div>
                    )}
                    {latest?.notes && (
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                        Note: {latest.notes}
                      </div>
                    )}
                    <div style={{ marginTop: 6 }}><PipelineBar fbRows={r.fbRows} /></div>
                  </div>
                  <div className="et-actions" style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0 }}>
                    <span style={badge(C.amber, C.amberLight)}><span style={dot(C.amber)} />Call Back</span>
                    <button style={btn("primary", { padding: "7px 14px", fontSize: 13 })}
                      onClick={() => onLogFeedback(r)}>
                      <Phone size={13} />Log Week {nxt}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {callbacks.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <CheckCircle size={32} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontFamily: F.head }}>No call-backs pending</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>All follow-up calls are up to date.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MyCallsView — per-week Edit buttons + assignment guard
// Change: name shown as "Full Name (M/F)"
// ─────────────────────────────────────────────────────────────────────────────

function MyCallsView({ currentUser, onLogFeedback, onEditWeekFeedback, onEditOverview }) {
  const { data, loading, err, reload } = useCallData();
  const [filter, setFilter] = useState("all");

  const mine = data.filter(r =>
    r.assignment?.assigned_to === currentUser ||
    r.fbRows.some(f => f.caller_name === currentUser)
  );

  const reached  = mine.filter(r => r.fbRows.some(f => normaliseStatus(f.call_status) === "Reached"));
  const callback = mine.filter(r => {
    const last = r.fbRows[r.fbRows.length - 1];
    return last && normaliseStatus(last.call_status) === "Call Back";
  });
  const complete = mine.filter(r => pipelineComplete(r.fbRows));
  const flagged  = mine.filter(r => r.fbRows.some(f => f.flagged_for_pastoral));

  const views    = { all: mine, reached, callback, complete, flagged };
  const filtered = views[filter] || mine;

  // v5.9 — follow-ups due today or overdue. A contact is "due" when its
  // MOST RECENT call log carries a follow_up_date that has arrived, and
  // the 3-week pipeline isn't complete. Logging a newer call clears it.
  const dueTodayStr = new Date().toISOString().slice(0, 10);
  const dueEntries = mine
    .filter(r => !pipelineComplete(r.fbRows))
    .map(r => {
      const last = r.fbRows[r.fbRows.length - 1];
      if (!last || !last.follow_up_date || last.follow_up_date > dueTodayStr) return null;
      return { id: r.id, row: r, name: r.full_name, phone: r.phone, dueDate: last.follow_up_date, note: last.notes };
    })
    .filter(Boolean)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const tabs = [
    { k: "all",      label: "All",       count: mine.length,     col: C.textMuted },
    { k: "reached",  label: "Reached",   count: reached.length,  col: C.green     },
    { k: "callback", label: "Call Back", count: callback.length, col: C.amber     },
    { k: "complete", label: "Complete",  count: complete.length, col: C.greenMid  },
    { k: "flagged",  label: "Flagged",   count: flagged.length,  col: C.flag      },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader
        title="My Calls"
        subtitle={`${mine.length} contact${mine.length !== 1 ? "s" : ""} assigned to you`}
      />

      <DueTodayPanel
        entries={dueEntries}
        actionLabel="Log Call"
        onAction={r => onLogFeedback(r)}
      />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Assigned to Me"    value={mine.length}      icon={Phone}       accent={C.green}    />
        <StatCard label="Pipeline Complete" value={complete.length}  icon={CheckCircle} accent={C.greenMid} />
        <StatCard label="Call Backs"        value={callback.length}  icon={RefreshCw}   accent={C.amber}    />
        <StatCard label="Flagged"           value={flagged.length}   icon={Flag}        accent={C.flag}
          sub={flagged.length > 0 ? "Needs pastoral attention" : ""} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? t.col : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? t.col : C.border}`,
            }}>
            {t.label} ({t.count})
          </button>
        ))}
        <button style={{ ...btn("ghost", { padding: "6px 10px", marginLeft: "auto" }) }} onClick={reload}>
          <RefreshCw size={13} />
        </button>
      </div>

      <Alert type="error" msg={err} onClose={() => {}} />

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => {
            const isComplete  = pipelineComplete(r.fbRows);
            const nxt         = nextWeek(r.fbRows);
            const lastFb      = r.fbRows[r.fbRows.length - 1];
            const sm          = lastFb
              ? statusMeta(lastFb.call_status)
              : { color: C.gold, bg: C.goldLight, label: "Pending" };
            const anyFlagged  = r.fbRows.some(f => f.flagged_for_pastoral);
            const hasOverview = !!r.overview;
            // ── v5.5: name with gender tag ──
            const displayName = `${r.full_name}${genderTag(r)}`;

            return (
              <div key={r.id} {...lift} style={{
                ...card, padding: "14px 16px",
                borderLeft: `3px solid ${anyFlagged ? C.flag : isComplete ? C.greenMid : sm.color}`,
              }}>
                {/* Header */}
                <div className="et-head" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: sm.color, fontSize: 14, fontFamily: F.head,
                    }}>{r.full_name?.charAt(0) || "?"}</div>
                    <div style={{ minWidth: 0 }}>
                      {/* ── gender tag in name ── */}
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={r.phone} withWhatsApp /> · {r.service_date}</div>
                    </div>
                  </div>
                  <div className="et-actions" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {anyFlagged && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={10} />Flagged</span>}
                    {isComplete ? (
                      <>
                        <span style={badge(C.greenMid, C.greenLight, { fontSize: 11 })}>
                          <CheckCircle size={10} />Pipeline Complete
                        </span>
                        {hasOverview ? (
                          <>
                            <button
                              style={btn("ghost", { padding: "7px 14px", fontSize: 13 })}
                              onClick={() => onEditOverview(r)}>
                              <Edit3 size={13} />Edit Overview
                            </button>
                            <span style={badge(C.green, C.greenLight, { fontSize: 11 })}>
                              <CheckCircle size={10} />Overview Submitted
                            </span>
                          </>
                        ) : (
                          <button style={btn("gold", { padding: "7px 14px", fontSize: 13 })}
                            onClick={() => onLogFeedback(r)}>
                            <FileText size={13} />Submit Overview
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={badge(sm.color, sm.bg, { fontSize: 11 })}>
                          <span style={dot(sm.color)} />{sm.label}
                        </span>
                        <button style={btn("primary", { padding: "7px 14px", fontSize: 13 })}
                          onClick={() => onLogFeedback(r)}>
                          <Phone size={13} />Log Week {nxt}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Pipeline bar */}
                <div style={{ marginBottom: 10 }}><PipelineBar fbRows={r.fbRows} /></div>

                {/* Per-week call logs with Edit buttons */}
                {r.fbRows.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {r.fbRows.map(fb => {
                      const fsm = statusMeta(fb.call_status);
                      return (
                        <div key={fb.id} style={{
                          background: C.bg, borderRadius: 8, padding: "8px 12px",
                          border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
                                <span style={badge(fsm.color, fsm.bg, { fontSize: 10, padding: "2px 8px", fontFamily: F.head })}>
                                  Week {fb.week_number || "?"} · {fsm.label}
                                </span>
                                {fb.church_attendance && (
                                  <span style={badge(
                                    fb.church_attendance === "Present" ? C.green : C.danger,
                                    fb.church_attendance === "Present" ? C.greenLight : C.dangerLight,
                                    { fontSize: 10 }
                                  )}>
                                    {fb.church_attendance === "Present" ? " In church" : " Absent"}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: C.textSecondary }}>
                                Called by <strong>{fb.caller_name || "—"}</strong>
                                {fb.experience_rating && <span style={{ marginLeft: 8 }}>Rating: {fb.experience_rating}</span>}
                                {fb.returning && <span style={{ marginLeft: 8, color: C.goldDark }}>Returning: {fb.returning}</span>}
                                {fb.follow_up_date && (
                                  <span style={{ marginLeft: 8, color: C.amber }}>
                                    <Calendar size={10} style={{ verticalAlign: "middle" }} /> {fb.follow_up_date}
                                  </span>
                                )}
                              </div>
                              {fb.notes && (
                                <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>{fb.notes}</div>
                              )}
                              {fb.flagged_for_pastoral && fb.flag_reason && (
                                <div style={{
                                  fontSize: 12, color: C.flag, marginTop: 4,
                                  background: C.flagLight, padding: "5px 8px", borderRadius: 5,
                                }}>🚩 {fb.flag_reason}</div>
                              )}
                            </div>
                            {fb.caller_name === currentUser && (
                              <button
                                style={btn("ghost", { padding: "5px 10px", fontSize: 11, flexShrink: 0 })}
                                onClick={() => onEditWeekFeedback(r, fb.week_number)}>
                                <Edit3 size={11} />Edit
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Overview summary card */}
                {hasOverview && (
                  <div style={{
                    marginTop: 10, background: C.greenXLight, borderRadius: 8, padding: "10px 14px",
                    border: `1px solid ${C.greenBorder}`,
                  }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6,
                      fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em",
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <CheckCircle size={11} />VIP Retention Overview
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.8 }}>
                      <strong>Move to Membership:</strong>{" "}
                      <span style={{ color: r.overview.move_to_membership ? C.green : C.danger, fontWeight: 700 }}>
                        {r.overview.move_to_membership ? "Yes" : "No"}
                      </span>
                      {r.overview.natural_groups?.length > 0 && (
                        <><br /><strong>Natural Groups:</strong>{" "}{r.overview.natural_groups.join(", ")}</>
                      )}
                      {r.overview.connect_center && (
                        <><br /><strong>Connect Center:</strong>{" "}{r.overview.connect_center}</>
                      )}
                      {r.overview.overview_notes && (
                        <><br /><strong>Notes:</strong>{" "}{r.overview.overview_notes}</>
                      )}
                    </div>
                  </div>
                )}

                {r.fbRows.length === 0 && (
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
                    No call logs yet — start with Week 1.
                  </div>
                )}
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Phone size={28} style={{ marginBottom: 8, opacity: .4 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>
                {mine.length === 0
                  ? "No contacts assigned to you yet."
                  : "No contacts in this category."}
              </div>
              {mine.length === 0 && (
                <p style={{ fontSize: 13, marginTop: 6 }}>
                  Ask your Experience Admin to assign contacts to you.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogFeedback — v5.5
// Change: header shows "Full Name (M/F)"
// ─────────────────────────────────────────────────────────────────────────────

function LogFeedback({ person, onBack, callerName = "", editWeek = null }) {
  const fbRows    = person.fbRows || [];
  const weekToLog = editWeek !== null ? editWeek : nextWeek(fbRows);
  // ── v5.5: name with gender tag ──
  const displayName = `${person.full_name}${genderTag(person)}`;

  const [form, setForm] = useState({
    call_status: "", experience_rating: "", returning_likelihood: "",
    notes: "", follow_up_date: "", caller_name: callerName,
    flagged_for_pastoral: false, flag_reason: "",
    church_attendance: "",
  });
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(true);
  const [done, setDone]               = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [err, setErr]                 = useState("");
  const [existingRow, setExistingRow] = useState(null);

  useEffect(() => {
    (async () => {
      setFetching(true);
      if (weekToLog === null) { setFetching(false); return; }
      try {
        const rows = await sb(
          `call_feedback?first_timer_id=eq.${person.id}&week_number=eq.${weekToLog}&order=created_at.desc&limit=1`
        );
        if (rows && rows.length > 0) {
          const r = rows[0];
          setExistingRow(r);
          setForm({
            call_status:          r.call_status          || "",
            experience_rating:    r.experience_rating    || "",
            returning_likelihood: r.returning            || "",
            notes:                r.notes                || "",
            follow_up_date:       r.follow_up_date       || "",
            caller_name:          callerName || r.caller_name || "",
            flagged_for_pastoral: r.flagged_for_pastoral || false,
            flag_reason:          r.flag_reason          || "",
            church_attendance:    r.church_attendance    || "",
          });
        }
      } catch { /* no existing row */ }
      setFetching(false);
    })();
  }, [person.id, weekToLog, callerName]);

  const lsRef = useRef({});
  const lset  = useCallback((key) => {
    if (!lsRef.current[key]) {
      lsRef.current[key] = (e) => {
        const val = e && e.target !== undefined ? e.target.value : e;
        setForm(f => ({ ...f, [key]: val }));
      };
    }
    return lsRef.current[key];
  }, []);

  const isReached = form.call_status === "Reached";

  const submit = async () => {
    if (!form.call_status)        { setErr("Call status is required."); return; }
    if (!form.caller_name.trim()) { setErr("Caller name is missing — please contact your admin."); return; }
    if (form.flagged_for_pastoral && !form.flag_reason.trim()) {
      setErr("Please describe the reason for flagging."); return;
    }
    setLoading(true); setErr("");
    try {
      const payload = {
        first_timer_id:       person.id,
        week_number:          weekToLog,
        call_status:          form.call_status,
        experience_rating:    isReached ? (form.experience_rating || null) : null,
        returning:            isReached ? (form.returning_likelihood || null) : null,
        notes:                form.notes          || null,
        follow_up_date:       form.follow_up_date || null,
        caller_name:          form.caller_name.trim(),
        flagged_for_pastoral: !!form.flagged_for_pastoral,
        flag_reason:          form.flagged_for_pastoral ? (form.flag_reason || null) : null,
        church_attendance:    (weekToLog >= 2) ? (form.church_attendance || null) : null,
      };
      if (existingRow) {
        await sb(`call_feedback?id=eq.${existingRow.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("call_feedback", { method: "POST", body: JSON.stringify(payload) });
      }
      if (weekToLog === 3 && !editWeek && !person.overview) {
        setShowOverview(true);
      } else {
        setDone(true);
      }
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (showOverview) {
    return (
      <PipelineOverviewForm
        person={person}
        callerName={form.caller_name || callerName}
        onBack={onBack}
        onDone={onBack}
      />
    );
  }

  if (!fetching && weekToLog === null && editWeek === null) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "3rem" }} className="page-enter">
        <CheckCircle size={48} color={C.green} style={{ marginBottom: 12 }} />
        {/* ── gender tag in completion screen ── */}
        <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px" }}>
          Pipeline complete for {displayName}
        </h3>
        <p style={{ fontSize: 13, color: C.textMuted }}>All 3 weeks have been logged.</p>
        <div style={{ margin: "16px 0" }}><PipelineBar fbRows={fbRows} /></div>
        {!person.overview && (
          <button style={{ ...btn("gold"), marginTop: 8 }}
            onClick={() => setShowOverview(true)}>
            <FileText size={14} />Submit VIP Retention Overview
          </button>
        )}
        <button style={{ ...btn("outline"), marginTop: 8, marginLeft: 8 }} onClick={onBack}>
          <ArrowLeft size={14} />Back
        </button>
      </div>
    );
  }

  if (fetching) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>Loading…</div>
  );

  if (done) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem" }} className="page-enter">
      <CheckCircle size={48} color={C.green} style={{ marginBottom: 12 }} />
      {/* ── gender tag in success screen ── */}
      <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px" }}>
        Week {weekToLog} feedback {existingRow ? "updated" : "logged"} for {displayName}
      </h3>
      {form.flagged_for_pastoral && (
        <div style={{ ...badge(C.flag, C.flagLight), marginTop: 8, fontSize: 13, display: "inline-flex" }}>
          <Flag size={12} />Flagged for Pastoral Team
        </div>
      )}
      {weekToLog < 3 && (
        <div style={{
          marginTop: 16, padding: "12px 16px", background: C.greenXLight,
          borderRadius: 8, fontSize: 13, color: C.textSecondary,
        }}>
          Next step: <strong>Week {weekToLog + 1}</strong> call
        </div>
      )}
      <button style={{ ...btn("outline"), marginTop: 20 }} onClick={onBack}>
        <ArrowLeft size={14} />Back to queue
      </button>
    </div>
  );

  return (
    <div style={card} className="page-enter">
      {/* Header — gender tag shown here */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={btn("ghost", { padding: "7px 10px" })} onClick={onBack}><ArrowLeft size={14} /></button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            {editWeek ? `Edit Week ${weekToLog}` : `Week ${weekToLog} Call`} — {displayName}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            <PhoneLink phone={person.phone} withWhatsApp size={13} bold /> · visited {person.service_date}
          </p>
        </div>
      </div>

      {/* Pipeline progress */}
      <div style={{
        marginBottom: 16, padding: "10px 14px",
        background: C.greenXLight, borderRadius: 8, border: `1px solid ${C.greenBorder}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em" }}>
          Pipeline Progress
        </div>
        <PipelineBar fbRows={fbRows} />
      </div>

      {existingRow && (
        <div style={{
          marginBottom: 16, padding: "8px 14px", background: C.goldLight,
          borderRadius: 8, fontSize: 13, color: C.goldDark, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Edit3 size={13} />Editing existing Week {weekToLog} entry — changes will overwrite it.
        </div>
      )}

      {CREDS_MISSING && <CredsBanner />}
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {/* Caller name — locked to session */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
          Your Name (Caller)
        </div>
        {callerName ? (
          <div style={{
            ...inputBase,
            background: C.greenXLight, border: `1.5px solid ${C.greenBorder}`,
            color: C.green, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8,
            cursor: "default", userSelect: "none",
          }}>
            <UserCheck size={14} color={C.green} />
            {callerName}
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: C.textMuted, fontStyle: "italic" }}>
              Logged as you
            </span>
          </div>
        ) : (
          <FieldInput label="" id="cn" required
            value={form.caller_name} onChange={lset("caller_name")}
            placeholder="Enter your name"
            hint="Your name could not be loaded from the session — type it manually" />
        )}
      </div>

      {/* Church attendance — Week 2 & 3 only */}
      {weekToLog >= 2 && (
        <div style={{
          marginBottom: 16, padding: "12px 14px",
          background: C.greenXLight, borderRadius: 8, border: `1px solid ${C.greenBorder}`,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 8,
            fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <Calendar size={11} />Church Attendance — Week {weekToLog}
          </div>
          <FieldInput label="Was this person in church on Sunday?" id="ca" type="select"
            value={form.church_attendance} onChange={lset("church_attendance")}
            options={[
              { value: "Present", label: "Present" },
              { value: "Absent",  label: "Absent"  },
              { value: "Unknown", label: "Unknown"  },
            ]} />
        </div>
      )}

      <FieldInput label="Call Status" id="cs" type="select" required
        value={form.call_status} onChange={lset("call_status")} options={CALL_STATUS_OPTIONS} />

      {form.call_status && (() => {
        const sm = statusMeta(form.call_status);
        return (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: -8, marginBottom: 16,
            padding: "8px 12px", borderRadius: 8, background: sm.bg,
            fontSize: 13, color: sm.color, fontWeight: 600,
          }}>
            <span style={dot(sm.color)} />Will be logged as: <strong>{sm.label}</strong>
          </div>
        );
      })()}

      {isReached && (
        <>
          <FieldInput label="Experience Rating" id="er" type="select"
            value={form.experience_rating} onChange={lset("experience_rating")}
            options={[
              { value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" },
              { value: "Average",   label: "Average"   }, { value: "Poor",  label: "Poor"  },
            ]} />
          <FieldInput label="Returning?" id="rl" type="select"
            value={form.returning_likelihood} onChange={lset("returning_likelihood")}
            options={[
              { value: "Yes",       label: "Yes: will return next week"     },
              { value: "Maybe",     label: "Maybe: on special services"     },
              { value: "No",        label: "No: came to visit"              },
              { value: "Undecided", label: "Undecided"                      },
            ]} />
        </>
      )}
      {!isReached && form.call_status && (
        <FieldInput label="Scheduled Call-back Date" id="fd" type="date"
          value={form.follow_up_date} onChange={lset("follow_up_date")}
          hint="Set a date to remind the team to call back" />
      )}
      <FieldInput label="Notes" id="nt" type="textarea"
        value={form.notes} onChange={lset("notes")}
        placeholder={isReached ? "Key points from the conversation…" : "Reason / any context for the team…"} />

      {/* Pastoral flag */}
      <div style={{
        background: C.flagLight, border: `1px solid #FECACA`,
        borderRadius: 10, padding: "16px", marginBottom: 16,
      }}>
        <div style={{
          fontWeight: 700, fontSize: 13, fontFamily: F.head, color: C.flag, marginBottom: 10,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Flag size={13} />Flag for Pastoral Team
        </div>
        <FieldInput label="Flag this person for Pastoral Team attention" id="fp" type="toggle"
          value={form.flagged_for_pastoral} onChange={lset("flagged_for_pastoral")}
          hint="Use this if the visitor raised a concern, prayer request, or needs pastoral follow-up" />
        {form.flagged_for_pastoral && (
          <FieldInput label="Reason for flagging" id="fr" type="textarea" required
            value={form.flag_reason} onChange={lset("flag_reason")}
            placeholder="Describe the concern that needs pastoral attention…" />
        )}
      </div>

      <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading
          ? "Saving…"
          : existingRow
            ? `Update Week ${weekToLog} Feedback`
            : `Save Week ${weekToLog} Feedback`}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineOverviewForm — v5.5
// Change: header and membership recommendation button show "Full Name (M/F)"
// ─────────────────────────────────────────────────────────────────────────────

function PipelineOverviewForm({ person, callerName = "", onBack, onDone }) {
  const existingOverview = person.overview || null;
  // ── v5.5: name with gender tag ──
  const displayName = `${person.full_name}${genderTag(person)}`;

  const [form, setForm] = useState({
    move_to_membership: existingOverview ? existingOverview.move_to_membership : null,
    natural_groups:     existingOverview?.natural_groups  || [],
    connect_center:     existingOverview?.connect_center  || "",
    overview_notes:     existingOverview?.overview_notes  || "",
    submitted_by:       existingOverview?.submitted_by    || callerName,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");

  const isEditing = !!existingOverview;

  const settersRef = useRef({});
  const set = useCallback((key) => {
    if (!settersRef.current[key]) {
      settersRef.current[key] = (valOrEvt) => {
        const val = valOrEvt && valOrEvt.target !== undefined ? valOrEvt.target.value : valOrEvt;
        setForm(f => ({ ...f, [key]: val }));
      };
    }
    return settersRef.current[key];
  }, []);

  const submit = async () => {
    if (form.move_to_membership === null) {
      setErr("Please indicate whether to move this person to Membership."); return;
    }
    setLoading(true); setErr("");
    try {
      const payload = {
        first_timer_id:     person.id,
        submitted_by:       form.submitted_by || callerName,
        move_to_membership: !!form.move_to_membership,
        natural_groups:     form.natural_groups.length > 0 ? form.natural_groups : null,
        connect_center:     form.connect_center || null,
        overview_notes:     form.overview_notes || null,
      };

      if (isEditing) {
        await sb(`pipeline_overviews?id=eq.${existingOverview.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const existing = await sb(
          `pipeline_overviews?first_timer_id=eq.${person.id}&select=id&limit=1`
        ).catch(() => []);
        if (existing && existing.length > 0) {
          await sb(`pipeline_overviews?id=eq.${existing[0].id}`, {
            method: "PATCH", body: JSON.stringify(payload),
          });
        } else {
          await sb("pipeline_overviews", { method: "POST", body: JSON.stringify(payload) });
        }
      }

      if (form.move_to_membership) {
        await sb(`first_timers?id=eq.${person.id}`, {
          method: "PATCH",
          body: JSON.stringify({ membership_decision: "Member" }),
        }).catch(() => {});
      }
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem" }} className="page-enter">
      <CheckCircle size={56} color={C.green} style={{ marginBottom: 16 }} />
      <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px", fontSize: 20 }}>
        {isEditing ? "Overview Updated!" : "VIP Retention Overview Submitted!"}
      </h3>
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
        {/* ── gender tag in success screen ── */}
        {displayName}'s retention overview has been {isEditing ? "updated" : "recorded"}.
        {form.move_to_membership && " Their membership decision has been updated to Member."}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
        <button style={btn("outline")} onClick={onDone}>
          <ArrowLeft size={14} />Back to My Calls
        </button>
      </div>
    </div>
  );

  return (
    <div style={card} className="page-enter">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <button style={btn("ghost", { padding: "7px 10px" })} onClick={onBack}><ArrowLeft size={14} /></button>
        <div>
          {/* ── gender tag in header ── */}
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            {isEditing ? "Edit" : "VIP"} Retention Overview — {displayName}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            {isEditing
              ? "Update your assessment. Changes will overwrite the existing overview."
              : "Submit your 3-week assessment to help the team decide on membership."}
          </p>
        </div>
      </div>

      {isEditing && (
        <div style={{
          marginBottom: 16, padding: "8px 14px", background: C.goldLight,
          borderRadius: 8, fontSize: 13, color: C.goldDark, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Edit3 size={13} />You are editing an existing overview — your changes will overwrite the saved version.
        </div>
      )}

      {!isEditing && (
        <div style={{
          marginBottom: 20, padding: "12px 16px", background: C.greenLight,
          borderRadius: 8, border: `1px solid ${C.greenBorder}`,
          fontSize: 13, color: C.green, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <CheckCircle size={16} />All 3 weeks have been logged. Submit your final overview below.
        </div>
      )}

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {/* Membership decision */}
      <div style={{ marginBottom: 24 }}>
        <SH title="Membership Recommendation" icon={UserCheck} />
        <div style={{ marginBottom: 12, fontSize: 13, color: C.textSecondary }}>
          Based on your 3-week engagement, do you recommend moving{" "}
          {/* ── gender tag in body copy ── */}
          <strong>{displayName}</strong> to full membership?
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            {
              val: true,
              // ── first name + gender tag in button label ──
              label: `Yes — Move to Membership`,
              col: C.green,  bg: C.greenLight,
            },
            {
              val: false,
              label: "No — Not ready for membership yet",
              col: C.danger, bg: C.dangerLight,
            },
          ].map(opt => (
            <button key={String(opt.val)} type="button"
              onClick={() => setForm(f => ({ ...f, move_to_membership: opt.val }))}
              style={{
                flex: 1, minWidth: 200,
                padding: "12px 16px", borderRadius: 10, cursor: "pointer",
                border: `2px solid ${form.move_to_membership === opt.val ? opt.col : C.border}`,
                background: form.move_to_membership === opt.val ? opt.bg : C.surface,
                color: form.move_to_membership === opt.val ? opt.col : C.textSecondary,
                fontWeight: form.move_to_membership === opt.val ? 700 : 400,
                fontFamily: F.body, fontSize: 13, textAlign: "left", transition: "all .15s",
              }}>
              {form.move_to_membership === opt.val ? "✓ " : ""}{opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Groups */}
      <div style={{ marginBottom: 24 }}>
        <SH title="Natural Groups Eligibility" icon={Users} />
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>
          Select any Natural Groups this person is eligible for (optional).
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {NATURAL_GROUPS.map(g => {
            const on = form.natural_groups.includes(g);
            return (
              <button key={g} type="button"
                onClick={() => setForm(f => ({
                  ...f,
                  natural_groups: on
                    ? f.natural_groups.filter(x => x !== g)
                    : [...f.natural_groups, g],
                }))}
                style={{
                  padding: "8px 18px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                  border: `2px solid ${on ? C.green : C.border}`,
                  background: on ? C.greenLight : C.surface,
                  color: on ? C.green : C.textSecondary,
                  fontWeight: on ? 700 : 400, fontFamily: F.body, transition: "all .15s",
                }}>
                {on ? "✓ " : ""}{g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connect Center */}
      <div style={{ marginBottom: 24 }}>
        <SH title="Recommended Connect Center" icon={MapPin} />
        <FieldInput label="Connect Center" id="cc" type="select"
          value={form.connect_center} onChange={set("connect_center")}
          options={CONNECT_CENTERS.map(c => ({ value: c, label: c }))}
          hint="Select the Connect Center closest to where this person lives" />
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 24 }}>
        <SH title="Overview Notes" icon={FileText} />
        <FieldInput label="Additional notes (optional)" id="on" type="textarea"
          value={form.overview_notes} onChange={set("overview_notes")}
          placeholder="Any observations or context to share with the pastoral team…" />
      </div>

      {/* Submitted by — locked to session */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
          Submitted by
        </div>
        {callerName ? (
          <div style={{
            ...inputBase,
            background: C.greenXLight, border: `1.5px solid ${C.greenBorder}`,
            color: C.green, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8,
            cursor: "default", userSelect: "none",
          }}>
            <UserCheck size={14} color={C.green} />
            {callerName}
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: C.textMuted, fontStyle: "italic" }}>
              Logged as you
            </span>
          </div>
        ) : (
          <FieldInput label="" id="sb" required
            value={form.submitted_by} onChange={set("submitted_by")}
            placeholder="Your name" />
        )}
      </div>

      <button style={{ ...btn("gold"), width: "100%", padding: 13, fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading
          ? "Saving…"
          : isEditing
            ? "Save Changes to Overview"
            : "Submit VIP Retention Overview"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompletedPipelines — experienceadmin view
// Change: VIP Name column shows "Full Name (M/F)" in table rows
// ─────────────────────────────────────────────────────────────────────────────

function CompletedPipelines({ onBack }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        // ── v5.5: fetch gender alongside the join ──
        const data = await sb(
          "pipeline_overviews?select=*,first_timers(full_name,phone,service_date,gender)&order=submitted_at.desc&limit=500"
        );
        setRows(data || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    const ft = r.first_timers || {};
    if (search) {
      const q = search.toLowerCase();
      if (
        !ft.full_name?.toLowerCase().includes(q) &&
        !r.submitted_by?.toLowerCase().includes(q)
      ) return false;
    }
    const submittedDate = r.submitted_at ? r.submitted_at.slice(0, 10) : "";
    if (dateFrom && submittedDate < dateFrom) return false;
    if (dateTo   && submittedDate > dateTo)   return false;
    return true;
  });

  const allFilteredIds = filtered.map(r => r.id);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected   = allFilteredIds.some(id => selected.has(id));

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.add(id)); return n; });
    }
  };

  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const downloadCSV = () => {
    const toExport = filtered.filter(r => selected.has(r.id));
    if (toExport.length === 0) return;

    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };

    // ── v5.5: Gender column added to CSV ──
    const header = ["VIP Name", "Gender", "Phone", "Service Date", "Move to Membership", "Natural Groups", "Connect Center", "Submitted By", "Submitted At"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => {
        const ft = r.first_timers || {};
        return [
          escape(ft.full_name),
          escape(ft.gender || ""),
          escape(ft.phone),
          escape(ft.service_date),
          escape(r.move_to_membership ? "Yes" : "No"),
          escape(Array.isArray(r.natural_groups) ? r.natural_groups.join("; ") : (r.natural_groups || "")),
          escape(r.connect_center),
          escape(r.submitted_by),
          escape(r.submitted_at ? r.submitted_at.slice(0, 10) : ""),
        ].join(",");
      }),
    ];

    const blob  = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    const dateLabel = dateFrom || dateTo
      ? `_${dateFrom || "start"}_to_${dateTo || "end"}`
      : `_${new Date().toISOString().slice(0, 10)}`;
    a.href     = url;
    a.download = `envoys_completed_pipelines${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = filtered.filter(r => selected.has(r.id)).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader
        title="Completed Pipelines"
        subtitle="Overview submissions after each 3-week follow-up cycle"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={btn("ghost")} onClick={onBack}><ArrowLeft size={14} />Back</button>
            <button
              style={{
                ...btn("primary"),
                background: selectedCount > 0 ? C.blue : C.border,
                color: selectedCount > 0 ? "#fff" : C.textMuted,
                cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                border: "none",
              }}
              onClick={downloadCSV}
              disabled={selectedCount === 0}>
              <Download size={14} />
              Download{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </button>
          </div>
        }
      />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Overviews"  value={rows.length}     icon={FileText} accent={C.blue}                                      />
        <StatCard label="Matching Filter"  value={filtered.length} icon={Filter}   accent={C.green}                                     />
        <StatCard label="Selected"         value={selectedCount}   icon={Download} accent={selectedCount > 0 ? C.blue : C.textMuted}
          sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </div>

      {/* Date filter bar */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.blueLight, borderRadius: 10, border: `1px solid ${C.blue}22`,
      }}>
        <Calendar size={14} color={C.blue} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>
          Filter by submission date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}>
              <X size={12} />Clear
            </button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or caller…"
            style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", marginBottom: 12,
          background: `${C.blue}10`, borderRadius: 8, border: `1px solid ${C.blue}30`,
          fontSize: 13, color: C.blue, fontWeight: 600, flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={14} />{selectedCount} record{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <button style={{ ...btn("primary", { padding: "6px 14px", fontSize: 12 }), background: C.blue }}
            onClick={downloadCSV}>
            <Download size={13} />Download CSV
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0 ? "No pipeline overviews submitted yet." : "No results match your filters."}
          </div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="mc-scroll" style={{ overflowX: "auto" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 130px 120px 1fr 1fr",
            padding: "10px 16px", background: C.bg,
            borderBottom: `1px solid ${C.border}`, gap: 10, alignItems: "center",
            minWidth: 760,
          }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div onClick={toggleAll} title={allSelected ? "Deselect all" : "Select all"}
                style={{
                  width: 18, height: 18, borderRadius: 4, cursor: "pointer",
                  border: `2px solid ${someSelected ? C.blue : C.border}`,
                  background: allSelected ? C.blue : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}>
                {allSelected && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                {!allSelected && someSelected && (
                  <div style={{ width: 8, height: 2, background: C.blue, borderRadius: 1 }} />
                )}
              </div>
            </div>
            {["VIP Name", "Membership", "Connect Center", "Natural Groups", "Submitted By"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>
                {h}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {filtered.map((r, i) => {
            const ft        = r.first_timers || {};
            const isChecked = selected.has(r.id);
            const groups    = Array.isArray(r.natural_groups)
              ? r.natural_groups
              : (r.natural_groups ? [r.natural_groups] : []);
            // ── v5.5: gender tag in table name cell ──
            const ftDisplayName = `${ft.full_name}${genderTag(ft)}`;

            return (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 130px 120px 1fr 1fr",
                  minWidth: 760,
                  padding: "12px 16px", gap: 10,
                  alignItems: "flex-start",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.blue}08` : C.surface,
                  cursor: "pointer", transition: "background .12s",
                }}
                onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = C.greenXLight; }}
                onMouseOut={e => { e.currentTarget.style.background = isChecked ? `${C.blue}08` : C.surface; }}>

                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${isChecked ? C.blue : C.border}`,
                    background: isChecked ? C.blue : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
                  }}>
                    {isChecked && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                  </div>
                </div>

                {/* Name — with gender tag */}
                <div>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", background: C.blueLight,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: C.blue, fontSize: 12, fontFamily: F.head,
                    marginBottom: 4, border: `1.5px solid ${C.blue}30`,
                  }}>
                    {ft.full_name?.charAt(0) || "?"}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>
                    {ftDisplayName}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{ft.phone} · {ft.service_date}</div>
                </div>

                {/* Membership */}
                <div style={{ paddingTop: 6 }}>
                  <span style={badge(
                    r.move_to_membership ? C.green : C.danger,
                    r.move_to_membership ? C.greenLight : C.dangerLight,
                    { fontSize: 11 }
                  )}>
                    {r.move_to_membership ? "✓ Yes" : "✗ No"}
                  </span>
                </div>

                {/* Connect Center */}
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>
                  {r.connect_center || <span style={{ color: C.textMuted }}>—</span>}
                </div>

                {/* Natural Groups */}
                <div style={{ paddingTop: 6 }}>
                  {groups.length > 0
                    ? groups.map(g => (
                        <span key={g} style={{
                          ...badge(C.green, C.greenLight, { fontSize: 10, marginRight: 4, marginBottom: 4 }),
                          display: "inline-flex",
                        }}>{g}</span>
                      ))
                    : <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
                  }
                </div>

                {/* Submitted by + date */}
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>
                  {r.submitted_by || "—"}
                  {r.submitted_at && (
                    <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
                      <Calendar size={10} />{r.submitted_at.slice(0, 10)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{
          marginTop: 12, fontSize: 12, color: C.textMuted, textAlign: "right",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <span>
            Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> overview{rows.length !== 1 ? "s" : ""}
          </span>
          {selectedCount === 0 && filtered.length > 0 && (
            <span style={{ color: C.blue, fontWeight: 600 }}>
              ☝ Click rows to select, then download as CSV
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v5.5)                    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: PASTORAL TEAM — FEEDBACK VIEWS & REPORT  (v6.1)                  ║
// ║  Includes: AllFeedback, FlaggedRecords, Report                            ║
// ║                                                                             ║
// ║  CHANGES FROM v6.0:                                                        ║
// ║   1. "Retention Snapshot" renamed to "VIPs Membership Decision" and is     ║
// ║      now sourced from pipeline_overviews (the 3-week-follow-up Membership  ║
// ║      Recommendation), NOT from first_timers.membership_decision.           ║
// ║   2. "Conversion Rate" stat card now = Yes-recommendations ÷ total         ║
// ║      pipeline_overviews submitted (within the active date filter),        ║
// ║      instead of first_timers.membership_decision === "Member".            ║
// ║   3. New "New Golden Envoys" widget — a compact, scrollable mini-table     ║
// ║      of the most recent people whose VIP Retention Overview recommended   ║
// ║      "Yes — Move to Membership". A small download icon sits directly in   ║
// ║      front of the widget title and exports the full filtered list (not    ║
// ║      just the 5 visible rows) as CSV — handy for monthly membership       ║
// ║      reporting using the existing date filter.                            ║
// ║   4. Report's date filter (dateFrom/dateTo) now also drives the           ║
// ║      pipeline_overviews query (filtered on submitted_at) in addition to   ║
// ║      the first_timers query (filtered on service_date), so both halves    ║
// ║      of the dashboard respect the same date range control.                ║
// ║                                                                             ║
// ║  REQUIRES: `recharts` (see INTEGRATION_GUIDE.md). All other helpers        ║
// ║  (C, F, SHADOW, card, btn, badge, dot, inputBase, Alert, PageHeader,       ║
// ║  StatCard, SH, FieldInput, AREAS, parseAreas, normaliseStatus,             ║
// ║  statusMeta, sb, CredsBanner) are assumed already in scope from earlier    ║
// ║  modules in the same file.                                                 ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// PasEmpty — small reusable "no data" placeholder for chart cards
// ─────────────────────────────────────────────────────────────────────────────

function PasEmpty({ label = "No data yet" }) {
  return (
    <div style={{
      height: 200, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 6,
    }}>
      <BarChart2 size={22} style={{ opacity: .35 }} />
      <span style={{ fontSize: 12 }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasDonut — recharts PieChart wrapped with a center label + legend chips
// data: [{ name, value, color }]
// ─────────────────────────────────────────────────────────────────────────────

function PasDonut({ data, centerLabel, centerValue, height = 230 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <PasEmpty />;
  return (
    <div>
      <div style={{ position: "relative", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data} dataKey="value" nameKey="name"
              cx="50%" cy="50%" innerRadius="62%" outerRadius="92%"
              paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F.body,
                boxShadow: SHADOW.sm,
              }}
              formatter={(v, n) => [`${v} (${Math.round((v / total) * 100)}%)`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", pointerEvents: "none",
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, fontFamily: F.head, lineHeight: 1 }}>
            {centerValue}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3, textAlign: "center", maxWidth: 110 }}>
            {centerLabel}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 10 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textSecondary }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: d.color, display: "inline-block" }} />
            {d.name} <strong style={{ color: C.textPrimary }}>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasBarRow — single horizontal progress-style bar (used for leaderboards)
// ─────────────────────────────────────────────────────────────────────────────

function PasBarRow({ label, value, sub, max, color }) {
  const pct = Math.round((value / (max || 1)) * 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: C.textSecondary, fontWeight: 600 }}>{label}</span>
        <span style={{ color: C.textMuted, fontSize: 12 }}>{sub}</span>
      </div>
      <div style={{ height: 8, background: C.bg, borderRadius: 5, overflow: "hidden" }}>
        <div style={{
          height: 8, borderRadius: 5, background: color || C.green,
          width: `${pct}%`, transition: "width .5s ease",
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasTrendChart — stacked area chart of weekly call outcomes
// rows: [{ week: "Jun 02", Reached, "Call Back", Incorrect }]
// ─────────────────────────────────────────────────────────────────────────────

function PasTrendChart({ rows }) {
  if (!rows.length) return <PasEmpty label="No calls logged in this range" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={rows} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="pasReached" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.green} stopOpacity={0.55} />
            <stop offset="95%" stopColor={C.green} stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="pasCallback" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.amber} stopOpacity={0.5} />
            <stop offset="95%" stopColor={C.amber} stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="pasIncorrect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.danger} stopOpacity={0.45} />
            <stop offset="95%" stopColor={C.danger} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 5" stroke={C.border} vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: C.textMuted, fontFamily: F.body }}
          axisLine={{ stroke: C.border }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.textMuted, fontFamily: F.body }}
          axisLine={false} tickLine={false} width={28} />
        <Tooltip contentStyle={{
          borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F.body, boxShadow: SHADOW.sm,
        }} />
        <Legend wrapperStyle={{ fontSize: 11, fontFamily: F.body }} iconType="circle" iconSize={8} />
        <Area type="monotone" dataKey="Reached" stackId="1" stroke={C.green} fill="url(#pasReached)" strokeWidth={2} />
        <Area type="monotone" dataKey="Call Back" stackId="1" stroke={C.amber} fill="url(#pasCallback)" strokeWidth={2} />
        <Area type="monotone" dataKey="Incorrect Contact" stackId="1" stroke={C.danger} fill="url(#pasIncorrect)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasOutcomeBars — vertical bar chart for call outcomes / ratings / returning
// ─────────────────────────────────────────────────────────────────────────────

function PasOutcomeBars({ data, height = 220 }) {
  if (!data.length) return <PasEmpty />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 5" stroke={C.border} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted, fontFamily: F.body }}
          axisLine={{ stroke: C.border }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.textMuted, fontFamily: F.body }}
          axisLine={false} tickLine={false} width={28} />
        <Tooltip
          cursor={{ fill: C.bg }}
          contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: F.body, boxShadow: SHADOW.sm }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={46}>
          {data.map((d, i) => <Cell key={i} fill={d.color || C.green} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PasGoldenEnvoys — compact scrollable mini-table of new confirmed members,
// drawn from pipeline_overviews where move_to_membership = true.
// A download icon sits in front of the title and exports the full filtered
// list (every row passed in, not just the visible scroll window) as CSV.
// ─────────────────────────────────────────────────────────────────────────────

function PasGoldenEnvoys({ rows, dateFrom, dateTo }) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const str = String(v).replace(/"/g, '""');
    return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
  };

  const downloadCSV = () => {
    if (!rows.length) return;
    const header = ["Name", "Gender", "Phone", "Connect Center", "Natural Groups", "Submitted By", "Confirmed At"];
    const csvRows = [
      header.join(","),
      ...rows.map(r => {
        const ft = r.first_timers || {};
        const groups = Array.isArray(r.natural_groups) ? r.natural_groups.join("; ") : (r.natural_groups || "");
        return [
          escape(ft.full_name),
          escape(ft.gender || ""),
          escape(ft.phone),
          escape(r.connect_center),
          escape(groups),
          escape(r.submitted_by),
          escape(r.submitted_at ? r.submitted_at.slice(0, 10) : ""),
        ].join(",");
      }),
    ];
    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateLabel = dateFrom || dateTo
      ? `_${dateFrom || "start"}_to_${dateTo || "end"}`
      : `_${new Date().toISOString().slice(0, 10)}`;
    a.href     = url;
    a.download = `envoys_new_golden_members${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={card}>
      {/* Header: download icon sits directly in front of the title */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, paddingBottom: 8, borderBottom: `1.5px solid ${C.greenLight}`,
      }}>
        <button
          onClick={downloadCSV}
          disabled={!rows.length}
          title="Download full list as CSV"
          style={{
            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
            background: rows.length ? C.goldLight : C.bg,
            border: `1px solid ${rows.length ? C.gold : C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: rows.length ? "pointer" : "not-allowed",
            color: rows.length ? C.goldDark : C.textMuted,
          }}>
          <Download size={12} />
        </button>
        <span style={{
          display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700,
          letterSpacing: ".08em", color: C.textMuted, textTransform: "uppercase", fontFamily: F.head,
        }}>
          <Star size={13} strokeWidth={2} color={C.goldDark} />
          New Golden Envoys
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 11, color: C.green, fontWeight: 700,
          background: C.greenLight, padding: "2px 10px", borderRadius: 10,
        }}>
          {rows.length} confirmed
        </span>
      </div>

      {rows.length === 0 ? (
        <PasEmpty label="No confirmed members in this date range yet" />
      ) : (
        <>
          <div style={{ maxHeight: 235, overflowY: "auto", paddingRight: 4 }}>
            <div style={{ display: "grid", gap: 6 }}>
              {rows.map(r => {
                const ft = r.first_timers || {};
                const groups = Array.isArray(r.natural_groups) ? r.natural_groups : (r.natural_groups ? [r.natural_groups] : []);
                return (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, background: C.goldLight,
                    border: `1px solid ${C.gold}22`,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "#fff", border: `1.5px solid ${C.gold}50`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: C.goldDark, fontSize: 13, fontFamily: F.head,
                    }}>
                      {ft.full_name?.charAt(0) || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>
                        {ft.full_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {r.connect_center && <span>{r.connect_center}</span>}
                        {groups.length > 0 && <span>· {groups.join(", ")}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.goldDark, fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {r.submitted_at ? r.submitted_at.slice(0, 10) : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {rows.length > 5 && (
            <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 8 }}>
              Scroll for {rows.length - 5} more · download icon exports all {rows.length}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AllFeedback — call log browser with quick-stat chips + tidied filters
// ─────────────────────────────────────────────────────────────────────────────

function AllFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await sb("call_feedback?select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc&limit=500");
        setRows(data || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    const norm = normaliseStatus(r.call_status);
    if (filter && norm !== filter) return false;

    const ft = r.first_timers || {};
    if (search) {
      const q = search.toLowerCase();
      const matchName = ft.full_name?.toLowerCase().includes(q);
      const matchCaller = r.caller_name?.toLowerCase().includes(q);
      if (!matchName && !matchCaller) return false;
    }

    if (dateFrom || dateTo) {
      const callDate = r.created_at ? r.created_at.slice(0, 10) : "";
      if (dateFrom && callDate < dateFrom) return false;
      if (dateTo   && callDate > dateTo)   return false;
    }

    return true;
  });

  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const reachedCount   = filtered.filter(r => normaliseStatus(r.call_status) === "Reached").length;
  const callbackCount  = filtered.filter(r => normaliseStatus(r.call_status) === "Call Back").length;
  const flaggedCount   = filtered.filter(r => r.flagged_for_pastoral).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title={`All Feedback (${rows.length})`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…" style={{ ...inputBase, width: 160, paddingLeft: 30 }} />
            </div>
            <select value={filter} onChange={e => setFilter(e.target.value)}
              style={{ ...inputBase, width: 160 }}>
              <option value="">All statuses</option>
              <option value="Reached">Reached</option>
              <option value="Call Back">Call Back</option>
              <option value="Incorrect Contact">Incorrect Contact</option>
            </select>
          </div>
        } />

      {/* Quick-stat chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <span style={badge(C.green, C.greenLight, { fontSize: 12, padding: "5px 12px" })}>
          <span style={dot(C.green)} />{reachedCount} Reached
        </span>
        <span style={badge(C.amber, C.amberLight, { fontSize: 12, padding: "5px 12px" })}>
          <span style={dot(C.amber)} />{callbackCount} Call Back
        </span>
        <span style={badge(C.flag, C.flagLight, { fontSize: 12, padding: "5px 12px" })}>
          <Flag size={10} />{flaggedCount} Flagged
        </span>
      </div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 20, padding: "12px 16px",
        background: C.greenXLight, borderRadius: 10, border: `1px solid ${C.greenBorder}`,
      }}>
        <Calendar size={14} color={C.green} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4 }}>
          Filter by call date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}>
              <X size={12} />Clear dates
            </button>
          )}
        </div>
        {(dateFrom || dateTo) && (
          <span style={{
            fontSize: 12, color: C.green, fontWeight: 600,
            background: C.greenLight, padding: "3px 10px", borderRadius: 10, whiteSpace: "nowrap",
          }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const ft = r.first_timers || {};
            const sm = statusMeta(r.call_status);
            return (
              <div key={r.id} style={{
                ...card, padding: "12px 16px",
                borderLeft: r.flagged_for_pastoral ? `3px solid ${C.flag}` : `3px solid ${sm.color}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{ft.full_name}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{ft.phone} · {ft.service_date}</span>
                    {r.caller_name && (
                      <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>
                        · Called by <strong>{r.caller_name}</strong>
                      </span>
                    )}
                    {r.created_at && (
                      <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>
                        · Logged {r.created_at.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {r.flagged_for_pastoral && (
                      <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={10} />Flagged</span>
                    )}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{sm.label}</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: r.notes || r.flag_reason ? 8 : 0 }}>
                  {r.experience_rating && (
                    <span style={badge(C.textSecondary, C.bg, { fontSize: 11 })}>Rating: {r.experience_rating}</span>
                  )}
                  {r.returning && (
                    <span style={badge(C.goldDark, C.goldLight, { fontSize: 11 })}>Returning: {r.returning}</span>
                  )}
                  {r.follow_up_date && (
                    <span style={badge(C.amber, C.amberLight, { fontSize: 11 })}><Calendar size={10} />{r.follow_up_date}</span>
                  )}
                </div>
                {r.notes && (
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>{r.notes}</p>
                )}
                {r.flag_reason && (
                  <p style={{
                    margin: 0, fontSize: 13, color: C.flag, lineHeight: 1.55,
                    background: C.flagLight, padding: "6px 10px", borderRadius: 6,
                  }}>
                    🚩 {r.flag_reason}
                  </p>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>
              {rows.length === 0 ? "No feedback yet." : "No results match your filters."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FlaggedRecords — pastoral attention queue, with an "aging" indicator
// ─────────────────────────────────────────────────────────────────────────────

function FlaggedRecords() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await sb("call_feedback?flagged_for_pastoral=eq.true&select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc");
        setRows(data || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const daysOpen = (createdAt) => {
    if (!createdAt) return 0;
    const ms = Date.now() - new Date(createdAt).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  const agingCount = rows.filter(r => daysOpen(r.created_at) >= 3).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Flagged for Pastoral"
        subtitle={`${rows.length} record${rows.length !== 1 ? "s" : ""} requiring pastoral attention`}
        action={agingCount > 0 && (
          <span style={badge(C.danger, C.dangerLight, { fontSize: 12, padding: "6px 12px" })}>
            <AlertCircle size={12} />{agingCount} aging 3+ days
          </span>
        )} />
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map(r => {
            const ft = r.first_timers || {};
            const sm = statusMeta(r.call_status);
            const age = daysOpen(r.created_at);
            const aging = age >= 3;
            return (
              <div key={r.id} style={{ ...card, borderLeft: `3px solid ${aging ? C.danger : C.flag}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: F.head }}>{ft.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{ft.phone} · {ft.service_date}</div>
                    {r.caller_name && (
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                        Reported by <strong>{r.caller_name}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {aging ? (
                      <span style={badge(C.danger, C.dangerLight)}><AlertCircle size={11} />Aging · {age}d open</span>
                    ) : (
                      <span style={badge(C.flag, C.flagLight)}><Flag size={11} />Flagged · {age}d open</span>
                    )}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{sm.label}</span>
                  </div>
                </div>
                <div style={{
                  background: C.flagLight, borderRadius: 8, padding: "10px 14px",
                  fontSize: 13, color: C.flag, lineHeight: 1.6,
                }}>
                  <strong>Reason flagged:</strong> {r.flag_reason || "No reason provided"}
                </div>
                {r.notes && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>
                    <strong>Call notes:</strong> {r.notes}
                  </p>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Shield size={36} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontFamily: F.head }}>No flagged records</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Nothing requires pastoral attention right now.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report — Recharts-based analytics. Membership decision + conversion rate
// now sourced from pipeline_overviews (post 3-week-follow-up recommendation)
// rather than the raw first_timers.membership_decision field. Also includes
// the new "New Golden Envoys" scrollable mini-table with CSV export.
// ─────────────────────────────────────────────────────────────────────────────

function Report() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      // ── first_timers: general registry stats (unchanged) ──
      let ftq = "first_timers?select=membership_decision,life_stage,gender,areas_of_interest,service_date";
      if (dateFrom) ftq += `&service_date=gte.${dateFrom}`;
      if (dateTo)   ftq += `&service_date=lte.${dateTo}`;
      const ft = await sb(ftq) || [];

      // ── call_feedback: call outcomes / ratings / trend (unchanged) ──
      const fb = await sb("call_feedback?select=call_status,experience_rating,returning,caller_name,flagged_for_pastoral,created_at") || [];

      // ── pipeline_overviews: drives Membership Decision donut + Conversion
      //    Rate + New Golden Envoys, filtered on submitted_at (the date the
      //    3-week follow-up was actually completed) so it respects the same
      //    date-range control as the rest of the report. ──
      let ovq = "pipeline_overviews?select=*,first_timers(full_name,phone,gender,service_date)&order=submitted_at.desc&limit=1000";
      if (dateFrom) ovq += `&submitted_at=gte.${dateFrom}`;
      if (dateTo)   ovq += `&submitted_at=lte.${dateTo}T23:59:59`;
      const overviews = await sb(ovq).catch(() => []) || [];

      const tally = (arr, key) => arr.reduce((a, r) => {
        const v = r[key] || "Unknown"; a[v] = (a[v] || 0) + 1; return a;
      }, {});

      const areasTally = {};
      ft.forEach(r => {
        parseAreas(r.areas_of_interest).forEach(v => { areasTally[v] = (areasTally[v] || 0) + 1; });
      });

      const callerTally = {};
      fb.forEach(f => {
        if (!f.caller_name) return;
        if (!callerTally[f.caller_name]) callerTally[f.caller_name] = { total: 0, reached: 0 };
        callerTally[f.caller_name].total++;
        if (normaliseStatus(f.call_status) === "Reached") callerTally[f.caller_name].reached++;
      });

      const callStatusNorm = {};
      fb.forEach(f => {
        const n = normaliseStatus(f.call_status) || "Unknown";
        callStatusNorm[n] = (callStatusNorm[n] || 0) + 1;
      });

      // ── Weekly trend: bucket calls by week of created_at ──
      const weekKey = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit" });
      const weekBuckets = {};
      fb.filter(f => f.created_at).forEach(f => {
        const label = weekKey(f.created_at);
        if (!weekBuckets[label]) weekBuckets[label] = { week: label, ts: new Date(f.created_at).getTime(), Reached: 0, "Call Back": 0, "Incorrect Contact": 0 };
        const norm = normaliseStatus(f.call_status) || "Call Back";
        weekBuckets[label][norm] = (weekBuckets[label][norm] || 0) + 1;
      });
      const trend = Object.values(weekBuckets).sort((a, b) => a.ts - b.ts).slice(-10);

      // ── Overview-derived stats ──
      const totalOverviews = overviews.length;
      const yesCount = overviews.filter(o => o.move_to_membership).length;
      const noCount  = totalOverviews - yesCount;
      const goldenEnvoys = overviews.filter(o => o.move_to_membership); // already sorted desc by submitted_at

      setStats({
        total: ft.length, totalCalls: fb.length,
        flagged: fb.filter(f => f.flagged_for_pastoral).length,
        lifeStage: tally(ft, "life_stage"), gender: tally(ft, "gender"),
        callStatus: callStatusNorm, rating: tally(fb, "experience_rating"),
        returning: tally(fb, "returning"), areas: areasTally, callers: callerTally,
        trend, totalOverviews, yesCount, noCount, goldenEnvoys,
      });
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <SkeletonReport />;
  if (!stats) return null;

  const conversionPct = stats.totalOverviews > 0 ? Math.round((stats.yesCount / stats.totalOverviews) * 100) : 0;

  const decisionDonut = [
    { name: "Yes — Move to Membership",      value: stats.yesCount, color: C.green },
    { name: "No — Not Ready Yet",            value: stats.noCount,  color: C.amber },
  ].filter(d => d.value > 0);

  const callStatusColor = k => k === "Reached" ? C.green : k === "Call Back" ? C.amber : C.danger;
  const callOutcomeBars = Object.entries(stats.callStatus).map(([k, v]) => ({ name: k, value: v, color: callStatusColor(k) }));

  const ratingColor = { Excellent: C.green, Good: C.greenMid, Average: C.amber, Poor: C.danger };
  const ratingBars   = Object.entries(stats.rating).map(([k, v]) => ({ name: k, value: v, color: ratingColor[k] || C.textMuted }));

  const returningColor = { Yes: C.green, Maybe: C.gold, No: C.danger, Undecided: C.textMuted };
  const returningBars   = Object.entries(stats.returning).map(([k, v]) => ({ name: k, value: v, color: returningColor[k] || C.textMuted }));

  const genderDonut = Object.entries(stats.gender).map(([k, v]) => ({
    name: k, value: v, color: k === "Female" ? C.goldMid : k === "Male" ? C.green : C.textMuted,
  }));

  const topCallers = Object.entries(stats.callers)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6);
  const maxCallerTotal = Math.max(...topCallers.map(([, s]) => s.total), 1);

  const topAreas = Object.entries(stats.areas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxArea = Math.max(...topAreas.map(([, v]) => v), 1);

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      <PageHeader title="Pastoral Report" subtitle="Membership retention overview"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ ...inputBase, width: 148 }} />
            <button style={btn("primary")} onClick={load}><Filter size={14} />Filter</button>
          </div>
        } />

      {/* Top-line stats */}
      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="First-Timers"      value={stats.total}                    icon={Users}     accent={C.green}   />
        <StatCard label="Calls Logged"      value={stats.totalCalls}               icon={Phone}     accent={C.greenMid} />
        <StatCard label="Conversion Rate"   value={`${conversionPct}%`}            icon={TrendingUp}accent={C.goldDark}
          sub={stats.totalOverviews > 0
            ? `${stats.yesCount} of ${stats.totalOverviews} are now Golden Envoys`
            : "No VIP Overviews submitted yet"} />
        <StatCard label="Flagged"           value={stats.flagged}                  icon={Flag}      accent={C.flag}
          sub={stats.flagged > 0 ? "Needs attention" : ""} />
      </div>

      <div style={{ marginBottom: 16 }}><BirthdaysWidget showEmpty={false} /></div>

      <div className="greport" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Membership decision donut — sourced from pipeline_overviews */}
        <div style={card}>
          <SH title="VIPs Membership Decision" icon={UserCheck} />
          <PasDonut data={decisionDonut} centerValue={`${conversionPct}%`} centerLabel="recommended for Membership" />
          <div style={{ fontSize: 11, color: C.textMuted, textAlign: "center", marginTop: 4 }}>
            Based on the Membership Recommendation in each VIP Retention Overview, submitted after the 3-week follow-up.
          </div>
        </div>

        {/* Call outcomes bar */}
        <div style={card}>
          <SH title="Call Outcomes" icon={Phone} />
          <PasOutcomeBars data={callOutcomeBars} />
        </div>

        {/* Weekly trend — full width */}
        <div style={{ ...card, gridColumn: "1 / -1" }}>
          <SH title="Weekly Call Activity" icon={Activity} />
          <PasTrendChart rows={stats.trend} />
        </div>

        {/* New Golden Envoys — full width */}
        <div style={{ gridColumn: "1 / -1" }}>
          <PasGoldenEnvoys rows={stats.goldenEnvoys} dateFrom={dateFrom} dateTo={dateTo} />
        </div>

        {/* Returning likelihood */}
        <div style={card}>
          <SH title="Returning Likelihood" icon={TrendingUp} />
          <PasOutcomeBars data={returningBars} height={200} />
        </div>

        {/* Experience rating */}
        <div style={card}>
          <SH title="Experience Rating" icon={Star} />
          <PasOutcomeBars data={ratingBars} height={200} />
        </div>

        {/* Gender + life stage */}
        <div style={card}>
          <SH title="Gender Split" icon={Users} />
          <PasDonut data={genderDonut} centerValue={stats.total} centerLabel="First-Timers" height={200} />
        </div>

        {/* Caller leaderboard */}
        <div style={card}>
          <SH title="Caller Leaderboard" icon={UserCheck} />
          {topCallers.length === 0 ? <PasEmpty label="No calls logged yet" /> : topCallers.map(([name, s]) => (
            <PasBarRow key={name} label={name}
              value={s.total} max={maxCallerTotal} color={C.green}
              sub={`${s.reached}/${s.total} reached (${Math.round((s.reached / s.total) * 100)}%)`} />
          ))}
        </div>

        {/* Areas of interest — full width */}
        <div style={{ ...card, gridColumn: "1 / -1" }}>
          <SH title="Areas of Interest" icon={Star} />
          {topAreas.length === 0 ? <PasEmpty label="No area-of-interest data yet" /> : (
            <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
              {topAreas.map(([k, v]) => {
                const label = AREAS.find(a => a.value === k)?.label || k;
                return <PasBarRow key={k} label={label} value={v} max={maxArea} sub={v} color={C.greenMid} />;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: PASTORAL TEAM — FEEDBACK VIEWS & REPORT  (v6.1)              ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SOUL CARE — VISITATION MANAGEMENT  (v7.0)                        ║
// ║                                                                             ║
// ║  Rebuilt to mirror the Experience Team module's architecture:              ║
// ║   • soul_care_contacts    — the pool of people awaiting a visit            ║
// ║     (the Soul Care equivalent of first_timers for the calling pipeline)    ║
// ║   • soul_care_assignments — assigns ONE contact to ONE Soul Care team      ║
// ║     member (equivalent of call_assignments)                                ║
// ║   • soul_care_visits      — one row per visit EVENT logged against a       ║
// ║     contact (equivalent of call_feedback — but there is no fixed 3-week    ║
// ║     pipeline here; visits are open-ended and can repeat)                   ║
// ║                                                                             ║
// ║  New "soulcareadmin" role owns: bulk CSV import of contacts, assignment    ║
// ║  of contacts to Soul Care team members, the global Visit Queue, Flagged    ║
// ║  cases, and Testimonies. Regular "soulcare" members only ever see          ║
// ║  contacts assigned to them — never the full pool.                         ║
// ║                                                                             ║
// ║  REQUIRES: soul_care_contacts / soul_care_assignments / soul_care_visits   ║
// ║  tables per INTEGRATION_GUIDE.md. All shared helpers (C, F, SHADOW, card,  ║
// ║  btn, badge, dot, inputBase, Alert, PageHeader, StatCard, SH, FieldInput,  ║
// ║  PhotoUpload, CredsBanner, sb, useRoleUsers) are assumed already in scope  ║
// ║  from earlier modules in the same file.                                   ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & STATUS META
// ─────────────────────────────────────────────────────────────────────────────

const SC_VISIT_TYPES = [
  { value: "Home (Periodic)", label: "Home (Periodic)" },
  { value: "Celebration",     label: "Celebration (New Born, Wedding, House Warming…)" },
  { value: "Pastoral Care",   label: "Pastoral Care" },
  { value: "Welfare Check",   label: "Welfare Check" },
];

const VISIT_STATUS_META = {
  Scheduled:             { color: C.blue,   bg: C.blueLight   },
  Completed:             { color: C.green,  bg: C.greenLight  },
  Rescheduled:           { color: C.amber,  bg: C.amberLight  },
  "Member Unavailable":  { color: C.danger, bg: C.dangerLight },
};
const URGENCY_META = {
  High:   { color: C.danger, bg: C.dangerLight },
  Medium: { color: C.amber,  bg: C.amberLight  },
  Low:    { color: C.green,  bg: C.greenLight  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function scGenderTag(row) {
  if (!row) return "";
  const g = (row.gender || "").trim().toLowerCase();
  if (g === "male")   return " (M)";
  if (g === "female") return " (F)";
  return "";
}

function scProfileTag(row) {
  if (!row) return "";
  const g = (row.gender || "").trim().toLowerCase();
  const gender = g === "male" ? "Male" : g === "female" ? "Female" : "";
  const marital = ({ married: "M", single: "S", divorced: "D", widowed: "W" })[
    (row.marital_status || "").trim().toLowerCase()
  ] || "";
  const l = (row.life_stage || "").trim().toLowerCase();
  const life =
    (l === "employee" || l === "employed") ? "E" :
    (l === "business owner" || l === "businessowner") ? "B" :
    (l === "student") ? "S" : "";
  let tag = gender ? ` (${gender})` : "";
  const extras = [marital, life].filter(Boolean);
  if (extras.length) tag += ` - ${extras.join(" - ")}`;
  return tag;
}

function scLatestVisit(visits) {
  return (visits && visits.length) ? visits[visits.length - 1] : null;
}

function scCategorise(contact) {
  const latest = scLatestVisit(contact.visits);
  if (!latest) return "pending";
  if (latest.visit_status === "Completed")            return "completed";
  if (latest.visit_status === "Scheduled")             return "scheduled";
  if (latest.visit_status === "Rescheduled")            return "rescheduled";
  if (latest.visit_status === "Member Unavailable")     return "unavailable";
  return "pending";
}

// ─────────────────────────────────────────────────────────────────────────────
// SCDateFilterBar — reusable date-range filter bar (used across every page)
// ─────────────────────────────────────────────────────────────────────────────

function SCDateFilterBar({ dateFrom, setDateFrom, dateTo, setDateTo, label = "Filter by date:" }) {
  const clear = () => { setDateFrom(""); setDateTo(""); };
  return (
    <div style={{
      display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      marginBottom: 16, padding: "12px 16px",
      background: C.soulLight, borderRadius: 10, border: `1px solid ${C.soul}30`,
    }}>
      <Calendar size={14} color={C.soul} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 148 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, width: 148 }} />
        </div>
        {(dateFrom || dateTo) && (
          <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clear}>
            <X size={12} />Clear dates
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useVisitData — shared data loader, mirrors useCallData()
// Returns soul_care_contacts enriched with .visits[] and .assignment
// dateFrom/dateTo filter on soul_care_contacts.created_at (date added to pool)
// ─────────────────────────────────────────────────────────────────────────────

function useVisitData(dateFrom, dateTo) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [tick, setTick]       = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        let cq = "soul_care_contacts?order=created_at.desc&limit=500";
        if (dateFrom) cq += `&created_at=gte.${dateFrom}`;
        if (dateTo)   cq += `&created_at=lte.${dateTo}T23:59:59`;

        const [contacts, visits, asgRows] = await Promise.all([
          sb(cq),
          sb("soul_care_visits?select=*&order=created_at.asc"),
          sb("soul_care_assignments?select=*").catch(() => []),
        ]);

        const vMap = {};
        (visits || []).forEach(v => {
          if (!vMap[v.contact_id]) vMap[v.contact_id] = [];
          vMap[v.contact_id].push(v);
        });
        const aMap = {};
        (asgRows || []).forEach(a => { aMap[a.contact_id] = a; });

        if (!cancelled) {
          setData((contacts || []).map(c => ({
            ...c,
            visits:     vMap[c.id] || [],
            assignment: aMap[c.id] || null,
          })));
        }
      } catch (e) { if (!cancelled) setErr(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tick, dateFrom, dateTo]);

  return { data, loading, err, reload };
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.4 — downloadable CSV templates for bulk imports
// ─────────────────────────────────────────────────────────────────────────────

function downloadCSVTemplate(filename, headers, example) {
  const csv = [headers.join(","), example.join(",")].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const VISITATION_TEMPLATE_HEADERS = [
  "full_name", "phone", "email", "gender", "dob",
  "marital_status", "life_stage", "house_address", "nearest_landmark",
];
const VISITATION_TEMPLATE_EXAMPLE = [
  "Adaeze Okafor", "08031234567", "adaeze@example.com", "Female", "1994-03-12",
  "Married", "Employee", "12 Palm Street Ikeja", "Near Chevron Roundabout",
];

const MEMBERS_TEMPLATE_HEADERS = [
  "full_name", "phone", "email", "gender", "dob", "marital_status", "life_stage",
  "category", "membership_status", "date_joined", "house_address", "nearest_landmark",
];
const MEMBERS_TEMPLATE_EXAMPLE = [
  "Tunde Adeyemi", "08065554321", "tunde@example.com", "Male", "1988-11-02", "Single", "Business Owner",
  "Steward", "Active", "2024-06-01", "5 Unity Close Ogba", "Opposite Excel Mall",
];

// ─────────────────────────────────────────────────────────────────────────────
// SoulCareCSVImport — bulk import of contacts to visit (soulcareadmin only)
// Columns: full_name, phone, email, gender, house_address, nearest_landmark,
//          marital_status, life_stage
// ─────────────────────────────────────────────────────────────────────────────

function SoulCareCSVImport({ currentUser, onDone }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRows(parseCSV(ev.target.result)); setErr(""); setSuccess("");
    };
    reader.readAsText(file);
  };

  const sanitizeGender = (g) => {
    const c = (g || "").toString().trim().toLowerCase();
    if (c === "male")   return "Male";
    if (c === "female") return "Female";
    return null;
  };
  const sanitizeMaritalStatus = (s) => {
    const c = (s || "").toString().trim().toLowerCase();
    if (c === "single")   return "Single";
    if (c === "married")  return "Married";
    if (c === "divorced") return "Divorced";
    if (c === "widowed")  return "Widowed";
    return null;
  };
  const sanitizeLifeStage = (ls) => {
    const c = (ls || "").toString().trim().toLowerCase();
    if (c === "student")  return "Student";
    if (c === "employee") return "Employee";
    if (c === "business owner" || c === "businessowner") return "Business Owner";
    return null;
  };

  const importAll = async () => {
    if (!rows.length) return;
    setLoading(true); setErr("");
    try {
      const n = (v) => (v === "" || v === undefined || v === null) ? null : v;
      const payload = rows
        .map(r => ({
          full_name:        (r.full_name || r.name || "").toString().trim(),
          phone:             (r.phone || r.phone_number || "").toString().trim(),
          email:             n(r.email?.toString().trim()),
          gender:            sanitizeGender(r.gender),
          house_address:     n((r.house_address || r.address || "").toString().trim()),
          nearest_landmark:  n((r.nearest_landmark || r.landmark || "").toString().trim()),
          marital_status:    sanitizeMaritalStatus(r.marital_status),
          life_stage:        sanitizeLifeStage(r.life_stage),
          dob:               (() => {
            const s = (r.dob || r.date_of_birth || "").toString().trim();
            const parts = s.split(/[/-]/);
            if (parts.length !== 3) return null;
            const [a, b, c2] = parts;
            if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c2.padStart(2, "0")}`;
            return `${c2}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
          })(),
          added_by:          currentUser || null,
        }))
        .filter(r => r.full_name && r.phone);

      if (!payload.length) {
        setErr("No valid rows found. Each row needs at least full_name and phone.");
        setLoading(false); return;
      }

      await sb("soul_care_contacts", { method: "POST", body: JSON.stringify(payload) });
      setSuccess(`${payload.length} contact${payload.length !== 1 ? "s" : ""} imported successfully.`);
      toast.success("Import complete.");
      setRows([]);
      onDone?.();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ ...card, marginBottom: 20, border: `1px solid ${C.soul}30` }}>
      <SH title="Bulk CSV Import — Contacts to Visit" icon={Upload} />
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16, lineHeight: 1.6 }}>
        Upload a CSV to add multiple people to the Soul Care visitation pool. Required columns:{" "}
        <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>full_name</code>,{" "}
        <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>phone</code>. Optional: email,
        gender, house_address, nearest_landmark, marital_status, life_stage.
      </p>
      <Alert type="error"   msg={err}     onClose={() => setErr("")} />
      <Alert type="success" msg={success} onClose={() => setSuccess("")} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: rows.length ? 16 : 0 }}>
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
        <button style={btn("outline", { color: C.soul, border: `1.5px solid ${C.soul}` })} onClick={() => fileRef.current.click()}>
          <Upload size={14} />Choose CSV File
        </button>
        <button style={btn("ghost", { fontSize: 12 })}
          onClick={() => downloadCSVTemplate("envoys_visitation_import_template.csv", VISITATION_TEMPLATE_HEADERS, VISITATION_TEMPLATE_EXAMPLE)}>
          <Download size={12} />Download Template
        </button>
        {rows.length > 0 && (
          <button style={btn("soul")} onClick={importAll} disabled={loading}>
            {loading ? "Importing…" : `Import ${rows.length} rows`}
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: F.body }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {Object.keys(rows[0]).slice(0, 6).map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: C.textSecondary, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {Object.values(r).slice(0, 6).map((v, j) => (
                    <td key={j} style={{ padding: "7px 12px", color: C.textPrimary }}>{v || "—"}</td>
                  ))}
                </tr>
              ))}
              {rows.length > 5 && (
                <tr><td colSpan={6} style={{ padding: "7px 12px", color: C.textMuted, fontStyle: "italic" }}>
                  …and {rows.length - 5} more rows
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AssignVisitsView — soulcareadmin only. Bulk import + assign contacts.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// AddVisitPage — single-entry flow: search existing people (soul_care_contacts
// + first_timers) or add someone brand new, then go straight into logging a
// visit for them. Available to soulcare / soulcareadmin / admin. This sits
// ALONGSIDE the bulk CSV import in AssignVisitsView, not instead of it.
// ─────────────────────────────────────────────────────────────────────────────

function AddVisitPage({ currentUser, onCancel, onLoggingDone }) {
  const [step, setStep]           = useState("search"); // "search" | "new"
  const [query, setQuery]         = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched]   = useState(false);
  const [results, setResults]     = useState([]);
  const [creating, setCreating]   = useState(false);
  const [err, setErr]             = useState("");
  const [contactForLogging, setContactForLogging] = useState(null);

  const [newForm, setNewForm] = useState({
    full_name: "", phone: "", email: "", gender: "",
    house_address: "", nearest_landmark: "", marital_status: "", life_stage: "", dob: ""
  });

  const setRef = useRef({});
  const setField = useCallback((key) => {
    if (!setRef.current[key]) {
      setRef.current[key] = (valOrEvt) => {
        const val = valOrEvt && valOrEvt.target !== undefined ? valOrEvt.target.value : valOrEvt;
        setNewForm(f => ({ ...f, [key]: val }));
      };
    }
    return setRef.current[key];
  }, []);

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setErr(""); setSearched(true);
    try {
      const q = query.trim().replace(/[,()]/g, "");
      const [scRows, ftRows] = await Promise.all([
        sb(`soul_care_contacts?or=(full_name.ilike.*${q}*,phone.ilike.*${q}*)&order=full_name.asc&limit=10`).catch(() => []),
        sb(`first_timers?or=(full_name.ilike.*${q}*,phone.ilike.*${q}*)&order=full_name.asc&limit=10`).catch(() => []),
      ]);
      const seen = new Set();
      const merged = [];
      (scRows || []).forEach(r => {
        if (!seen.has(r.phone)) { seen.add(r.phone); merged.push({ ...r, _source: "soul_care" }); }
      });
      (ftRows || []).forEach(r => {
        if (!seen.has(r.phone)) {
          seen.add(r.phone);
          merged.push({
            full_name: r.full_name, phone: r.phone, email: r.email, gender: r.gender,
            house_address: r.house_address, nearest_landmark: r.nearest_landmark,
            marital_status: r.marital_status, life_stage: r.life_stage,
            _source: "first_timer",
          });
        }
      });
      setResults(merged);
    } catch (e) { setErr(e.message); }
    setSearching(false);
  };

  // Only creates an assignment if none exists yet — never steals a contact
  // that's already assigned to someone else.
  const ensureSelfAssigned = async (contactId) => {
    try {
      const existing = await sb(
        `soul_care_assignments?contact_id=eq.${contactId}&select=id,assigned_to&limit=1`
      ).catch(() => []);
      if (!existing || existing.length === 0) {
        await sb("soul_care_assignments", {
          method: "POST",
          body: JSON.stringify({ contact_id: contactId, assigned_to: currentUser, assigned_by: currentUser }),
        });
      }
    } catch { /* non-fatal — visit can still be logged */ }
  };

  const selectExisting = async (person) => {
    setCreating(true); setErr("");
    try {
      let contactRow = person;
      if (person._source === "first_timer") {
        const [created] = await sb("soul_care_contacts", {
          method: "POST",
          body: JSON.stringify({
            full_name: person.full_name, phone: person.phone, email: person.email || null,
            gender: person.gender || null, house_address: person.house_address || null,
            nearest_landmark: person.nearest_landmark || null,
            marital_status: person.marital_status || null, life_stage: person.life_stage || null,
            added_by: currentUser || null,
          }),
        });
        contactRow = created;
      }
      await ensureSelfAssigned(contactRow.id);
      setContactForLogging({ ...contactRow, visits: [] });
    } catch (e) { setErr(e.message); }
    setCreating(false);
  };

  const createNewAndProceed = async () => {
    if (!newForm.full_name.trim() || !newForm.phone.trim()) {
      setErr("Full name and phone are required."); return;
    }
    setCreating(true); setErr("");
    try {
      const dupe = await sb(
        `soul_care_contacts?phone=eq.${encodeURIComponent(newForm.phone.trim())}&select=id&limit=1`
      ).catch(() => []);
      if (dupe && dupe.length > 0) {
        setErr('A contact with this phone number already exists — use "Find Existing Member" to search for them instead.');
        setCreating(false); return;
      }
      const n = (v) => (v === "" || v === undefined) ? null : v;
      const [created] = await sb("soul_care_contacts", {
        method: "POST",
        body: JSON.stringify({
          full_name: newForm.full_name.trim(), phone: newForm.phone.trim(),
          email: n(newForm.email), gender: n(newForm.gender),
          house_address: n(newForm.house_address), nearest_landmark: n(newForm.nearest_landmark),
          marital_status: n(newForm.marital_status), life_stage: n(newForm.life_stage), dob: n(newForm.dob),
          added_by: currentUser || null,
        }),
      });
      await ensureSelfAssigned(created.id);
      setContactForLogging({ ...created, visits: [] });
    } catch (e) { setErr(e.message); }
    setCreating(false);
  };

  if (contactForLogging) {
    return (
      <LogVisitForm
        contact={contactForLogging}
        loggedBy={currentUser}
        onBack={() => setContactForLogging(null)}
        onDone={onLoggingDone}
      />
    );
  }

  return (
    <div style={card} className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="New Visitation Record" subtitle="Start by finding the member in the system, or add them as new"
        action={onCancel && <button style={btn("ghost")} onClick={onCancel}><ArrowLeft size={14} />Back</button>} />

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {step === "search" ? (
        <>
          <SH title="Find Existing Member" icon={Search} />
          <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, lineHeight: 1.6 }}>
            Search by name or phone to auto-populate member details. If the person isn't in the system yet, add them as new.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && doSearch()}
                placeholder="Name or phone number…" style={inputBase} />
            </div>
            <button style={btn("primary")} onClick={doSearch} disabled={searching}>
              <Search size={14} />{searching ? "Searching…" : "Search"}
            </button>
            <button style={btn("soul")} onClick={() => setStep("new")}>
              <UserPlus size={14} />Add New
            </button>
          </div>

          {searched && !searching && (
            <div style={{ display: "grid", gap: 8 }}>
              {results.length === 0 ? (
                <div style={{ ...card, textAlign: "center", padding: "2rem", color: C.textMuted }}>
                  <Search size={24} style={{ marginBottom: 8, opacity: .4 }} />
                  <div>No matches found. Try "Add New" to create a fresh record.</div>
                </div>
              ) : results.map(p => (
                <div key={`${p._source}-${p.phone}`} style={{
                  ...card, padding: "12px 16px", display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexWrap: "wrap", gap: 10,
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Avatar name={p.full_name} size={36} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{p.full_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{p.phone}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={badge(
                      p._source === "soul_care" ? C.soul : C.green,
                      p._source === "soul_care" ? C.soulLight : C.greenLight,
                      { fontSize: 11 }
                    )}>{p._source === "soul_care" ? "In Soul Care pool" : "First-Timer record"}</span>
                    <button style={btn("soul", { padding: "7px 14px", fontSize: 13 })}
                      onClick={() => selectExisting(p)} disabled={creating}>
                      {creating ? "…" : "Use this Person"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <SH title="Add New Contact" icon={UserPlus} />
          <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FieldInput label="Full Name" id="nvn" required value={newForm.full_name} onChange={setField("full_name")} placeholder="e.g. Adaeze Okafor" />
            <FieldInput label="Phone Number" id="nvp" required value={newForm.phone} onChange={setField("phone")} placeholder="+234 xxx xxx xxxx" />
          </div>
          <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FieldInput label="Gender" id="nvg" type="select" value={newForm.gender} onChange={setField("gender")}
              options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
            <FieldInput label="Email Address" id="nve" type="email" value={newForm.email} onChange={setField("email")} placeholder="you@example.com" />
          </div>
          <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FieldInput label="Marital Status" id="nvm" type="select" value={newForm.marital_status} onChange={setField("marital_status")}
              options={[{ value: "Single", label: "Single" }, { value: "Married", label: "Married" }, { value: "Divorced", label: "Divorced" }, { value: "Widowed", label: "Widowed" }]} />
            <FieldInput label="Life Stage" id="nvl" type="select" value={newForm.life_stage} onChange={setField("life_stage")}
              options={[{ value: "Student", label: "Student" }, { value: "Employee", label: "Employee" }, { value: "Business Owner", label: "Business Owner" }]} />
          </div>
          <FieldInput label="Date of Birth" id="nvd" type="date" value={newForm.dob} onChange={setField("dob")}
            hint="Optional — powers the Birthdays This Week widget" />
          <FieldInput label="House Address" id="nvh" value={newForm.house_address} onChange={setField("house_address")} placeholder="Street, City" />
          <FieldInput label="Nearest Landmark" id="nvk" value={newForm.nearest_landmark} onChange={setField("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout" />

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={btn("ghost")} onClick={() => setStep("search")}><ArrowLeft size={14} />Back to Search</button>
            <button style={{ ...btn("soul"), flex: 1 }} onClick={createNewAndProceed} disabled={creating}>
              {creating ? "Saving…" : "Save & Log Visit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AssignVisitsView — soulcareadmin only. Bulk import + assign contacts.
// ─────────────────────────────────────────────────────────────────────────────

function AssignVisitsView({ currentUser }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const { data, loading, err, reload } = useVisitData(dateFrom, dateTo);
  const { options: teamOptions, loading: teamLoading } = useRoleUsers(["soulcare", "soulcareadmin"]);

  const [selectedMember, setSelectedMember] = useState("");
  const [search, setSearch]                 = useState("");
  const [filter, setFilter]                 = useState("unassigned");
  const [saving, setSaving]                 = useState(false);
  const [msg, setMsg]                       = useState("");
  const [msgType, setMsgType]               = useState("success");
  const [pendingAssign, setPendingAssign]   = useState({});
  const [showImport, setShowImport]         = useState(false);

  const filtered = data.filter(c => {
    const matchSearch = !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    if (filter === "unassigned") return matchSearch && !c.assignment;
    if (filter === "assigned")   return matchSearch && !!c.assignment;
    if (filter === "visited")    return matchSearch && c.visits.length > 0;
    return matchSearch;
  });

  const assignedCount   = data.filter(c => !!c.assignment).length;
  const unassignedCount = data.filter(c => !c.assignment).length;
  const visitedCount    = data.filter(c => c.visits.length > 0).length;

  const bulkAssign = async () => {
    if (!selectedMember) { setMsg("Select a team member first."); setMsgType("warn"); return; }
    const targets = data.filter(c => !c.assignment);
    if (!targets.length) { setMsg("No unassigned contacts to assign."); setMsgType("warn"); return; }
    setSaving(true); setMsg("");
    try {
      const payload = targets.map(c => ({
        contact_id:  c.id,
        assigned_to: selectedMember,
        assigned_by: currentUser,
      }));
      for (let i = 0; i < payload.length; i += 50) {
        await sb("soul_care_assignments", {
          method: "POST",
          prefer: "resolution=merge-duplicates,return=representation",
          body: JSON.stringify(payload.slice(i, i + 50)),
        });
      }
      setMsg(`${targets.length} contact${targets.length !== 1 ? "s" : ""} assigned to ${selectedMember}.`);
      setMsgType("success");
      reload();
    } catch (e) { setMsg(e.message); setMsgType("error"); }
    setSaving(false);
  };

  const saveAssignment = async (contactId) => {
    const member = pendingAssign[contactId];
    if (!member) return;
    setSaving(true);
    try {
      const existing = data.find(c => c.id === contactId)?.assignment;
      if (existing) {
        await sb(`soul_care_assignments?id=eq.${existing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ assigned_to: member, assigned_by: currentUser }),
        });
      } else {
        await sb("soul_care_assignments", {
          method: "POST",
          body: JSON.stringify({ contact_id: contactId, assigned_to: member, assigned_by: currentUser }),
        });
      }
      setPendingAssign(p => { const n = { ...p }; delete n[contactId]; return n; });
      setMsg(`Assigned to ${member}.`); setMsgType("success"); reload();
    } catch (e) { setMsg(e.message); setMsgType("error"); }
    setSaving(false);
  };

  const removeAssignment = async (asgId) => {
    setSaving(true);
    try {
      await sb(`soul_care_assignments?id=eq.${asgId}`, { method: "DELETE", prefer: "return=minimal" });
      setMsg("Assignment removed."); setMsgType("success"); reload();
    } catch (e) { setMsg(e.message); setMsgType("error"); }
    setSaving(false);
  };

  const tabs = [
    { k: "unassigned", label: "Unassigned", count: unassignedCount, col: C.gold      },
    { k: "assigned",   label: "Assigned",   count: assignedCount,   col: C.soul      },
    { k: "visited",    label: "Visited",    count: visitedCount,    col: C.green     },
    { k: "all",        label: "All",        count: data.length,     col: C.textMuted },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader
        title="Assign Visits"
        subtitle="Import contacts and allocate them to Soul Care team members for follow-up"
        action={
          <button style={btn("outline", { color: C.soul, border: `1.5px solid ${C.soul}` })} onClick={() => setShowImport(s => !s)}>
            <Upload size={14} />{showImport ? "Hide Import" : "Bulk Import"}
          </button>
        }
      />

      <SCDateFilterBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
        label="Filter by date added to pool:" />

      {showImport && <SoulCareCSVImport currentUser={currentUser} onDone={reload} />}

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Contacts" value={data.length}     icon={Users}       accent={C.soul}  />
        <StatCard label="Assigned"       value={assignedCount}   icon={UserCheck}   accent={C.green} />
        <StatCard label="Unassigned"     value={unassignedCount} icon={AlertCircle} accent={C.gold}
          sub={unassignedCount > 0 ? "Need assignment" : "All assigned"} />
      </div>

      {/* Bulk assign panel */}
      <div style={{ ...card, marginBottom: 20, padding: "1rem 1.25rem", background: C.soulLight, border: `1px solid ${C.soul}22` }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: C.soul, marginBottom: 10,
          fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".07em",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          <Zap size={11} />Bulk Assignment
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
              Assign all <strong>{unassignedCount}</strong> unassigned contacts to:
            </div>
            {teamLoading ? (
              <div style={{ ...inputBase, color: C.textMuted, display: "flex", alignItems: "center", gap: 8 }}>
                <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />Loading…
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <select value={selectedMember} onChange={e => setSelectedMember(e.target.value)} style={{ ...inputBase, cursor: "pointer" }}>
                <option value="">Select team member</option>
                {teamOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            )}
          </div>
          <button
            style={{ ...btn("soul"), opacity: (!selectedMember || unassignedCount === 0) ? .5 : 1 }}
            onClick={bulkAssign} disabled={saving || !selectedMember || unassignedCount === 0}>
            <UserCheck size={14} />{saving ? "Saving…" : `Assign ${unassignedCount} contacts`}
          </button>
        </div>
      </div>

      <Alert type={msgType} msg={msg} onClose={() => setMsg("")} />
      <Alert type="error" msg={err} onClose={() => {}} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? (t.col || C.soul) : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? (t.col || C.soul) : C.border}`,
            }}>
            {t.label} ({t.count})
          </button>
        ))}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...inputBase, width: 180, paddingLeft: 30 }} />
        </div>
        <button style={btn("ghost", { padding: "6px 10px" })} onClick={reload}><RefreshCw size={13} /></button>
      </div>

      <Alert type="error" msg={err} onClose={() => {}} />

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(c => {
            const pending     = pendingAssign[c.id];
            const displayName = `${c.full_name}${scProfileTag(c)}`;
            const hasVisits   = c.visits.length > 0;
            return (
              <div key={c.id} style={{
                ...card, padding: "12px 16px",
                borderLeft: `3px solid ${hasVisits ? C.green : c.assignment ? C.soul : C.gold}`,
              }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 220 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: C.soulLight, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head,
                    }}>{c.full_name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={c.phone} /> · added {c.created_at?.slice(0, 10)}</div>
                      {hasVisits && (
                        <div style={{ fontSize: 11, color: C.green, marginTop: 3 }}>
                          {c.visits.length} visit{c.visits.length !== 1 ? "s" : ""} logged · latest: {scLatestVisit(c.visits)?.visit_status || "—"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {c.assignment && !pending ? (
                      <>
                        <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}>
                          <UserCheck size={10} />{c.assignment.assigned_to}
                        </span>
                        <button style={btn("ghost", { padding: "5px 10px", fontSize: 11 })}
                          onClick={() => setPendingAssign(p => ({ ...p, [c.id]: c.assignment.assigned_to }))}>
                          <Edit3 size={10} />Reassign
                        </button>
                        <button style={btn("danger", { padding: "5px 10px", fontSize: 11 })}
                          onClick={() => removeAssignment(c.assignment.id)} disabled={saving}>
                          <X size={10} />Unassign
                        </button>
                      </>
                    ) : (
                      <>
                        {teamLoading ? (
                          <span style={{ fontSize: 12, color: C.textMuted }}>Loading…</span>
                        ) : (
                          <select value={pending ?? ""} onChange={e => setPendingAssign(p => ({ ...p, [c.id]: e.target.value }))}
                            style={{ ...inputBase, width: 180, padding: "6px 10px", fontSize: 13 }}>
                            <option value="">Select visitor</option>
                            {teamOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        )}
                        {pending && (
                          <>
                            <button style={btn("soul", { padding: "6px 14px", fontSize: 12 })}
                              onClick={() => saveAssignment(c.id)} disabled={saving}>
                              {saving ? "…" : "Save"}
                            </button>
                            <button style={btn("ghost", { padding: "6px 10px", fontSize: 12 })}
                              onClick={() => setPendingAssign(p => { const n = { ...p }; delete n[c.id]; return n; })}>
                              <X size={12} />
                            </button>
                          </>
                        )}
                        {!pending && !c.assignment && <span style={badge(C.gold, C.goldLight, { fontSize: 11 })}>Unassigned</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <UserCheck size={28} style={{ marginBottom: 8, opacity: .4 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>No contacts in this category</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.4 — MembersCareCSVImport: bulk import into church_members, with an
// optional "also add to visit pool" pass (skips phones already in the pool).
// ─────────────────────────────────────────────────────────────────────────────

function MembersCareCSVImport({ currentUser, onDone }) {
  const [rows, setRows]       = useState([]);
  const [alsoPool, setAlsoPool] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/"/g, ""));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
      return obj;
    });
  };

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setRows(parseCSV(ev.target.result)); setErr(""); setSuccess(""); };
    reader.readAsText(file);
  };

  const oneOf = (v, list) => {
    const c = (v || "").toString().trim().toLowerCase();
    const hit = list.find(x => x.toLowerCase() === c);
    return hit || null;
  };
  const cleanDate = (raw) => {
    const s = (raw || "").toString().trim();
    const parts = s.split(/[/-]/);
    if (parts.length !== 3) return null;
    const [a, b, c2] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, "0")}-${c2.padStart(2, "0")}`;
    return `${c2}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`;
  };

  const importAll = async () => {
    if (!rows.length) return;
    setLoading(true); setErr("");
    try {
      const n = (v) => (v === "" || v === undefined || v === null) ? null : v;
      const payload = rows
        .map(r => ({
          full_name:         (r.full_name || r.name || "").toString().trim(),
          phone:             (r.phone || r.phone_number || "").toString().trim(),
          email:             n(r.email?.toString().trim()),
          gender:            oneOf(r.gender, ["Male", "Female"]),
          dob:               cleanDate(r.dob || r.date_of_birth),
          marital_status:    oneOf(r.marital_status, ["Single", "Married", "Divorced", "Widowed"]),
          life_stage:        oneOf(r.life_stage, ["Student", "Employee", "Business Owner"]),
          category:          oneOf(r.category, ["Steward", "Member"]) || "Member",
          membership_status: oneOf(r.membership_status, ["Active", "Inactive", "Travelled"]) || "Active",
          date_joined:       cleanDate(r.date_joined || r.joined),
          house_address:     n((r.house_address || r.address || "").toString().trim()),
          nearest_landmark:  n((r.nearest_landmark || r.landmark || "").toString().trim()),
          added_by:          currentUser || null,
        }))
        .filter(r => r.full_name && r.phone);

      if (!payload.length) {
        setErr("No valid rows found. Each row needs at least full_name and phone.");
        setLoading(false); return;
      }

      await sb("church_members", { method: "POST", body: JSON.stringify(payload) });

      let pooled = 0;
      if (alsoPool) {
        const pool = await sb("soul_care_contacts?select=phone").catch(() => []);
        const existing = new Set((pool || []).map(c => phoneKey(c.phone)).filter(Boolean));
        const poolPayload = payload
          .filter(m => !existing.has(phoneKey(m.phone)))
          .map(m => ({
            full_name: m.full_name, phone: m.phone, email: m.email, gender: m.gender,
            house_address: m.house_address, nearest_landmark: m.nearest_landmark,
            marital_status: m.marital_status, life_stage: m.life_stage, dob: m.dob,
            added_by: currentUser || null,
          }));
        for (let i = 0; i < poolPayload.length; i += 50) {
          await sb("soul_care_contacts", { method: "POST", body: JSON.stringify(poolPayload.slice(i, i + 50)) });
        }
        pooled = poolPayload.length;
      }

      setSuccess(`${payload.length} member${payload.length !== 1 ? "s" : ""} imported${alsoPool ? ` · ${pooled} added to the visit pool (duplicates skipped)` : ""}.`);
      toast.success("Import complete.");
      setRows([]);
      onDone?.();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ ...card, marginBottom: 20, border: `1px solid ${C.soul}30` }}>
      <SH title="Bulk CSV Import — Church Members" icon={Upload} />
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
        Required columns:{" "}
        <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>full_name</code>,{" "}
        <code style={{ background: C.bg, padding: "1px 5px", borderRadius: 4 }}>phone</code>. Optional: email, gender, dob,
        marital_status, life_stage, category (Steward/Member), membership_status (Active/Inactive/Travelled),
        date_joined, house_address, nearest_landmark.
      </p>
      <Alert type="error"   msg={err}     onClose={() => setErr("")} />
      <Alert type="success" msg={success} onClose={() => setSuccess("")} />

      <FieldInput label="Also add imported members to the Visit Pool (they'll appear as Unassigned in Assign Visits)"
        id="mc-pool" type="bool-toggle" value={alsoPool} onChange={v => setAlsoPool(!!v)} />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: rows.length ? 16 : 0 }}>
        <input ref={fileRef} type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
        <button style={btn("outline", { color: C.soul, border: `1.5px solid ${C.soul}` })} onClick={() => fileRef.current.click()}>
          <Upload size={14} />Choose CSV File
        </button>
        <button style={btn("ghost", { fontSize: 12 })}
          onClick={() => downloadCSVTemplate("envoys_members_import_template.csv", MEMBERS_TEMPLATE_HEADERS, MEMBERS_TEMPLATE_EXAMPLE)}>
          <Download size={12} />Download Template
        </button>
        {rows.length > 0 && (
          <button style={btn("soul")} onClick={importAll} disabled={loading}>
            {loading ? "Importing…" : `Import ${rows.length} rows`}
          </button>
        )}
      </div>

      {rows.length > 0 && (
        <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: F.body }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {Object.keys(rows[0]).slice(0, 6).map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: C.textSecondary, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  {Object.values(r).slice(0, 6).map((v, j) => (
                    <td key={j} style={{ padding: "7px 12px", color: C.textPrimary }}>{v || "—"}</td>
                  ))}
                </tr>
              ))}
              {rows.length > 5 && (
                <tr><td colSpan={6} style={{ padding: "7px 12px", color: C.textMuted, fontStyle: "italic" }}>
                  …and {rows.length - 5} more rows
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.4 — MembersCare: the full-congregation care registry.
// Last Visitation is DERIVED: members are matched to the visit pool by
// normalized phone and the latest logged visit_date is shown.
// ─────────────────────────────────────────────────────────────────────────────

const MC_STATUS_META = {
  Active:    { color: C.green,  bg: C.greenLight  },
  Inactive:  { color: C.danger, bg: C.dangerLight },
  Travelled: { color: C.amber,  bg: C.amberLight  },
};

function MembersCare({ currentUser, role }) {
  const isAdmin = role === "soulcareadmin" || role === "admin";
  const [members, setMembers]           = useState([]);
  const [poolKeys, setPoolKeys]         = useState(new Set());
  const [lastVisitByKey, setLastVisit]  = useState({});
  const [loading, setLoading]           = useState(true);
  const [err, setErr]                   = useState("");
  const [msg, setMsg]                   = useState("");
  const [search, setSearch]             = useState("");
  const [fStatus, setFStatus]           = useState("");
  const [fMarital, setFMarital]         = useState("");
  const [fLife, setFLife]               = useState("");
  const [showImport, setShowImport]     = useState(false);
  const [addingId, setAddingId]         = useState(null);
  const [tick, setTick]                 = useState(0);
  const reload = () => setTick(t => t + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const [cm, pool, visits] = await Promise.all([
          sb("church_members?select=*&order=full_name.asc&limit=3000"),
          sb("soul_care_contacts?select=id,phone").catch(() => []),
          sb("soul_care_visits?select=contact_id,visit_date").catch(() => []),
        ]);
        if (cancelled) return;
        const keys = new Set((pool || []).map(c => phoneKey(c.phone)).filter(Boolean));
        const contactKey = {};
        (pool || []).forEach(c => { contactKey[c.id] = phoneKey(c.phone); });
        const lv = {};
        (visits || []).forEach(v => {
          const k = contactKey[v.contact_id];
          if (k && v.visit_date && (!lv[k] || v.visit_date > lv[k])) lv[k] = v.visit_date;
        });
        setMembers(cm || []);
        setPoolKeys(keys);
        setLastVisit(lv);
      } catch (e) { if (!cancelled) setErr(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tick]);

  const ageOf = (dob) => {
    if (!dob) return null;
    const [y, m, d] = String(dob).slice(0, 10).split("-").map(Number);
    if (!y) return null;
    const t = new Date();
    let a = t.getFullYear() - y;
    if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--;
    return a;
  };
  const dobDayMonth = (dob) => {
    if (!dob) return "—";
    const [, m, d] = String(dob).slice(0, 10).split("-").map(Number);
    if (!m || !d) return "—";
    return new Date(2000, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const total        = members.length;
  const stewards     = members.filter(m => m.category === "Steward").length;
  const newThisMonth = members.filter(m => ((m.date_joined || (m.created_at || "").slice(0, 10)) >= monthStart)).length;
  const children     = members.filter(m => { const a = ageOf(m.dob); return a !== null && a < 18; }).length;

  const filtered = members.filter(m => {
    if (fStatus  && (m.membership_status || "Active") !== fStatus) return false;
    if (fMarital && m.marital_status !== fMarital) return false;
    if (fLife    && m.life_stage !== fLife) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!m.full_name?.toLowerCase().includes(q) && !m.phone?.includes(search)) return false;
    }
    return true;
  });

  const addToPool = async (m) => {
    setAddingId(m.id); setErr("");
    try {
      await sb("soul_care_contacts", {
        method: "POST",
        body: JSON.stringify({
          full_name: m.full_name, phone: m.phone, email: m.email || null, gender: m.gender || null,
          house_address: m.house_address || null, nearest_landmark: m.nearest_landmark || null,
          marital_status: m.marital_status || null, life_stage: m.life_stage || null, dob: m.dob || null,
          added_by: currentUser || null,
        }),
      });
      setPoolKeys(prev => { const n = new Set(prev); n.add(phoneKey(m.phone)); return n; });
      setMsg(`${m.full_name} added to the visit pool — find them under Unassigned in Assign Visits.`);
      toast.success(`${m.full_name} added to the visit pool.`);
    } catch (e) { setErr(e.message); }
    setAddingId(null);
  };

  const GRID = "minmax(186px,1.3fr) 175px minmax(150px,1fr) 62px 74px 92px 96px 100px 150px";
  const headCell = {
    fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase",
    letterSpacing: ".07em", fontFamily: F.head,
  };
  const stickyLeft = (bg, z = 2) => ({
    position: "sticky", left: 0, zIndex: z, background: bg,
    boxShadow: "2px 0 5px rgba(0,0,0,.06)", paddingLeft: 16,
    alignSelf: "stretch", display: "flex", alignItems: "center",
  });
  const stickyRight = (bg, z = 2) => ({
    position: "sticky", right: 0, zIndex: z, background: bg,
    boxShadow: "-2px 0 5px rgba(0,0,0,.06)", paddingRight: 16, paddingLeft: 6,
    alignSelf: "stretch", display: "flex", alignItems: "center",
  });

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader
        title="Members Care"
        subtitle="Full congregation registry for Soul Care follow-up"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isAdmin && (
              <button style={btn("outline", { color: C.soul, border: `1.5px solid ${C.soul}` })} onClick={() => setShowImport(s => !s)}>
                <Upload size={14} />{showImport ? "Hide Import" : "Bulk Import"}
              </button>
            )}
            <button style={btn("ghost", { padding: "8px 10px" })} onClick={reload}><RefreshCw size={14} /></button>
          </div>
        } />

      {isAdmin && showImport && <MembersCareCSVImport currentUser={currentUser} onDone={reload} />}

      <div style={{ marginBottom: 20 }}><BirthdaysWidget /></div>

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Envoys"           value={total}        icon={Users}    accent={C.soul}     />
        <StatCard label="Stewards"                value={stewards}     icon={Shield}   accent={C.goldDark} />
        <StatCard label="New Members This Month"  value={newThisMonth} icon={UserPlus} accent={C.green}    />
        <StatCard label="Children"                value={children}     icon={Heart}    accent={C.research}
          sub={children === 0 && total > 0 ? "Counted from recorded DOBs" : ""} />
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.soulLight, borderRadius: 10, border: `1px solid ${C.soul}30`,
      }}>
        <Filter size={14} color={C.soul} style={{ flexShrink: 0 }} />
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ ...inputBase, width: 170, cursor: "pointer" }}>
          <option value="">Membership Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Travelled">Travelled</option>
        </select>
        <select value={fMarital} onChange={e => setFMarital(e.target.value)} style={{ ...inputBase, width: 170, cursor: "pointer" }}>
          <option value="">Marital Status</option>
          <option value="Single">Single</option>
          <option value="Married">Married</option>
          <option value="Divorced">Divorced</option>
          <option value="Widowed">Widowed</option>
        </select>
        <select value={fLife} onChange={e => setFLife(e.target.value)} style={{ ...inputBase, width: 170, cursor: "pointer" }}>
          <option value="">Life Stage</option>
          <option value="Student">Student</option>
          <option value="Employee">Employee</option>
          <option value="Business Owner">Business Owner</option>
        </select>
        {(fStatus || fMarital || fLife) && (
          <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })}
            onClick={() => { setFStatus(""); setFMarital(""); setFLife(""); }}>
            <X size={12} />Clear
          </button>
        )}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
            style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error"   msg={err} onClose={() => setErr("")} />
      <Alert type="success" msg={msg} onClose={() => setMsg("")} />

      {loading ? <SkeletonList rows={6} /> : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <Users size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {members.length === 0 ? "No members yet — use Bulk Import to load the congregation." : "No members match your filters."}
          </div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="mc-scroll" style={{ overflow: "auto", maxHeight: 600, padding: "0 16px" }}>

            {/* Sticky header */}
            <div style={{
              display: "grid", gridTemplateColumns: GRID, gap: 10, alignItems: "center",
              padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`,
              position: "sticky", top: 0, zIndex: 3, minWidth: 1050,
            }}>
              <div style={{ ...headCell, ...stickyLeft(C.bg, 4) }}>Name</div>
              {["Phone", "Email", "Gender", "DOB", "Category", "Status", "Last Visit"].map(h => (
                <div key={h} style={headCell}>{h}</div>
              ))}
              <div style={headCell}>Visit Pool</div>
            </div>

            {/* Rows */}
            {filtered.map((m, i) => {
              const k       = phoneKey(m.phone);
              const inPool  = k && poolKeys.has(k);
              const lastVis = k ? lastVisitByKey[k] : null;
              const stm     = MC_STATUS_META[m.membership_status || "Active"] || MC_STATUS_META.Active;
              return (
                <div key={m.id} style={{
                  display: "grid", gridTemplateColumns: GRID, gap: 10, alignItems: "center",
                  padding: "10px 0", background: C.surface, minWidth: 1050,
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={stickyLeft(C.surface)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <Avatar name={m.full_name} size={30} />
                      <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.full_name}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12 }}><PhoneLink phone={m.phone} withWhatsApp /></div>
                  <div style={{ fontSize: 12, color: C.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.email || <span style={{ color: C.textMuted }}>—</span>}
                  </div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>{m.gender || "—"}</div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}>{dobDayMonth(m.dob)}</div>
                  <div>
                    <span style={badge(
                      m.category === "Steward" ? C.goldDark : C.soul,
                      m.category === "Steward" ? C.goldLight : C.soulLight,
                      { fontSize: 10 }
                    )}>{m.category || "Member"}</span>
                  </div>
                  <div>
                    <span style={badge(stm.color, stm.bg, { fontSize: 10 })}>
                      <span style={dot(stm.color)} />{m.membership_status || "Active"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: lastVis ? C.textSecondary : C.textMuted }}>
                    {lastVis || "Never"}
                  </div>
                  <div style={{ paddingLeft: 6 }}>
                    {inPool ? (
                      <span style={badge(C.green, C.greenLight, { fontSize: 10 })}>
                        <CheckCircle size={10} />In Pool
                      </span>
                    ) : (
                      <button style={btn("soul", { padding: "5px 10px", fontSize: 11 })}
                        onClick={() => addToPool(m)} disabled={addingId === m.id}>
                        <UserPlus size={11} />{addingId === m.id ? "Adding…" : "Add to Pool"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>
            Showing <strong>{filtered.length}</strong> of <strong>{members.length}</strong> member{members.length !== 1 ? "s" : ""}
          </span>
          {filtered.length > 10 && (
            <span>Scroll the table for more · Name and Visit Pool stay pinned</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoulCareQueue — role-aware. soulcareadmin/admin see everyone + can expand
// ─────────────────────────────────────────────────────────────────────────────
// SoulCareQueue — role-aware. soulcareadmin/admin see everyone + can expand
// visit history; soulcare members only see contacts assigned to them.
// ─────────────────────────────────────────────────────────────────────────────

function SoulCareQueue({ onLogVisit, currentUserRole = "soulcare", currentUser = "" }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const { data, loading, err, reload } = useVisitData(dateFrom, dateTo);
  const [filter, setFilter]     = useState("pending");
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState(null);
  const isAdmin = currentUserRole === "soulcareadmin" || currentUserRole === "admin";

  const searched = data.filter(c =>
    !search ||
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  const visible = isAdmin
    ? searched
    : searched.filter(c => c.assignment?.assigned_to === currentUser);

  const pending     = visible.filter(c => scCategorise(c) === "pending");
  const scheduled   = visible.filter(c => scCategorise(c) === "scheduled");
  const completed   = visible.filter(c => scCategorise(c) === "completed");
  const rescheduled = visible.filter(c => scCategorise(c) === "rescheduled");
  const unavailable = visible.filter(c => scCategorise(c) === "unavailable");
  const views  = { pending, scheduled, completed, rescheduled, unavailable, all: visible };
  const filtered = views[filter] || visible;

  const tabs = [
    { k: "pending",     label: "Pending",       count: pending.length,     col: C.gold      },
    { k: "scheduled",   label: "Scheduled",     count: scheduled.length,   col: C.blue      },
    { k: "completed",   label: "Completed",     count: completed.length,   col: C.green     },
    { k: "rescheduled", label: "Rescheduled",   count: rescheduled.length, col: C.amber     },
    { k: "unavailable", label: "Unavailable",   count: unavailable.length, col: C.danger    },
    { k: "all",         label: "All",           count: visible.length,     col: C.textMuted },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Visit Queue" subtitle="People awaiting or receiving a Soul Care visit"
        action={
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ ...inputBase, width: 180, paddingLeft: 30 }} />
          </div>
        } />

      <div style={{ marginBottom: 16 }}><BirthdaysWidget /></div>

      <SCDateFilterBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
        label="Filter by date added to pool:" />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? t.col : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? t.col : C.border}`,
            }}>
            {t.label} <span style={{ opacity: .8 }}>({t.count})</span>
          </button>
        ))}
        <button style={{ ...btn("ghost", { padding: "6px 10px", marginLeft: "auto" }) }} onClick={reload}><RefreshCw size={13} /></button>
      </div>

      <Alert type="error" msg={err} onClose={() => {}} />

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(c => {
            const latest = scLatestVisit(c.visits);
            const sm     = latest ? (VISIT_STATUS_META[latest.visit_status] || { color: C.gold, bg: C.goldLight }) : { color: C.gold, bg: C.goldLight };
            const isOpen = expanded === c.id;
            const isMine = c.assignment?.assigned_to === currentUser;
            const displayName = `${c.full_name}${scProfileTag(c)}`;

            return (
              <div key={c.id} style={{ ...card, padding: 0, overflow: "hidden", borderLeft: `3px solid ${sm.color}` }}>
                <div className="et-head" style={{
                  display: "flex", justifyContent: "space-between", flexWrap: "wrap",
                  gap: 10, padding: "12px 16px", cursor: isAdmin ? "pointer" : "default",
                }}
                  onClick={() => isAdmin && setExpanded(isOpen ? null : c.id)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: sm.color, fontSize: 14, fontFamily: F.head,
                    }}>{c.full_name?.charAt(0)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={c.phone} withWhatsApp /></div>
                      {c.assignment && (
                        <div style={{ fontSize: 11, color: C.soul, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <UserCheck size={10} />Assigned to <strong>{c.assignment.assigned_to}</strong>
                        </div>
                      )}
                      {latest && (
                        <div style={{ marginTop: 5 }}>
                          <span style={badge(sm.color, sm.bg, { fontSize: 11 })}>
                            <span style={dot(sm.color)} />{latest.visit_status}
                          </span>
                          {c.visits.length > 1 && (
                            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>
                              ({c.visits.length} visits logged)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="et-actions" style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0 }}>
                    {!isAdmin && isMine && (
                      <button style={btn("soul", { padding: "7px 14px", fontSize: 13 })}
                        onClick={e => { e.stopPropagation(); onLogVisit(c); }}>
                        <MapPin size={13} />Log Visit
                      </button>
                    )}
                    {!isAdmin && !isMine && (
                      <span style={badge(C.textMuted, C.bg, { fontSize: 11 })}>Not assigned to you</span>
                    )}
                    {isAdmin && (
                      <ChevronDown size={14} color={C.textMuted}
                        style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", alignSelf: "center" }} />
                    )}
                  </div>
                </div>

                {isAdmin && isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
                    {c.visits.length === 0 ? (
                      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 12 }}>No visits logged yet.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                        {c.visits.map(v => {
                          const vsm = VISIT_STATUS_META[v.visit_status] || { color: C.textMuted, bg: C.bg };
                          const um  = URGENCY_META[v.urgency] || {};
                          return (
                            <div key={v.id} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", border: `1px solid ${C.border}` }}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
                                <span style={badge(vsm.color, vsm.bg, { fontSize: 11, fontFamily: F.head })}>{v.visit_type || "Visit"} · {v.visit_status}</span>
                                {v.urgency && <span style={badge(um.color || C.textMuted, um.bg || C.bg, { fontSize: 11 })}>{v.urgency}</span>}
                                {v.escalate_to_pastorate && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={10} />Escalated</span>}
                              </div>
                              <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>
                                Logged by <strong>{v.logged_by || "—"}</strong>
                                {v.visit_date && <span style={{ marginLeft: 8 }}><Calendar size={10} style={{ verticalAlign: "middle" }} /> {v.visit_date}</span>}
                              </div>
                              {v.meeting_notes && <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{v.meeting_notes}</div>}
                              {v.escalate_to_pastorate && v.escalation_reason && (
                                <div style={{ fontSize: 12, color: C.flag, marginTop: 6, background: C.flagLight, padding: "5px 8px", borderRadius: 5 }}>
                                  🚩 {v.escalation_reason}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <CheckCircle size={28} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>No records in this category</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MySoulCareVisits — visits assigned to the logged-in Soul Care member
// ─────────────────────────────────────────────────────────────────────────────

function MySoulCareVisits({ currentUser, onLogVisit, onEditVisit }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const { data, loading, err, reload } = useVisitData(dateFrom, dateTo);
  const [filter, setFilter] = useState("all");

  const mine = data.filter(c => c.assignment?.assigned_to === currentUser);

  const pending   = mine.filter(c => c.visits.length === 0);
  const scheduled = mine.filter(c => scLatestVisit(c.visits)?.visit_status === "Scheduled");
  const completed = mine.filter(c => scLatestVisit(c.visits)?.visit_status === "Completed");
  const flagged   = mine.filter(c => c.visits.some(v => v.escalate_to_pastorate));

  const views    = { all: mine, pending, scheduled, completed, flagged };
  const filtered = views[filter] || mine;

  // v5.9 — visits whose latest log requested a follow-up that has arrived.
  const dueTodayStr = new Date().toISOString().slice(0, 10);
  const dueVisitEntries = mine
    .map(c => {
      const last = scLatestVisit(c.visits);
      if (!last || !last.follow_up_required || !last.next_follow_up_date || last.next_follow_up_date > dueTodayStr) return null;
      return {
        id: c.id, row: c, name: c.full_name, phone: c.phone,
        dueDate: last.next_follow_up_date,
        note: last.reason_for_care || last.meeting_notes,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const tabs = [
    { k: "all",       label: "All",       count: mine.length,      col: C.textMuted },
    { k: "pending",   label: "Pending",   count: pending.length,   col: C.gold      },
    { k: "scheduled", label: "Scheduled", count: scheduled.length, col: C.blue      },
    { k: "completed", label: "Completed", count: completed.length, col: C.green     },
    { k: "flagged",   label: "Flagged",   count: flagged.length,   col: C.flag      },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="My Visits" subtitle={`${mine.length} contact${mine.length !== 1 ? "s" : ""} assigned to you`} />

      <DueTodayPanel
        entries={dueVisitEntries}
        actionLabel="Log Visit"
        actionIcon={MapPin}
        onAction={c => onLogVisit(c)}
      />

      <SCDateFilterBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
        label="Filter by date added to pool:" />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Assigned to Me" value={mine.length}      icon={MapPin}      accent={C.soul}  />
        <StatCard label="Completed"      value={completed.length} icon={CheckCircle} accent={C.green} />
        <StatCard label="Scheduled"      value={scheduled.length} icon={Calendar}    accent={C.blue}  />
        <StatCard label="Flagged"        value={flagged.length}   icon={Flag}        accent={C.flag}
          sub={flagged.length > 0 ? "Needs pastoral attention" : ""} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
              fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? t.col : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? t.col : C.border}`,
            }}>
            {t.label} ({t.count})
          </button>
        ))}
        <button style={{ ...btn("ghost", { padding: "6px 10px", marginLeft: "auto" }) }} onClick={reload}><RefreshCw size={13} /></button>
      </div>

      <Alert type="error" msg={err} onClose={() => {}} />

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(c => {
            const latest      = scLatestVisit(c.visits);
            const sm          = latest ? (VISIT_STATUS_META[latest.visit_status] || { color: C.gold, bg: C.goldLight }) : { color: C.gold, bg: C.goldLight };
            const anyFlagged  = c.visits.some(v => v.escalate_to_pastorate);
            const displayName = `${c.full_name}${scGenderTag(c)}`;

            return (
              <div key={c.id} style={{ ...card, padding: "14px 16px", borderLeft: `3px solid ${anyFlagged ? C.flag : sm.color}` }}>
                <div className="et-head" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: sm.color, fontSize: 14, fontFamily: F.head,
                    }}>{c.full_name?.charAt(0) || "?"}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{displayName}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}><PhoneLink phone={c.phone} withWhatsApp /></div>
                    </div>
                  </div>
                  <div className="et-actions" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {anyFlagged && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={10} />Flagged</span>}
                    <button style={btn("soul", { padding: "7px 14px", fontSize: 13 })} onClick={() => onLogVisit(c)}>
                      <MapPin size={13} />Log New Visit
                    </button>
                  </div>
                </div>

                {c.visits.length > 0 ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    {c.visits.map(v => {
                      const vsm = VISIT_STATUS_META[v.visit_status] || { color: C.textMuted, bg: C.bg };
                      return (
                        <div key={v.id} style={{ background: C.bg, borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4, alignItems: "center" }}>
                                <span style={badge(vsm.color, vsm.bg, { fontSize: 10, padding: "2px 8px", fontFamily: F.head })}>
                                  {v.visit_type || "Visit"} · {v.visit_status}
                                </span>
                                {v.visit_date && <span style={{ fontSize: 11, color: C.textMuted }}><Calendar size={10} style={{ verticalAlign: "middle" }} /> {v.visit_date}</span>}
                              </div>
                              {v.meeting_notes && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, lineHeight: 1.5 }}>{v.meeting_notes}</div>}
                              {v.escalate_to_pastorate && v.escalation_reason && (
                                <div style={{ fontSize: 12, color: C.flag, marginTop: 4, background: C.flagLight, padding: "5px 8px", borderRadius: 5 }}>
                                  🚩 {v.escalation_reason}
                                </div>
                              )}
                            </div>
                            {v.logged_by === currentUser && (
                              <button style={btn("ghost", { padding: "5px 10px", fontSize: 11, flexShrink: 0 })} onClick={() => onEditVisit(c, v)}>
                                <Edit3 size={11} />Edit
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>No visits logged yet.</div>
                )}
              </div>
            );
          })}

          {!loading && filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Heart size={28} color={C.soul} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontFamily: F.head }}>
                {mine.length === 0 ? "No contacts assigned to you yet." : "No contacts in this category."}
              </div>
              {mine.length === 0 && <p style={{ fontSize: 13, marginTop: 6 }}>Ask your Soul Care Admin to assign contacts to you.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LogVisitForm — log a new visit, or edit an existing one, for a contact
// ─────────────────────────────────────────────────────────────────────────────

function LogVisitForm({ contact, editVisit = null, loggedBy = "", onBack, onDone }) {
  const displayName = `${contact.full_name}${scGenderTag(contact)}`;

  const [form, setForm] = useState({
    visit_type: editVisit?.visit_type || "",
    urgency: editVisit?.urgency || "",
    reason_for_care: editVisit?.reason_for_care || "",
    visit_status: editVisit?.visit_status || "",
    visit_date: editVisit?.visit_date || new Date().toISOString().slice(0, 10),
    visit_time: editVisit?.visit_time || "",
    meeting_notes: editVisit?.meeting_notes || "",
    visit_photo_url: editVisit?.visit_photo_url || "",
    material_support: editVisit?.material_support || false,
    material_support_notes: editVisit?.material_support_notes || "",
    prayer_requests: editVisit?.prayer_requests || "",
    testimony: editVisit?.testimony || "",
    follow_up_required: editVisit?.follow_up_required || false,
    next_follow_up_date: editVisit?.next_follow_up_date || "",
    escalate_to_pastorate: editVisit?.escalate_to_pastorate || false,
    escalation_reason: editVisit?.escalation_reason || "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");

  const setRef = useRef({});
  const set = useCallback((key) => {
    if (!setRef.current[key]) {
      setRef.current[key] = (valOrEvt) => {
        const val = valOrEvt && valOrEvt.target !== undefined ? valOrEvt.target.value : valOrEvt;
        setForm(f => ({ ...f, [key]: val }));
      };
    }
    return setRef.current[key];
  }, []);

  const submit = async () => {
    if (!form.visit_type)   { setErr("Type of visit is required."); return; }
    if (!form.visit_status) { setErr("Visit status is required."); return; }
    if (form.escalate_to_pastorate && !form.escalation_reason.trim()) {
      setErr("Please describe the reason for escalation."); return;
    }
    setLoading(true); setErr("");
    try {
      const n = (v) => (v === "" || v === undefined || v === null) ? null : v;
      const payload = {
        contact_id:             contact.id,
        logged_by:              loggedBy || editVisit?.logged_by || null,
        visit_type:             form.visit_type,
        reason_for_care:        n(form.reason_for_care),
        urgency:                n(form.urgency),
        visit_status:           form.visit_status,
        visit_date:             n(form.visit_date),
        visit_time:             n(form.visit_time),
        meeting_notes:          n(form.meeting_notes),
        visit_photo_url:        n(form.visit_photo_url),
        material_support:       !!form.material_support,
        material_support_notes: form.material_support ? n(form.material_support_notes) : null,
        prayer_requests:        n(form.prayer_requests),
        testimony:              n(form.testimony),
        follow_up_required:     !!form.follow_up_required,
        next_follow_up_date:    form.follow_up_required ? n(form.next_follow_up_date) : null,
        escalate_to_pastorate:  !!form.escalate_to_pastorate,
        escalation_reason:      form.escalate_to_pastorate ? n(form.escalation_reason) : null,
      };
      if (editVisit?.id) {
        await sb(`soul_care_visits?id=eq.${editVisit.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("soul_care_visits", { method: "POST", body: JSON.stringify(payload) });
      }
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem" }} className="page-enter">
      <CheckCircle size={48} color={C.green} style={{ marginBottom: 12 }} />
      <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px" }}>
        Visit {editVisit ? "updated" : "logged"} for {displayName}
      </h3>
      {form.escalate_to_pastorate && (
        <div style={{ ...badge(C.flag, C.flagLight), marginTop: 8, fontSize: 13, display: "inline-flex" }}>
          <Flag size={12} />Flagged for Pastoral Team
        </div>
      )}
      <button style={{ ...btn("outline"), marginTop: 20 }} onClick={onDone}>
        <ArrowLeft size={14} />Back
      </button>
    </div>
  );

  const uc = URGENCY_META[form.urgency]?.color || C.textMuted;

  return (
    <div style={card} className="page-enter">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={btn("ghost", { padding: "7px 10px" })} onClick={onBack}><ArrowLeft size={14} /></button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            {editVisit ? "Edit Visit" : "Log New Visit"} — {displayName}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            <PhoneLink phone={contact.phone} withWhatsApp size={13} bold />
          </p>
        </div>
      </div>

      {CREDS_MISSING && <CredsBanner />}
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {loggedBy && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>Logged By</div>
          <div style={{
            ...inputBase, background: C.soulLight, border: `1.5px solid ${C.soul}40`, color: C.soul, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8, cursor: "default", userSelect: "none",
          }}>
            <UserCheck size={14} color={C.soul} />{loggedBy}
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 400, color: C.textMuted, fontStyle: "italic" }}>Logged as you</span>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 20 }}>
        <SH title="Visitation Details" icon={MapPin} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Type of Visit" id="vt" type="select" required value={form.visit_type} onChange={set("visit_type")} options={SC_VISIT_TYPES} />
          <FieldInput label="Urgency Level" id="ul" type="select" value={form.urgency} onChange={set("urgency")}
            options={[{ value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" }]} />
        </div>
        {form.urgency && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginTop: -8, marginBottom: 16,
            padding: "7px 12px", borderRadius: 8, background: `${uc}12`, fontSize: 12, color: uc, fontWeight: 600,
          }}>
            <Zap size={12} />Urgency: <strong>{form.urgency}</strong>
          </div>
        )}
        <FieldInput label="Reason for Care" id="rfc" type="textarea" value={form.reason_for_care} onChange={set("reason_for_care")}
          placeholder="Describe the purpose or context of this visit…" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <SH title="Feedback & Outcome" icon={MessageSquare} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Visit Status" id="vs" type="select" required value={form.visit_status} onChange={set("visit_status")}
            options={[
              { value: "Scheduled", label: "Scheduled" }, { value: "Completed", label: "Completed" },
              { value: "Rescheduled", label: "Rescheduled" }, { value: "Member Unavailable", label: "Member Unavailable" },
            ]} />
          <FieldInput label="Date Conducted" id="vd" type="date" value={form.visit_date} onChange={set("visit_date")} />
        </div>
        <FieldInput label="Time Conducted" id="vtime" type="time" value={form.visit_time} onChange={set("visit_time")} />
        <FieldInput label="Meeting Notes" id="mn" type="textarea" value={form.meeting_notes} onChange={set("meeting_notes")}
          placeholder="Detailed spiritual and physical observations from the visit…" />

        <div style={{ background: C.soulLight, border: `1px solid ${C.soul}22`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: C.soul, marginBottom: 12, display: "flex", alignItems: "center", gap: 5, fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em" }}>
            <Camera size={12} />Visit Photo
          </div>
          <PhotoUpload value={form.visit_photo_url} onChange={set("visit_photo_url")} existingUrl={editVisit?.visit_photo_url || ""} />
        </div>

        <div style={{ background: C.soulLight, border: `1px solid ${C.soul}22`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <FieldInput label="Material Support Provided" id="msp" type="bool-toggle" value={form.material_support} onChange={set("material_support")}
            hint="Toggle if the church provided physical aid (groceries, financial welfare, medical package, etc.)" />
          {form.material_support && (
            <FieldInput label="Support Details" id="msn" type="textarea" value={form.material_support_notes} onChange={set("material_support_notes")}
              placeholder="Describe what was provided…" />
          )}
        </div>

        <FieldInput label="Prayer Requests" id="pr" type="textarea" value={form.prayer_requests} onChange={set("prayer_requests")}
          placeholder="Specific items the member asked the church to stand in agreement with them for…" />
        <FieldInput label="Testimony" id="test" type="textarea" value={form.testimony} onChange={set("testimony")}
          placeholder="A brief summary of their testimonies since joining The Envoys…" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <SH title="Next Steps & Post-Visit Action" icon={Calendar} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div>
            <FieldInput label="Follow-Up Required" id="fur" type="bool-toggle" value={form.follow_up_required} onChange={set("follow_up_required")} />
            {form.follow_up_required && (
              <FieldInput label="Next Follow-Up Date" id="nfud" type="date" value={form.next_follow_up_date} onChange={set("next_follow_up_date")} />
            )}
          </div>
          <div>
            <div style={{ background: C.flagLight, border: `1px solid #FECACA`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.flag, marginBottom: 10, display: "flex", alignItems: "center", gap: 5, fontFamily: F.head }}>
                <Flag size={12} />Escalation
              </div>
              <FieldInput label="Escalate to Pastorate" id="etp" type="toggle" value={form.escalate_to_pastorate} onChange={set("escalate_to_pastorate")}
                hint="Notify the Pastoral Team about this case" />
              {form.escalate_to_pastorate && (
                <FieldInput label="Reason for Escalation" id="er" type="textarea" required value={form.escalation_reason} onChange={set("escalation_reason")}
                  placeholder="Describe the concern requiring pastoral escalation…" />
              )}
            </div>
          </div>
        </div>
      </div>

      <button style={{ ...btn("soul"), width: "100%", padding: 13, fontSize: 15 }} onClick={submit} disabled={loading}>
        {loading ? "Saving…" : editVisit ? "Update Visit Record" : "Save Visitation Record"}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SoulCareFlagged — global flagged/escalated visits, for soulcare + soulcareadmin
// ─────────────────────────────────────────────────────────────────────────────

function SoulCareFlagged() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      let q = "soul_care_visits?escalate_to_pastorate=eq.true&select=*,soul_care_contacts(full_name,phone,gender)&order=created_at.desc";
      if (dateFrom) q += `&created_at=gte.${dateFrom}`;
      if (dateTo)   q += `&created_at=lte.${dateTo}T23:59:59`;
      setRows((await sb(q)) || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  const daysOpen = (createdAt) => {
    if (!createdAt) return 0;
    return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  };
  const agingCount = rows.filter(r => daysOpen(r.created_at) >= 3).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Flagged for Pastoral" subtitle={`${rows.length} visit${rows.length !== 1 ? "s" : ""} escalated by the Soul Care team`}
        action={agingCount > 0 && (
          <span style={badge(C.danger, C.dangerLight, { fontSize: 12, padding: "6px 12px" })}>
            <AlertCircle size={12} />{agingCount} aging 3+ days
          </span>
        )} />

      <SCDateFilterBar dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo} label="Filter by date flagged:" />

      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map(r => {
            const contact = r.soul_care_contacts || {};
            const age = daysOpen(r.created_at);
            const aging = age >= 3;
            const sm = VISIT_STATUS_META[r.visit_status] || { color: C.textMuted, bg: C.bg };
            return (
              <div key={r.id} style={{ ...card, borderLeft: `3px solid ${aging ? C.danger : C.flag}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, fontFamily: F.head }}>{contact.full_name}{scGenderTag(contact)}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{contact.phone} · {r.visit_type}</div>
                    {r.logged_by && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Reported by <strong>{r.logged_by}</strong></div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {aging
                      ? <span style={badge(C.danger, C.dangerLight)}><AlertCircle size={11} />Aging · {age}d open</span>
                      : <span style={badge(C.flag, C.flagLight)}><Flag size={11} />Flagged · {age}d open</span>}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{r.visit_status}</span>
                  </div>
                </div>
                <div style={{ background: C.flagLight, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.flag, lineHeight: 1.6 }}>
                  <strong>Reason flagged:</strong> {r.escalation_reason || "No reason provided"}
                </div>
                {r.meeting_notes && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>
                    <strong>Visit notes:</strong> {r.meeting_notes}
                  </p>
                )}
              </div>
            );
          })}
          {rows.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Shield size={36} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontFamily: F.head }}>No flagged records</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Nothing requires pastoral attention right now.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Testimonies — mirrors ResearchFeedback exactly, sourced from soul_care_visits
// ─────────────────────────────────────────────────────────────────────────────

function Testimonies() {
  const [rows, setRows]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState("");
  const [search, setSearch]       = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [selected, setSelected]   = useState(new Set());

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await sb(
          "soul_care_visits?select=id,testimony,visit_date,soul_care_contacts(full_name)&order=visit_date.desc&limit=1000"
        );
        setRows((data || []).filter(r => r.testimony && r.testimony.trim() !== ""));
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    const name = r.soul_care_contacts?.full_name || "";
    if (search) {
      const q = search.toLowerCase();
      if (!name.toLowerCase().includes(q) && !r.testimony?.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && r.visit_date < dateFrom) return false;
    if (dateTo   && r.visit_date > dateTo)   return false;
    return true;
  });

  const allFilteredIds = filtered.map(r => r.id);
  const allSelected  = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected = allFilteredIds.some(id => selected.has(id));

  const toggleRow = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    setSelected(prev => {
      const n = new Set(prev);
      allFilteredIds.forEach(id => allSelected ? n.delete(id) : n.add(id));
      return n;
    });
  };
  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const downloadCSV = () => {
    const toExport = filtered.filter(r => selected.has(r.id));
    if (toExport.length === 0) return;
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };
    const header = ["Name", "Visit Date", "Testimony"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => [escape(r.soul_care_contacts?.full_name), escape(r.visit_date), escape(r.testimony)].join(",")),
    ];
    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateLabel = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${new Date().toISOString().slice(0, 10)}`;
    a.href = url; a.download = `envoys_testimonies${dateLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = filtered.filter(r => selected.has(r.id)).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Testimonies" subtitle="Testimonies shared during Soul Care visitations"
        action={
          <button
            style={{ ...btn("soul"), background: selectedCount > 0 ? C.soul : C.border, color: selectedCount > 0 ? "#fff" : C.textMuted, cursor: selectedCount > 0 ? "pointer" : "not-allowed" }}
            onClick={downloadCSV} disabled={selectedCount === 0}>
            <Download size={14} />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        } />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Testimonies" value={rows.length}     icon={FileText} accent={C.soul}  />
        <StatCard label="Matching Filter"   value={filtered.length} icon={Filter}   accent={C.green} />
        <StatCard label="Selected"          value={selectedCount}   icon={Download} accent={selectedCount > 0 ? C.soul : C.textMuted}
          sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16, padding: "12px 16px",
        background: C.soulLight, borderRadius: 10, border: `1px solid ${C.soul}30`,
      }}>
        <Calendar size={14} color={C.soul} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>Filter by visit date:</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}><X size={12} />Clear</button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or testimony…" style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", marginBottom: 12,
          background: `${C.soul}12`, borderRadius: 8, border: `1px solid ${C.soul}30`, fontSize: 13, color: C.soul, fontWeight: 600, flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle size={14} />{selectedCount} testimon{selectedCount !== 1 ? "ies" : "y"} selected</span>
          <button style={{ ...btn("soul", { padding: "6px 14px", fontSize: 12 }) }} onClick={downloadCSV}><Download size={13} />Download CSV</button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0 ? "No testimonies recorded yet." : "No testimonies match your filters."}
          </div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="mc-scroll" style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 1fr", minWidth: 620, padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div onClick={toggleAll} title={allSelected ? "Deselect all" : "Select all visible"}
                style={{
                  width: 18, height: 18, borderRadius: 4, cursor: "pointer", flexShrink: 0,
                  border: `2px solid ${someSelected ? C.soul : C.border}`, background: allSelected ? C.soul : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                }}>
                {allSelected && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                {!allSelected && someSelected && <div style= {{ width: 8, height: 2, background: C.soul, borderRadius: 1 }} />}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>Name</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>Visit Date</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>Testimony</div>
          </div>

          {filtered.map((r, i) => {
            const isChecked = selected.has(r.id);
            const name = r.soul_care_contacts?.full_name || "—";
            return (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 120px 1fr", minWidth: 620, padding: "12px 16px", gap: 12, alignItems: "flex-start",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.soul}08` : C.surface, cursor: "pointer", transition: "background .12s",
                }}
                onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = C.soulLight; }}
                onMouseOut={e => { e.currentTarget.style.background = isChecked ? `${C.soul}08` : C.surface; }}>
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${isChecked ? C.soul : C.border}`, background: isChecked ? C.soul : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                  }}>{isChecked && <CheckCircle size={11} color="#fff" strokeWidth={3} />}</div>
                </div>
                <div>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: C.soulLight, display: "inline-flex", alignItems: "center",
                    justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 13, fontFamily: F.head, marginBottom: 4, border: `1.5px solid ${C.soul}30`,
                  }}>{name.charAt(0) || "?"}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>{name}</div>
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, paddingTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} color={C.textMuted} />{r.visit_date || "—"}</div>
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, paddingTop: 4, wordBreak: "break-word" }}>{r.testimony}</div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, textAlign: "right", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> testimon{rows.length !== 1 ? "ies" : "y"}</span>
          {selectedCount === 0 && filtered.length > 0 && <span style={{ color: C.soul, fontWeight: 600 }}>☝ Click rows to select, then download as CSV</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TestimonyBank — v5.5. All testimonies submitted via the public Testimony
// QR form (public_testimonies table). Category filter sits in front of the
// date filter. Row-select + CSV export, matching the Testimonies page UX.
// ─────────────────────────────────────────────────────────────────────────────

const TESTIMONY_CATEGORIES = [
  "General Testimony",
  "Coronation Service Testimony",
  "Upgrade Service Testimony",
];

// ─────────────────────────────────────────────────────────────────────────────
// v6.7 — TestimonyProjector: full-screen pulpit reader.
// Branding header always shown. When `slug` is provided, every navigation
// is persisted to the DB via onIndexChange, so a refresh (or opening the
// same link on a different device) resumes exactly where it left off.
// ─────────────────────────────────────────────────────────────────────────────

function fontSizeForTestimony(text) {
  const len = (text || "").length;
  if (len < 120) return 56;
  if (len < 260) return 46;
  if (len < 420) return 37;
  if (len < 650) return 29;
  if (len < 900) return 23;
  return 18;
}

function TestimonyProjector({ items, initialIndex = 0, slug, shareUrl, onIndexChange, onExit }) {
  const [index, setIndex] = useState(initialIndex);
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef(null);

  const atEnd = index >= items.length;
  const current = !atEnd ? items[index] : null;

  useEffect(() => { onIndexChange?.(index); /* eslint-disable-next-line */ }, [index]);

  const next = () => setIndex(i => Math.min(i + 1, items.length));
  const prev = () => setIndex(i => Math.max(i - 1, 0));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { onExit(); return; }
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
      if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) next();
    else if (dx > 50) prev();
    touchStartX.current = null;
  };

  const catBadge = (cat) => {
    if (cat === "Coronation Service Testimony") return [C.soul, C.soulLight];
    if (cat === "Upgrade Service Testimony")    return [C.research, C.researchLight];
    return [C.goldDark, C.goldLight];
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* clipboard blocked — link is still visible to select manually */ }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "#fff", fontFamily: F.body,
        display: "flex", flexDirection: "column",
        userSelect: "none",
      }}>

      {/* Top bar — branding + controls */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={30} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{ fontSize: 12, fontWeight: 800, fontFamily: F.head, color: C.textPrimary, letterSpacing: ".02em" }}>
              THE ENVOYS
            </span>
            <span style={{ fontSize: 10.5, color: C.textMuted, fontStyle: "italic" }}>
              ...the home of supernatural upgrades
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textMuted, fontFamily: F.head }}>
            {atEnd ? "—" : `${index + 1} / ${items.length}`}
          </div>
          {shareUrl && (
            <button onClick={copyLink} style={{
              background: copied ? C.greenLight : "none", border: `1px solid ${copied ? C.green : C.border}`,
              borderRadius: 8, padding: "7px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: copied ? C.green : C.textSecondary, fontFamily: F.body,
            }}>
              {copied ? <CheckCircle size={13} /> : <Download size={13} style={{ transform: "rotate(0deg)" }} />}
              {copied ? "Link Copied" : "Copy Presentation Link"}
            </button>
          )}
          <button onClick={onExit} style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            fontSize: 13, color: C.textSecondary, fontFamily: F.body,
          }}>
            <X size={14} />Exit
          </button>
        </div>
      </div>

      {atEnd ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Star size={30} color={C.goldDark} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, fontFamily: F.head }}>
            That's all {items.length} testimon{items.length !== 1 ? "ies" : "y"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setIndex(0)} style={btn("outline")}><RefreshCw size={14} />Start Over</button>
            <button onClick={onExit} style={btn("primary")}><X size={14} />Exit</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
            <div onClick={prev} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "30%", cursor: index > 0 ? "pointer" : "default", zIndex: 2 }} />
            <div onClick={next} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "30%", cursor: "pointer", zIndex: 2 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", overflowY: "auto" }}>
              <div style={{ maxWidth: "min(90vw, 1100px)", textAlign: "center" }}>
                <div style={{ fontSize: 60, color: C.goldLight, lineHeight: 1, marginBottom: 8, fontFamily: F.head }}>"</div>
                <div style={{
                  fontSize: fontSizeForTestimony(current.testimony),
                  lineHeight: 1.55, color: C.textPrimary, fontWeight: 500,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {current.testimony}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "18px 24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap",
          }}>
            <Avatar name={current.display_name} size={40} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: 17, fontFamily: F.head, color: C.textPrimary }}>{current.display_name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                {(() => { const [cc, cb] = catBadge(current.category); return <span style={badge(cc, cb, { fontSize: 10 })}>{current.category}</span>; })()}
                {current.date && <span style={{ fontSize: 12, color: C.textMuted }}>{current.date}</span>}
              </div>
            </div>
          </div>

          <div style={{ flexShrink: 0, textAlign: "center", fontSize: 11, color: C.textMuted, padding: "0 0 12px" }}>
            Swipe, click either side, or use arrow keys / spacebar to advance · Esc to exit
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// v6.7 — PresentationViewer: what opens when someone visits ?present=SLUG.
// No login required. Fetches the presentation record + full testimony
// content fresh from the DB every time it mounts — this is what makes a
// browser refresh (or opening the link on a second device) safe: there is
// no in-memory state to lose, everything is reloaded from source.
// ─────────────────────────────────────────────────────────────────────────────

function PresentationViewer({ slug }) {
  const [state, setState] = useState("loading"); // loading | ready | notfound | ended
  const [items, setItems] = useState([]);
  const [initialIndex, setInitialIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await sb(`testimony_presentations?slug=eq.${slug}&select=*&limit=1`);
        if (!rows || rows.length === 0) { if (!cancelled) setState("notfound"); return; }
        const pres = rows[0];

        const all = await sb("public_testimonies?select=*&limit=2000");
        const byId = {};
        (all || []).forEach(r => { byId[String(r.id)] = r; });

        const ordered = (pres.testimony_ids || [])
          .map(id => byId[String(id)])
          .filter(Boolean)
          .map(r => ({
            id: r.id,
            display_name: r.name || "Anonymous",
            category: r.category || "General Testimony",
            testimony: r.testimony,
            date: r.submitted_at ? r.submitted_at.slice(0, 10) : "",
          }));

        if (cancelled) return;
        if (ordered.length === 0) { setState("notfound"); return; }
        setItems(ordered);
        setInitialIndex(Math.min(pres.current_index || 0, ordered.length));
        setState("ready");
      } catch {
        if (!cancelled) setState("notfound");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const persistIndex = useCallback((idx) => {
    sb(`testimony_presentations?slug=eq.${slug}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ current_index: idx, updated_at: new Date().toISOString() }),
    }).catch(() => {});
  }, [slug]);

  if (state === "loading") {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#fff", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14,
      }}>
        <Logo size={44} />
        <div style={{ fontSize: 13, color: C.textMuted, fontFamily: F.body }}>Loading presentation…</div>
      </div>
    );
  }

  if (state === "notfound") {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#fff", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, padding: 24, textAlign: "center",
      }}>
        <Logo size={44} />
        <div style={{ fontSize: 18, fontWeight: 800, fontFamily: F.head, color: C.textPrimary }}>
          This presentation link isn't available
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, maxWidth: 360 }}>
          It may have been ended, or the link was mistyped. Please check with whoever shared it with you.
        </div>
      </div>
    );
  }

  if (state === "ended") {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "#fff", display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
      }}>
        <Logo size={44} />
        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: F.head, color: C.textPrimary }}>
          Presentation ended
        </div>
        <div style={{ fontSize: 13, color: C.textMuted }}>You can close this tab now.</div>
      </div>
    );
  }

  return (
    <TestimonyProjector
      items={items}
      initialIndex={initialIndex}
      slug={slug}
      onIndexChange={persistIndex}
      onExit={() => setState("ended")}
    />
  );
}

function TestimonyBank({ currentUser }) {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [search, setSearch]     = useState("");
  const [category, setCategory] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [selected, setSelected] = useState(new Set());
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [presentationSlug, setPresentationSlug] = useState(null);
  const [presentErr, setPresentErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const data = await sb("public_testimonies?select=*&order=submitted_at.desc&limit=1000");
      setRows((data || [])
        .filter(r => r.testimony && r.testimony.trim() !== "")
        .map(r => ({
          id:           r.id,
          display_name: r.name || "Anonymous",
          category:     r.category || "General Testimony",
          testimony:    r.testimony,
          date:         r.submitted_at ? r.submitted_at.slice(0, 10) : "",
        })));
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (category && r.category !== category) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.display_name.toLowerCase().includes(q) && !r.testimony.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    return true;
  });

  const allFilteredIds = filtered.map(r => r.id);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected   = allFilteredIds.some(id => selected.has(id));
  const toggleRow = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    setSelected(prev => {
      const n = new Set(prev);
      allFilteredIds.forEach(id => allSelected ? n.delete(id) : n.add(id));
      return n;
    });
  };
  const clearFilters = () => { setDateFrom(""); setDateTo(""); setCategory(""); };

  const downloadCSV = () => {
    const toExport = filtered.filter(r => selected.has(r.id));
    if (!toExport.length) return;
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };
    const header = ["Name", "Category", "Date Submitted", "Testimony"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => [escape(r.display_name), escape(r.category), escape(r.date), escape(r.testimony)].join(",")),
    ];
    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateLabel = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${new Date().toISOString().slice(0, 10)}`;
    a.href = url; a.download = `envoys_testimony_bank${dateLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = filtered.filter(r => selected.has(r.id)).length;

  const catBadge = (cat) => {
    if (cat === "Coronation Service Testimony") return [C.soul,     C.soulLight];
    if (cat === "Upgrade Service Testimony")    return [C.research, C.researchLight];
    return [C.goldDark, C.goldLight];
  };

  const updatePresentationIndex = useCallback((idx) => {
    if (!presentationSlug) return;
    sb(`testimony_presentations?slug=eq.${presentationSlug}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ current_index: idx, updated_at: new Date().toISOString() }),
    }).catch(() => {});
  }, [presentationSlug]);

  const startPresentation = async () => {
    const chosen = filtered.filter(r => selected.has(r.id));
    if (chosen.length === 0) return;
    setPresentErr("");
    let slug = generatePresentationSlug();
    try {
      let ok = false;
      for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        try {
          await sb("testimony_presentations", {
            method: "POST",
            body: JSON.stringify({
              slug,
              testimony_ids: chosen.map(r => String(r.id)),
              current_index: 0,
              created_by: currentUser || null,
            }),
          });
          ok = true;
        } catch (e) {
          if (attempt === 0) slug = generatePresentationSlug();
          else throw e;
        }
      }
      setPresentationSlug(slug);
      setProjectorOpen(true);
    } catch (e) { setPresentErr(`Could not start presentation: ${e.message}`); }
  };

  if (projectorOpen) {
    const chosen = filtered.filter(r => selected.has(r.id));
    const shareUrl = presentationSlug
      ? `${window.location.origin}${window.location.pathname}?present=${presentationSlug}`
      : null;
    return (
      <TestimonyProjector
        items={chosen}
        slug={presentationSlug}
        shareUrl={shareUrl}
        onIndexChange={updatePresentationIndex}
        onExit={() => { setProjectorOpen(false); setPresentationSlug(null); }}
      />
    );
  }

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Testimony Bank"
        subtitle={`${rows.length} testimon${rows.length !== 1 ? "ies" : "y"} submitted via the Testimony QR form`}
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={btn("ghost", { padding: "8px 10px" })} onClick={load}><RefreshCw size={14} /></button>
            <button
              style={{
                ...btn("primary"),
                background: selectedCount > 0 ? C.soul : C.border,
                color:      selectedCount > 0 ? "#fff" : C.textMuted,
                cursor:     selectedCount > 0 ? "pointer" : "not-allowed",
                border: "none",
              }}
              onClick={startPresentation}
              disabled={selectedCount === 0}>
              <Maximize2 size={14} />Project{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </button>
            <button
              style={{
                ...btn("gold"),
                background: selectedCount > 0 ? C.gold : C.border,
                color:      selectedCount > 0 ? "#fff" : C.textMuted,
                cursor:     selectedCount > 0 ? "pointer" : "not-allowed",
              }}
              onClick={downloadCSV} disabled={selectedCount === 0}>
              <Download size={14} />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}
            </button>
          </div>
        } />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Testimonies" value={rows.length}     icon={Star}     accent={C.goldDark} />
        <StatCard label="Matching Filter"   value={filtered.length} icon={Filter}   accent={C.green}    />
        <StatCard label="Selected"          value={selectedCount}   icon={Download} accent={selectedCount > 0 ? C.goldDark : C.textMuted}
          sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </div>

      {/* Filter bar — Testimony Type sits IN FRONT of the date filter */}
      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.goldLight, borderRadius: 10, border: `1px solid ${C.gold}30`,
      }}>
        <Star size={14} color={C.goldDark} style={{ flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, whiteSpace: "nowrap" }}>
            Testimony Type:
          </span>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ ...inputBase, width: 210, cursor: "pointer" }}>
            <option value="">All types</option>
            {TESTIMONY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Calendar size={14} color={C.goldDark} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, whiteSpace: "nowrap" }}>
          Filter by date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo || category) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearFilters}>
              <X size={12} />Clear filters
            </button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or testimony…" style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />
      <Alert type="error" msg={presentErr} onClose={() => setPresentErr("")} />

      {selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", marginBottom: 12,
          background: `${C.gold}15`, borderRadius: 8, border: `1px solid ${C.gold}40`,
          fontSize: 13, color: C.goldDark, fontWeight: 600, flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={14} />{selectedCount} testimon{selectedCount !== 1 ? "ies" : "y"} selected
          </span>
          <button style={btn("gold", { padding: "6px 14px", fontSize: 12 })} onClick={downloadCSV}>
            <Download size={13} />Download CSV
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <Star size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0 ? "No testimonies submitted via the QR form yet." : "No testimonies match your filters."}
          </div>
          {rows.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Share the Testimony QR Code so members can submit their testimonies.
            </p>
          )}
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="mc-scroll" style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 170px 110px 1.4fr", minWidth: 760,
            padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, gap: 10, alignItems: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div onClick={toggleAll} title={allSelected ? "Deselect all" : "Select all visible"}
                style={{
                  width: 18, height: 18, borderRadius: 4, cursor: "pointer",
                  border: `2px solid ${someSelected ? C.gold : C.border}`,
                  background: allSelected ? C.gold : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                }}>
                {allSelected && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                {!allSelected && someSelected && <div style={{ width: 8, height: 2, background: C.gold, borderRadius: 1 }} />}
              </div>
            </div>
            {["Name", "Testimony Type", "Date", "Testimony"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>{h}</div>
            ))}
          </div>

          {filtered.map((r, i) => {
            const isChecked = selected.has(r.id);
            const [cc, cb] = catBadge(r.category);
            return (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 170px 110px 1.4fr", minWidth: 760,
                  padding: "12px 16px", gap: 10, alignItems: "flex-start",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.gold}0D` : C.surface,
                  cursor: "pointer", transition: "background .12s",
                }}
                onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = C.goldLight; }}
                onMouseOut={e => { e.currentTarget.style.background = isChecked ? `${C.gold}0D` : C.surface; }}>
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${isChecked ? C.gold : C.border}`,
                    background: isChecked ? C.gold : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                  }}>{isChecked && <CheckCircle size={11} color="#fff" strokeWidth={3} />}</div>
                </div>
                <div>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", background: C.goldLight,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: C.goldDark, fontSize: 12, fontFamily: F.head,
                    marginBottom: 3, border: `1.5px solid ${C.gold}40`,
                  }}>{(r.display_name.charAt(0) || "?").toUpperCase()}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>{r.display_name}</div>
                </div>
                <div style={{ paddingTop: 5 }}>
                  <span style={badge(cc, cb, { fontSize: 10, whiteSpace: "normal", lineHeight: 1.4 })}>{r.category}</span>
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} color={C.textMuted} />{r.date || "—"}</div>
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, paddingTop: 4, wordBreak: "break-word" }}>{r.testimony}</div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> testimon{rows.length !== 1 ? "ies" : "y"}</span>
          {selectedCount === 0 && <span style={{ color: C.goldDark, fontWeight: 600 }}>☝ Click rows to select, then download as CSV</span>}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// VisitationTab — admin/pasteam oversight view of ALL visits (unchanged nav id)
// ─────────────────────────────────────────────────────────────────────────────

function VisitationTab() {
  const [data, setData]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      let q = "soul_care_visits?select=*,soul_care_contacts(full_name,phone,gender,marital_status,life_stage)&order=created_at.desc&limit=500";
      if (dateFrom) q += `&visit_date=gte.${dateFrom}`;
      if (dateTo)   q += `&visit_date=lte.${dateTo}`;
      setData((await sb(q)) || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const completedMonth = data.filter(r => r.visit_status === "Completed" && r.visit_date >= monthStart).length;
  const highPriority   = data.filter(r => r.urgency === "High" && r.visit_status !== "Completed").length;
  const escalated      = data.filter(r => r.escalate_to_pastorate).length;

  const filtered = data.filter(r => !statusFilter || r.visit_status === statusFilter);

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Visitation Records" subtitle="Soul Care team visits — pastoral oversight view"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 140 }} />
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ ...inputBase, width: 140 }} />
            <button style={btn("primary")} onClick={load}><Filter size={14} />Filter</button>
          </div>
        } />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Visits Logged"    value={data.length}    icon={MapPin}      accent={C.soul}   />
        <StatCard label="Completed This Month"    value={completedMonth} icon={CheckCircle} accent={C.green}  />
        <StatCard label="High Priority / Open"    value={highPriority}   icon={AlertCircle} accent={C.danger} />
        <StatCard label="Escalated to Pastorate"  value={escalated}      icon={Flag}        accent={C.flag}   />
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {["", "Scheduled", "Completed", "Rescheduled", "Member Unavailable"].map(s => {
          const sm = VISIT_STATUS_META[s] || {};
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: F.body, transition: "all .15s",
                background: statusFilter === s ? (sm.color || C.soul) : C.bg,
                color: statusFilter === s ? "#fff" : C.textSecondary,
                border: `1.5px solid ${statusFilter === s ? (sm.color || C.soul) : C.border}`,
              }}>
              {s || "All"} {s ? `(${data.filter(r => r.visit_status === s).length})` : `(${data.length})`}
            </button>
          );
        })}
      </div>

      {loading ? <SkeletonList rows={6} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const contact = r.soul_care_contacts || {};
            const sm = VISIT_STATUS_META[r.visit_status] || { color: C.textMuted, bg: C.bg };
            const um = URGENCY_META[r.urgency] || {};
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{ ...card, padding: 0, overflow: "hidden", borderLeft: `3px solid ${r.escalate_to_pastorate ? C.flag : sm.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, padding: "12px 16px", cursor: "pointer" }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    {r.visit_photo_url ? (
                      <img src={r.visit_photo_url} alt="Visit" style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: `2px solid ${C.soul}40` }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", flexShrink: 0, background: C.soulLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head }}>
                        {contact.full_name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{contact.full_name}{scGenderTag(contact)}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        {contact.phone} · {r.visit_type}
                        {r.visit_date && <> · <Calendar size={10} style={{ verticalAlign: "middle" }} /> {r.visit_date}</>}
                      </div>
                      {r.logged_by && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Logged by <strong>{r.logged_by}</strong></div>}
                    </div>
                  </div>
                  <div className="et-actions" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {r.urgency && <span style={badge(um.color || C.textMuted, um.bg || C.bg, { fontSize: 11 })}>{r.urgency}</span>}
                    {r.escalate_to_pastorate && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={9} />Escalated</span>}
                    {r.material_support && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}>Aid Given</span>}
                    {r.visit_photo_url && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}><Camera size={9} />Photo</span>}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{r.visit_status}</span>
                    <ChevronDown size={14} color={C.textMuted} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}`, marginTop: -4 }}>
                    {r.visit_photo_url && (
                      <div style={{ marginTop: 14, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.soul, marginBottom: 8, display: "flex", alignItems: "center", gap: 4, fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em" }}>
                          <Camera size={11} />Visit Photo
                        </div>
                        <img src={r.visit_photo_url} alt="From the visit"
                          style={{ width: "100%", maxWidth: 360, height: 220, objectFit: "cover", borderRadius: 10, border: `1.5px solid ${C.border}`, display: "block", cursor: "pointer" }}
                          onClick={() => window.open(r.visit_photo_url, "_blank")} title="Click to open full image" />
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Click image to open full size</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }} className="g2">
                      {r.reason_for_care && <DetailBlock icon={Info} label="Reason for Care" value={r.reason_for_care} />}
                      {r.meeting_notes   && <DetailBlock icon={FileText} label="Meeting Notes" value={r.meeting_notes} />}
                      {r.prayer_requests && <DetailBlock icon={Heart} label="Prayer Requests" value={r.prayer_requests} color={C.soul} />}
                      {r.testimony       && <DetailBlock icon={Star} label="Testimony" value={r.testimony} color={C.goldDark} />}
                      {r.material_support && r.material_support_notes && <DetailBlock icon={Shield} label="Material Support" value={r.material_support_notes} />}
                      {r.follow_up_required && r.next_follow_up_date && <DetailBlock icon={Calendar} label="Next Follow-Up" value={r.next_follow_up_date} color={C.amber} />}
                      {r.escalate_to_pastorate && r.escalation_reason && <DetailBlock icon={Flag} label="Escalation Reason" value={r.escalation_reason} color={C.flag} />}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <MapPin size={28} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontFamily: F.head }}>No visitation records{dateFrom || dateTo ? " in this date range" : ""}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailBlock({ icon: Icon, label, value, color }) {
  return (
    <div style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.textMuted, marginBottom: 4, display: "flex", alignItems: "center", gap: 4, fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em" }}>
        {Icon && <Icon size={11} />}{label}
      </div>
      <div style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SOUL CARE — VISITATION MANAGEMENT  (v7.0)                    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: RESEARCH TEAM — SERVICE FEEDBACK VIEWER                          ║
// ║  Includes: ResearchFeedback                                                ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function FeedbackQRPage() {
  const feedbackUrl = window.location.origin + "/feedback";
  const [custom, setCustom] = useState(feedbackUrl);
  const [display, setDisplay] = useState(feedbackUrl);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=16&color=0E7490&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
  const download = () => {
    const a = document.createElement("a");
    a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&color=0E7490&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
    a.download = "envoys-feedback-qr.png"; a.target = "_blank"; a.click();
  };
  return (
    <div className="page-enter">
      <PageHeader title="Feedback QR Code" subtitle="Members scan this to submit anonymous service feedback." />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ ...card, textAlign: "center", flex: "0 0 auto" }}>
          <img src={qrSrc} alt="QR Code" width={240} height={240} style={{ display: "block", borderRadius: 8, border: `1px solid ${C.border}` }} />
          <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, wordBreak: "break-all", maxWidth: 240 }}>{display}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button style={{ ...btn("primary", { background: C.research, border: "none" }) }} onClick={download}><Download size={14} />Download PNG</button>
            <button style={btn("outline")} onClick={() => window.open(display, "_blank")}>Open Link</button>
          </div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head, marginBottom: 4 }}>Feedback Form URL</div>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Auto-set to your live site. Share this link or QR code so members can submit feedback anonymously.
          </p>
          <FieldInput label="Feedback URL" id="furl" value={custom} onChange={e => setCustom(e.target.value)} placeholder="https://your-site.vercel.app/feedback" />
          <button style={{ ...btn("primary", { background: C.research, border: "none" }), width: "100%" }} onClick={() => setDisplay(custom)}>Update QR Code</button>
          <div style={{ marginTop: 20, padding: 14, background: C.researchLight, borderRadius: 8, fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
            <strong style={{ color: C.research }}>💡 Tip</strong><br />
            Members can submit without logging in. Name, gender, and phone are optional — only feedback is required.
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonyQRPage() {
  const testimonyUrl = window.location.origin + "/testimony";
  const [custom, setCustom] = useState(testimonyUrl);
  const [display, setDisplay] = useState(testimonyUrl);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=16&color=A66D15&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
  const download = () => {
    const a = document.createElement("a");
    a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&color=A66D15&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
    a.download = "envoys-testimony-qr.png"; a.target = "_blank"; a.click();
  };
  return (
    <div className="page-enter">
      <PageHeader title="Testimony QR Code" subtitle="Members scan this to submit their testimony." />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ ...card, textAlign: "center", flex: "0 0 auto" }}>
          <img src={qrSrc} alt="QR Code" width={240} height={240} style={{ display: "block", borderRadius: 8, border: `1px solid ${C.border}` }} />
          <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, wordBreak: "break-all", maxWidth: 240 }}>{display}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button style={btn("gold")} onClick={download}><Download size={14} />Download PNG</button>
            <button style={btn("outline")} onClick={() => window.open(display, "_blank")}>Open Link</button>
          </div>
        </div>
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head, marginBottom: 4 }}>Testimony Form URL</div>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Share this QR code at services or on the church's social channels so members can share testimonies.
          </p>
          <FieldInput label="Testimony URL" id="turl" value={custom} onChange={e => setCustom(e.target.value)} placeholder="https://your-site.vercel.app/testimony" />
          <button style={{ ...btn("gold"), width: "100%" }} onClick={() => setDisplay(custom)}>Update QR Code</button>
          <div style={{ marginTop: 20, padding: 14, background: C.goldLight, borderRadius: 8, fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
            <strong style={{ color: C.goldDark }}>💡 Tip</strong><br />
            Submissions can be anonymous. Category options: General, Coronation Service, and Upgrade Service.
          </div>
        </div>
      </div>
    </div>
  );
}

function PublicFeedbackForm() {
  const [form, setForm] = useState({ name: "", gender: "", phone: "", feedback: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }));

  const submit = async () => {
    if (!form.feedback.trim()) { setErr("Feedback is required."); return; }
    setLoading(true); setErr("");
    try {
      await sb("feedback_submissions", {
        method: "POST",
        body: JSON.stringify({
          name:     form.name.trim()  || null,
          gender:   form.gender       || null,
          phone:    form.phone.trim() || null,
          feedback: form.feedback.trim(),
        }),
      });
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ ...card, maxWidth: 480, textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.researchLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <CheckCircle size={32} color={C.research} />
        </div>
        <h2 style={{ color: C.research, margin: "0 0 10px", fontFamily: F.head, fontWeight: 800 }}>Thank you for your feedback!</h2>
        <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.7 }}>
          Your feedback has been received. We appreciate you taking the time to share your thoughts with us.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo size={72} /></div>
          <h1 style={{ margin: 0, color: C.textPrimary, fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>
            Share Your <span style={{ color: C.research }}>Feedback</span>
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Your feedback helps us serve you better. You may submit anonymously.
          </p>
        </div>
        <div style={card}>
          {CREDS_MISSING && <CredsBanner />}
          <Alert type="error" msg={err} onClose={() => setErr("")} />
          <FieldInput label="Your Name" id="pfn" value={form.name} onChange={set("name")}
            placeholder="Optional — leave blank to submit anonymously" />
          <FieldInput label="Gender" id="pfg" type="select" value={form.gender} onChange={set("gender")}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
          <FieldInput label="Phone Number" id="pfp" value={form.phone} onChange={set("phone")}
            placeholder="Optional" />
          <FieldInput label="Your Feedback" id="pff" type="textarea" required value={form.feedback} onChange={set("feedback")}
            placeholder="Share your experience, suggestions, or thoughts about our services…" />
          <button
            style={{ ...btn("primary", { background: C.research, border: "none" }), width: "100%", padding: 13, fontSize: 15 }}
            onClick={submit} disabled={loading}>
            {loading ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicTestimonyForm() {
  const [form, setForm] = useState({ name: "", category: "General Testimony", testimony: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target ? e.target.value : e }));

  const submit = async () => {
    if (!form.testimony.trim()) { setErr("Please share your testimony."); return; }
    setLoading(true); setErr("");
    try {
      await sb("public_testimonies", {
        method: "POST",
        body: JSON.stringify({
          name:      form.name.trim()     || null,
          category:  form.category        || "General Testimony",
          testimony: form.testimony.trim(),
        }),
      });
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ ...card, maxWidth: 480, textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.goldLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Star size={32} color={C.goldDark} />
        </div>
        <h2 style={{ color: C.goldDark, margin: "0 0 10px", fontFamily: F.head, fontWeight: 800 }}>Testimony Received!</h2>
        <p style={{ color: C.textSecondary, fontSize: 14, lineHeight: 1.7 }}>
          Thank you for sharing what God has done! Your testimony is an encouragement to the whole body.
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo size={72} /></div>
          <h1 style={{ margin: 0, color: C.textPrimary, fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>
            Share Your <span style={{ color: C.goldDark }}>Testimony</span>
          </h1>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
            Tell us what God has done! You may submit anonymously.
          </p>
        </div>
        <div style={card}>
          {CREDS_MISSING && <CredsBanner />}
          <Alert type="error" msg={err} onClose={() => setErr("")} />
          <FieldInput label="Your Name" id="ptn" value={form.name} onChange={set("name")}
            placeholder="Optional — leave blank to submit anonymously" />
          <FieldInput label="Testimony Category" id="ptc" type="select" required value={form.category} onChange={set("category")}
            options={[
              { value: "General Testimony",             label: "General Testimony"             },
              { value: "Coronation Service Testimony",  label: "Coronation Service Testimony"  },
              { value: "Upgrade Service Testimony",     label: "Upgrade Service Testimony"     },
            ]} />
          <FieldInput label="Your Testimony" id="ptt" type="textarea" required value={form.testimony} onChange={set("testimony")}
            placeholder="Share what God has done in your life…" />
          <button style={{ ...btn("gold"), width: "100%", padding: 13, fontSize: 15 }}
            onClick={submit} disabled={loading}>
            {loading ? "Submitting…" : "Share My Testimony"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResearchFeedback() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const [ftRows, subRows] = await Promise.all([
        sb("first_timers?select=id,full_name,service_feedback,service_date,gender,phone&order=service_date.desc&limit=1000").catch(() => []),
        sb("feedback_submissions?select=*&order=submitted_at.desc&limit=1000").catch(() => []),
      ]);

      const merged = [];
      (ftRows || []).forEach(r => {
        if (r.service_feedback && r.service_feedback.trim()) {
          merged.push({
            id: `ft-${r.id}`,
            display_name: r.full_name || "Anonymous",
            gender: r.gender || null,
            phone:  r.phone  || null,
            feedback: r.service_feedback,
            date: r.service_date || "",
            source: "First-Timer Form",
          });
        }
      });
      (subRows || []).forEach(r => {
        if (r.feedback && r.feedback.trim()) {
          merged.push({
            id: `sub-${r.id}`,
            display_name: r.name || "Anonymous",
            gender: r.gender || null,
            phone:  r.phone  || null,
            feedback: r.feedback,
            date: r.submitted_at ? r.submitted_at.slice(0, 10) : "",
            source: "Feedback Form",
          });
        }
      });
      merged.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setRows(merged);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.display_name.toLowerCase().includes(q) && !r.feedback.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    return true;
  });

  const allFilteredIds = filtered.map(r => r.id);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected   = allFilteredIds.some(id => selected.has(id));
  const toggleRow = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    setSelected(prev => {
      const n = new Set(prev);
      allFilteredIds.forEach(id => allSelected ? n.delete(id) : n.add(id));
      return n;
    });
  };
  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const downloadCSV = () => {
    const toExport = filtered.filter(r => selected.has(r.id));
    if (!toExport.length) return;
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };
    const header = ["Name", "Gender", "Phone", "Date", "Source", "Feedback"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => [
        escape(r.display_name), escape(r.gender), escape(r.phone),
        escape(r.date), escape(r.source), escape(r.feedback),
      ].join(",")),
    ];
    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateLabel = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${new Date().toISOString().slice(0, 10)}`;
    a.href = url; a.download = `envoys_service_feedback${dateLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = filtered.filter(r => selected.has(r.id)).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}

      <PageHeader
        title="Service Feedback"
        subtitle={`${rows.length} response${rows.length !== 1 ? "s" : ""} from all sources`}
        action={
          <button
            style={{
              ...btn("primary"),
              background: selectedCount > 0 ? C.research : C.border,
              color:       selectedCount > 0 ? "#fff"      : C.textMuted,
              cursor:      selectedCount > 0 ? "pointer"   : "not-allowed",
              border: "none",
            }}
            onClick={downloadCSV} disabled={selectedCount === 0}>
            <Download size={14} />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        }
      />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Responses" value={rows.length}     icon={FileText} accent={C.research} />
        <StatCard label="Matching Filter" value={filtered.length} icon={Filter}   accent={C.green}    />
        <StatCard label="Selected"        value={selectedCount}   icon={Download} accent={selectedCount > 0 ? C.research : C.textMuted}
          sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.researchLight, borderRadius: 10, border: `1px solid ${C.researchBorder}`,
      }}>
        <Calendar size={14} color={C.research} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>
          Filter by date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}><X size={12} />Clear</button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or feedback…" style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", marginBottom: 12,
          background: `${C.research}12`, borderRadius: 8, border: `1px solid ${C.research}30`,
          fontSize: 13, color: C.research, fontWeight: 600, flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={14} />{selectedCount} response{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <button style={{ ...btn("primary", { padding: "6px 14px", fontSize: 12 }), background: C.research }} onClick={downloadCSV}>
            <Download size={13} />Download CSV
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0 ? "No feedback responses yet." : "No responses match your filters."}
          </div>
          {rows.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Use the Feedback QR Code page to share the feedback form link with members.
            </p>
          )}
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="mc-scroll" style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 100px 80px 130px 1fr", minWidth: 820,
            padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, gap: 10, alignItems: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div onClick={toggleAll} style={{
                width: 18, height: 18, borderRadius: 4, cursor: "pointer",
                border: `2px solid ${someSelected ? C.research : C.border}`,
                background: allSelected ? C.research : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
              }}>
                {allSelected && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                {!allSelected && someSelected && <div style={{ width: 8, height: 2, background: C.research, borderRadius: 1 }} />}
              </div>
            </div>
            {["Respondent", "Date", "Gender", "Source", "Feedback"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>{h}</div>
            ))}
          </div>

          {filtered.map((r, i) => {
            const isChecked = selected.has(r.id);
            return (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 100px 80px 130px 1fr", minWidth: 820,
                  padding: "12px 16px", gap: 10, alignItems: "flex-start",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.research}08` : C.surface,
                  cursor: "pointer", transition: "background .12s",
                }}
                onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = C.greenXLight; }}
                onMouseOut={e => { e.currentTarget.style.background = isChecked ? `${C.research}08` : C.surface; }}>
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${isChecked ? C.research : C.border}`,
                    background: isChecked ? C.research : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                  }}>{isChecked && <CheckCircle size={11} color="#fff" strokeWidth={3} />}</div>
                </div>
                <div>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", background: C.researchLight,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: C.research, fontSize: 12, fontFamily: F.head,
                    marginBottom: 3, border: `1.5px solid ${C.researchBorder}`,
                  }}>{(r.display_name.charAt(0) || "?").toUpperCase()}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>{r.display_name}</div>
                  {r.phone && <div style={{ fontSize: 11, color: C.textMuted }}>{r.phone}</div>}
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} color={C.textMuted} />{r.date || "—"}</div>
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>{r.gender || <span style={{ color: C.textMuted }}>—</span>}</div>
                <div style={{ paddingTop: 5 }}>
                  <span style={badge(
                    r.source === "Feedback Form" ? C.research : C.green,
                    r.source === "Feedback Form" ? C.researchLight : C.greenLight,
                    { fontSize: 10 }
                  )}>{r.source}</span>
                </div>
                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, paddingTop: 4, wordBreak: "break-word" }}>{r.feedback}</div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> response{rows.length !== 1 ? "s" : ""}</span>
          {selectedCount === 0 && <span style={{ color: C.research, fontWeight: 600 }}>☝ Click rows to select, then download as CSV</span>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GeneralFeedback — mirrors ResearchFeedback's UI, but scoped ONLY to
// responses submitted through the public Feedback QR form
// (feedback_submissions table). Does NOT merge in first_timers.service_feedback.
// ─────────────────────────────────────────────────────────────────────────────

function GeneralFeedback() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState("");
  const [search, setSearch]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [selected, setSelected] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const subRows = await sb("feedback_submissions?select=*&order=submitted_at.desc&limit=1000").catch(() => []);
      const mapped = (subRows || [])
        .filter(r => r.feedback && r.feedback.trim())
        .map(r => ({
          id: r.id,
          display_name: r.name || "Anonymous",
          gender: r.gender || null,
          phone: r.phone || null,
          feedback: r.feedback,
          date: r.submitted_at ? r.submitted_at.slice(0, 10) : "",
        }));
      setRows(mapped);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.display_name.toLowerCase().includes(q) && !r.feedback.toLowerCase().includes(q)) return false;
    }
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    return true;
  });

  const allFilteredIds = filtered.map(r => r.id);
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected   = allFilteredIds.some(id => selected.has(id));
  const toggleRow = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    setSelected(prev => {
      const n = new Set(prev);
      allFilteredIds.forEach(id => allSelected ? n.delete(id) : n.add(id));
      return n;
    });
  };
  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const downloadCSV = () => {
    const toExport = filtered.filter(r => selected.has(r.id));
    if (!toExport.length) return;
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };
    const header = ["Name", "Gender", "Phone", "Date", "Feedback"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => [
        escape(r.display_name), escape(r.gender), escape(r.phone),
        escape(r.date), escape(r.feedback),
      ].join(",")),
    ];
    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateLabel = dateFrom || dateTo ? `_${dateFrom || "start"}_to_${dateTo || "end"}` : `_${new Date().toISOString().slice(0, 10)}`;
    a.href = url; a.download = `envoys_general_feedback${dateLabel}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = filtered.filter(r => selected.has(r.id)).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}

      <PageHeader
        title="General Feedback"
        subtitle={`${rows.length} response${rows.length !== 1 ? "s" : ""} submitted via the Feedback QR form`}
        action={
          <button
            style={{
              ...btn("primary"),
              background: selectedCount > 0 ? C.research : C.border,
              color:       selectedCount > 0 ? "#fff"      : C.textMuted,
              cursor:      selectedCount > 0 ? "pointer"   : "not-allowed",
              border: "none",
            }}
            onClick={downloadCSV} disabled={selectedCount === 0}>
            <Download size={14} />Download{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        }
      />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Responses" value={rows.length}     icon={FileText} accent={C.research} />
        <StatCard label="Matching Filter" value={filtered.length} icon={Filter}   accent={C.green}    />
        <StatCard label="Selected"        value={selectedCount}   icon={Download} accent={selectedCount > 0 ? C.research : C.textMuted}
          sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.researchLight, borderRadius: 10, border: `1px solid ${C.researchBorder}`,
      }}>
        <Calendar size={14} color={C.research} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginRight: 4, whiteSpace: "nowrap" }}>
          Filter by date:
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, width: 148 }} />
          </div>
          {(dateFrom || dateTo) && (
            <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={clearDates}><X size={12} />Clear</button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or feedback…" style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", marginBottom: 12,
          background: `${C.research}12`, borderRadius: 8, border: `1px solid ${C.research}30`,
          fontSize: 13, color: C.research, fontWeight: 600, flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={14} />{selectedCount} response{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <button style={{ ...btn("primary", { padding: "6px 14px", fontSize: 12 }), background: C.research }} onClick={downloadCSV}>
            <Download size={13} />Download CSV
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonList rows={6} />
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0 ? "No feedback responses via the QR form yet." : "No responses match your filters."}
          </div>
          {rows.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Use the Feedback QR Code page to share the feedback form link with members.
            </p>
          )}
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div className="mc-scroll" style={{ overflowX: "auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 100px 80px 1fr", minWidth: 680,
            padding: "10px 16px", background: C.bg, borderBottom: `1px solid ${C.border}`, gap: 10, alignItems: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div onClick={toggleAll} style={{
                width: 18, height: 18, borderRadius: 4, cursor: "pointer",
                border: `2px solid ${someSelected ? C.research : C.border}`,
                background: allSelected ? C.research : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
              }}>
                {allSelected && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                {!allSelected && someSelected && <div style={{ width: 8, height: 2, background: C.research, borderRadius: 1 }} />}
              </div>
            </div>
            {["Respondent", "Date", "Gender", "Feedback"].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>{h}</div>
            ))}
          </div>

          {filtered.map((r, i) => {
            const isChecked = selected.has(r.id);
            return (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 100px 80px 1fr", minWidth: 680,
                  padding: "12px 16px", gap: 10, alignItems: "flex-start",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.research}08` : C.surface,
                  cursor: "pointer", transition: "background .12s",
                }}
                onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = C.greenXLight; }}
                onMouseOut={e => { e.currentTarget.style.background = isChecked ? `${C.research}08` : C.surface; }}>
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `2px solid ${isChecked ? C.research : C.border}`,
                    background: isChecked ? C.research : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
                  }}>{isChecked && <CheckCircle size={11} color="#fff" strokeWidth={3} />}</div>
                </div>
                <div>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", background: C.researchLight,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: C.research, fontSize: 12, fontFamily: F.head,
                    marginBottom: 3, border: `1.5px solid ${C.researchBorder}`,
                  }}>{(r.display_name.charAt(0) || "?").toUpperCase()}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>{r.display_name}</div>
                  {r.phone && <div style={{ fontSize: 11, color: C.textMuted }}>{r.phone}</div>}
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} color={C.textMuted} />{r.date || "—"}</div>
                </div>
                <div style={{ fontSize: 12, color: C.textSecondary, paddingTop: 6 }}>{r.gender || <span style={{ color: C.textMuted }}>—</span>}</div>
                <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, paddingTop: 4, wordBreak: "break-word" }}>{r.feedback}</div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> response{rows.length !== 1 ? "s" : ""}</span>
          {selectedCount === 0 && <span style={{ color: C.research, fontWeight: 600 }}>☝ Click rows to select, then download as CSV</span>}
        </div>
      )}
    </div>
  );
}
// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: RESEARCH TEAM — SERVICE FEEDBACK VIEWER                      ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: ADMIN — USER MANAGEMENT & OVERVIEW                               ║
// ║  Includes: AdminOverview, AdminUsers, AdminAddUser                        ║
// ╚═════════════════════════════════════════════════════════════════════════════╝
// ─────────────────────────────────────────────────────────────────────────────
// v6.3 — MyProfilePage: self-service display name + password changes.
// ─────────────────────────────────────────────────────────────────────────────

function MyProfilePage({ currentUser, username, role, onRenamed }) {
  const ri = ROLE_META[role] || ROLE_META.expteam;
  const [account, setAccount] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  const [newName, setNewName]   = useState(currentUser || "");
  const [namePwd, setNamePwd]   = useState("");
  const [nameMsg, setNameMsg]   = useState("");
  const [nameErr, setNameErr]   = useState("");
  const [savingName, setSavingName] = useState(false);

  const [curPwd, setCurPwd]   = useState("");
  const [newPwd, setNewPwd]   = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [pwdMsg, setPwdMsg]   = useState("");
  const [pwdErr, setPwdErr]   = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let rows = [];
        if (username) {
          rows = await sb(`app_users?username=eq.${encodeURIComponent(username)}&select=*&limit=1`);
        }
        if ((!rows || rows.length === 0) && currentUser) {
          rows = await sb(`app_users?display_name=eq.${encodeURIComponent(currentUser)}&select=*&limit=2`);
        }
        if (rows && rows.length === 1) setAccount(rows[0]);
        else setLoadErr("Could not uniquely identify your account — please sign out and back in, then retry.");
      } catch (e) { setLoadErr(e.message); }
    })();
  }, [username, currentUser]);

  const verifyCurrent = async (pwd) => {
    const hashed = await hashPassword(account.username, pwd);
    return account.password_hash === hashed || account.password_hash === pwd; // second check: legacy plaintext row
  };

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { setNameErr("Display name cannot be empty."); return; }
    if (trimmed === account.display_name) { setNameErr("That's already your display name."); return; }
    if (!namePwd.trim()) { setNameErr("Enter your current password to confirm."); return; }
    setSavingName(true); setNameErr(""); setNameMsg("");
    try {
      if (!(await verifyCurrent(namePwd.trim()))) {
        setNameErr("Current password is incorrect."); setSavingName(false); return;
      }
      const oldName = account.display_name;
      await cascadeRename(oldName, trimmed);
      await sb(`app_users?id=eq.${account.id}`, {
        method: "PATCH", body: JSON.stringify({ display_name: trimmed }),
      });
      setAccount(a => ({ ...a, display_name: trimmed }));
      setNamePwd("");
      setNameMsg("Display name updated — your assignments and call history have been carried over.");
      toast.success("Display name updated.");
      onRenamed?.(trimmed);
    } catch (e) { setNameErr(e.message); }
    setSavingName(false);
  };

  const savePwd = async () => {
    if (!curPwd.trim() || !newPwd.trim()) { setPwdErr("Fill in all password fields."); return; }
    if (newPwd.trim().length < 6) { setPwdErr("New password must be at least 6 characters."); return; }
    if (newPwd.trim() !== confPwd.trim()) { setPwdErr("New passwords don't match."); return; }
    setSavingPwd(true); setPwdErr(""); setPwdMsg("");
    try {
      if (!(await verifyCurrent(curPwd.trim()))) {
        setPwdErr("Current password is incorrect."); setSavingPwd(false); return;
      }
      await sb(`app_users?id=eq.${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password_hash: await hashPassword(account.username, newPwd.trim()) }),
      });
      setCurPwd(""); setNewPwd(""); setConfPwd("");
      setPwdMsg("Password updated. Use it from your next sign-in.");
      toast.success("Password updated.");
    } catch (e) { setPwdErr(e.message); }
    setSavingPwd(false);
  };

  if (loadErr) return <div className="page-enter"><Alert type="error" msg={loadErr} /></div>;
  if (!account) return <SkeletonList rows={2} />;

  return (
    <div className="page-enter" style={{ maxWidth: 640 }}>
      <PageHeader title="My Profile" subtitle="Manage your own account details" />

      {/* Identity card */}
      <div style={{ ...card, marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar name={account.display_name || account.username} size={48} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 16, fontFamily: F.head }}>{account.display_name}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>@{account.username}</div>
        </div>
        <span style={badge(ri.color, ri.bg)}>{ri.label}</span>
      </div>

      {/* Display name */}
      <div style={{ ...card, marginBottom: 20 }}>
        <SH title="Change Display Name" icon={Edit3} />
        <Alert type="error"   msg={nameErr} onClose={() => setNameErr("")} />
        <Alert type="success" msg={nameMsg} onClose={() => setNameMsg("")} />
        <FieldInput label="Display Name" id="pf-name" value={newName} onChange={e => setNewName(e.target.value)}
          hint="Shown across the dashboard. Your assignments and history move with it automatically." />
        <FieldInput label="Current Password" id="pf-name-pwd" type="password" value={namePwd}
          onChange={e => setNamePwd(e.target.value)} placeholder="Confirm it's you" />
        <button style={btn("primary")} onClick={saveName} disabled={savingName}>
          {savingName ? "Saving…" : "Update Display Name"}
        </button>
      </div>

      {/* Password */}
      <div style={card}>
        <SH title="Change Password" icon={Shield} />
        <Alert type="error"   msg={pwdErr} onClose={() => setPwdErr("")} />
        <Alert type="success" msg={pwdMsg} onClose={() => setPwdMsg("")} />
        <FieldInput label="Current Password" id="pf-cur" type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="New Password" id="pf-new" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} hint="At least 6 characters" />
          <FieldInput label="Confirm New Password" id="pf-conf" type="password" value={confPwd} onChange={e => setConfPwd(e.target.value)} />
        </div>
        <button style={btn("primary")} onClick={savePwd} disabled={savingPwd}>
          {savingPwd ? "Saving…" : "Update Password"}
        </button>
      </div>
    </div>
  );
}

function AdminOverview({ setActive }) {
  const [counts, setCounts] = useState({ ft: 0, fb: 0, flagged: 0, users: 0, visits: 0, pending: 0 });
  useEffect(() => {
    (async () => {
      try {
        const [ft, fb, fl, us, vis, pend] = await Promise.all([
          sb("first_timers?select=id"),
          sb("call_feedback?select=id"),
          sb("call_feedback?flagged_for_pastoral=eq.true&select=id"),
          sb("app_users?select=id"),
          sb("soul_care_visits?select=id").catch(() => []),
          sb("app_users?is_pending=eq.true&select=id").catch(() => []),
        ]);
        setCounts({
          ft: (ft||[]).length, fb: (fb||[]).length, flagged: (fl||[]).length,
          users: (us||[]).length, visits: (vis||[]).length, pending: (pend||[]).length,
        });
      } catch {}
    })();
  }, []);

  return (
    <div className="page-enter">
      <PageHeader title="Admin Overview" subtitle="System-wide summary" />
      {counts.pending > 0 && (
        <div style={{
          ...card, marginBottom: 20, padding: "12px 16px",
          background: C.goldLight, border: `1px solid ${C.gold}30`, borderLeft: `3px solid ${C.gold}`,
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <UserPlus size={16} color={C.goldDark} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.goldDark }}>
            {counts.pending} account request{counts.pending !== 1 ? "s" : ""} awaiting your approval
          </span>
          <button style={btn("gold", { padding: "6px 14px", fontSize: 12 })} onClick={() => setActive("admin_users")}>
            Review Requests
          </button>
        </div>
      )}
      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        <StatCard label="First-Timers"  value={counts.ft}      icon={Users}   accent={C.green}   />
        <StatCard label="Calls Logged"  value={counts.fb}      icon={Phone}   accent={C.greenMid}/>
        <StatCard label="Flagged"       value={counts.flagged}  icon={Flag}    accent={C.flag}    />
        <StatCard label="System Users"  value={counts.users}   icon={Shield}  accent={C.goldDark}/>
      </div>
      <div style={{ marginBottom: 24 }}><BirthdaysWidget /></div>
        
      <div style={{
        marginBottom: 12, fontWeight: 700, fontSize: 13, color: C.textMuted,
        fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".07em",
      }}>Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
        {[
          { id: "admin_users",    label: "Manage Users",   icon: Users,    desc: "View, edit and deactivate staff accounts"        },
          { id: "admin_adduser",  label: "Add New User",   icon: UserPlus, desc: "Create a new staff account and assign a role"    },
          { id: "firsttimers",   label: "First-Timers",   icon: Users,    desc: "Browse and edit all visitor records"             },
          { id: "report",        label: "Full Report",    icon: BarChart2,desc: "View the Pastoral retention dashboard"           },
          { id: "visitation_tab",label: "Visitations",    icon: MapPin,   desc: "Soul Care team visitation records"               },
          { id: "flagged",       label: "Flagged Records",icon: Flag,     desc: "Review escalated cases"                         },
        ].map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActive(item.id)}
              style={{
                ...card, textAlign: "left", cursor: "pointer", padding: "1rem",
                transition: "all .15s", display: "flex", gap: 12, alignItems: "flex-start",
                border: `1px solid ${C.border}`,
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.boxShadow = SHADOW.md; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = SHADOW.xs; }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: C.greenLight,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={16} color={C.green} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, fontFamily: F.head, marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 28 }}>
        <div style={{
          marginBottom: 12, fontWeight: 700, fontSize: 13, color: C.textMuted,
          fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".07em",
        }}>Bulk Data Import</div>
        <CSVImport />
      </div>
    </div>
  );
}

function AdminUsers({ onEdit }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers((await sb("app_users?order=created_at.desc")) || []); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleActive = async (u) => {
    try {
      await sb(`app_users?id=eq.${u.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !u.is_active }) });
      setMsg(`${u.username} ${u.is_active ? "deactivated" : "reactivated"}.`);
      toast.success(`${u.username} ${u.is_active ? "deactivated" : "reactivated"}.`);
      load();
    } catch (e) { setErr(e.message); }
  };

  const approve = async (u) => {
    try {
      await sb(`app_users?id=eq.${u.id}`, {
        method: "PATCH", body: JSON.stringify({ is_active: true, is_pending: false }),
      });
      setMsg(`${u.display_name || u.username} approved — they can now sign in.`);
      toast.success(`${u.display_name || u.username} approved.`);
      load();
    } catch (e) { setErr(e.message); }
  };

  const reject = async (u) => {
    if (!window.confirm(`Reject and delete the account request from "${u.display_name || u.username}"?`)) return;
    try {
      await sb(`app_users?id=eq.${u.id}`, { method: "DELETE", prefer: "return=minimal" });
      setMsg("Request rejected.");
      toast.info("Account request rejected.");
      load();
    } catch (e) { setErr(e.message); }
  };

  const pendingCount = users.filter(u => u.is_pending).length;
  const sorted = [...users].sort((a, b) => (b.is_pending ? 1 : 0) - (a.is_pending ? 1 : 0));

  return (
    <div className="page-enter">
      <PageHeader title="System Users"
        subtitle={`${users.length} accounts${pendingCount ? ` · ${pendingCount} pending approval` : ""}`}
        action={<button style={btn("ghost")} onClick={load}><RefreshCw size={14} /></button>} />
      <Alert type="error"   msg={err} onClose={() => setErr("")} />
      <Alert type="success" msg={msg} onClose={() => setMsg("")} />
      {loading ? <SkeletonList rows={5} /> : (
        <div style={{ display: "grid", gap: 8 }}>
          {sorted.map(u => {
            const rm = ROLE_META[u.role] || ROLE_META.dofficer;
            return (
              <div key={u.id} style={{
                ...card, display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "12px 16px",
                opacity: u.is_active || u.is_pending ? 1 : .55,
                borderLeft: u.is_pending ? `3px solid ${C.gold}` : `1px solid ${C.border}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar name={u.display_name || u.username} size={40} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>@{u.username}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={badge(rm.color, rm.bg)}>{rm.label}</span>
                  {u.is_pending ? (
                    <>
                      <span style={badge(C.goldDark, C.goldLight)}><Clock size={11} />Pending Approval</span>
                      <button style={btn("primary", { padding: "6px 12px", fontSize: 12 })} onClick={() => approve(u)}>
                        <CheckCircle size={12} />Approve
                      </button>
                      <button style={btn("danger", { padding: "6px 12px", fontSize: 12 })} onClick={() => reject(u)}>
                        <X size={12} />Reject
                      </button>
                      <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={() => onEdit(u)}>
                        <Edit3 size={12} />Edit Role
                      </button>
                    </>
                  ) : (
                    <>
                      {!u.is_active && <span style={badge(C.danger, C.dangerLight)}>Inactive</span>}
                      <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={() => onEdit(u)}>
                        <Edit3 size={12} />Edit
                      </button>
                      <button
                        style={btn(u.is_active ? "danger" : "ghost", { padding: "6px 12px", fontSize: 12 })}
                        onClick={() => toggleActive(u)}>
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {users.length === 0 && <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No users yet.</p>}
        </div>
      )}
    </div>
  );
}

function AdminAddUser({ editUser, onSuccess, onCancel }) {
  const [form, setForm] = useState({
    username:     editUser?.username     || "",
    password:     "",
    display_name: editUser?.display_name || "",
    role:         editUser?.role         || "expteam",
    is_active:    editUser?.is_active    ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const settersRef = useRef({});
  const set = useCallback((key) => {
    if (!settersRef.current[key]) {
      settersRef.current[key] = (valOrEvt) => {
        const val = valOrEvt && valOrEvt.target !== undefined ? valOrEvt.target.value : valOrEvt;
        setForm(f => ({ ...f, [key]: val }));
      };
    }
    return settersRef.current[key];
  }, []);

  const submit = async () => {
    if (!form.username.trim()) { setErr("Username is required."); return; }
    if (!editUser && !form.password.trim()) { setErr("Password is required for new users."); return; }

    const uname = form.username.trim().toLowerCase();
    if (editUser && uname !== editUser.username && !form.password.trim()) {
      setErr("Changing a username requires setting the password again (enter it in the password field).");
      return;
    }

    setLoading(true); setErr("");
    try {
      const payload = {
        username:     uname,
        display_name: form.display_name.trim() || form.username.trim(),
        role:         form.role,
        is_active:    form.is_active,
        ...(form.password.trim()
          ? { password_hash: await hashPassword(uname, form.password.trim()) }
          : {}),
      };
      if (editUser?.id) {
        await sb(`app_users?id=eq.${editUser.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("app_users", { method: "POST", body: JSON.stringify(payload) });
      }
      onSuccess();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  return (
    <div style={card} className="page-enter">
      <PageHeader title={editUser ? "Edit User" : "Add New User"}
        action={onCancel && (
          <button style={btn("ghost")} onClick={onCancel}><ArrowLeft size={14} />Back</button>
        )} />
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <FieldInput label="Username" id="un" required value={form.username} onChange={set("username")}
          placeholder="e.g. soulcare1" hint="Lowercase, no spaces. Used to log in." />
        <FieldInput label="Display Name" id="dn" value={form.display_name} onChange={set("display_name")}
          placeholder="e.g. Tunde Adeyemi" hint="Full name shown on dashboard" />
      </div>
      <FieldInput label={editUser ? "New Password (leave blank to keep current)" : "Password"} id="pw"
        type="password" required={!editUser} value={form.password} onChange={set("password")} placeholder="••••••••" />
     <FieldInput label="Role" id="rl" type="select" required value={form.role} onChange={set("role")}
        options={[
          { value: "dofficer",      label: "Data Officer"    },
          { value: "expteam",       label: "Experience Team" },
          { value: "pasteam",       label: "Pastoral Team"   },
          { value: "soulcare",      label: "Soul Care"       },
          { value: "research",      label: "Research Team"   },
          { value: "testimonyteam", label: "Testimony Team"  },
          { value: "admin",         label: "Admin"           },
          { value: "experienceadmin", label: "Experience Admin" },
          { value: "soulcareadmin",   label: "Soul Care Admin"  },
        ]} />
      <div style={{
        background: C.greenXLight, borderRadius: 8, padding: "12px 14px", marginBottom: 16,
        fontSize: 13, color: C.textSecondary, lineHeight: 1.8,
      }}>
        <strong style={{ color: C.green }}>Role permissions:</strong><br />
        <strong>Data Officer</strong> — Add/edit first-timer records, generate QR code<br />
        <strong>Experience Team</strong> — My Calls, call queue, log feedback, flag for pastoral<br />
        <strong>Pastoral Team</strong> — Report, all feedback (with date filter), flagged records, visitation view<br />
        <strong>Soul Care</strong> — My Visits, visit queue (assigned contacts only), flagged records<br />
        <strong>Soul Care Admin</strong> — Bulk import contacts, assign visits, view all visits, flagged records, Testimonies<br />
        <strong>Research Team</strong> — View and download service feedback responses (CSV export)<br />
        <strong>Testimony Team</strong> — View and download Soul Care member testimonies (CSV export)<br />
        <strong>Admin</strong> — All of the above + user management + bulk import<br />
        <strong>Experience Admin</strong> — Assign contacts to team members, view call queue and all feedback<br />
      </div>

      <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading ? "Saving…" : editUser ? "Update User" : "Create User"}
      </button>
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: ADMIN — USER MANAGEMENT & OVERVIEW                           ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: AUTHENTICATION — LOGIN                                                          ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const SIGNUP_ROLES = [
  { value: "expteam",       label: "Experience Team" },
  { value: "soulcare",      label: "Soul Care"       },
  { value: "dofficer",      label: "Data Officer"    },
  { value: "pasteam",       label: "Pastoral Team"   },
  { value: "research",      label: "Research Team"   },
  { value: "testimonyteam", label: "Testimony Team"  },
];

function Login({ onLogin }) {
  const [mode, setMode] = useState("signin"); // "signin" | "request"

  // sign-in state
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // request-access state
  const [rUser, setRUser]   = useState("");
  const [rName, setRName]   = useState("");
  const [rRole, setRRole]   = useState("");
  const [rPwd, setRPwd]     = useState("");
  const [rConf, setRConf]   = useState("");
  const [rErr, setRErr]     = useState("");
  const [rBusy, setRBusy]   = useState(false);
  const [rDone, setRDone]   = useState(false);

  const submit = async () => {
    if (!u.trim() || !p.trim()) { setErr("Enter your username and password."); return; }
    setLoading(true); setErr("");
    try {
      const uname = u.trim().toLowerCase();
      const rows = await sb(`app_users?username=eq.${uname}&is_active=eq.true&select=*`);
      if (!rows || rows.length === 0) {
        setErr("Invalid username or password.");
        setLoading(false); return;
      }
      const account = rows[0];
      const hashed = await hashPassword(uname, p.trim());
      if (account.password_hash === hashed) {
        onLogin(account.role, account.display_name || account.username, account.username);
      } else if (account.password_hash === p.trim()) {
        await sb(`app_users?id=eq.${account.id}`, {
          method: "PATCH", body: JSON.stringify({ password_hash: hashed }),
        }).catch(() => {});
        onLogin(account.role, account.display_name || account.username, account.username);
      } else {
        setErr("Incorrect password.");
      }
    } catch (e) { setErr(`Login failed: ${e.message}`); }
    setLoading(false);
  };

  const requestAccess = async () => {
    const uname = rUser.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(uname)) { setRErr("Username: 3–24 characters, lowercase letters, numbers, . _ - only."); return; }
    if (!rRole) { setRErr("Select the team you serve on."); return; }
    if (rPwd.trim().length < 6) { setRErr("Password must be at least 6 characters."); return; }
    if (rPwd.trim() !== rConf.trim()) { setRErr("Passwords don't match."); return; }
    setRBusy(true); setRErr("");
    try {
      const existing = await sb(`app_users?username=eq.${encodeURIComponent(uname)}&select=id&limit=1`);
      if (existing && existing.length > 0) {
        setRErr("That username is already taken — choose another.");
        setRBusy(false); return;
      }
      await sb("app_users", {
        method: "POST",
        body: JSON.stringify({
          username:      uname,
          display_name:  rName.trim() || uname,
          role:          rRole,
          password_hash: await hashPassword(uname, rPwd.trim()),
          is_active:     false,
          is_pending:    true,
        }),
      });
      setRDone(true);
    } catch (e) { setRErr(e.message); }
    setRBusy(false);
  };

  const switchMode = (m) => { setMode(m); setErr(""); setRErr(""); };

  return (
    <div className="login-wrap" style={{ background: C.bg, fontFamily: F.body }}>

      {/* ── Brand panel (unchanged from v6.2) ── */}
      <div className="login-brand" style={{
        background: "linear-gradient(160deg, #1B3A2D 0%, #143526 55%, #0F5228 100%)",
        position: "relative", overflow: "hidden",
        flexDirection: "column", justifyContent: "center", padding: "3.5rem 3rem",
      }}>
        <div style={{
          position: "absolute", top: -120, right: -120, width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,146,42,.18), transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: -140, left: -100, width: 380, height: 380, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,.05), transparent 70%)",
        }} />
        <div style={{ position: "relative" }}>
          <Logo size={72} />
          <h1 style={{
            color: "#fff", fontFamily: F.head, fontWeight: 900, fontSize: 34,
            margin: "20px 0 6px", letterSpacing: "-.02em", lineHeight: 1.1,
          }}>
            THE <span style={{ color: C.goldMid }}>ENVOYS</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,.7)", fontSize: 14, margin: 0, letterSpacing: ".04em" }}>
            Membership Retention
          </p>
          <div className="login-verse" style={{ marginTop: 44, paddingLeft: 14, borderLeft: `3px solid ${C.gold}` }}>
            <p style={{
              color: "rgba(255,255,255,.85)", fontSize: 15, fontStyle: "italic",
              lineHeight: 1.7, margin: 0, maxWidth: 380,
            }}>
              "...turning information into insight and insight into impact."
            </p>
            <p style={{ color: C.goldMid, fontSize: 12, marginTop: 8, letterSpacing: ".1em", fontWeight: 700 }}>
              RETENTION
            </p>
          </div>
          <div className="login-verse" style={{ marginTop: 48, color: "rgba(255,255,255,.35)", fontSize: 11, letterSpacing: ".1em" }}>
            ENVOYSBYTE
          </div>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="login-panel">
        <div style={{ width: "100%", maxWidth: 380 }}>

          {mode === "signin" ? (
            <>
              <h2 style={{ margin: 0, color: C.textPrimary, fontFamily: F.head, fontWeight: 800, fontSize: 24 }}>
                Welcome back
              </h2>
              <p style={{ margin: "6px 0 26px", fontSize: 13, color: C.textMuted }}>
                Sign in to continue to your dashboard
              </p>
              {CREDS_MISSING && <CredsBanner />}
              <Alert type="error" msg={err} onClose={() => setErr("")} />
              <div onKeyDown={e => e.key === "Enter" && !loading && submit()}>
                <FieldInput label="Username" id="lu" value={u}
                  onChange={e => setU(e.target.value)} placeholder="e.g. expteam1" />
                <FieldInput label="Password" id="lp" type="password" value={p}
                  onChange={e => setP(e.target.value)} placeholder="••••••••" />
                <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15, marginTop: 4 }}
                  onClick={submit} disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 20, textAlign: "center" }}>
                New team member?{" "}
                <button onClick={() => switchMode("request")} style={{
                  background: "none", border: "none", color: C.green, fontWeight: 700,
                  cursor: "pointer", fontSize: 13, padding: 0, fontFamily: F.body,
                }}>Request access</button>
              </p>
            </>
          ) : rDone ? (
            <div style={{ textAlign: "center" }} className="page-enter">
              <div style={{
                width: 64, height: 64, borderRadius: "50%", background: C.greenLight,
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <CheckCircle size={32} color={C.green} />
              </div>
              <h2 style={{ margin: "0 0 8px", color: C.green, fontFamily: F.head, fontWeight: 800, fontSize: 22 }}>
                Request submitted!
              </h2>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7 }}>
                An admin will review and approve your account. Once approved, sign in with the
                username and password you chose.
              </p>
              <button style={{ ...btn("outline"), marginTop: 16 }} onClick={() => switchMode("signin")}>
                <ArrowLeft size={14} />Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ margin: 0, color: C.textPrimary, fontFamily: F.head, fontWeight: 800, fontSize: 24 }}>
                Request access
              </h2>
              <p style={{ margin: "6px 0 22px", fontSize: 13, color: C.textMuted }}>
                Create your account — an admin will approve it before you can sign in.
              </p>
              <Alert type="error" msg={rErr} onClose={() => setRErr("")} />
              <div onKeyDown={e => e.key === "Enter" && !rBusy && requestAccess()}>
                <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FieldInput label="Username" id="ru" required value={rUser}
                    onChange={e => setRUser(e.target.value)} placeholder="e.g. tunde.a"
                    hint="Lowercase, no spaces" />
                  <FieldInput label="Full Name" id="rn" value={rName}
                    onChange={e => setRName(e.target.value)} placeholder="e.g. Tunde Adeyemi" />
                </div>
                <FieldInput label="Which team do you serve on?" id="rr" type="select" required
                  value={rRole} onChange={e => setRRole(e.target.value)} options={SIGNUP_ROLES} />
                <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <FieldInput label="Password" id="rp" type="password" required value={rPwd}
                    onChange={e => setRPwd(e.target.value)} hint="At least 6 characters" />
                  <FieldInput label="Confirm Password" id="rc" type="password" required value={rConf}
                    onChange={e => setRConf(e.target.value)} />
                </div>
                <button style={{ ...btn("gold"), width: "100%", padding: 13, fontSize: 15, marginTop: 4 }}
                  onClick={requestAccess} disabled={rBusy}>
                  {rBusy ? "Submitting…" : "Submit Request"}
                </button>
              </div>
              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 20, textAlign: "center" }}>
                Already have an account?{" "}
                <button onClick={() => switchMode("signin")} style={{
                  background: "none", border: "none", color: C.green, fontWeight: 700,
                  cursor: "pointer", fontSize: 13, padding: 0, fontFamily: F.body,
                }}>Sign in</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: AUTHENTICATION — LOGIN                                        ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: APP SHELL — ROOT COMPONENT & ROUTING                             ║
// ║  Includes: App (default export) — manages all state, routing, rendering   ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function App() {
  const [session, setSession] = useState(() => loadSession());
  const [active, setActive] = useState(() => {
    const s = loadSession();
    return s ? (NAV[s.role]?.[0]?.id ?? null) : null;
  });
  const [editTarget,     setEditTarget]     = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [editUser,       setEditUser]       = useState(null);
  const [showPublic,     setShowPublic]     = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [flagCount,      setFlagCount]      = useState(0);
  const [editWeekTarget,   setEditWeekTarget]   = useState(null); // { person, week }
  const [editOverviewTarget, setEditOverviewTarget] = useState(null);
  const [visitLogTarget,  setVisitLogTarget]  = useState(null);
  const [visitEditTarget, setVisitEditTarget] = useState(null);
  const [showFeedback,    setShowFeedback]    = useState(false);
  const [showTestimony,   setShowTestimony]   = useState(false);

  useEffect(() => {
    const onPopState = (e) => {
      if (e.state && e.state.active) setActive(e.state.active);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const p = window.location.pathname;
    const h = window.location.hash;
    if (p === "/register"  || p === "/register/"  || h === "#register")  setShowPublic(true);
    if (p === "/feedback"  || p === "/feedback/"  || h === "#feedback")  setShowFeedback(true);
    if (p === "/testimony" || p === "/testimony/" || h === "#testimony") setShowTestimony(true);
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const fl = await sb("call_feedback?flagged_for_pastoral=eq.true&select=id");
        setFlagCount((fl || []).length);
      } catch {}
    })();
  }, [session]);

  const login = (role, user, username) => {
    const s = { role, user, username };
    setSession(s);
    setActive(NAV[role][0].id);
    window.history.replaceState({ active: NAV[role][0].id }, "", window.location.pathname);
    saveSession(role, user, username);
  };

  const logout = () => {
    clearSession();
    setSession(null);
    setActive(null);
  };

  const navTo = (v) => {
  setActive(v);
  setEditTarget(null); setFeedbackTarget(null); setEditUser(null);
  setEditWeekTarget(null); setEditOverviewTarget(null);
  setVisitLogTarget(null); setVisitEditTarget(null);
  setMobileOpen(false);
  if (v !== active) {
    window.history.pushState({ active: v }, "", window.location.pathname);
  }
};

  if (showPublic)    return <PublicForm />;
  if (showFeedback)  return <PublicFeedbackForm />;
  if (showTestimony) return <PublicTestimonyForm />;
  if (!session)      return <Login onLogin={login} />;

  const { role, user, username } = session;
  const pageTitle = NAV[role]?.find(n => n.id === active)?.label || "Dashboard";

  const renderContent = () => {
    if (active === "admin_overview") {
      return <AdminOverview setActive={navTo} />;
    }

    if (active === "admin_adduser") {
      if (editUser) {
        return (
          <AdminAddUser
            editUser={editUser}
            onCancel={() => { setEditUser(null); navTo("admin_users"); }}
            onSuccess={() => { setEditUser(null); navTo("admin_users"); }}
          />
        );
      }
      return <AdminAddUser onSuccess={() => navTo("admin_users")} onCancel={() => navTo("admin_overview")} />;
    }

    if (active === "admin_users") {
      if (editUser) {
        return (
          <AdminAddUser
            editUser={editUser}
            onCancel={() => setEditUser(null)}
            onSuccess={() => { setEditUser(null); navTo("admin_users"); }}
          />
        );
      }
      return <AdminUsers onEdit={u => setEditUser(u)} />;
    }

    if (active === "myprofile") {
      return (
        <MyProfilePage
          currentUser={user}
          username={username}
          role={role}
          onRenamed={(newName) => {
            const next = { ...session, user: newName };
            setSession(next);
            saveSession(next.role, next.user, next.username);
          }}
        />
      );
    }

    if (active === "addmember") return <FirstTimerForm onSuccess={() => navTo("firsttimers")} />;
    if (active === "qrcode") return <QRCodePage />;
    if (active === "allfeedback") return <AllFeedback />;
    if (active === "report") return <Report />;
    if (active === "flagged") return <FlaggedRecords />;
    if (active === "visitation_tab") return <VisitationTab />;
    if (active === "research_feedback") return <ResearchFeedback />;
    if (active === "general_feedback")  return <GeneralFeedback />;
    if (active === "feedback_qr")       return <FeedbackQRPage />;
    if (active === "testimony_qr")      return <TestimonyQRPage />;

    if (active === "firsttimers") {
      if (editTarget) {
        return (
          <FirstTimerForm
            editData={editTarget}
            onCancel={() => setEditTarget(null)}
            onSuccess={() => { setEditTarget(null); navTo("firsttimers"); }}
          />
        );
      }
      return <FirstTimersList onEdit={r => setEditTarget(r)} />;
    }

    if (active === "mycalls") {
      if (editOverviewTarget) {
        return (
          <PipelineOverviewForm
            person={editOverviewTarget}
            callerName={user}
            onBack={() => setEditOverviewTarget(null)}
            onDone={() => { setEditOverviewTarget(null); navTo("mycalls"); }}
          />
        );
      }
      if (editWeekTarget) {
        return (
          <LogFeedback
            person={editWeekTarget.person}
            callerName={user}
            editWeek={editWeekTarget.week}
            onBack={() => setEditWeekTarget(null)}
          />
        );
      }
      if (feedbackTarget) {
        return (
          <LogFeedback
            person={feedbackTarget}
            callerName={user}
            onBack={() => setFeedbackTarget(null)}
          />
        );
      }
      return (
        <MyCallsView
          currentUser={user}
          onLogFeedback={r => setFeedbackTarget(r)}
          onEditWeekFeedback={(person, week) => setEditWeekTarget({ person, week })}
          onEditOverview={r => setEditOverviewTarget(r)}
        />
      );
    }

    if (active === "assign_calls") {
      return (
        <AssignCallsView
          currentUser={user}
          onViewCompleted={() => navTo("completed_pipelines")}
        />
      );
    }

    if (active === "completed_pipelines") {
      const cpBackTarget = role === "soulcareadmin" ? "sc_assign" : "assign_calls";
      return <CompletedPipelines onBack={() => navTo(cpBackTarget)} />;
    }

    if (active === "callqueue") {
      if (editWeekTarget) {
        return (
          <LogFeedback
            person={editWeekTarget.person}
            callerName={user}
            editWeek={editWeekTarget.week}
            onBack={() => setEditWeekTarget(null)}
          />
        );
      }
      if (feedbackTarget) {
        return (
          <LogFeedback
            person={feedbackTarget}
            callerName={user}
            onBack={() => setFeedbackTarget(null)}
          />
        );
      }
      return (
        <CallQueue
          currentUser={user}
          currentUserRole={role}
          onLogFeedback={r => setFeedbackTarget(r)}
          onEditWeek={(person, week) => setEditWeekTarget({ person, week })}
        />
      );
    }

    if (active === "callbacks") {
      if (feedbackTarget) {
        return (
          <LogFeedback
            person={feedbackTarget}
            callerName={user}
            onBack={() => setFeedbackTarget(null)}
          />
        );
      }
      return (
        <CallBackQueue
          currentUser={user}
          onLogFeedback={r => setFeedbackTarget(r)}
        />
      );
    }

    if (active === "sc_assign") {
      return <AssignVisitsView currentUser={user} />;
    }

    if (active === "add_visit") {
      const backTarget = (role === "soulcareadmin" || role === "admin") ? "sc_queue" : "sc_mine";
      return (
        <AddVisitPage
          currentUser={user}
          onCancel={() => navTo(backTarget)}
          onLoggingDone={() => navTo(backTarget)}
        />
      );
    }

    if (active === "members_care") return <MembersCare currentUser={user} role={role} />;
    if (active === "sc_flagged") return <SoulCareFlagged />;
    if (active === "sc_testimonies") return <Testimonies />;
    if (active === "testimony_bank") return <TestimonyBank currentUser={user} />;

    if (active === "sc_queue" || active === "sc_mine") {
      if (visitEditTarget) {
        return (
          <LogVisitForm
            contact={visitEditTarget.contact}
            editVisit={visitEditTarget.visit}
            loggedBy={user}
            onBack={() => setVisitEditTarget(null)}
            onDone={() => { setVisitEditTarget(null); navTo(active); }}
          />
        );
      }
      if (visitLogTarget) {
        return (
          <LogVisitForm
            contact={visitLogTarget}
            loggedBy={user}
            onBack={() => setVisitLogTarget(null)}
            onDone={() => { setVisitLogTarget(null); navTo(active); }}
          />
        );
      }
      if (active === "sc_queue") {
        return (
          <SoulCareQueue
            currentUser={user}
            currentUserRole={role}
            onLogVisit={c => setVisitLogTarget(c)}
          />
        );
      }
      return (
        <MySoulCareVisits
          currentUser={user}
          onLogVisit={c => setVisitLogTarget(c)}
          onEditVisit={(contact, visit) => setVisitEditTarget({ contact, visit })}
        />
      );
    }

    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, color: C.textPrimary }}>
      <MobileHeader onMenu={() => setMobileOpen(true)} title={pageTitle} />
      <Sidebar role={role} active={active} setActive={navTo} user={user}
        onLogout={logout} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)}
        flagCount={flagCount} />
      <div className="main-content">
        <div className="content-inner">
          {renderContent()}
        </div>
      </div>
      <InstallBanner />
      <ToastHost />
      <NotificationBell role={role} user={user} setActive={navTo} />
    </div>
  );
}

function AppRoot() {
  const presentSlug = new URLSearchParams(window.location.search).get("present");
  if (presentSlug) return <PresentationViewer slug={presentSlug} />;
  return <App />;
}

export default AppRoot;
// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: APP SHELL — ROOT COMPONENT & ROUTING                         ║
// ╚═════════════════════════════════════════════════════════════════════════════╝