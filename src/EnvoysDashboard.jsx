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
  Star, TrendingUp, Activity, Shield, Eye, Edit3, UserCheck, Layers,
  FileText, Bell, Filter, Download, ChevronDown, Info, Zap, Camera, Image as ImageIcon,
} from "lucide-react";


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
    body { -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #c5d8cb; border-radius: 4px; }
    input, select, textarea, button { font-family: 'Satoshi', sans-serif; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .page-enter { animation: fadeIn .2s ease; }
    @media (max-width: 768px) {
      .sidebar      { transform: translateX(-100%); transition: transform .25s ease; }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0 !important; padding: 1rem !important; }
      .mob-header   { display: flex !important; }
      .g2           { grid-template-columns: 1fr !important; }
      .g4           { grid-template-columns: 1fr 1fr !important; }
      .greport      { grid-template-columns: 1fr !important; }
    }
    @media (min-width: 769px) {
      .sidebar    { transform: translateX(0) !important; }
      .mob-header { display: none !important; }
    }
  `;
  document.head.appendChild(s);
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

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SUPABASE CONFIG & API HELPERS                                 ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SESSION PERSISTENCE                                               ║
// ║  Includes: saveSession(), loadSession(), clearSession()                    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const SESSION_KEY = "envoys_session_v1";

function saveSession(role, user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ role, user })); } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.role && s.user) return s;
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

  useEffect(() => {
    if (!role) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await sb(
          `app_users?role=eq.${role}&is_active=eq.true&select=display_name,username&order=display_name.asc`
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
        console.warn(`useRoleUsers(${role}) fetch failed:`, e.message);
        if (!cancelled) setOptions([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [role]);

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
  research: { label: "Research Team",   color: C.research,   bg: C.researchLight},
  experienceadmin: { label: "Exp. Admin", color: C.blue, bg: C.blueLight },
};

const NAV_ICONS = {
  admin_overview: Home, admin_users: Users, admin_adduser: UserPlus,
  firsttimers: Users, addmember: UserPlus, report: BarChart2,
  allfeedback: MessageSquare, flagged: Flag, qrcode: QrCode,
  callqueue: Phone, callbacks: RefreshCw, mycalls: Phone,
  sc_queue: Heart, sc_add: UserPlus, sc_mine: Clipboard,
  visitation_tab: MapPin,
  research_feedback: FileText,
  assign_calls: UserCheck,
  completed_pipelines: FileText,
};

const NAV = {
  admin: [
    { id: "admin_overview", label: "Overview"     },
    { id: "admin_users",    label: "Users"         },
    { id: "admin_adduser",  label: "Add User"      },
    { id: "firsttimers",   label: "First-Timers"  },
    { id: "report",        label: "Report"        },
    { id: "allfeedback",   label: "All Feedback"  },
    { id: "flagged",       label: "Flagged"       },
    { id: "visitation_tab",label: "Visitations"   },
    { id: "research_feedback", label: "Research"  },
    { id: "qrcode",        label: "QR Code"       },
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
    { id: "sc_queue",      label: "Visit Queue"   },
    { id: "sc_add",        label: "Add Visit"     },
    { id: "sc_mine",       label: "My Visits"     },
  ],
  research: [
    { id: "research_feedback", label: "Service Feedback" },
  ],
  experienceadmin: [
  { id: "assign_calls",        label: "Assign Calls"        },
  { id: "completed_pipelines", label: "Completed Pipelines" },
  { id: "callqueue",           label: "Call Queue"          },
  { id: "allfeedback",         label: "All Feedback"        },
  { id: "flagged",             label: "Flagged"             },
],
};

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
          <img src={preview} alt="Visit photo"
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
    <div onClick={onClick}
      style={{
        ...card, padding: "1.1rem 1.25rem", borderLeft: `3px solid ${accent}`,
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow .15s", display: "flex", alignItems: "center", gap: 14,
      }}
      onMouseOver={e => onClick && (e.currentTarget.style.boxShadow = SHADOW.md)}
      onMouseOut={e => onClick && (e.currentTarget.style.boxShadow = SHADOW.xs)}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: `${accent}14`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {Icon && <Icon size={20} color={accent} strokeWidth={1.8} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 26, fontWeight: 800, color: accent, fontFamily: F.head, lineHeight: 1.1,
        }}>{value ?? "—"}</div>
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

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SHARED UI PRIMITIVES                                          ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: NAVIGATION — SIDEBAR & MOBILE HEADER                             ║
// ║  Includes: Sidebar, MobileHeader                                           ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function Sidebar({ role, active, setActive, user, onLogout, mobileOpen, onClose, flagCount = 0 }) {
  const ri = ROLE_META[role] || ROLE_META.expteam;
  return (
    <>
      {mobileOpen && (
        <div onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 98 }} />
      )}
      <div className={`sidebar${mobileOpen ? " open" : ""}`}
        style={{
          width: 224, background: C.sidebar, minHeight: "100vh",
          display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 100,
          boxShadow: "2px 0 12px rgba(0,0,0,.15)",
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
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {(NAV[role] || []).map(item => {
            const on = active === item.id;
            const Icon = NAV_ICONS[item.id] || FileText;
            const isFlag = item.id === "flagged";
            return (
              <button key={item.id} onClick={() => { setActive(item.id); onClose?.(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 10px", border: "none", cursor: "pointer", borderRadius: 8,
                  marginBottom: 2,
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
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
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

const BLANK_FT = {
  full_name: "", phone: "", gender: "", email: "", dob: "",
  marital_status: "", house_address: "", nearest_landmark: "",
  membership_decision: "", life_stage: "", heard_from: "",
  areas_of_interest: [], service_feedback: "",
  service_date: new Date().toISOString().slice(0, 10),
};

function FirstTimerForm({ onSuccess, editData, onCancel }) {
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

  const submit = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.gender) {
      setErr("Full name, phone and gender are required.");
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
        style={{ ...btn("primary"), width: "100%", padding: "12px", fontSize: 15 }}
        onClick={submit}
        disabled={loading}>
        {loading ? "Saving…" : editData ? "Update Record" : "Submit"}
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
          Thank you for visiting!
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
        <FirstTimerForm onSuccess={() => setDone(true)} />
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

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { setData((await sb("first_timers?order=created_at.desc&limit=300")) || []); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
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
      <PageHeader title="First-Timers Registry" subtitle={`${data.length} total records`}
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
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const [col, bg] = dc[r.membership_decision] || [C.textMuted, C.bg];
            return (
              <div key={r.id} style={{
                ...card, display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "12px 16px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: C.greenLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: C.green, fontFamily: F.head, flexShrink: 0,
                  }}>
                    {r.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.gender} · {r.service_date}</div>
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
    const parts = s.split(/[\/\-]/);
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
// ║  MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v7.1)                        ║
// ║                                                                             ║
// ║  CHANGES FROM v7.0:                                                         ║
// ║  1. LogFeedback: "Your Name (Caller)" no longer shows a dropdown for       ║
// ║     expteam users — it is locked to the signed-in user's display name.      ║
// ║  2. MyCallsView / PipelineOverviewForm: an "Edit Overview" button is        ║
// ║     shown after an overview has been submitted, letting callers re-open      ║
// ║     and amend the form. PipelineOverviewForm now pre-populates from         ║
// ║     person.overview when an existing record is present.                     ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CONNECT_CENTERS = [
  "Agege", "Aboru/Iyana Ipaja", "Akute", "Ayobo", "Berger",
  "Command/Ikeja", "Egbeda", "Iju-Ishaga", "Magboro", "Mile 12",
  "Ogba", "Ojoo", "OPIC Estates", "Redemption City",
];

const NATURAL_GROUPS = ["Interphaze", "Solid Rock", "Royal Diade"];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — pipeline utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Given an array of call_feedback rows for one first-timer, return weeks present */
function weeksLogged(fbRows) {
  const weeks = new Set();
  (fbRows || []).forEach(r => { if (r.week_number) weeks.add(r.week_number); });
  return weeks;
}

/** How many of the 3 pipeline weeks have at least one log? */
function pipelineProgress(fbRows) {
  return weeksLogged(fbRows).size; // 0–3
}

/** What is the next week to log? null if pipeline complete */
function nextWeek(fbRows) {
  const done = weeksLogged(fbRows);
  for (let w = 1; w <= 3; w++) { if (!done.has(w)) return w; }
  return null;
}

/** Is the 3-week pipeline complete? */
function pipelineComplete(fbRows) {
  return nextWeek(fbRows) === null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineBar — compact 3-week progress indicator
// ─────────────────────────────────────────────────────────────────────────────

function PipelineBar({ fbRows, compact = false }) {
  const done = weeksLogged(fbRows);
  const complete = pipelineComplete(fbRows);

  const weekColor = (w) => {
    if (!done.has(w)) return { bg: C.border, text: C.textMuted };
    const row = (fbRows || []).find(r => r.week_number === w);
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
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {[1, 2, 3].map(w => {
        const c = weekColor(w);
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
// ─────────────────────────────────────────────────────────────────────────────

function useCallData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr("");
      try {
        const [ftRows, fbRows, asgRows, ovRows] = await Promise.all([
          sb("first_timers?order=created_at.desc&limit=500"),
          sb("call_feedback?select=*&order=created_at.asc"),
          sb("call_assignments?select=*").catch(() => []),
          sb("pipeline_overviews?select=*").catch(() => []),
        ]);

        const fbMap = {};
        (fbRows || []).forEach(f => {
          if (!fbMap[f.first_timer_id]) fbMap[f.first_timer_id] = [];
          fbMap[f.first_timer_id].push(f);
        });

        const asgMap = {};
        (asgRows || []).forEach(a => { asgMap[a.first_timer_id] = a; });

        const ovMap = {};
        (ovRows || []).forEach(o => { ovMap[o.first_timer_id] = o; });

        if (!cancelled) {
          setData((ftRows || []).map(r => ({
            ...r,
            fbRows:     fbMap[r.id] || [],
            assignment: asgMap[r.id] || null,
            overview:   ovMap[r.id]  || null,
          })));
        }
      } catch (e) { if (!cancelled) setErr(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tick]);

  return { data, loading, err, reload };
}

// ─────────────────────────────────────────────────────────────────────────────
// AssignCallsView — only visible to experienceadmin / admin
// (unchanged from v7.0)
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
      setMsg(`Assigned to ${member}.`);
      setMsgType("success");
      reload();
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
    { k: "unassigned", label: "Unassigned",        count: unassignedCount, col: C.gold     },
    { k: "assigned",   label: "Assigned",           count: assignedCount,   col: C.green    },
    { k: "complete",   label: "Pipeline Complete",  count: completeCount,   col: C.greenMid },
    { k: "all",        label: "All",                count: data.length,     col: C.textMuted},
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
        <StatCard label="Total Contacts"  value={data.length}      icon={Users}       accent={C.green}   />
        <StatCard label="Assigned"        value={assignedCount}    icon={UserCheck}   accent={C.greenMid}/>
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

      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const complete = pipelineComplete(r.fbRows);
            const pending  = pendingAssign[r.id];
            return (
              <div key={r.id} style={{
                ...card, padding: "12px 16px",
                borderLeft: `3px solid ${complete ? C.green : r.assignment ? C.blue : C.gold}`,
              }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: 1, minWidth: 220 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: C.greenLight, display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 800, color: C.green, fontSize: 14, fontFamily: F.head,
                    }}>{r.full_name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.service_date}</div>
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
                        <button style={btn("ghost", { padding: "5px 10px", fontSize: 11 })}
                          onClick={() => setPendingAssign(p => ({ ...p, [r.id]: r.assignment.assigned_to }))}>
                          <Edit3 size={10} />Reassign
                        </button>
                        <button style={btn("danger", { padding: "5px 10px", fontSize: 11 })}
                          onClick={() => removeAssignment(r.id, r.assignment.id)} disabled={saving}>
                          <X size={10} />Unassign
                        </button>
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
// CallQueue — role-aware: experienceadmin sees expandable week detail
// (unchanged from v7.0)
// ─────────────────────────────────────────────────────────────────────────────

function CallQueue({ onLogFeedback, onEditWeek, currentUserRole = "expteam", currentUser = "" }) {
  const { data, loading, err, reload } = useCallData();
  const [filter, setFilter]   = useState("pending");
  const [search, setSearch]   = useState("");
  const [expanded, setExpanded] = useState(null);

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
    : searched.filter(r => r.assignment?.assigned_to === currentUser || r.fbRows.some(f => f.caller_name === currentUser));

  const pending   = visible.filter(r => categorise(r) === "pending");
  const reached   = visible.filter(r => categorise(r) === "reached");
  const callback  = visible.filter(r => categorise(r) === "callback");
  const incorrect = visible.filter(r => categorise(r) === "incorrect");
  const complete  = visible.filter(r => categorise(r) === "complete");
  const views = { pending, reached, callback, incorrect, complete, all: visible };
  const filtered = views[filter] || visible;

  const tabs = [
    { k: "pending",   label: "Pending",   count: pending.length,   col: C.gold     },
    { k: "callback",  label: "Call Back", count: callback.length,  col: C.amber    },
    { k: "reached",   label: "Reached",   count: reached.length,   col: C.green    },
    { k: "incorrect", label: "Incorrect", count: incorrect.length, col: C.danger   },
    { k: "complete",  label: "Complete",  count: complete.length,  col: C.greenMid },
    { k: "all",       label: "All",       count: visible.length,   col: C.textMuted},
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

      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const latestFb = r.fbRows[r.fbRows.length - 1];
            const complete = pipelineComplete(r.fbRows);
            const sm       = latestFb ? statusMeta(latestFb.call_status)
              : { color: C.gold, bg: C.goldLight, label: "Pending" };
            const nxt      = nextWeek(r.fbRows);
            const isOpen   = expanded === r.id;

            const isMyContact = isAdmin ||
              r.assignment?.assigned_to === currentUser ||
              r.fbRows.some(f => f.caller_name === currentUser);

            return (
              <div key={r.id} style={{
                ...card, padding: 0, overflow: "hidden",
                borderLeft: `3px solid ${complete ? C.greenMid : sm.color}`,
              }}>
                <div style={{
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
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        {r.phone} · {r.membership_decision} · {r.service_date}
                      </div>
                      {r.assignment && (
                        <div style={{ fontSize: 11, color: C.blue, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <UserCheck size={10} />Assigned to <strong>{r.assignment.assigned_to}</strong>
                        </div>
                      )}
                      <div style={{ marginTop: 6 }}>
                        <PipelineBar fbRows={r.fbRows} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0 }}>
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
// (unchanged from v7.0)
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

      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {callbacks.map(r => {
            const latest = r.fbRows[r.fbRows.length - 1];
            const nxt    = nextWeek(r.fbRows);
            return (
              <div key={r.id} style={{ ...card, padding: "12px 16px", borderLeft: `3px solid ${C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.service_date}</div>
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
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0 }}>
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
//
// CHANGE (v7.1): When a pipeline overview exists, shows both an
// "Edit Overview" button (to revise it) and an "Overview Submitted" badge.
// The "onEditOverview" prop opens PipelineOverviewForm in edit mode.
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

  const views = { all: mine, reached, callback, complete, flagged };
  const filtered = views[filter] || mine;

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

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Assigned to Me"    value={mine.length}      icon={Phone}       accent={C.green}   />
        <StatCard label="Pipeline Complete" value={complete.length}  icon={CheckCircle} accent={C.greenMid}/>
        <StatCard label="Call Backs"        value={callback.length}  icon={RefreshCw}   accent={C.amber}   />
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

      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => {
            const isComplete  = pipelineComplete(r.fbRows);
            const nxt         = nextWeek(r.fbRows);
            const lastFb      = r.fbRows[r.fbRows.length - 1];
            const sm          = lastFb ? statusMeta(lastFb.call_status)
              : { color: C.gold, bg: C.goldLight, label: "Pending" };
            const anyFlagged  = r.fbRows.some(f => f.flagged_for_pastoral);
            const hasOverview = !!r.overview;

            return (
              <div key={r.id} style={{
                ...card, padding: "14px 16px",
                borderLeft: `3px solid ${anyFlagged ? C.flag : isComplete ? C.greenMid : sm.color}`,
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, color: sm.color, fontSize: 14, fontFamily: F.head,
                    }}>{r.full_name?.charAt(0) || "?"}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.service_date}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {anyFlagged && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={10} />Flagged</span>}
                    {isComplete ? (
                      <>
                        <span style={badge(C.greenMid, C.greenLight, { fontSize: 11 })}>
                          <CheckCircle size={10} />Pipeline Complete
                        </span>
                        {/* ── v7.1: Edit Overview always available once overview exists ── */}
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
// LogFeedback — v7.1
//
// CHANGE: "Your Name (Caller)" is now a locked read-only display that shows the
// signed-in user's display name (callerName prop). The dropdown is removed for
// expteam users so callers cannot impersonate another team member.
// The field is still editable only if callerName is empty (fallback for edge cases).
// ─────────────────────────────────────────────────────────────────────────────

function LogFeedback({ person, onBack, callerName = "", editWeek = null }) {
  const fbRows = person.fbRows || [];

  const weekToLog = editWeek !== null ? editWeek : nextWeek(fbRows);

  const [form, setForm] = useState({
    call_status: "", experience_rating: "", returning_likelihood: "",
    notes: "", follow_up_date: "", caller_name: callerName,
    flagged_for_pastoral: false, flag_reason: "",
    church_attendance: "",
  });
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [done, setDone]         = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [err, setErr]           = useState("");
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
            // Always keep the signed-in caller's name, not the stored one,
            // so a corrected name from the session takes precedence.
            caller_name:          callerName || r.caller_name || "",
            flagged_for_pastoral: r.flagged_for_pastoral || false,
            flag_reason:          r.flag_reason          || "",
            church_attendance:    r.church_attendance    || "",
          });
        }
      } catch { /* no existing row */ }
      setFetching(false);
    })();
  }, [person.id, weekToLog]);

  const lsRef = useRef({});
  const lset = useCallback((key) => {
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
        <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px" }}>
          Pipeline complete for {person.full_name}
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
      <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px" }}>
        Week {weekToLog} feedback {existingRow ? "updated" : "logged"} for {person.full_name}
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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={btn("ghost", { padding: "7px 10px" })} onClick={onBack}><ArrowLeft size={14} /></button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            {editWeek ? `Edit Week ${weekToLog}` : `Week ${weekToLog} Call`} — {person.full_name}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            {person.phone} · visited {person.service_date}
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

      {/*
        ── v7.1 CHANGE: Caller name ──────────────────────────────────────────
        Show a locked read-only chip with the signed-in user's display name.
        This prevents expteam users from selecting a different caller name.
        If callerName is somehow empty (edge case), fall back to a plain text
        input so the form is still usable.
      */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
          Your Name (Caller)
        </div>
        {callerName ? (
          <div style={{
            ...inputBase,
            background: C.greenXLight,
            border: `1.5px solid ${C.greenBorder}`,
            color: C.green,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "default",
            userSelect: "none",
          }}>
            <UserCheck size={14} color={C.green} />
            {callerName}
            <span style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 400,
              color: C.textMuted, fontStyle: "italic",
            }}>
              Logged as you
            </span>
          </div>
        ) : (
          /* Fallback: plain text input if session name is unavailable */
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
              { value: "Average", label: "Average" }, { value: "Poor", label: "Poor" },
            ]} />
          <FieldInput label="Returning?" id="rl" type="select"
            value={form.returning_likelihood} onChange={lset("returning_likelihood")}
            options={[
              { value: "Yes", label: "Yes: will return next week" }, { value: "Maybe", label: "Maybe: on special services" },
              { value: "No", label: "No: came to visit" }, { value: "Undecided", label: "Undecided" },
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
// PipelineOverviewForm — v7.1
//
// CHANGE: Now supports both creating a new overview AND editing an existing one.
// When person.overview is present the form pre-populates all fields.
// The "Edit" flow is opened via the "Edit Overview" button in MyCallsView.
// ─────────────────────────────────────────────────────────────────────────────

function PipelineOverviewForm({ person, callerName = "", onBack, onDone }) {
  const existingOverview = person.overview || null;

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
        // We already know the record's id from person.overview
        await sb(`pipeline_overviews?id=eq.${existingOverview.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        // Check for an orphan record just in case, then insert
        const existing = await sb(
          `pipeline_overviews?first_timer_id=eq.${person.id}&select=id&limit=1`
        ).catch(() => []);

        if (existing && existing.length > 0) {
          await sb(`pipeline_overviews?id=eq.${existing[0].id}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          });
        } else {
          await sb("pipeline_overviews", { method: "POST", body: JSON.stringify(payload) });
        }
      }

      // Sync membership decision in first_timers when recommended
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
        {person.full_name}'s retention overview has been {isEditing ? "updated" : "recorded"}.
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
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            {isEditing ? "Edit" : "VIP"} Retention Overview — {person.full_name}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            {isEditing
              ? "Update your assessment. Changes will overwrite the existing overview."
              : "Submit your 3-week assessment to help the team decide on membership."}
          </p>
        </div>
      </div>

      {/* Edit mode banner */}
      {isEditing && (
        <div style={{
          marginBottom: 16, padding: "8px 14px", background: C.goldLight,
          borderRadius: 8, fontSize: 13, color: C.goldDark, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Edit3 size={13} />You are editing an existing overview — your changes will overwrite the saved version.
        </div>
      )}

      {/* Pipeline complete banner */}
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
          <strong>{person.full_name}</strong> to full membership?
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { val: true,  label: `Yes — Move ${person.full_name?.split(" ")[0]} to Membership`, col: C.green,  bg: C.greenLight  },
            { val: false, label: "No — Not ready for membership yet",                            col: C.danger, bg: C.dangerLight },
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

      {/* Submitted by — locked to session name, same as LogFeedback */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
          Submitted by
        </div>
        {callerName ? (
          <div style={{
            ...inputBase,
            background: C.greenXLight,
            border: `1.5px solid ${C.greenBorder}`,
            color: C.green,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "default",
            userSelect: "none",
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
// (unchanged from v7.0)
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
        const data = await sb(
          "pipeline_overviews?select=*,first_timers(full_name,phone,service_date)&order=submitted_at.desc&limit=500"
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

    const header = ["VIP Name", "Phone", "Service Date", "Move to Membership", "Natural Groups", "Connect Center", "Submitted By", "Submitted At"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => {
        const ft = r.first_timers || {};
        return [
          escape(ft.full_name),
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

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
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
        <StatCard label="Total Overviews"   value={rows.length}     icon={FileText}    accent={C.blue}    />
        <StatCard label="Matching Filter"   value={filtered.length} icon={Filter}      accent={C.green}   />
        <StatCard label="Selected"          value={selectedCount}   icon={Download}    accent={selectedCount > 0 ? C.blue : C.textMuted}
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
        <p style={{ color: C.textMuted }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0 ? "No pipeline overviews submitted yet." : "No results match your filters."}
          </div>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 130px 120px 1fr 1fr",
            padding: "10px 16px", background: C.bg,
            borderBottom: `1px solid ${C.border}`, gap: 10, alignItems: "center",
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

            return (
              <div key={r.id} onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 130px 120px 1fr 1fr",
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

                {/* Name */}
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
                    {ft.full_name}
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
// ║  END MODULE: EXPERIENCE TEAM — CALL MANAGEMENT  (v7.1)                    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: PASTORAL TEAM — FEEDBACK VIEWS & REPORT                          ║
// ║  Includes: AllFeedback, FlaggedRecords, Report                            ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

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
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
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

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Flagged for Pastoral"
        subtitle={`${rows.length} record${rows.length !== 1 ? "s" : ""} requiring pastoral attention`} />
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map(r => {
            const ft = r.first_timers || {};
            const sm = statusMeta(r.call_status);
            return (
              <div key={r.id} style={{ ...card, borderLeft: `3px solid ${C.flag}`, padding: "14px 16px" }}>
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
                    <span style={badge(C.flag, C.flagLight)}><Flag size={11} />Flagged</span>
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

function Report() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      let q = "first_timers?select=membership_decision,life_stage,gender,areas_of_interest";
      if (dateFrom) q += `&service_date=gte.${dateFrom}`;
      if (dateTo)   q += `&service_date=lte.${dateTo}`;
      const ft = await sb(q) || [];
      const fb = await sb("call_feedback?select=call_status,experience_rating,returning,caller_name,flagged_for_pastoral") || [];
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
      setStats({
        total: ft.length, totalCalls: fb.length,
        flagged: fb.filter(f => f.flagged_for_pastoral).length,
        decisions: tally(ft, "membership_decision"), lifeStage: tally(ft, "life_stage"),
        gender: tally(ft, "gender"), callStatus: callStatusNorm,
        rating: tally(fb, "experience_rating"), returning: tally(fb, "returning"),
        areas: areasTally, callers: callerTally,
      });
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [dateFrom, dateTo]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: C.textMuted }}>Loading report…</p>;

  const Bar = ({ label, value, max, color }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: C.textSecondary }}>{label}</span>
        <span style={{ fontWeight: 600, color: C.textPrimary }}>{value}</span>
      </div>
      <div style={{ height: 7, background: C.border, borderRadius: 4 }}>
        <div style={{
          height: 7, borderRadius: 4, transition: "width .5s",
          background: color || C.green,
          width: `${Math.round((value / (max || 1)) * 100)}%`,
        }} />
      </div>
    </div>
  );

  const maxD = Math.max(...Object.values(stats?.decisions || {}), 1);
  const maxA = Math.max(...Object.values(stats?.areas || {}), 1);
  const maxC = Math.max(...Object.values(stats?.callStatus || {}), 1);
  const csColor = k => k === "Reached" ? C.green : k === "Call Back" ? C.amber : C.danger;

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

      {stats && (
        <>
          <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard label="First-Timers"  value={stats.total}                     icon={Users}     accent={C.green}   />
            <StatCard label="Calls Logged"  value={stats.totalCalls}                icon={Phone}     accent={C.greenMid}/>
            <StatCard label="Members"       value={stats.decisions["Member"] || 0}  icon={UserCheck} accent={C.goldDark}/>
            <StatCard label="Flagged"       value={stats.flagged}                   icon={Flag}      accent={C.flag}
              sub={stats.flagged > 0 ? "Needs attention" : ""} />
          </div>

          <div className="greport" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={card}>
              <SH title="Membership Decision" icon={UserCheck} />
              {Object.entries(stats.decisions).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxD}
                  color={k === "Member" ? C.green : k === "Visitor" ? C.goldMid : C.amber} />
              ))}
              {!Object.keys(stats.decisions).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            </div>
            <div style={card}>
              <SH title="Call Outcomes" icon={Phone} />
              {Object.entries(stats.callStatus).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={maxC} color={csColor(k)} />
              ))}
              {!Object.keys(stats.callStatus).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            </div>
            <div style={card}>
              <SH title="Returning Likelihood" icon={TrendingUp} />
              {Object.entries(stats.returning).map(([k, v]) => (
                <Bar key={k} label={k} value={v}
                  max={Math.max(...Object.values(stats.returning), 1)}
                  color={k === "Yes" ? C.green : k === "Maybe" ? C.gold : C.danger} />
              ))}
              {!Object.keys(stats.returning).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            </div>
            <div style={card}>
              <SH title="Gender & Life Stage" icon={Activity} />
              {Object.entries(stats.gender).map(([k, v]) => (
                <Bar key={k} label={k} value={v} max={stats.total} color={k === "Female" ? C.goldMid : C.green} />
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
                {Object.entries(stats.lifeStage).map(([k, v]) => (
                  <Bar key={k} label={k} value={v} max={stats.total} color={C.greenMid} />
                ))}
              </div>
            </div>
            <div style={card}>
              <SH title="Caller Activity" icon={Users} />
              {Object.entries(stats.callers).sort((a, b) => b[1].total - a[1].total).map(([name, s]) => (
                <div key={name} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: C.textSecondary, fontWeight: 500 }}>{name}</span>
                    <span style={{ color: C.textMuted, fontSize: 12 }}>{s.reached}/{s.total} reached</span>
                  </div>
                  <div style={{ height: 7, background: C.border, borderRadius: 4 }}>
                    <div style={{
                      height: 7, borderRadius: 4, background: C.green,
                      width: `${Math.round((s.total / Math.max(...Object.values(stats.callers).map(x => x.total), 1)) * 100)}%`,
                    }} />
                  </div>
                </div>
              ))}
              {!Object.keys(stats.callers).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No calls logged yet.</p>}
            </div>
            <div style={{ ...card, gridColumn: "1 / -1" }}>
              <SH title="Areas of Interest" icon={Star} />
              <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                {Object.entries(stats.areas).map(([k, v]) => {
                  const label = AREAS.find(a => a.value === k)?.label || k;
                  return <Bar key={k} label={label} value={v} max={maxA} color={C.greenMid} />;
                })}
                {!Object.keys(stats.areas).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No area data yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: PASTORAL TEAM — FEEDBACK VIEWS & REPORT                      ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: SOUL CARE — VISITATION MANAGEMENT                                ║
// ║  Includes: MemberPicker, SoulCareForm, SoulCareQueue,                     ║
// ║            MySoulCareVisits, VisitationTab, DetailBlock                   ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function MemberPicker({ onSelect, onAddNew }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true); setSearched(true);
    try {
      const enc = encodeURIComponent(query.trim().toLowerCase());
      const data = await sb(
        `first_timers?or=(full_name.ilike.*${enc}*,phone.ilike.*${enc}*)&order=created_at.desc&limit=15`
      );
      setResults(data || []);
    } catch (e) { setResults([]); }
    setLoading(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <SH title="Find Existing Member" icon={Search} />
      <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
        Search by name or phone to auto-populate member details. If the person isn't in the system yet, add them as new.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Name or phone number…"
            style={{ ...inputBase, paddingLeft: 32 }} />
        </div>
        <button style={btn("primary")} onClick={search} disabled={loading}>
          {loading ? "…" : <><Search size={13} />Search</>}
        </button>
        <button style={btn("soul")} onClick={onAddNew}>
          <UserPlus size={13} />Add New
        </button>
      </div>
      {searched && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", boxShadow: SHADOW.xs }}>
          {results.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
              No members found.{" "}
              <button onClick={onAddNew}
                style={{ ...btn("soul", { padding: "4px 12px", fontSize: 12 }), marginLeft: 8 }}>
                <UserPlus size={11} />Add as New Member
              </button>
            </div>
          ) : results.map(r => (
            <button key={r.id} onClick={() => onSelect(r)}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "11px 14px", border: "none", borderBottom: `1px solid ${C.border}`,
                background: C.surface, cursor: "pointer", textAlign: "left", transition: "background .1s",
              }}
              onMouseOver={e => e.currentTarget.style.background = C.greenXLight}
              onMouseOut={e => e.currentTarget.style.background = C.surface}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", background: C.soulLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, color: C.soul, fontSize: 14, fontFamily: F.head, flexShrink: 0,
              }}>
                {r.full_name?.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head }}>{r.full_name}</div>
                <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.gender} · {r.membership_decision}</div>
              </div>
              <ChevronRight size={14} color={C.textMuted} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const BLANK_VISIT = {
  first_timer_id: null,
  member_name: "", phone: "", email: "", gender: "", house_address: "",
  nearest_landmark: "", marital_status: "", life_stage: "",
  visit_type: "", reason_for_care: "", assigned_to: "", urgency: "",
  visit_status: "", visit_date: "", visit_time: "",
  meeting_notes: "", material_support: false, material_support_notes: "",
  prayer_requests: "", testimony: "",
  follow_up_required: false, next_follow_up_date: "",
  escalate_to_pastorate: false, escalation_reason: "",
  visit_photo_url: "",
};

function SoulCareForm({ editData, onSuccess, onCancel, defaultAssignee = "" }) {
  const [step, setStep] = useState(editData ? "form" : "picker");
  const [form, setForm] = useState(() => editData ? { ...BLANK_VISIT, ...editData } : {
    ...BLANK_VISIT,
    assigned_to: defaultAssignee,
    visit_date: new Date().toISOString().slice(0, 10),
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [isNewMember, setIsNewMember] = useState(false);

  const { options: soulCareOptions, loading: scLoading } = useRoleUsers("soulcare");

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

  const handleMemberSelect = (member) => {
    setForm(f => ({
      ...f,
      first_timer_id:  member.id,
      member_name:     member.full_name,
      phone:           member.phone,
      email:           member.email || "",
      gender:          member.gender || "",
      house_address:   member.house_address || "",
      nearest_landmark:member.nearest_landmark || "",
      marital_status:  member.marital_status || "",
      life_stage:      member.life_stage || "",
    }));
    setIsNewMember(false);
    setStep("form");
  };

  const handleAddNew = () => {
    setIsNewMember(true);
    setForm(f => ({ ...f, first_timer_id: null }));
    setStep("form");
  };

  const submit = async () => {
    if (!form.member_name.trim() || !form.phone.trim()) {
      setErr("Member name and phone are required."); return;
    }
    if (!form.visit_type) { setErr("Visit type is required."); return; }
    if (!form.assigned_to.trim()) { setErr("Assigned team member is required."); return; }
    if (!form.visit_status) { setErr("Visit status is required."); return; }
    setLoading(true); setErr("");
    try {
      const n = (v) => (v === "" || v === undefined || v === null) ? null : v;
      let ftId = form.first_timer_id;

      if (isNewMember && !ftId) {
        const today = new Date().toISOString().slice(0, 10);
        const newMember = await sb("first_timers", {
          method: "POST",
          body: JSON.stringify({
            full_name:           form.member_name.trim(),
            phone:               form.phone.trim(),
            email:               n(form.email),
            gender:              n(form.gender),
            house_address:       n(form.house_address),
            nearest_landmark:    n(form.nearest_landmark),
            marital_status:      n(form.marital_status),
            life_stage:          n(form.life_stage),
            membership_decision: "Member",
            service_date:        today,
            areas_of_interest:   "[]",
          }),
        });
        ftId = Array.isArray(newMember) ? newMember[0]?.id : newMember?.id;
      }

      const payload = {
        first_timer_id:        ftId || null,
        member_name:           form.member_name.trim(),
        phone:                 form.phone.trim(),
        email:                 n(form.email),
        gender:                n(form.gender),
        house_address:         n(form.house_address),
        nearest_landmark:      n(form.nearest_landmark),
        marital_status:        n(form.marital_status),
        life_stage:            n(form.life_stage),
        visit_type:            n(form.visit_type),
        reason_for_care:       n(form.reason_for_care),
        assigned_to:           form.assigned_to.trim(),
        urgency:               n(form.urgency),
        visit_status:          n(form.visit_status),
        visit_date:            n(form.visit_date),
        visit_time:            n(form.visit_time),
        meeting_notes:         n(form.meeting_notes),
        material_support:      !!form.material_support,
        material_support_notes:form.material_support ? n(form.material_support_notes) : null,
        prayer_requests:       n(form.prayer_requests),
        testimony:             n(form.testimony),
        follow_up_required:    !!form.follow_up_required,
        next_follow_up_date:   form.follow_up_required ? n(form.next_follow_up_date) : null,
        escalate_to_pastorate: !!form.escalate_to_pastorate,
        escalation_reason:     form.escalate_to_pastorate ? n(form.escalation_reason) : null,
        visit_photo_url:       n(form.visit_photo_url),
      };

      if (editData?.id) {
        await sb(`soul_care_visits?id=eq.${editData.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("soul_care_visits", { method: "POST", body: JSON.stringify(payload) });
      }
      onSuccess();
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };

  if (step === "picker") {
    return (
      <div style={card} className="page-enter">
        <PageHeader title="New Visitation Record"
          subtitle="Start by finding the member in the system, or add them as new"
          action={onCancel && (
            <button style={btn("ghost")} onClick={onCancel}><ArrowLeft size={14} />Back</button>
          )} />
        <MemberPicker onSelect={handleMemberSelect} onAddNew={handleAddNew} />
      </div>
    );
  }

  const urgencyColors = { High: C.danger, Medium: C.amber, Low: C.green };
  const uc = urgencyColors[form.urgency] || C.textMuted;
  const showAssignedDropdown = !scLoading && soulCareOptions.length > 0;

  return (
    <div style={card} className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, flexWrap: "wrap", gap: 10,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontFamily: F.head, fontWeight: 800 }}>
            {editData ? "Edit Visit" : "New Visitation Record"}
          </h2>
          {form.member_name && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={badge(C.soul, C.soulLight, { fontSize: 12 })}>
                <Heart size={10} />{form.member_name}
              </span>
              {!editData && (
                <button onClick={() => setStep("picker")}
                  style={{
                    fontSize: 11, color: C.textMuted, background: "none", border: "none",
                    cursor: "pointer", textDecoration: "underline",
                  }}>change member</button>
              )}
            </div>
          )}
        </div>
        {onCancel && <button style={btn("ghost")} onClick={onCancel}><ArrowLeft size={14} />Back</button>}
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {/* A. Member Information */}
      <div style={{ marginBottom: 24 }}>
        <SH title="A. Member Information" icon={Users} />
        <div style={{
          padding: "12px 14px", background: C.greenXLight, borderRadius: 8, marginBottom: 16,
          fontSize: 13, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6,
        }}>
          <Info size={13} color={C.green} />
          {form.first_timer_id
            ? "Member details auto-populated from First-Timers registry."
            : isNewMember
              ? "This member will be added to the First-Timers registry automatically on save."
              : "Enter member details manually."}
        </div>
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Full Name" id="mn" required value={form.member_name} onChange={set("member_name")}
            disabled={!!form.first_timer_id} placeholder="e.g. Chukwudi Osei" />
          <FieldInput label="Phone Number" id="mp" required value={form.phone} onChange={set("phone")}
            disabled={!!form.first_timer_id} placeholder="+234 xxx xxx xxxx" />
        </div>
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Email Address" id="me" type="email" value={form.email} onChange={set("email")}
            disabled={!!form.first_timer_id} placeholder="you@example.com" />
          <FieldInput label="Gender" id="mg" type="select" value={form.gender} onChange={set("gender")}
            disabled={!!form.first_timer_id}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
        </div>
        <FieldInput label="Residential Address" id="mha" value={form.house_address} onChange={set("house_address")}
          disabled={!!form.first_timer_id} placeholder="Street, City" />
        <FieldInput label="Nearest Landmark" id="mnl" value={form.nearest_landmark} onChange={set("nearest_landmark")}
          disabled={!!form.first_timer_id} placeholder="e.g. Near Total Filling Station" />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Marital Status" id="mms" type="select" value={form.marital_status} onChange={set("marital_status")}
            disabled={!!form.first_timer_id}
            options={[{ value: "Single", label: "Single" }, { value: "Married", label: "Married" }]} />
          <FieldInput label="Life Stage" id="mls" type="select" value={form.life_stage} onChange={set("life_stage")}
            disabled={!!form.first_timer_id}
            options={[
              { value: "Student", label: "Student" }, { value: "Employee", label: "Employee" },
              { value: "Business Owner", label: "Business Owner" },
            ]} />
        </div>
      </div>

      {/* B. Visitation Details */}
      <div style={{ marginBottom: 24 }}>
        <SH title="B. Visitation Details" icon={MapPin} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Type of Visit" id="vt" type="select" required value={form.visit_type} onChange={set("visit_type")}
            options={[
              { value: "Home (Periodic)", label: "Home (Periodic)" },
              { value: "Celebration", label: "Celebration (New Born, Wedding, House Warming…)" },
              { value: "Pastoral Care", label: "Pastoral Care" },
              { value: "Welfare Check", label: "Welfare Check" },
            ]} />
          <FieldInput label="Urgency Level" id="ul" type="select" value={form.urgency} onChange={set("urgency")}
            options={[
              { value: "High", label: "High" }, { value: "Medium", label: "Medium" }, { value: "Low", label: "Low" },
            ]} />
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

        {scLoading ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary, marginBottom: 5 }}>
              Assigned To <span style={{ color: C.danger }}>*</span>
            </div>
            <div style={{
              ...inputBase, color: C.textMuted, display: "flex", alignItems: "center", gap: 8,
            }}>
              <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} />
              Loading Soul Care team…
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : showAssignedDropdown ? (
          <FieldInput
            label="Assigned To"
            id="at"
            type="select"
            required
            value={form.assigned_to}
            onChange={set("assigned_to")}
            options={soulCareOptions}
            hint="Select the Soul Care team member responsible for this visit"
          />
        ) : (
          <FieldInput
            label="Assigned To"
            id="at"
            required
            value={form.assigned_to}
            onChange={set("assigned_to")}
            placeholder="Name of Soul Care team member responsible"
          />
        )}
      </div>

      {/* C. Feedback & Outcome */}
      <div style={{ marginBottom: 24 }}>
        <SH title="C. Feedback & Outcome" icon={MessageSquare} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Visit Status" id="vs" type="select" required value={form.visit_status} onChange={set("visit_status")}
            options={[
              { value: "Scheduled", label: "Scheduled" },
              { value: "Completed", label: "Completed" },
              { value: "Rescheduled", label: "Rescheduled" },
              { value: "Member Unavailable", label: "Member Unavailable" },
            ]} />
          <FieldInput label="Date Conducted" id="vd" type="date" value={form.visit_date} onChange={set("visit_date")} />
        </div>
        <FieldInput label="Time Conducted" id="vtime" type="time" value={form.visit_time} onChange={set("visit_time")} />
        <FieldInput label="Meeting Notes" id="mn2" type="textarea" value={form.meeting_notes} onChange={set("meeting_notes")}
          placeholder="Detailed spiritual and physical observations from the visit…" />

        <div style={{
          background: C.soulLight, border: `1px solid ${C.soul}22`,
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <div style={{
            fontWeight: 700, fontSize: 12, color: C.soul, marginBottom: 12,
            display: "flex", alignItems: "center", gap: 5, fontFamily: F.head,
            textTransform: "uppercase", letterSpacing: ".06em",
          }}>
            <Camera size={12} />Visit Photo
          </div>
          <PhotoUpload
            value={form.visit_photo_url}
            onChange={set("visit_photo_url")}
            existingUrl={editData?.visit_photo_url || ""}
          />
        </div>

        <div style={{
          background: C.soulLight, border: `1px solid ${C.soul}22`, borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <FieldInput label="Material Support Provided" id="msp" type="bool-toggle"
            value={form.material_support} onChange={set("material_support")}
            hint="Toggle if the church provided physical aid (groceries, financial welfare, medical package, etc.)" />
          {form.material_support && (
            <FieldInput label="Support Details" id="msn" type="textarea"
              value={form.material_support_notes} onChange={set("material_support_notes")}
              placeholder="Describe what was provided…" />
          )}
        </div>

        <FieldInput label="Prayer Requests" id="pr" type="textarea" value={form.prayer_requests} onChange={set("prayer_requests")}
          placeholder="Specific items the member asked the church to stand in agreement with them for…" />
        <FieldInput label="Testimony" id="test" type="textarea" value={form.testimony} onChange={set("testimony")}
          placeholder="A brief summary of their testimonies since joining The Envoys…" />
      </div>

      {/* D. Next Steps */}
      <div style={{ marginBottom: 24 }}>
        <SH title="D. Next Steps & Post-Visit Action" icon={Calendar} />
        <div className="g2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div>
            <FieldInput label="Follow-Up Required" id="fur" type="bool-toggle"
              value={form.follow_up_required} onChange={set("follow_up_required")} />
            {form.follow_up_required && (
              <FieldInput label="Next Follow-Up Date" id="nfud" type="date"
                value={form.next_follow_up_date} onChange={set("next_follow_up_date")} />
            )}
          </div>
          <div>
            <div style={{
              background: C.flagLight, border: `1px solid #FECACA`, borderRadius: 10, padding: 14,
            }}>
              <div style={{
                fontWeight: 700, fontSize: 12, color: C.flag, marginBottom: 10,
                display: "flex", alignItems: "center", gap: 5, fontFamily: F.head,
              }}>
                <Flag size={12} />Escalation
              </div>
              <FieldInput label="Escalate to Pastorate" id="etp" type="toggle"
                value={form.escalate_to_pastorate} onChange={set("escalate_to_pastorate")}
                hint="Notify the Pastoral Team about this case" />
              {form.escalate_to_pastorate && (
                <FieldInput label="Reason for Escalation" id="er2" type="textarea" required
                  value={form.escalation_reason} onChange={set("escalation_reason")}
                  placeholder="Describe the concern requiring pastoral escalation…" />
              )}
            </div>
          </div>
        </div>
      </div>

      <button style={{ ...btn("soul"), width: "100%", padding: 13, fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading ? "Saving…" : editData ? "Update Visit Record" : "Save Visitation Record"}
      </button>
    </div>
  );
}

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

function SoulCareQueue({ onEdit, onAdd, currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const rows = await sb("soul_care_visits?order=created_at.desc&limit=300");
      setData(rows || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const completedMonth = data.filter(r => r.visit_status === "Completed" && r.visit_date >= monthStart).length;
  const highPriority = data.filter(r => r.urgency === "High" && r.visit_status !== "Completed").length;
  const escalated = data.filter(r => r.escalate_to_pastorate).length;

  const filtered = data.filter(r => {
    const matchFilter = filter === "all" || r.visit_status === filter || r.urgency === filter;
    const matchSearch = !search ||
      r.member_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.assigned_to?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const statusTabs = [
    { k: "all",       label: "All",          count: data.length,                                         },
    { k: "Scheduled", label: "Scheduled",     count: data.filter(r => r.visit_status === "Scheduled").length,  col: C.blue  },
    { k: "Completed", label: "Completed",     count: data.filter(r => r.visit_status === "Completed").length,  col: C.green },
    { k: "Rescheduled",label: "Rescheduled",  count: data.filter(r => r.visit_status === "Rescheduled").length,col: C.amber },
    { k: "High",      label: "High Urgency",  count: highPriority,                                        col: C.danger },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Visit Queue" subtitle="Track Soul Care team visitations"
        action={<button style={btn("soul")} onClick={onAdd}><UserPlus size={14} />Add Visit</button>} />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Visits"          value={data.length}      icon={MapPin}      accent={C.soul}   />
        <StatCard label="Completed This Month"   value={completedMonth}   icon={CheckCircle} accent={C.green}  />
        <StatCard label="High Priority / Open"   value={highPriority}     icon={AlertCircle} accent={C.danger} />
        <StatCard label="Escalated to Pastorate" value={escalated}        icon={Flag}        accent={C.flag}   />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {statusTabs.map(t => (
          <button key={t.k} onClick={() => setFilter(t.k)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: F.body, transition: "all .15s",
              background: filter === t.k ? (t.col || C.soul) : C.bg,
              color: filter === t.k ? "#fff" : C.textSecondary,
              border: `1.5px solid ${filter === t.k ? (t.col || C.soul) : C.border}`,
            }}>
            {t.label} ({t.count})
          </button>
        ))}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            style={{ ...inputBase, width: 160, paddingLeft: 30 }} />
        </div>
        <button style={btn("ghost", { padding: "6px 10px" })} onClick={load}><RefreshCw size={13} /></button>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const sm = VISIT_STATUS_META[r.visit_status] || { color: C.textMuted, bg: C.bg };
            const um = URGENCY_META[r.urgency] || {};
            return (
              <div key={r.id} style={{
                ...card, padding: "12px 16px",
                borderLeft: `3px solid ${r.escalate_to_pastorate ? C.flag : r.urgency === "High" ? C.danger : sm.color}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    {r.visit_photo_url ? (
                      <img src={r.visit_photo_url} alt="Visit"
                        style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          objectFit: "cover", border: `2px solid ${C.soul}40`,
                        }} />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: C.soulLight, display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head,
                      }}>
                        {r.member_name?.charAt(0)}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.member_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.visit_type}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <UserCheck size={10} />Assigned to <strong>{r.assigned_to}</strong>
                        {r.visit_date && <> · <Calendar size={10} />{r.visit_date}</>}
                      </div>
                      {r.prayer_requests && (
                        <div style={{ fontSize: 11, color: C.soul, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                          <Heart size={10} />Prayer request on file
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap", flexShrink: 0 }}>
                    {r.urgency && <span style={badge(um.color || C.textMuted, um.bg || C.bg, { fontSize: 11 })}><Zap size={9} />{r.urgency}</span>}
                    {r.escalate_to_pastorate && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={9} />Escalated</span>}
                    {r.material_support && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}>Aid Given</span>}
                    {r.visit_photo_url && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}><Camera size={9} />Photo</span>}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{r.visit_status}</span>
                    <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={() => onEdit(r)}>
                      <Edit3 size={12} />Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Heart size={28} color={C.soul} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontFamily: F.head }}>No visits found</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <button style={{ ...btn("soul", { padding: "7px 14px", fontSize: 13 }), marginTop: 12 }} onClick={onAdd}>
                  <UserPlus size={13} />Add First Visit
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MySoulCareVisits({ onEdit, onAdd, currentUser }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await sb("soul_care_visits?order=created_at.desc&limit=300");
        const mine = (rows || []).filter(r =>
          r.assigned_to?.toLowerCase() === currentUser?.toLowerCase()
        );
        setData(mine);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, [currentUser]);

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="My Visits"
        subtitle={`${data.length} visit${data.length !== 1 ? "s" : ""} assigned to you`}
        action={<button style={btn("soul")} onClick={onAdd}><UserPlus size={14} />Log New Visit</button>} />
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {data.map(r => {
            const sm = VISIT_STATUS_META[r.visit_status] || { color: C.textMuted, bg: C.bg };
            const um = URGENCY_META[r.urgency] || {};
            return (
              <div key={r.id} style={{ ...card, padding: "12px 16px", borderLeft: `3px solid ${sm.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    {r.visit_photo_url ? (
                      <img src={r.visit_photo_url} alt="Visit"
                        style={{
                          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                          objectFit: "cover", border: `2px solid ${C.soul}40`,
                        }} />
                    ) : (
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: C.soulLight, display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head,
                      }}>
                        {r.member_name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.member_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.visit_type}</div>
                      {r.visit_date && (
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <Calendar size={10} />{r.visit_date}
                        </div>
                      )}
                      {r.follow_up_required && r.next_follow_up_date && (
                        <div style={{ fontSize: 11, color: C.amber, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                          <Bell size={10} />Follow-up: {r.next_follow_up_date}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {r.urgency && <span style={badge(um.color || C.textMuted, um.bg || C.bg, { fontSize: 11 })}><Zap size={9} />{r.urgency}</span>}
                    {r.visit_photo_url && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}><Camera size={9} />Photo</span>}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{r.visit_status}</span>
                    <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={() => onEdit(r)}>
                      <Edit3 size={12} />Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
            <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
              <Heart size={28} color={C.soul} style={{ marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontFamily: F.head }}>No visits assigned to you yet</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VisitationTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      let q = "soul_care_visits?order=created_at.desc&limit=500";
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
  const highPriority = data.filter(r => r.urgency === "High" && r.visit_status !== "Completed").length;
  const escalated = data.filter(r => r.escalate_to_pastorate).length;

  const filtered = data.filter(r => !statusFilter || r.visit_status === statusFilter);

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Visitation Records"
        subtitle="Soul Care team visits — pastoral oversight view"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, width: 140 }} />
            <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ ...inputBase, width: 140 }} />
            <button style={btn("primary")} onClick={load}><Filter size={14} />Filter</button>
          </div>
        } />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Assigned Visits"  value={data.length}    icon={MapPin}      accent={C.soul}   />
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
                padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: F.body, transition: "all .15s",
                background: statusFilter === s ? (sm.color || C.soul) : C.bg,
                color: statusFilter === s ? "#fff" : C.textSecondary,
                border: `1.5px solid ${statusFilter === s ? (sm.color || C.soul) : C.border}`,
              }}>
              {s || "All"} {s
                ? `(${data.filter(r => r.visit_status === s).length})`
                : `(${data.length})`}
            </button>
          );
        })}
      </div>

      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const sm = VISIT_STATUS_META[r.visit_status] || { color: C.textMuted, bg: C.bg };
            const um = URGENCY_META[r.urgency] || {};
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{
                ...card, padding: 0, overflow: "hidden",
                borderLeft: `3px solid ${r.escalate_to_pastorate ? C.flag : sm.color}`,
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", flexWrap: "wrap",
                  gap: 10, padding: "12px 16px", cursor: "pointer",
                }}
                  onClick={() => setExpanded(isOpen ? null : r.id)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                    {r.visit_photo_url ? (
                      <img src={r.visit_photo_url} alt="Visit"
                        style={{
                          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                          objectFit: "cover", border: `2px solid ${C.soul}40`,
                        }} />
                    ) : (
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: C.soulLight, display: "flex", alignItems: "center",
                        justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head,
                      }}>
                        {r.member_name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.member_name}</div>
                      <div style={{ fontSize: 12, color: C.textMuted }}>
                        {r.phone} · {r.visit_type}
                        {r.visit_date && <> · <Calendar size={10} style={{ verticalAlign: "middle" }} /> {r.visit_date}</>}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        Assigned to <strong>{r.assigned_to}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                    {r.urgency && <span style={badge(um.color || C.textMuted, um.bg || C.bg, { fontSize: 11 })}>{r.urgency}</span>}
                    {r.escalate_to_pastorate && <span style={badge(C.flag, C.flagLight, { fontSize: 11 })}><Flag size={9} />Escalated</span>}
                    {r.material_support && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}>Aid Given</span>}
                    {r.visit_photo_url && <span style={badge(C.soul, C.soulLight, { fontSize: 11 })}><Camera size={9} />Photo</span>}
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{r.visit_status}</span>
                    <ChevronDown size={14} color={C.textMuted}
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}`, marginTop: -4 }}>
                    {r.visit_photo_url && (
                      <div style={{ marginTop: 14, marginBottom: 14 }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: C.soul, marginBottom: 8,
                          display: "flex", alignItems: "center", gap: 4,
                          fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em",
                        }}>
                          <Camera size={11} />Visit Photo
                        </div>
                        <img src={r.visit_photo_url} alt="Visit photo"
                          style={{
                            width: "100%", maxWidth: 360, height: 220, objectFit: "cover",
                            borderRadius: 10, border: `1.5px solid ${C.border}`, display: "block",
                            cursor: "pointer",
                          }}
                          onClick={() => window.open(r.visit_photo_url, "_blank")}
                          title="Click to open full image"
                        />
                        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                          Click image to open full size
                        </div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }} className="g2">
                      {r.reason_for_care        && <DetailBlock icon={Info}     label="Reason for Care"   value={r.reason_for_care} />}
                      {r.meeting_notes          && <DetailBlock icon={FileText} label="Meeting Notes"     value={r.meeting_notes} />}
                      {r.prayer_requests        && <DetailBlock icon={Heart}    label="Prayer Requests"   value={r.prayer_requests}        color={C.soul} />}
                      {r.testimony              && <DetailBlock icon={Star}     label="Testimony"         value={r.testimony}              color={C.goldDark} />}
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
              <div style={{ fontWeight: 700, fontFamily: F.head }}>
                No visitation records{dateFrom || dateTo ? " in this date range" : ""}
              </div>
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
      <div style={{
        fontSize: 11, fontWeight: 700, color: color || C.textMuted,
        marginBottom: 4, display: "flex", alignItems: "center", gap: 4,
        fontFamily: F.head, textTransform: "uppercase", letterSpacing: ".06em",
      }}>
        {Icon && <Icon size={11} />}{label}
      </div>
      <div style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: SOUL CARE — VISITATION MANAGEMENT                            ║
// ╚═════════════════════════════════════════════════════════════════════════════╝


// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  MODULE: RESEARCH TEAM — SERVICE FEEDBACK VIEWER                          ║
// ║  Includes: ResearchFeedback                                                ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

function ResearchFeedback() {
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
          "first_timers?select=id,full_name,service_feedback,service_date&order=service_date.desc&limit=1000"
        );
        setRows((data || []).filter(r => r.service_feedback && r.service_feedback.trim() !== ""));
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.full_name?.toLowerCase().includes(q) &&
        !r.service_feedback?.toLowerCase().includes(q)
      ) return false;
    }
    if (dateFrom && r.service_date < dateFrom) return false;
    if (dateTo   && r.service_date > dateTo)   return false;
    return true;
  });

  const allFilteredIds  = filtered.map(r => r.id);
  const allSelected     = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const someSelected    = allFilteredIds.some(id => selected.has(id));

  const toggleRow = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        allFilteredIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const clearDates = () => { setDateFrom(""); setDateTo(""); };

  const downloadCSV = () => {
    const toExport = filtered.filter(r => selected.has(r.id));
    if (toExport.length === 0) return;

    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const str = String(v).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str}"`
        : str;
    };

    const header = ["Name", "Service Date", "Service Feedback"];
    const csvRows = [
      header.join(","),
      ...toExport.map(r => [
        escape(r.full_name),
        escape(r.service_date),
        escape(r.service_feedback),
      ].join(",")),
    ];

    const blob = new Blob([csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const dateLabel = dateFrom || dateTo
      ? `_${dateFrom || "start"}_to_${dateTo || "end"}`
      : `_${new Date().toISOString().slice(0, 10)}`;
    a.href     = url;
    a.download = `envoys_service_feedback${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedCount = filtered.filter(r => selected.has(r.id)).length;

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}

      <PageHeader
        title="Service Feedback"
        subtitle="Envoys VIPs' service feedback"
        action={
          <button
            style={{
              ...btn("primary"),
              background: selectedCount > 0 ? C.research : C.border,
              color: selectedCount > 0 ? "#fff" : C.textMuted,
              cursor: selectedCount > 0 ? "pointer" : "not-allowed",
              border: "none",
            }}
            onClick={downloadCSV}
            disabled={selectedCount === 0}>
            <Download size={14} />
            Download Feedback{selectedCount > 0 ? ` (${selectedCount})` : ""}
          </button>
        }
      />

      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Responses"   value={rows.length}     icon={FileText}   accent={C.research} />
        <StatCard label="Matching Filter"   value={filtered.length} icon={Filter}     accent={C.green}    />
        <StatCard label="Selected"          value={selectedCount}   icon={Download}   accent={selectedCount > 0 ? C.research : C.textMuted}
          sub={selectedCount > 0 ? "Ready to download" : "Select rows below"} />
      </div>

      <div style={{
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        marginBottom: 16, padding: "12px 16px",
        background: C.researchLight, borderRadius: 10, border: `1px solid ${C.researchBorder}`,
      }}>
        <Calendar size={14} color={C.research} style={{ flexShrink: 0 }} />
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
              <X size={12} />Clear
            </button>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or feedback…"
            style={{ ...inputBase, width: 200, paddingLeft: 30 }} />
        </div>
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      {selectedCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", marginBottom: 12,
          background: `${C.research}12`, borderRadius: 8,
          border: `1px solid ${C.research}30`,
          fontSize: 13, color: C.research, fontWeight: 600,
          flexWrap: "wrap", gap: 10,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle size={14} />
            {selectedCount} response{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <button style={{ ...btn("primary", { padding: "6px 14px", fontSize: 12 }), background: C.research }}
            onClick={downloadCSV}>
            <Download size={13} />Download CSV
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: C.textMuted }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>
          <FileText size={32} style={{ marginBottom: 10, opacity: .4 }} />
          <div style={{ fontWeight: 700, fontFamily: F.head }}>
            {rows.length === 0
              ? "No service feedback responses yet."
              : "No responses match your filters."}
          </div>
          {rows.length > 0 && (
            <button style={{ ...btn("ghost", { marginTop: 12 }) }} onClick={clearDates}>
              Clear date filter
            </button>
          )}
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 120px 1fr",
            padding: "10px 16px",
            background: C.bg,
            borderBottom: `1px solid ${C.border}`,
            gap: 12,
            alignItems: "center",
          }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                onClick={toggleAll}
                title={allSelected ? "Deselect all" : "Select all visible"}
                style={{
                  width: 18, height: 18, borderRadius: 4, cursor: "pointer", flexShrink: 0,
                  border: `2px solid ${someSelected ? C.research : C.border}`,
                  background: allSelected ? C.research : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all .15s",
                }}>
                {allSelected && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                {!allSelected && someSelected && (
                  <div style={{ width: 8, height: 2, background: C.research, borderRadius: 1 }} />
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>
              Respondent
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>
              Service Date
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".07em", fontFamily: F.head }}>
              Feedback
            </div>
          </div>

          {/* Table rows */}
          {filtered.map((r, i) => {
            const isChecked = selected.has(r.id);
            return (
              <div
                key={r.id}
                onClick={() => toggleRow(r.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr 120px 1fr",
                  padding: "12px 16px",
                  gap: 12,
                  alignItems: "flex-start",
                  borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.research}08` : C.surface,
                  cursor: "pointer",
                  transition: "background .12s",
                }}
                onMouseOver={e => { if (!isChecked) e.currentTarget.style.background = C.greenXLight; }}
                onMouseOut={e => { e.currentTarget.style.background = isChecked ? `${C.research}08` : C.surface; }}>

                <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${isChecked ? C.research : C.border}`,
                    background: isChecked ? C.research : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .15s",
                  }}>
                    {isChecked && <CheckCircle size={11} color="#fff" strokeWidth={3} />}
                  </div>
                </div>

                <div>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", background: C.researchLight,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: C.research, fontSize: 13, fontFamily: F.head,
                    marginBottom: 4, border: `1.5px solid ${C.researchBorder}`,
                  }}>
                    {r.full_name?.charAt(0) || "?"}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, fontFamily: F.head, color: C.textPrimary }}>
                    {r.full_name}
                  </div>
                </div>

                <div style={{ fontSize: 13, color: C.textSecondary, paddingTop: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Calendar size={11} color={C.textMuted} />
                    {r.service_date}
                  </div>
                </div>

                <div style={{
                  fontSize: 13, color: C.textSecondary, lineHeight: 1.6, paddingTop: 4,
                  wordBreak: "break-word",
                }}>
                  {r.service_feedback}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{
          marginTop: 12, fontSize: 12, color: C.textMuted, textAlign: "right",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <span>
            Showing <strong>{filtered.length}</strong> of <strong>{rows.length}</strong> response{rows.length !== 1 ? "s" : ""}
            {(dateFrom || dateTo) && " in date range"}
          </span>
          {selectedCount === 0 && filtered.length > 0 && (
            <span style={{ color: C.research, fontWeight: 600 }}>
              ☝ Click rows to select, then download as CSV
            </span>
          )}
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

function AdminOverview({ setActive }) {
  const [counts, setCounts] = useState({ ft: 0, fb: 0, flagged: 0, users: 0, visits: 0 });
  useEffect(() => {
    (async () => {
      try {
        const [ft, fb, fl, us, vis] = await Promise.all([
          sb("first_timers?select=id"),
          sb("call_feedback?select=id"),
          sb("call_feedback?flagged_for_pastoral=eq.true&select=id"),
          sb("app_users?select=id"),
          sb("soul_care_visits?select=id").catch(() => []),
        ]);
        setCounts({
          ft: (ft||[]).length, fb: (fb||[]).length, flagged: (fl||[]).length,
          users: (us||[]).length, visits: (vis||[]).length,
        });
      } catch {}
    })();
  }, []);

  return (
    <div className="page-enter">
      <PageHeader title="Admin Overview" subtitle="System-wide summary" />
      <div className="g4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
        <StatCard label="First-Timers"  value={counts.ft}      icon={Users}   accent={C.green}   />
        <StatCard label="Calls Logged"  value={counts.fb}      icon={Phone}   accent={C.greenMid}/>
        <StatCard label="Flagged"       value={counts.flagged}  icon={Flag}    accent={C.flag}    />
        <StatCard label="System Users"  value={counts.users}   icon={Shield}  accent={C.goldDark}/>
      </div>
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
      load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="page-enter">
      <PageHeader title="System Users" subtitle={`${users.length} accounts`}
        action={<button style={btn("ghost")} onClick={load}><RefreshCw size={14} /></button>} />
      <Alert type="error"   msg={err} onClose={() => setErr("")} />
      <Alert type="success" msg={msg} onClose={() => setMsg("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {users.map(u => {
            const rm = ROLE_META[u.role] || ROLE_META.dofficer;
            return (
              <div key={u.id} style={{
                ...card, display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "12px 16px",
                opacity: u.is_active ? 1 : .55,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: C.greenLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: C.green, fontSize: 15, fontFamily: F.head, flexShrink: 0,
                  }}>
                    {(u.display_name || u.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>@{u.username}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={badge(rm.color, rm.bg)}>{rm.label}</span>
                  {!u.is_active && <span style={badge(C.danger, C.dangerLight)}>Inactive</span>}
                  <button style={btn("ghost", { padding: "6px 12px", fontSize: 12 })} onClick={() => onEdit(u)}>
                    <Edit3 size={12} />Edit
                  </button>
                  <button
                    style={btn(u.is_active ? "danger" : "ghost", { padding: "6px 12px", fontSize: 12 })}
                    onClick={() => toggleActive(u)}>
                    {u.is_active ? "Deactivate" : "Reactivate"}
                  </button>
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
    setLoading(true); setErr("");
    try {
      const payload = {
        username:     form.username.trim().toLowerCase(),
        display_name: form.display_name.trim() || form.username.trim(),
        role:         form.role,
        is_active:    form.is_active,
        ...(form.password.trim() ? { password_hash: form.password.trim() } : {}),
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
          { value: "dofficer",  label: "Data Officer"    },
          { value: "expteam",   label: "Experience Team" },
          { value: "pasteam",   label: "Pastoral Team"   },
          { value: "soulcare",  label: "Soul Care"       },
          { value: "research",  label: "Research Team"   },
          { value: "admin",     label: "Admin"           },
          { value: "experienceadmin", label: "Experience Admin" },
        ]} />
      <div style={{
        background: C.greenXLight, borderRadius: 8, padding: "12px 14px", marginBottom: 16,
        fontSize: 13, color: C.textSecondary, lineHeight: 1.8,
      }}>
        <strong style={{ color: C.green }}>Role permissions:</strong><br />
        <strong>Data Officer</strong> — Add/edit first-timer records, generate QR code<br />
        <strong>Experience Team</strong> — My Calls, call queue, log feedback, flag for pastoral<br />
        <strong>Pastoral Team</strong> — Report, all feedback (with date filter), flagged records, visitation view<br />
        <strong>Soul Care</strong> — Visitation queue, log and edit visit records<br />
        <strong>Research Team</strong> — View and download service feedback responses (CSV export)<br />
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
// ║  MODULE: AUTHENTICATION — LOGIN                                            ║
// ║  Includes: FALLBACK_ACCOUNTS constant, Login component                    ║
// ╚═════════════════════════════════════════════════════════════════════════════╝

const FALLBACK_ACCOUNTS = [
  { username: "admin",      password: "admin1",     role: "admin",    display_name: "Administrator"   },
  { username: "dofficer1",  password: "dofficer1",  role: "dofficer", display_name: "Data Officer"    },
  { username: "expteam1",   password: "expteam1",   role: "expteam",  display_name: "Experience Team" },
  { username: "pasteam1",   password: "pasteam1",   role: "pasteam",  display_name: "Pastoral Team"   },
  { username: "soulcare1",  password: "soulcare1",  role: "soulcare", display_name: "Soul Care Team"  },
  { username: "research1",  password: "research1",  role: "research", display_name: "Research Team"   },
  { username: "experienceadmin", password: "expadmin1", role: "experienceadmin", display_name: "Experience Admin" },
];

function Login({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!u.trim() || !p.trim()) { setErr("Enter your username and password."); return; }
    setLoading(true); setErr("");
    try {
      const rows = await sb(`app_users?username=eq.${u.trim().toLowerCase()}&is_active=eq.true&select=*`);
      if (rows && rows.length > 0) {
        const user = rows[0];
        if (user.password_hash === p.trim()) {
          onLogin(user.role, user.display_name || user.username);
          setLoading(false); return;
        }
        setErr("Incorrect password.");
        setLoading(false); return;
      }
    } catch { /* fall through to fallback */ }
    const match = FALLBACK_ACCOUNTS.find(a => a.username === u.trim() && a.password === p.trim());
    if (match) { onLogin(match.role, match.display_name); setLoading(false); return; }
    setErr("Invalid username or password.");
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: F.body,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem",
    }}>
      <div style={{ ...card, width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo size={68} /></div>
          <h2 style={{ margin: 0, color: C.textPrimary, fontFamily: F.head, fontWeight: 800, fontSize: 22 }}>
            The Envoys
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>Membership Retention Dashboard</p>
        </div>
        {CREDS_MISSING && <CredsBanner />}
        <Alert type="error" msg={err} onClose={() => setErr("")} />
        <FieldInput label="Username" id="lu" value={u}
          onChange={e => setU(e.target.value)} placeholder="e.g. expteam1" />
        <FieldInput label="Password" id="lp" type="password" value={p}
          onChange={e => setP(e.target.value)} placeholder="••••••••" />
        <div style={{ marginBottom: 16 }} onKeyDown={e => e.key === "Enter" && submit()} />
        <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15 }}
          onClick={submit} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
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

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [active, setActive] = useState(() => {
    const s = loadSession();
    return s ? (NAV[s.role]?.[0]?.id ?? null) : null;
  });
  const [editTarget,     setEditTarget]     = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [editUser,       setEditUser]       = useState(null);
  const [editVisit,      setEditVisit]      = useState(null);
  const [showPublic,     setShowPublic]     = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [flagCount,      setFlagCount]      = useState(0);
  const [addVisitMode,   setAddVisitMode]   = useState(false);
  const [editWeekTarget,   setEditWeekTarget]   = useState(null); // { person, week }
  const [showCompleted,    setShowCompleted]     = useState(false);
  const [editOverviewTarget, setEditOverviewTarget] = useState(null);

  useEffect(() => {
    const p = window.location.pathname;
    const h = window.location.hash;
    if (p === "/register" || p === "/register/" || h === "#register") setShowPublic(true);
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

  const login = (role, user) => {
    const s = { role, user };
    setSession(s);
    setActive(NAV[role][0].id);
    saveSession(role, user);
  };

  const logout = () => {
    clearSession();
    setSession(null);
    setActive(null);
  };

  const navTo = (v) => {
    setActive(v); setEditTarget(null); setFeedbackTarget(null);
    setEditUser(null); setEditVisit(null); setAddVisitMode(false);
    setEditWeekTarget(null); setShowCompleted(false);
    setEditOverviewTarget(null);   // ← add this
    setMobileOpen(false);
  };

  if (showPublic) return <PublicForm />;
  if (!session)   return <Login onLogin={login} />;

  const { role, user } = session;
  const pageTitle = NAV[role]?.find(n => n.id === active)?.label || "Dashboard";

  const renderContent = () => {
    if (active === "admin_overview") return <AdminOverview setActive={navTo} />;
    if (active === "admin_adduser") {
      if (editUser) return (
        <AdminAddUser editUser={editUser}
          onCancel={() => { setEditUser(null); navTo("admin_users"); }}
          onSuccess={() => { setEditUser(null); navTo("admin_users"); }} />
      );
      return <AdminAddUser onSuccess={() => navTo("admin_users")} onCancel={() => navTo("admin_overview")} />;
    }
    if (active === "admin_users") {
      if (editUser) return (
        <AdminAddUser editUser={editUser}
          onCancel={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); navTo("admin_users"); }} />
      );
      return <AdminUsers onEdit={u => setEditUser(u)} />;
    }

    if (active === "addmember")     return <FirstTimerForm onSuccess={() => navTo("firsttimers")} />;
    if (active === "qrcode")        return <QRCodePage />;
    if (active === "allfeedback")   return <AllFeedback />;
    if (active === "report")        return <Report />;
    if (active === "flagged")       return <FlaggedRecords />;
    if (active === "visitation_tab")return <VisitationTab />;
    if (active === "research_feedback") return <ResearchFeedback />;

    if (active === "firsttimers") {
      if (editTarget) return (
        <FirstTimerForm editData={editTarget}
          onCancel={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); navTo("firsttimers"); }} />
      );
      return <FirstTimersList onEdit={r => setEditTarget(r)} />;
    }

    if (active === "mycalls") {
      if (editOverviewTarget) return (
        <PipelineOverviewForm
          person={editOverviewTarget}
          callerName={user}
          onBack={() => setEditOverviewTarget(null)}
          onDone={() => { setEditOverviewTarget(null); navTo("mycalls"); }}
        />
      );
      if (editWeekTarget) return (
        <LogFeedback
          person={editWeekTarget.person}
          callerName={user}
          editWeek={editWeekTarget.week}
          onBack={() => setEditWeekTarget(null)}
        />
      );
      if (feedbackTarget) return (
        <LogFeedback
          person={feedbackTarget}
          callerName={user}
          onBack={() => setFeedbackTarget(null)}
        />
      );
      return (
        <MyCallsView
          currentUser={user}
          onLogFeedback={r => setFeedbackTarget(r)}
          onEditWeekFeedback={(person, week) => setEditWeekTarget({ person, week })}
          onEditOverview={r => setEditOverviewTarget(r)}   // ← now wired up
        />
      );
    }
    if (active === "assign_calls") return (
      <AssignCallsView
        currentUser={user}
        onViewCompleted={() => navTo("completed_pipelines")}
      />
    );

    if (active === "completed_pipelines") return (
      <CompletedPipelines onBack={() => navTo("assign_calls")} />
    );

    if (active === "callqueue") {
      if (editWeekTarget) return (
        <LogFeedback
          person={editWeekTarget.person}
          callerName={user}
          editWeek={editWeekTarget.week}
          onBack={() => setEditWeekTarget(null)}
        />
      );
      if (feedbackTarget) return (
        <LogFeedback
          person={feedbackTarget}
          callerName={user}
          onBack={() => setFeedbackTarget(null)}
        />
      );
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
      if (feedbackTarget) return (
        <LogFeedback
          person={feedbackTarget}
          callerName={user}
          onBack={() => setFeedbackTarget(null)}
        />
      );
      return (
        <CallBackQueue
          currentUser={user}
          onLogFeedback={r => setFeedbackTarget(r)}
        />
      );
    }

    if (active === "sc_queue" || active === "sc_mine") {
      if (addVisitMode) return (
        <SoulCareForm defaultAssignee={user}
          onSuccess={() => { setAddVisitMode(false); navTo(active); }}
          onCancel={() => setAddVisitMode(false)} />
      );
      if (editVisit) return (
        <SoulCareForm editData={editVisit}
          onSuccess={() => { setEditVisit(null); navTo(active); }}
          onCancel={() => setEditVisit(null)} />
      );
      if (active === "sc_queue") return (
        <SoulCareQueue currentUser={user}
          onEdit={v => setEditVisit(v)}
          onAdd={() => setAddVisitMode(true)} />
      );
      return (
        <MySoulCareVisits currentUser={user}
          onEdit={v => setEditVisit(v)}
          onAdd={() => setAddVisitMode(true)} />
      );
    }

    if (active === "sc_add") {
      if (editVisit) return (
        <SoulCareForm editData={editVisit}
          onSuccess={() => { setEditVisit(null); navTo("sc_queue"); }}
          onCancel={() => setEditVisit(null)} />
      );
      return (
        <SoulCareForm defaultAssignee={user}
          onSuccess={() => navTo("sc_queue")}
          onCancel={() => navTo("sc_queue")} />
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
      <div className="main-content" style={{ marginLeft: 224, padding: "2rem", minHeight: "100vh" }}>
        <div style={{ maxWidth: 940 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

// ╔═════════════════════════════════════════════════════════════════════════════╗
// ║  END MODULE: APP SHELL — ROOT COMPONENT & ROUTING                         ║
// ╚═════════════════════════════════════════════════════════════════════════════╝