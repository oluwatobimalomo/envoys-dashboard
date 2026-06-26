// ─────────────────────────────────────────────────────────────────────────────
// THE ENVOYS — Membership Retention Dashboard  v5
// Cabinet Grotesk (headings) · Satoshi (body) · Forest Green + Gold palette
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Home, Users, UserPlus, Phone, RefreshCw, BarChart2, MessageSquare,
  Flag, QrCode, LogOut, Menu, X, Heart, MapPin, Calendar, ChevronRight,
  AlertCircle, CheckCircle, Clock, Clipboard, Upload, Search, ArrowLeft,
  Star, TrendingUp, Activity, Shield, Eye, Edit3, UserCheck, Layers,
  FileText, Bell, Filter, Download, ChevronDown, Info, Zap,
} from "lucide-react";

// ── Global CSS ────────────────────────────────────────────────────────────────
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

// ── Supabase credentials ──────────────────────────────────────────────────────
const SUPABASE_URL      = "https://bhtbypqzukugnenyqvlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodGJ5cHF6dWt1Z25lbnlxdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTE4NjYsImV4cCI6MjA5Nzg2Nzg2Nn0.eAsuBENwgtbj_RsNpOPdNrYZkULEuJv7pnwclIM_ito";
const CREDS_MISSING = !SUPABASE_URL || SUPABASE_URL.includes("your-project-id") || SUPABASE_ANON_KEY === "your-anon-key";

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

// ── Palette ───────────────────────────────────────────────────────────────────
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

// ── Nav config ────────────────────────────────────────────────────────────────
const STATUS_META = {
  "Reached":           { label: "Reached",          color: C.green,  bg: C.greenLight  },
  "Call Back":         { label: "Call Back",         color: C.amber,  bg: C.amberLight  },
  "Incorrect Contact": { label: "Incorrect Contact", color: C.danger, bg: C.dangerLight },
};
const CALL_STATUS_OPTIONS = [
  { value: "Reached",            label: "Reached — spoke with person"   },
  { value: "Not Reached",        label: "Not Reached — no answer"       },
  { value: "Callback Requested", label: "Callback Requested by visitor" },
  { value: "Wrong Number",       label: "Wrong Number"                  },
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
  admin:    { label: "Admin",           color: C.goldDark,  bg: C.goldLight  },
  dofficer: { label: "Data Officer",    color: C.green,     bg: C.greenLight },
  expteam:  { label: "Experience Team", color: C.green,     bg: C.greenLight },
  pasteam:  { label: "Pastoral Team",   color: C.goldDark,  bg: C.goldLight  },
  soulcare: { label: "Soul Care",       color: C.soul,      bg: C.soulLight  },
};

const NAV_ICONS = {
  admin_overview: Home, admin_users: Users, admin_adduser: UserPlus,
  firsttimers: Users, addmember: UserPlus, report: BarChart2,
  allfeedback: MessageSquare, flagged: Flag, qrcode: QrCode,
  callqueue: Phone, callbacks: RefreshCw,
  sc_queue: Heart, sc_add: UserPlus, sc_mine: Clipboard,
  visitation_tab: MapPin,
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
    { id: "qrcode",        label: "QR Code"       },
  ],
  dofficer: [
    { id: "firsttimers",   label: "First-Timers"  },
    { id: "addmember",     label: "Add Record"    },
    { id: "qrcode",        label: "QR Code"       },
  ],
  expteam: [
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
};

// ── Shared style helpers ──────────────────────────────────────────────────────
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

// ── Utility ───────────────────────────────────────────────────────────────────
function parseAreas(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; }
  catch { return []; }
}

// ── FieldInput ────────────────────────────────────────────────────────────────
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

// ── Shared UI ─────────────────────────────────────────────────────────────────
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Sidebar ───────────────────────────────────────────────────────────────────
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

// ── Areas of Interest ─────────────────────────────────────────────────────────
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

// ── Section Heading ───────────────────────────────────────────────────────────
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

// ── First-Timer Form ──────────────────────────────────────────────────────────
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

// ── Public self-registration ──────────────────────────────────────────────────
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

// ── QR Code ───────────────────────────────────────────────────────────────────
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

// ── First-Timers List ─────────────────────────────────────────────────────────
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

// ── Call Queue ────────────────────────────────────────────────────────────────
function CallQueue({ onLogFeedback }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("pending");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const rows = await sb("first_timers?order=created_at.desc&limit=300");
      const fbRows = await sb("call_feedback?select=first_timer_id,call_status,caller_name,created_at&order=created_at.desc");
      const fbMap = {};
      (fbRows || []).forEach(f => { if (!fbMap[f.first_timer_id]) fbMap[f.first_timer_id] = f; });
      setData((rows || []).map(r => ({ ...r, latestFb: fbMap[r.id] || null })));
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const pending   = data.filter(r => !r.latestFb);
  const reached   = data.filter(r => r.latestFb && normaliseStatus(r.latestFb.call_status) === "Reached");
  const callback  = data.filter(r => r.latestFb && normaliseStatus(r.latestFb.call_status) === "Call Back");
  const incorrect = data.filter(r => r.latestFb && normaliseStatus(r.latestFb.call_status) === "Incorrect Contact");
  const views = { pending, reached, callback, incorrect, all: data };
  const filtered = views[filter] || data;

  const tabs = [
    { k: "pending",   label: "Pending",   count: pending.length,   col: C.gold   },
    { k: "callback",  label: "Call Back",  count: callback.length,  col: C.amber  },
    { k: "reached",   label: "Reached",    count: reached.length,   col: C.green  },
    { k: "incorrect", label: "Incorrect",  count: incorrect.length, col: C.danger },
    { k: "all",       label: "All",        count: data.length,      col: C.textMuted },
  ];

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Call Queue" subtitle="Track and log calls for every first-timer" />
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
        <button style={{ ...btn("ghost", { padding: "6px 10px", marginLeft: "auto" }) }} onClick={load}>
          <RefreshCw size={13} />
        </button>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {filtered.map(r => {
            const fb = r.latestFb;
            const sm = fb ? statusMeta(fb.call_status) : { color: C.gold, bg: C.goldLight, label: "Pending" };
            return (
              <div key={r.id} style={{
                ...card, display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "12px 16px",
                borderLeft: `3px solid ${sm.color}`,
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                    background: sm.bg, display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, color: sm.color, fontSize: 14, fontFamily: F.head,
                  }}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.membership_decision} · {r.service_date}</div>
                    {fb?.caller_name && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                        Last called by <strong>{fb.caller_name}</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
                  <span style={badge(sm.color, sm.bg)}><span style={dot(sm.color)} />{sm.label}</span>
                  <button style={btn("primary", { padding: "7px 14px", fontSize: 13 })} onClick={() => onLogFeedback(r)}>
                    <Phone size={13} />Log Feedback
                  </button>
                </div>
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

// ── Call-back Queue ───────────────────────────────────────────────────────────
function CallBackQueue({ onLogFeedback }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await sb("first_timers?order=created_at.desc&limit=300");
        const fbRows = await sb("call_feedback?select=first_timer_id,call_status,caller_name,follow_up_date,notes,created_at&order=created_at.desc");
        const fbMap = {};
        (fbRows || []).forEach(f => { if (!fbMap[f.first_timer_id]) fbMap[f.first_timer_id] = f; });
        const cb = (rows || []).map(r => ({ ...r, latestFb: fbMap[r.id] || null }))
          .filter(r => r.latestFb && normaliseStatus(r.latestFb.call_status) === "Call Back");
        setData(cb);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title="Call Backs" subtitle={`${data.length} people needing a follow-up call`} />
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 8 }}>
          {data.map(r => {
            const fb = r.latestFb;
            return (
              <div key={r.id} style={{ ...card, padding: "12px 16px", borderLeft: `3px solid ${C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.service_date}</div>
                    {fb?.follow_up_date && (
                      <div style={{ fontSize: 12, color: C.amber, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={11} />Follow-up: {fb.follow_up_date}
                      </div>
                    )}
                    {fb?.notes && (
                      <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                        Note: {fb.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <span style={badge(C.amber, C.amberLight)}><span style={dot(C.amber)} />Call Back</span>
                    <button style={btn("primary", { padding: "7px 14px", fontSize: 13 })} onClick={() => onLogFeedback(r)}>
                      <Phone size={13} />Log New Call
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {data.length === 0 && (
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

// ── Log Feedback ──────────────────────────────────────────────────────────────
function LogFeedback({ person, onBack, callerName = "" }) {
  const BLANK_FB = {
    call_status: "", experience_rating: "", returning_likelihood: "",
    notes: "", follow_up_date: "", caller_name: callerName,
    flagged_for_pastoral: false, flag_reason: "",
  };
  const [form, setForm] = useState(BLANK_FB);
  const [existingId, setExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    (async () => {
      setFetching(true);
      try {
        const rows = await sb(`call_feedback?first_timer_id=eq.${person.id}&order=created_at.desc&limit=1`);
        if (rows && rows.length > 0) {
          const r = rows[0];
          setExistingId(r.id);
          setIsEdit(true);
          setForm({
            call_status: r.call_status || "", experience_rating: r.experience_rating || "",
            returning_likelihood: r.returning || "", notes: r.notes || "",
            follow_up_date: r.follow_up_date || "", caller_name: r.caller_name || callerName,
            flagged_for_pastoral: r.flagged_for_pastoral || false, flag_reason: r.flag_reason || "",
          });
        }
      } catch (e) { /* no existing record */ }
      setFetching(false);
    })();
  }, [person.id]);

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
    if (!form.call_status) { setErr("Call status is required."); return; }
    if (!form.caller_name.trim()) { setErr("Please enter your name as the caller."); return; }
    if (form.flagged_for_pastoral && !form.flag_reason.trim()) {
      setErr("Please describe the reason for flagging."); return;
    }
    setLoading(true); setErr("");
    try {
      const payload = {
        first_timer_id:       person.id,
        call_status:          form.call_status,
        experience_rating:    isReached ? (form.experience_rating || null)   : null,
        returning:            isReached ? (form.returning_likelihood || null) : null,
        notes:                form.notes          || null,
        follow_up_date:       form.follow_up_date || null,
        caller_name:          form.caller_name.trim(),
        flagged_for_pastoral: !!form.flagged_for_pastoral,
        flag_reason:          form.flagged_for_pastoral ? (form.flag_reason || null) : null,
      };
      if (existingId) {
        await sb(`call_feedback?id=eq.${existingId}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("call_feedback", { method: "POST", body: JSON.stringify(payload) });
      }
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (fetching) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem", color: C.textMuted }}>Loading…</div>
  );

  if (done) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem" }} className="page-enter">
      <CheckCircle size={48} color={C.green} style={{ marginBottom: 12 }} />
      <h3 style={{ color: C.green, fontFamily: F.head, margin: "0 0 8px" }}>
        Feedback {isEdit ? "updated" : "logged"} for {person.full_name}
      </h3>
      {form.flagged_for_pastoral && (
        <div style={{ ...badge(C.flag, C.flagLight), marginTop: 8, fontSize: 13, display: "inline-flex" }}>
          <Flag size={12} />Flagged for Pastoral Team
        </div>
      )}
      <button style={{ ...btn("outline"), marginTop: 20 }} onClick={onBack}>
        <ArrowLeft size={14} />Back to queue
      </button>
    </div>
  );

  return (
    <div style={card} className="page-enter">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={btn("ghost", { padding: "7px 10px" })} onClick={onBack}><ArrowLeft size={14} /></button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            {isEdit ? "Update Feedback" : "Log Feedback"} — {person.full_name}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            {person.phone} · visited {person.service_date}
          </p>
        </div>
      </div>
      {isEdit && (
        <div style={{
          marginBottom: 16, padding: "8px 14px", background: C.goldLight,
          borderRadius: 8, fontSize: 13, color: C.goldDark, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Edit3 size={13} />Editing existing feedback — changes will overwrite the previous entry.
        </div>
      )}
      {CREDS_MISSING && <CredsBanner />}
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <FieldInput label="Your Name (Caller)" id="cn" required
        value={form.caller_name} onChange={lset("caller_name")} placeholder="e.g. Tunde Adeyemi"
        hint="Identifies who made the call for activity tracking" />
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
              { value: "Yes", label: "Yes — will return" }, { value: "Maybe", label: "Maybe" },
              { value: "No", label: "No" }, { value: "Undecided", label: "Undecided" },
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

      <div style={{
        background: C.flagLight, border: `1px solid #FECACA`, borderRadius: 10,
        padding: "16px", marginBottom: 16,
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
        {loading ? "Saving…" : isEdit ? "Update Feedback" : "Save Feedback"}
      </button>
    </div>
  );
}

// ── All Feedback ──────────────────────────────────────────────────────────────
function AllFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await sb("call_feedback?select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc&limit=300");
        setRows(data || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter(r => {
    const norm = normaliseStatus(r.call_status);
    const matchFilter = !filter || norm === filter;
    const ft = r.first_timers || {};
    const matchSearch = !search ||
      ft.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.caller_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="page-enter">
      {CREDS_MISSING && <CredsBanner />}
      <PageHeader title={`All Feedback (${rows.length})`}
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No feedback yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Flagged Records ───────────────────────────────────────────────────────────
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

// ── Pastoral Report ───────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// SOUL CARE MODULE
// ═══════════════════════════════════════════════════════════════════════════════

// ── Member Picker ─────────────────────────────────────────────────────────────
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

// ── CSV Bulk Import ───────────────────────────────────────────────────────────
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
      setSuccess(`✅ ${payload.length} records imported successfully.`);
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

// ── Soul Care: Add / Edit Visit ───────────────────────────────────────────────
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
        <FieldInput label="Assigned To" id="at" required value={form.assigned_to} onChange={set("assigned_to")}
          placeholder="Name of Soul Care team member responsible" />
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

// ── Soul Care: Visit Queue ────────────────────────────────────────────────────
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
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: C.soulLight, display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head,
                    }}>
                      {r.member_name?.charAt(0)}
                    </div>
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

// ── Soul Care: My Visits ──────────────────────────────────────────────────────
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
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {r.urgency && <span style={badge(um.color || C.textMuted, um.bg || C.bg, { fontSize: 11 })}><Zap size={9} />{r.urgency}</span>}
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

// ── Visitation Tab (Pastoral & Admin) ─────────────────────────────────────────
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
                    <div style={{
                      width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                      background: C.soulLight, display: "flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 800, color: C.soul, fontSize: 14, fontFamily: F.head,
                    }}>
                      {r.member_name?.charAt(0)}
                    </div>
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
                    <span style={badge(sm.color, sm.bg, { fontSize: 11 })}><span style={dot(sm.color)} />{r.visit_status}</span>
                    <ChevronDown size={14} color={C.textMuted}
                      style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                  </div>
                </div>
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}`, marginTop: -4 }}>
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

// ── Admin: Overview ───────────────────────────────────────────────────────────
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

// ── Admin: Users ──────────────────────────────────────────────────────────────
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

// ── Admin: Add / Edit User ────────────────────────────────────────────────────
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
          { value: "dofficer", label: "Data Officer"    },
          { value: "expteam",  label: "Experience Team" },
          { value: "pasteam",  label: "Pastoral Team"   },
          { value: "soulcare", label: "Soul Care"       },
          { value: "admin",    label: "Admin"           },
        ]} />
      <div style={{
        background: C.greenXLight, borderRadius: 8, padding: "12px 14px", marginBottom: 16,
        fontSize: 13, color: C.textSecondary, lineHeight: 1.8,
      }}>
        <strong style={{ color: C.green }}>Role permissions:</strong><br />
        <strong>Data Officer</strong> — Add/edit first-timer records, generate QR code<br />
        <strong>Experience Team</strong> — Call queue, log feedback, flag for pastoral<br />
        <strong>Pastoral Team</strong> — Report, all feedback, flagged records, visitation view<br />
        <strong>Soul Care</strong> — Visitation queue, log and edit visit records<br />
        <strong>Admin</strong> — All of the above + user management + bulk import
      </div>
      <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading ? "Saving…" : editUser ? "Update User" : "Create User"}
      </button>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
const FALLBACK_ACCOUNTS = [
  { username: "admin",     password: "admin1",    role: "admin",    display_name: "Administrator"   },
  { username: "dofficer1", password: "dofficer1", role: "dofficer", display_name: "Data Officer"    },
  { username: "expteam1",  password: "expteam1",  role: "expteam",  display_name: "Experience Team" },
  { username: "pasteam1",  password: "pasteam1",  role: "pasteam",  display_name: "Pastoral Team"   },
  { username: "soulcare1", password: "soulcare1", role: "soulcare", display_name: "Soul Care Team"  },
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

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,        setSession]        = useState(null);
  const [active,         setActive]         = useState(null);
  const [editTarget,     setEditTarget]     = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [editUser,       setEditUser]       = useState(null);
  const [editVisit,      setEditVisit]      = useState(null);
  const [showPublic,     setShowPublic]     = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);
  const [flagCount,      setFlagCount]      = useState(0);
  const [addVisitMode,   setAddVisitMode]   = useState(false);

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

  const login  = (role, user) => { setSession({ role, user }); setActive(NAV[role][0].id); };
  const logout = () => { setSession(null); setActive(null); };
  const navTo  = (v) => {
    setActive(v); setEditTarget(null); setFeedbackTarget(null);
    setEditUser(null); setEditVisit(null); setAddVisitMode(false);
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

    if (active === "firsttimers") {
      if (editTarget) return (
        <FirstTimerForm editData={editTarget}
          onCancel={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); navTo("firsttimers"); }} />
      );
      return <FirstTimersList onEdit={r => setEditTarget(r)} />;
    }

    if (active === "callqueue") {
      if (feedbackTarget) return (
        <LogFeedback person={feedbackTarget} callerName={user}
          onBack={() => setFeedbackTarget(null)} />
      );
      return <CallQueue onLogFeedback={r => setFeedbackTarget(r)} />;
    }
    if (active === "callbacks") {
      if (feedbackTarget) return (
        <LogFeedback person={feedbackTarget} callerName={user}
          onBack={() => setFeedbackTarget(null)} />
      );
      return <CallBackQueue onLogFeedback={r => setFeedbackTarget(r)} />;
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