// ─────────────────────────────────────────────────────────────────────────────
// THE ENVOYS — Membership Retention Dashboard
// Cabinet Grotesk (headings) + Satoshi (body) · Green + Gold palette only
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";

// ── Fonts & global CSS ────────────────────────────────────────────────────────
(function injectGlobals() {
  if (document.getElementById("envoys-globals")) return;
  const s = document.createElement("style");
  s.id = "envoys-globals";
  s.textContent = `
    @import url('https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@700,800,900&f[]=satoshi@400,500,700&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #F4F7F5; }
    ::-webkit-scrollbar-thumb { background: #c5d8cb; border-radius: 4px; }
    input, select, textarea, button { font-family: 'Satoshi', sans-serif; }
    @media (max-width: 768px) {
      .sidebar      { transform: translateX(-100%); transition: transform .25s ease; }
      .sidebar.open { transform: translateX(0); }
      .main-content { margin-left: 0 !important; padding: 1rem !important; }
      .mob-header   { display: flex !important; }
      .grid-2col    { grid-template-columns: 1fr !important; }
      .grid-4col    { grid-template-columns: 1fr 1fr !important; }
      .grid-report  { grid-template-columns: 1fr !important; }
    }
    @media (min-width: 769px) {
      .sidebar    { transform: translateX(0) !important; }
      .mob-header { display: none !important; }
    }
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────────────────
// !! REPLACE THESE TWO VALUES WITH YOUR REAL SUPABASE CREDENTIALS !!
// Supabase dashboard → Settings → API
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://bhtbypqzukugnenyqvlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodGJ5cHF6dWt1Z25lbnlxdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTE4NjYsImV4cCI6MjA5Nzg2Nzg2Nn0.eAsuBENwgtbj_RsNpOPdNrYZkULEuJv7pnwclIM_ito";

// Detect unconfigured placeholder credentials
const CREDS_MISSING =
  SUPABASE_URL.includes("YOUR_PROJECT_ID") ||
  SUPABASE_ANON_KEY === "YOUR_ANON_KEY";

// ── Supabase REST helper ──────────────────────────────────────────────────────
async function sb(path, opts = {}) {
  if (CREDS_MISSING) throw new Error("CREDS_MISSING");
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey:          SUPABASE_ANON_KEY,
        Authorization:   `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type":  "application/json",
        Prefer:          opts.prefer || "return=representation",
        ...opts.headers,
      },
      ...opts,
    });
  } catch (netErr) {
    // Network error — provide a clear diagnostic message
    throw new Error(
      `Network error: could not reach Supabase. ` +
      `Check that your SUPABASE_URL is correct and that you have internet access. ` +
      `(${netErr.message})`
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      body.message || body.error_description || body.hint ||
      `HTTP ${res.status} — ${res.statusText}`
    );
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  green:         "#1A7A3C",
  greenDark:     "#0F5228",
  greenMid:      "#22963F",
  greenLight:    "#E8F5EC",
  greenXLight:   "#F2FAF5",
  gold:          "#F5A623",
  goldDark:      "#B87800",
  goldLight:     "#FEF6E4",
  goldMid:       "#FAC75A",
  bg:            "#F4F7F5",
  surface:       "#FFFFFF",
  border:        "#D9E5DC",
  sidebar:       "#0B1F12",
  textPrimary:   "#0F2318",
  textSecondary: "#4A6355",
  textMuted:     "#7A9585",
  danger:        "#C0392B",
  dangerLight:   "#FDEDEC",
  warning:       "#D4720A",
  warningLight:  "#FEF3E2",
};

const F = {
  head: "'Cabinet Grotesk', 'Segoe UI', sans-serif",
  body: "'Satoshi', 'Inter', sans-serif",
};

// ── Roles / Nav ───────────────────────────────────────────────────────────────
const ROLES = {
  dofficer: { label: "Data Officer",    col: C.green,    bg: C.greenLight },
  expteam:  { label: "Experience Team", col: C.goldDark, bg: C.goldLight  },
  pasteam:  { label: "Pastoral Team",   col: C.green,    bg: C.greenLight },
};

const NAV = {
  dofficer: [
    { id: "firsttimers", label: "First-Timers", icon: "👥" },
    { id: "addmember",   label: "Add Record",   icon: "➕" },
    { id: "qrcode",      label: "QR Code",      icon: "📲" },
  ],
  expteam: [
    { id: "callqueue",   label: "Call Queue",   icon: "📞" },
    { id: "allfeedback", label: "All Feedback", icon: "📋" },
  ],
  pasteam: [
    { id: "report",      label: "Report",       icon: "📊" },
    { id: "allfeedback", label: "All Feedback", icon: "📋" },
  ],
};

// ── Shared style helpers ──────────────────────────────────────────────────────
const inputBase = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: `1px solid ${C.border}`, fontSize: 14, color: C.textPrimary,
  background: C.surface, outline: "none", fontFamily: F.body,
  transition: "border-color .15s", display: "block",
};

const btn = (v = "primary") => ({
  padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer",
  fontWeight: 600, fontSize: 14, fontFamily: F.body, lineHeight: 1.4,
  ...(v === "primary" ? { background: C.green,  color: "#fff"  } :
      v === "gold"    ? { background: C.gold,   color: "#fff"  } :
      v === "outline" ? { background: "transparent", color: C.green,
                          border: `1.5px solid ${C.green}`     } :
      v === "danger"  ? { background: C.danger, color: "#fff"  } :
                        { background: C.bg, color: C.textSecondary,
                          border: `1px solid ${C.border}`      }),
});

const card = {
  background: C.surface, borderRadius: 14,
  border: `1px solid ${C.border}`, padding: "1.5rem",
};

const badge = (col, bg) => ({
  display: "inline-block", padding: "3px 11px", borderRadius: 20,
  fontSize: 12, fontWeight: 600, color: col, background: bg, whiteSpace: "nowrap",
});

// ─────────────────────────────────────────────────────────────────────────────
// !! FieldInput MUST stay at MODULE SCOPE — never nest it inside another
//    component or it remounts on every render and loses focus after 1 char.
// ─────────────────────────────────────────────────────────────────────────────
function FieldInput({ label, id, type = "text", required, value, onChange, placeholder, options }) {
  const [focused, setFocused] = useState(false);
  const base = { ...inputBase, borderColor: focused ? C.green : C.border };

  const wrap = (children) => (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 13, fontWeight: 500,
        color: C.textSecondary, marginBottom: 6, fontFamily: F.body }}>
        {label}{required && <span style={{ color: C.danger }}> *</span>}
      </label>
      {children}
    </div>
  );

  if (type === "select") return wrap(
    <select id={id} value={value} onChange={onChange} required={required}
      style={{ ...base, background: C.surface }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
      <option value="">Select…</option>
      {(options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  if (type === "textarea") return wrap(
    <textarea id={id} value={value} onChange={onChange} placeholder={placeholder}
      rows={3} style={{ ...base, resize: "vertical" }}
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
              style={{ padding: "7px 13px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                border: `1.5px solid ${on ? C.green : C.border}`,
                background: on ? C.greenLight : C.surface,
                color: on ? C.green : C.textSecondary,
                fontWeight: on ? 700 : 400, fontFamily: F.body }}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  return wrap(
    <input id={id} type={type} value={value} onChange={onChange}
      required={required} placeholder={placeholder} style={base}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
  );
}

// ── Credential-missing banner (shown instead of cryptic network errors) ───────
function CredsBanner() {
  return (
    <div style={{ background: C.dangerLight, border: `1.5px solid ${C.danger}`,
      borderRadius: 10, padding: "20px 24px", marginBottom: 24 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.danger, fontFamily: F.head, marginBottom: 8 }}>
        ⚠️ Supabase credentials not configured
      </div>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: C.danger, lineHeight: 1.6 }}>
        Open <code>src/EnvoysDashboard.jsx</code> and replace the two placeholder values near the top of the file:
      </p>
      <code style={{ display: "block", background: "#fff", border: `1px solid ${C.danger}`,
        borderRadius: 6, padding: "10px 14px", fontSize: 12, lineHeight: 1.8, color: C.textPrimary }}>
        const SUPABASE_URL = "https://<strong>your-project-id</strong>.supabase.co";<br/>
        const SUPABASE_ANON_KEY = "<strong>your-anon-key</strong>";
      </code>
      <p style={{ margin: "12px 0 0", fontSize: 12, color: C.textMuted }}>
        Find these in your Supabase project → Settings → API. Then save the file, commit, and push to redeploy.
      </p>
    </div>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo({ size = 48 }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.green,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      fontSize: size * 0.42, fontWeight: 800, color: "#fff", fontFamily: F.head }}>E</div>
  );
  return (
    <img src="/logo.png" alt="The Envoys" onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, display: "block" }} />
  );
}

// ── Alert ─────────────────────────────────────────────────────────────────────
function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const col = type === "error" ? C.danger : C.green;
  const bg  = type === "error" ? C.dangerLight : C.greenLight;
  return (
    <div style={{ background: bg, border: `1px solid ${col}`, borderRadius: 8,
      padding: "10px 14px", fontSize: 13, color: col,
      display: "flex", justifyContent: "space-between", marginBottom: 16, lineHeight: 1.5 }}>
      <span style={{ flex: 1 }}>{msg}</span>
      {onClose && <button onClick={onClose} style={{ background: "none", border: "none",
        cursor: "pointer", color: col, fontWeight: 700, fontSize: 18,
        lineHeight: 1, padding: "0 0 0 12px", flexShrink: 0 }}>×</button>}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ role, active, setActive, user, onLogout, mobileOpen, onClose }) {
  const ri = ROLES[role];
  return (
    <>
      {mobileOpen && (
        <div onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 98 }} />
      )}
      <div className={`sidebar${mobileOpen ? " open" : ""}`}
        style={{ width: 230, background: C.sidebar, minHeight: "100vh",
          display: "flex", flexDirection: "column",
          position: "fixed", top: 0, left: 0, zIndex: 100 }}>

        <div style={{ padding: "22px 18px 16px", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Logo size={42} />
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 13,
                fontFamily: F.head, lineHeight: 1.25 }}>THE ENVOYS</div>
              <div style={{ color: C.gold, fontSize: 10, letterSpacing: ".08em" }}>EnvoysByte</div>
            </div>
          </div>
          <span style={{ ...badge(ri.col, ri.bg), fontSize: 11 }}>{ri.label}</span>
          <div style={{ color: "rgba(255,255,255,.35)", fontSize: 11, marginTop: 6 }}>{user}</div>
        </div>

        <nav style={{ flex: 1, padding: "8px 0" }}>
          {(NAV[role] || []).map(item => {
            const on = active === item.id;
            return (
              <button key={item.id} onClick={() => { setActive(item.id); onClose?.(); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "11px 18px", border: "none", cursor: "pointer",
                  background: on ? "rgba(245,166,35,.12)" : "transparent",
                  color: on ? C.gold : "rgba(255,255,255,.5)",
                  fontSize: 13, fontWeight: on ? 700 : 400, fontFamily: F.body, textAlign: "left",
                  borderLeft: `3px solid ${on ? C.gold : "transparent"}`,
                  transition: "all .15s" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
              </button>
            );
          })}
        </nav>

        <button onClick={onLogout}
          style={{ margin: 14, padding: 10, borderRadius: 8,
            border: "1px solid rgba(255,255,255,.13)", background: "transparent",
            color: "rgba(255,255,255,.4)", cursor: "pointer", fontSize: 13, fontFamily: F.body }}>
          Sign out
        </button>
      </div>
    </>
  );
}

// ── Mobile header ─────────────────────────────────────────────────────────────
function MobileHeader({ onMenu, title }) {
  return (
    <div className="mob-header"
      style={{ position: "sticky", top: 0, zIndex: 50, background: C.sidebar,
        padding: "12px 16px", alignItems: "center", gap: 12,
        borderBottom: "1px solid rgba(255,255,255,.07)" }}>
      <button onClick={onMenu}
        style={{ background: "none", border: "none", color: "#fff",
          fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1 }}>☰</button>
      <Logo size={28} />
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: F.head }}>
        {title || "The Envoys"}
      </span>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, accent }) {
  return (
    <div style={{ ...card, textAlign: "center", padding: "1.1rem 1rem" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent || C.green, fontFamily: F.head }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ── Areas of Interest ─────────────────────────────────────────────────────────
const AREAS = [
  { value: "billionpreneur", label: "Billionpreneur Hub (Entrepreneurs, Startups, Business)" },
  { value: "ceos",           label: "CEOs Hub (Corporate, Career, Executives)"               },
  { value: "directors",      label: "Directors Hub (Governance, Politics, Nation Building)"  },
  { value: "scholars",       label: "Scholars Hub (Researchers, Students, Academics)"        },
  { value: "creatives",      label: "Creatives Hub (Designers, Tech People)"                 },
  { value: "ministry",       label: "Ministry Hub (Pastoral & Apostleship)"                  },
  { value: "indecisive",     label: "Indecisive"                                             },
];

const BLANK = {
  full_name: "", phone: "", gender: "", email: "", dob: "",
  marital_status: "", house_address: "", nearest_landmark: "",
  membership_decision: "", life_stage: "", heard_from: "",
  areas_of_interest: [], service_feedback: "",
  service_date: new Date().toISOString().slice(0, 10),
};

// ── First-Timer Form ──────────────────────────────────────────────────────────
function FirstTimerForm({ onSuccess, editData, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!editData) return { ...BLANK };
    let areas = editData.areas_of_interest;
    if (typeof areas === "string") { try { areas = JSON.parse(areas); } catch { areas = []; } }
    return { ...editData, areas_of_interest: Array.isArray(areas) ? areas : [] };
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  // One stable setter per field key — never recreated between renders
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
      setErr("Full name, phone number and gender are required."); return;
    }
    setLoading(true); setErr("");
    try {
      const payload = { ...form, areas_of_interest: JSON.stringify(form.areas_of_interest) };
      if (editData?.id) {
        await sb(`first_timers?id=eq.${editData.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await sb("first_timers", { method: "POST", body: JSON.stringify(payload) });
      }
      onSuccess();
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const SH = ({ title }) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: C.textMuted,
      textTransform: "uppercase", marginBottom: 16, paddingBottom: 8,
      borderBottom: `2px solid ${C.greenLight}`, fontFamily: F.head }}>{title}</div>
  );

  return (
    <div style={card}>
      {CREDS_MISSING && <CredsBanner />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontFamily: F.head, fontWeight: 800 }}>
            {editData ? "Edit Record" : "New First-Timer"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>
            Service date: {form.service_date}
          </p>
        </div>
        {onCancel && <button style={btn("ghost")} onClick={onCancel}>← Back</button>}
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <div style={{ marginBottom: 28 }}>
        <SH title="Personal Information" />
        <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Full Name"    id="fn" required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Okafor" />
          <FieldInput label="Phone Number" id="ph" required value={form.phone}     onChange={set("phone")}     placeholder="+234 xxx xxx xxxx" />
        </div>
        <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Gender" id="gd" type="select" required value={form.gender} onChange={set("gender")}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
          <FieldInput label="Email Address" id="em" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
        </div>
        <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Date of Birth"  id="db" type="date"   value={form.dob}           onChange={set("dob")} />
          <FieldInput label="Marital Status" id="ms" type="select" value={form.marital_status} onChange={set("marital_status")}
            options={[{ value: "Single", label: "Single" }, { value: "Married", label: "Married" },
                      { value: "Divorced", label: "Divorced" }, { value: "Widowed", label: "Widowed" }]} />
        </div>
        <FieldInput label="House Address"    id="ha" value={form.house_address}    onChange={set("house_address")}    placeholder="Street, City" />
        <FieldInput label="Nearest Landmark" id="nl" value={form.nearest_landmark} onChange={set("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout" />
      </div>

      <div style={{ marginBottom: 28 }}>
        <SH title="Your Visit" />
        <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <FieldInput label="Membership Decision" id="md" type="select" required value={form.membership_decision} onChange={set("membership_decision")}
            options={[{ value: "Member", label: "Member" }, { value: "Visitor", label: "Visitor" }, { value: "Undecided", label: "Undecided" }]} />
          <FieldInput label="Life Stage" id="ls" type="select" value={form.life_stage} onChange={set("life_stage")}
            options={[{ value: "Student", label: "Student" }, { value: "Employee", label: "Employee" }, { value: "Business Owner", label: "Business Owner" }]} />
        </div>
        <FieldInput label="How did you hear about us?" id="hf" value={form.heard_from}       onChange={set("heard_from")}       placeholder="e.g. Friend, Social media, Flyer…" />
        <FieldInput label="Area of Interest"           id="ai" type="multicheck"              value={form.areas_of_interest}    onChange={set("areas_of_interest")} options={AREAS} />
        <FieldInput label="Service Feedback"           id="sf" type="textarea"                value={form.service_feedback}     onChange={set("service_feedback")}  placeholder="What was your experience like today?" />
      </div>

      <button style={{ ...btn("primary"), width: "100%", padding: "13px", fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading ? "Saving…" : editData ? "Update Record" : "Submit"}
      </button>
    </div>
  );
}

// ── Public self-registration ──────────────────────────────────────────────────
function PublicForm() {
  const [done, setDone] = useState(false);
  if (done) return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ ...card, maxWidth: 480, textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
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

// ── QR Code page ──────────────────────────────────────────────────────────────
// Uses the free QR Server API — no npm package needed
function QRCodePage() {
  const liveUrl = window.location.origin + "/#register";
  const [custom, setCustom]   = useState(liveUrl);
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
    <div>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>
        Registration QR Code
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: 13, color: C.textMuted }}>
        Print or display this QR code in church — visitors scan it to fill the first-timer form on their phone.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* QR display */}
        <div style={{ ...card, textAlign: "center", flex: "0 0 auto" }}>
          <img src={qrSrc} alt="QR Code" width={240} height={240}
            style={{ display: "block", borderRadius: 8 }} />
          <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted, wordBreak: "break-all", maxWidth: 240 }}>
            {display}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, flexWrap: "wrap" }}>
            <button style={btn("primary")} onClick={download}>⬇ Download PNG</button>
            <button style={btn("outline")} onClick={() => window.open(display, "_blank")}>
              Open Link
            </button>
          </div>
        </div>

        {/* URL editor */}
        <div style={{ ...card, flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head, marginBottom: 4 }}>
            Form URL
          </div>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            This is set to your live site automatically. If your Vercel URL has changed, update it below.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500,
              color: C.textSecondary, marginBottom: 6 }}>Registration URL</label>
            <input value={custom} onChange={e => setCustom(e.target.value)}
              style={{ ...inputBase, borderColor: C.border }}
              placeholder="https://your-site.vercel.app/#register" />
          </div>
          <button style={{ ...btn("gold"), width: "100%" }}
            onClick={() => setDisplay(custom)}>
            Update QR Code
          </button>

          <div style={{ marginTop: 20, padding: 14, background: C.greenXLight,
            borderRadius: 8, fontSize: 12, color: C.textSecondary, lineHeight: 1.7 }}>
            <strong style={{ color: C.green }}>💡 How to use</strong><br />
            Download the PNG and print it on a card, banner, or welcome screen.<br />
            Visitors scan it with their phone camera and the form opens instantly.<br />
            Recommended size: at least <strong>5cm × 5cm</strong> for reliable scanning.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data Officer: First-Timers list ───────────────────────────────────────────
function FirstTimersList({ onEdit }) {
  const [data, setData]       = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { setData((await sb("first_timers?order=created_at.desc&limit=300")) || []); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = data.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) || r.phone?.includes(search));

  const dc = {
    Member:    [C.green,    C.greenLight  ],
    Visitor:   [C.goldDark, C.goldLight   ],
    Undecided: [C.warning,  C.warningLight],
  };

  return (
    <div>
      {CREDS_MISSING && <CredsBanner />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>First-Timers Registry</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>{data.length} total records</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            style={{ ...inputBase, width: 200, borderColor: C.border }} />
          <button style={btn("outline")} onClick={load}>↺ Refresh</button>
        </div>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => {
            const [col, bg] = dc[r.membership_decision] || [C.textMuted, C.bg];
            return (
              <div key={r.id} style={{ ...card, display: "flex", justifyContent: "space-between",
                alignItems: "center", flexWrap: "wrap", gap: 12, padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.greenLight,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontSize: 16, fontWeight: 800, color: C.green, fontFamily: F.head }}>
                    {r.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      {r.phone} · {r.gender} · {r.service_date}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={badge(col, bg)}>{r.membership_decision || "–"}</span>
                  <button style={btn("outline")} onClick={() => onEdit(r)}>Edit</button>
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No records found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Experience Team: Call Queue ───────────────────────────────────────────────
function CallQueue({ onLogFeedback }) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const rows   = await sb("first_timers?order=created_at.desc&limit=300");
        const fbRows = await sb("call_feedback?select=first_timer_id,call_status");
        const calledIds = new Set((fbRows || []).map(f => f.first_timer_id));
        setData((rows || []).map(r => ({ ...r, called: calledIds.has(r.id) })));
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = data.filter(r =>
    filter === "all" ? true : filter === "pending" ? !r.called : r.called);

  return (
    <div>
      {CREDS_MISSING && <CredsBanner />}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>Call Queue</h2>
        <p style={{ margin: "4px 0 14px", fontSize: 13, color: C.textMuted }}>
          Contact first-timers and log your call feedback
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "pending", "called"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...btn(filter === f ? "primary" : "ghost"), padding: "7px 18px",
                fontSize: 13, textTransform: "capitalize" }}>
              {f === "all"     ? `All (${data.length})`
               : f === "pending" ? `Pending (${data.filter(r => !r.called).length})`
               :                   `Called (${data.filter(r => r.called).length})`}
            </button>
          ))}
        </div>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...card, display: "flex", justifyContent: "space-between",
              alignItems: "center", flexWrap: "wrap", gap: 12, padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: r.called ? C.greenLight : C.goldLight,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, color: r.called ? C.green : C.goldDark,
                  fontSize: 15, fontFamily: F.head }}>
                  {r.full_name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{r.full_name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>
                    {r.phone} · {r.membership_decision} · {r.service_date}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {r.called
                  ? <span style={badge(C.green,    C.greenLight)}>✓ Called</span>
                  : <span style={badge(C.goldDark, C.goldLight)}>Pending</span>}
                <button style={btn("primary")} onClick={() => onLogFeedback(r)}>Log Feedback</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No records.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Experience Team: Log Feedback ─────────────────────────────────────────────
function LogFeedback({ person, onBack }) {
  const [form, setForm] = useState({
    call_status: "", experience_rating: "", returning_likelihood: "",
    notes: "", follow_up_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [err, setErr]         = useState("");

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

  const submit = async () => {
    if (!form.call_status) { setErr("Please set a call status."); return; }
    setLoading(true); setErr("");
    try {
      await sb("call_feedback", {
        method: "POST",
        body: JSON.stringify({
          first_timer_id:    person.id,
          call_status:       form.call_status,
          experience_rating: form.experience_rating   || null,
          returning:         form.returning_likelihood || null,
          notes:             form.notes               || null,
          follow_up_date:    form.follow_up_date       || null,
        }),
      });
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{ ...card, textAlign: "center", padding: "3rem" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h3 style={{ color: C.green, fontFamily: F.head }}>Feedback logged for {person.full_name}</h3>
      <button style={{ ...btn("outline"), marginTop: 16 }} onClick={onBack}>← Back to queue</button>
    </div>
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button style={btn("ghost")} onClick={onBack}>←</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: F.head, fontWeight: 800 }}>
            Log Feedback — {person.full_name}
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>
            {person.phone} · visited {person.service_date}
          </p>
        </div>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <FieldInput label="Call Status" id="cs" type="select" required
        value={form.call_status} onChange={lset("call_status")}
        options={[
          { value: "Reached",            label: "Reached – spoke with person" },
          { value: "Not Reached",        label: "Not Reached – no answer"     },
          { value: "Callback Requested", label: "Callback Requested"          },
          { value: "Wrong Number",       label: "Wrong Number"                },
        ]} />

      <FieldInput label="Experience Rating" id="er" type="select"
        value={form.experience_rating} onChange={lset("experience_rating")}
        options={[
          { value: "Excellent", label: "Excellent" },
          { value: "Good",      label: "Good"      },
          { value: "Average",   label: "Average"   },
          { value: "Poor",      label: "Poor"      },
        ]} />

      <FieldInput label="Returning?" id="rl" type="select"
        value={form.returning_likelihood} onChange={lset("returning_likelihood")}
        options={[
          { value: "Yes",       label: "Yes – will return" },
          { value: "Maybe",     label: "Maybe"             },
          { value: "No",        label: "No"                },
          { value: "Undecided", label: "Undecided"         },
        ]} />

      <FieldInput label="Follow-up Date" id="fd" type="date"
        value={form.follow_up_date} onChange={lset("follow_up_date")} />

      <FieldInput label="Notes / Conversation Summary" id="nt" type="textarea"
        value={form.notes} onChange={lset("notes")}
        placeholder="Key points from the conversation…" />

      <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading ? "Saving…" : "Save Feedback"}
      </button>
    </div>
  );
}

// ── All Feedback ──────────────────────────────────────────────────────────────
function AllFeedback() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [filter, setFilter]   = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true); setErr("");
      try {
        const data = await sb(
          "call_feedback?select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc&limit=300"
        );
        setRows(data || []);
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const sc = {
    "Reached":            [C.green,    C.greenLight  ],
    "Not Reached":        [C.danger,   C.dangerLight ],
    "Callback Requested": [C.warning,  C.warningLight],
    "Wrong Number":       [C.textMuted, C.bg         ],
  };

  const filtered = rows.filter(r => !filter || r.call_status === filter);

  return (
    <div>
      {CREDS_MISSING && <CredsBanner />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>
          All Feedback ({rows.length})
        </h2>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ ...inputBase, width: 200, borderColor: C.border }}>
          <option value="">All statuses</option>
          {["Reached", "Not Reached", "Callback Requested", "Wrong Number"].map(s =>
            <option key={s}>{s}</option>)}
        </select>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => {
            const ft = r.first_timers || {};
            const [col, bg] = sc[r.call_status] || [C.textMuted, C.bg];
            return (
              <div key={r.id} style={{ ...card, padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14, fontFamily: F.head }}>{ft.full_name}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>
                      {ft.phone} · {ft.service_date}
                    </span>
                  </div>
                  <span style={badge(col, bg)}>{r.call_status}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: r.notes ? 8 : 0 }}>
                  {r.experience_rating && (
                    <span style={{ ...badge(C.textSecondary, C.bg), fontSize: 11 }}>
                      Rating: {r.experience_rating}
                    </span>
                  )}
                  {r.returning && (
                    <span style={{ ...badge(C.goldDark, C.goldLight), fontSize: 11 }}>
                      Returning: {r.returning}
                    </span>
                  )}
                  {r.follow_up_date && (
                    <span style={{ ...badge(C.textMuted, C.bg), fontSize: 11 }}>
                      Follow-up: {r.follow_up_date}
                    </span>
                  )}
                </div>
                {r.notes && (
                  <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>{r.notes}</p>
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

// ── Pastoral Report ───────────────────────────────────────────────────────────
function Report() {
  const [stats,    setStats]   = useState(null);
  const [loading,  setLoading] = useState(true);
  const [err,      setErr]     = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      let q = "first_timers?select=membership_decision,life_stage,gender,areas_of_interest";
      if (dateFrom) q += `&service_date=gte.${dateFrom}`;
      if (dateTo)   q += `&service_date=lte.${dateTo}`;

      const ft = await sb(q) || [];
      const fb = await sb("call_feedback?select=call_status,experience_rating,returning") || [];

      const tally = (arr, key) =>
        arr.reduce((a, r) => {
          const v = r[key] || "Unknown";
          a[v] = (a[v] || 0) + 1;
          return a;
        }, {});

      const areas = {};
      ft.forEach(r => {
        let a = [];
        try { a = JSON.parse(r.areas_of_interest || "[]"); } catch {}
        a.forEach(v => { areas[v] = (areas[v] || 0) + 1; });
      });

      setStats({
        total:      ft.length,
        totalCalls: fb.length,
        decisions:  tally(ft, "membership_decision"),
        lifeStage:  tally(ft, "life_stage"),
        gender:     tally(ft, "gender"),
        callStatus: tally(fb, "call_status"),
        rating:     tally(fb, "experience_rating"),
        returning:  tally(fb, "returning"),
        areas,
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
      <div style={{ height: 8, background: C.border, borderRadius: 4 }}>
        <div style={{ height: 8, borderRadius: 4, transition: "width .5s",
          background: color || C.green,
          width: `${Math.round((value / (max || 1)) * 100)}%` }} />
      </div>
    </div>
  );

  const SH = ({ t }) => (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: C.textMuted,
      textTransform: "uppercase", marginBottom: 16, fontFamily: F.head }}>{t}</div>
  );

  const maxD = Math.max(...Object.values(stats?.decisions || {}), 1);
  const maxA = Math.max(...Object.values(stats?.areas    || {}), 1);

  return (
    <div>
      {CREDS_MISSING && <CredsBanner />}
      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end",
        marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: F.head, fontWeight: 800 }}>Pastoral Report</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>Membership retention overview</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...inputBase, width: 150, borderColor: C.border }} />
          <input type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}
            style={{ ...inputBase, width: 150, borderColor: C.border }} />
          <button style={btn("primary")} onClick={load}>Filter</button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid-4col"
            style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
            <Stat label="First-Timers"  value={stats.total}                       accent={C.green}    />
            <Stat label="Calls Logged"  value={stats.totalCalls}                  accent={C.greenMid} />
            <Stat label="Members"       value={stats.decisions["Member"]    || 0} accent={C.goldDark} />
            <Stat label="Reached"       value={stats.callStatus["Reached"]  || 0} accent={C.gold}    />
          </div>

          <div className="grid-report" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={card}>
              <SH t="Membership Decision" />
              {Object.entries(stats.decisions).map(([k, v]) =>
                <Bar key={k} label={k} value={v} max={maxD}
                  color={k === "Member" ? C.green : k === "Visitor" ? C.goldMid : C.warning} />)}
              {!Object.keys(stats.decisions).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            </div>

            <div style={card}>
              <SH t="Call Outcomes" />
              {Object.entries(stats.callStatus).map(([k, v]) =>
                <Bar key={k} label={k} value={v}
                  max={Math.max(...Object.values(stats.callStatus), 1)}
                  color={k === "Reached" ? C.green : C.goldMid} />)}
              {!Object.keys(stats.callStatus).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            </div>

            <div style={card}>
              <SH t="Returning Likelihood" />
              {Object.entries(stats.returning).map(([k, v]) =>
                <Bar key={k} label={k} value={v}
                  max={Math.max(...Object.values(stats.returning), 1)}
                  color={k === "Yes" ? C.green : k === "Maybe" ? C.gold : C.danger} />)}
              {!Object.keys(stats.returning).length && <p style={{ color: C.textMuted, fontSize: 13 }}>No data yet.</p>}
            </div>

            <div style={card}>
              <SH t="Gender & Life Stage" />
              {Object.entries(stats.gender).map(([k, v]) =>
                <Bar key={k} label={k} value={v} max={stats.total}
                  color={k === "Female" ? C.goldMid : C.green} />)}
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
                {Object.entries(stats.lifeStage).map(([k, v]) =>
                  <Bar key={k} label={k} value={v} max={stats.total} color={C.greenMid} />)}
              </div>
            </div>

            <div style={{ ...card, gridColumn: "1 / -1" }}>
              <SH t="Areas of Interest" />
              <div className="grid-2col"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                {Object.entries(stats.areas).map(([k, v]) => {
                  const label = AREAS.find(a => a.value === k)?.label.split("(")[0].trim() || k;
                  return <Bar key={k} label={label} value={v} max={maxA} color={C.greenMid} />;
                })}
                {!Object.keys(stats.areas).length && (
                  <p style={{ color: C.textMuted, fontSize: 13 }}>No area data yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { username: "dofficer1", password: "dofficer1", role: "dofficer" },
  { username: "expteam1",  password: "expteam1",  role: "expteam"  },
  { username: "pasteam1",  password: "pasteam1",  role: "pasteam"  },
];

function Login({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    const match = ACCOUNTS.find(a => a.username === u && a.password === p);
    if (!match) { setErr("Invalid username or password."); return; }
    onLogin(match.role, match.username);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ ...card, width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Logo size={72} /></div>
          <h2 style={{ margin: 0, color: C.textPrimary, fontFamily: F.head, fontWeight: 800, fontSize: 22 }}>
            The Envoys
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: C.textMuted }}>
            Membership Retention Dashboard
          </p>
        </div>
        {CREDS_MISSING && <CredsBanner />}
        <Alert type="error" msg={err} onClose={() => setErr("")} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500,
            color: C.textSecondary, marginBottom: 6 }}>Username</label>
          <input value={u} onChange={e => setU(e.target.value)} placeholder="e.g. dofficer1"
            style={{ ...inputBase, borderColor: C.border }}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500,
            color: C.textSecondary, marginBottom: 6 }}>Password</label>
          <input type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••"
            style={{ ...inputBase, borderColor: C.border }}
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <button style={{ ...btn("primary"), width: "100%", padding: 13, fontSize: 15 }} onClick={submit}>
          Sign In
        </button>
        <div style={{ marginTop: 20, padding: 12, background: C.greenXLight,
          borderRadius: 8, fontSize: 12, color: C.textSecondary }}>
          <strong>Credentials:</strong> dofficer1 · expteam1 · pasteam1
        </div>
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
  const [showPublic,     setShowPublic]     = useState(false);
  const [mobileOpen,     setMobileOpen]     = useState(false);

  useEffect(() => {
    if (window.location.hash === "#register") setShowPublic(true);
  }, []);

  const login  = (role, user) => { setSession({ role, user }); setActive(NAV[role][0].id); };
  const logout = () => { setSession(null); setActive(null); };
  const navTo  = v  => { setActive(v); setEditTarget(null); setFeedbackTarget(null); setMobileOpen(false); };

  if (showPublic) return <PublicForm />;
  if (!session)   return <Login onLogin={login} />;

  const { role, user } = session;
  const pageTitle = NAV[role]?.find(n => n.id === active)?.label || "Dashboard";

  const renderContent = () => {
    if (active === "addmember") return <FirstTimerForm onSuccess={() => navTo("firsttimers")} />;
    if (active === "qrcode")    return <QRCodePage />;

    if (active === "firsttimers") {
      if (editTarget) return (
        <FirstTimerForm editData={editTarget} onCancel={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); navTo("firsttimers"); }} />
      );
      return <FirstTimersList onEdit={r => setEditTarget(r)} />;
    }

    if (active === "callqueue") {
      if (feedbackTarget) return <LogFeedback person={feedbackTarget} onBack={() => setFeedbackTarget(null)} />;
      return <CallQueue onLogFeedback={r => setFeedbackTarget(r)} />;
    }

    if (active === "allfeedback") return <AllFeedback />;
    if (active === "report")      return <Report />;
    return null;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: F.body, color: C.textPrimary }}>
      <MobileHeader onMenu={() => setMobileOpen(true)} title={pageTitle} />
      <Sidebar role={role} active={active} setActive={navTo} user={user}
        onLogout={logout} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="main-content" style={{ marginLeft: 230, padding: "2rem", minHeight: "100vh" }}>
        <div style={{ maxWidth: 920 }}>{renderContent()}</div>
      </div>
    </div>
  );
}