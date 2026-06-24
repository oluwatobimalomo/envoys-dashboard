import { useState, useEffect, useCallback } from "react";

// ── Supabase client (paste your URL + anon key) ──────────────────────────────
const SUPABASE_URL = "https://bhtbypqzukugnenyqvlg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJodGJ5cHF6dWt1Z25lbnlxdmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyOTE4NjYsImV4cCI6MjA5Nzg2Nzg2Nn0.eAsuBENwgtbj_RsNpOPdNrYZkULEuJv7pnwclIM_ito";

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || res.statusText);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Colour tokens (from Envoys logo + servispulse inspiration) ────────────────
const C = {
  green: "#1A7A3C",
  greenMid: "#22963F",
  greenLight: "#E8F5EC",
  greenAccent: "#2DB352",
  gold: "#F5A623",
  goldLight: "#FEF6E4",
  navy: "#1B2A4A",
  bg: "#F4F7F5",
  surface: "#FFFFFF",
  border: "#D9E5DC",
  textPrimary: "#0F2318",
  textSecondary: "#4A6355",
  textMuted: "#7A9585",
  danger: "#C0392B",
  dangerLight: "#FDEDEC",
  info: "#1565C0",
  infoLight: "#E3F2FD",
  success: "#1A7A3C",
  successLight: "#E8F5EC",
  warning: "#E67E22",
  warningLight: "#FEF3E2",
};

// ── Roles & users (auth managed by Supabase row-level security) ──────────────
const ROLES = {
  dofficer: { label: "Data Officer", color: C.navy, bg: "#E8EEF8" },
  expteam: { label: "Experience Team", color: C.green, bg: C.greenLight },
  pasteam: { label: "Pastoral Team", color: C.gold, bg: C.goldLight },
};

// ── Shared UI atoms ───────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter', 'Segoe UI', sans-serif", color: C.textPrimary },
  card: { background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "1.5rem" },
  input: {
    width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`,
    fontSize: 14, color: C.textPrimary, background: C.surface, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 5 },
  btn: (variant = "primary") => ({
    padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500,
    fontSize: 14, transition: "opacity 0.15s, transform 0.1s",
    ...(variant === "primary" ? { background: C.green, color: "#fff" } :
       variant === "gold" ? { background: C.gold, color: "#fff" } :
       variant === "outline" ? { background: "transparent", color: C.green, border: `1px solid ${C.green}` } :
       variant === "danger" ? { background: C.danger, color: "#fff" } :
       { background: C.bg, color: C.textSecondary, border: `1px solid ${C.border}` }),
  }),
  badge: (col, bg) => ({
    display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12,
    fontWeight: 500, color: col, background: bg,
  }),
  tag: (col, bg) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 6, fontSize: 11,
    fontWeight: 500, color: col, background: bg, marginRight: 4, marginBottom: 4,
  }),
};

function Input({ label, id, type = "text", required, value, onChange, placeholder, options, multi }) {
  const [focused, setFocused] = useState(false);
  const inputStyle = { ...styles.input, borderColor: focused ? C.green : C.border };

  if (type === "select") {
    return (
      <div style={{ marginBottom: 16 }}>
        <label htmlFor={id} style={styles.label}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
        <select id={id} value={value} onChange={onChange} required={required}
          style={{ ...inputStyle, background: C.surface }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
          <option value="">Select…</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  if (type === "textarea") {
    return (
      <div style={{ marginBottom: 16 }}>
        <label htmlFor={id} style={styles.label}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
        <textarea id={id} value={value} onChange={onChange} required={required} placeholder={placeholder}
          rows={3} style={{ ...inputStyle, resize: "vertical" }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      </div>
    );
  }
  if (type === "multicheck") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v) => {
      const next = selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v];
      onChange({ target: { value: next } });
    };
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={styles.label}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => toggle(o.value)}
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 13, cursor: "pointer", border: "1px solid",
                borderColor: selected.includes(o.value) ? C.green : C.border,
                background: selected.includes(o.value) ? C.greenLight : C.surface,
                color: selected.includes(o.value) ? C.green : C.textSecondary,
                fontWeight: selected.includes(o.value) ? 600 : 400,
              }}>{o.label}</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={styles.label}>{label}{required && <span style={{ color: C.danger }}> *</span>}</label>
      <input id={id} type={type} value={value} onChange={onChange} required={required} placeholder={placeholder}
        style={inputStyle} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ ...styles.card, textAlign: "center", padding: "1rem" }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || C.green }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const col = type === "error" ? C.danger : C.green;
  const bg = type === "error" ? C.dangerLight : C.greenLight;
  return (
    <div style={{ background: bg, border: `1px solid ${col}`, borderRadius: 8, padding: "10px 14px",
      fontSize: 13, color: col, display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
      <span>{msg}</span>
      {onClose && <span onClick={onClose} style={{ cursor: "pointer", fontWeight: 700, marginLeft: 8 }}>×</span>}
    </div>
  );
}

// ── Sidebar nav ───────────────────────────────────────────────────────────────
const NAV = {
  dofficer: [
    { id: "firsttimers", label: "First-Timers", icon: "👥" },
    { id: "addmember", label: "Add Record", icon: "➕" },
  ],
  expteam: [
    { id: "callqueue", label: "Call Queue", icon: "📞" },
    { id: "logfeedback", label: "Log Feedback", icon: "📝" },
    { id: "allfeedback", label: "All Feedback", icon: "📋" },
  ],
  pasteam: [
    { id: "report", label: "Report", icon: "📊" },
    { id: "allfeedback", label: "All Feedback", icon: "📋" },
  ],
};

function Sidebar({ role, active, setActive, user, onLogout }) {
  const roleInfo = ROLES[role];
  return (
    <div style={{
      width: 220, background: C.navy, minHeight: "100vh", display: "flex",
      flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 100,
    }}>
      {/* Logo area */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.green,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✦</div>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>THE ENVOYS</div>
            <div style={{ color: C.gold, fontSize: 10, letterSpacing: "0.05em" }}>EnvoysByte</div>
          </div>
        </div>
        <div style={{ ...styles.badge(roleInfo.color, roleInfo.bg), fontSize: 11, marginTop: 4 }}>
          {roleInfo.label}
        </div>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 4 }}>{user}</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        {(NAV[role] || []).map(item => (
          <button key={item.id} onClick={() => setActive(item.id)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 20px", border: "none", cursor: "pointer", textAlign: "left",
              background: active === item.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: active === item.id ? "#fff" : "rgba(255,255,255,0.6)",
              fontSize: 13, fontWeight: active === item.id ? 600 : 400,
              borderLeft: active === item.id ? `3px solid ${C.gold}` : "3px solid transparent",
              transition: "all 0.15s",
            }}>
            <span>{item.icon}</span> {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <button onClick={onLogout}
        style={{ margin: 16, padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
          background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}>
        Sign out
      </button>
    </div>
  );
}

// ── FORM: First-Timer Registration ───────────────────────────────────────────
const AREAS = [
  { value: "billionpreneur", label: "The Billionpreneur Hub (Entrepreneurs, Startups, Business)" },
  { value: "ceos", label: "CEOs Hub (Corporate, Career Professionals, Executives)" },
  { value: "directors", label: "Directors Hub (Governance, Politics, Nation Building)" },
  { value: "scholars", label: "Scholars Hub (Researchers, Students, Academics)" },
  { value: "creatives", label: "Creatives Hub (Designers, Tech People)" },
  { value: "ministry", label: "Ministry Hub (Pastoral and Apostleship Influence)" },
  { value: "indecisive", label: "Indecisive" },
];

const BLANK = {
  full_name: "", phone: "", gender: "", email: "", dob: "", marital_status: "",
  house_address: "", nearest_landmark: "", membership_decision: "",
  life_stage: "", heard_from: "", areas_of_interest: [], service_feedback: "",
  service_date: new Date().toISOString().slice(0, 10),
};

function FirstTimerForm({ onSuccess, editData, onCancel }) {
  const [form, setForm] = useState(editData || BLANK);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setMulti = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.full_name || !form.phone || !form.gender) {
      setErr("Name, phone and gender are required."); return;
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

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: C.textMuted,
        textTransform: "uppercase", marginBottom: 16, paddingBottom: 8,
        borderBottom: `2px solid ${C.greenLight}` }}>{title}</div>
      {children}
    </div>
  );

  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" };

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, color: C.textPrimary }}>{editData ? "Edit Record" : "New First-Timer"}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>Today's service: {form.service_date}</p>
        </div>
        {onCancel && <button style={styles.btn("ghost")} onClick={onCancel}>← Back</button>}
      </div>

      <Alert type="error" msg={err} onClose={() => setErr("")} />

      <Section title="Personal Information">
        <div style={grid2}>
          <Input label="Full Name" id="name" required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Okafor" />
          <Input label="Phone Number" id="phone" required value={form.phone} onChange={set("phone")} placeholder="+234 xxx xxx xxxx" />
        </div>
        <div style={grid2}>
          <Input label="Gender" id="gender" type="select" required value={form.gender} onChange={set("gender")}
            options={[{ value: "Male", label: "Male" }, { value: "Female", label: "Female" }]} />
          <Input label="Email Address" id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
        </div>
        <div style={grid2}>
          <Input label="Date of Birth" id="dob" type="date" value={form.dob} onChange={set("dob")} />
          <Input label="Marital Status" id="marital" type="select" value={form.marital_status} onChange={set("marital_status")}
            options={[{ value: "Single", label: "Single" }, { value: "Married", label: "Married" }, { value: "Divorced", label: "Divorced" }, { value: "Widowed", label: "Widowed" }]} />
        </div>
        <Input label="House Address" id="address" value={form.house_address} onChange={set("house_address")} placeholder="Street, City" />
        <Input label="Nearest Landmark" id="landmark" value={form.nearest_landmark} onChange={set("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout" />
      </Section>

      <Section title="Your Visit">
        <div style={grid2}>
          <Input label="Membership Decision" id="decision" type="select" required value={form.membership_decision} onChange={set("membership_decision")}
            options={[{ value: "Member", label: "Member" }, { value: "Visitor", label: "Visitor" }, { value: "Undecided", label: "Undecided" }]} />
          <Input label="Life Stage" id="lifestage" type="select" value={form.life_stage} onChange={set("life_stage")}
            options={[{ value: "Student", label: "Student" }, { value: "Employee", label: "Employee" }, { value: "Business Owner", label: "Business Owner" }]} />
        </div>
        <Input label="How did you hear about us?" id="heard" value={form.heard_from} onChange={set("heard_from")} placeholder="e.g. Friend, Social media, Flyer…" />
        <Input label="Area of Interest" id="areas" type="multicheck" value={form.areas_of_interest} onChange={setMulti("areas_of_interest")} options={AREAS} />
        <Input label="Service Feedback" id="feedback" type="textarea" value={form.service_feedback} onChange={set("service_feedback")} placeholder="What was your experience like today?" />
      </Section>

      <button style={{ ...styles.btn("primary"), width: "100%", padding: "12px", fontSize: 15 }}
        onClick={submit} disabled={loading}>
        {loading ? "Saving…" : editData ? "Update Record" : "Submit"}
      </button>
    </div>
  );
}

// ── Public form (no login) ────────────────────────────────────────────────────
function PublicForm() {
  const [done, setDone] = useState(false);
  if (done) return (
    <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...styles.card, maxWidth: 480, textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: C.green, margin: "0 0 8px" }}>Thank you for visiting!</h2>
        <p style={{ color: C.textSecondary, fontSize: 14 }}>We're glad you joined us today. Our Envoys Experience Team will be in touch shortly.</p>
      </div>
    </div>
  );
  return (
    <div style={{ ...styles.page, display: "flex", justifyContent: "center", padding: "2rem 1rem" }}>
      <div style={{ width: "100%", maxWidth: 700 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.green,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, margin: "0 auto 12px" }}>✦</div>
          <h1 style={{ margin: 0, color: C.textPrimary, fontSize: 22 }}>Welcome to <span style={{ color: C.green }}>The Envoys</span></h1>
          <p style={{ color: C.textMuted, fontSize: 13, marginTop: 6 }}>Fill in your details so we can stay connected with you</p>
        </div>
        <FirstTimerForm onSuccess={() => setDone(true)} />
      </div>
    </div>
  );
}

// ── Data Officer: list first-timers ──────────────────────────────────────────
function FirstTimersList({ onEdit }) {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await sb("first_timers?order=created_at.desc&limit=200");
      setData(rows || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = data.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search));

  const decisionColor = { Member: [C.green, C.greenLight], Visitor: [C.info, C.infoLight], Undecided: [C.warning, C.warningLight] };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>First-Timers Registry</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>{data.length} total records</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone…"
          style={{ ...styles.input, width: 220 }} />
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map(r => {
            const [col, bg] = decisionColor[r.membership_decision] || [C.textMuted, C.bg];
            return (
              <div key={r.id} style={{ ...styles.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.greenLight,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: C.green, flexShrink: 0 }}>
                    {r.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.full_name}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.gender} · {r.service_date}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={styles.badge(col, bg)}>{r.membership_decision || "–"}</span>
                  <button style={styles.btn("outline")} onClick={() => onEdit(r)}>Edit</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No records found.</p>}
        </div>
      )}
    </div>
  );
}

// ── Experience Team: call queue ───────────────────────────────────────────────
function CallQueue({ onLogFeedback }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await sb("first_timers?order=created_at.desc&limit=200");
        const fbRows = await sb("call_feedback?select=first_timer_id,status");
        const calledIds = new Set((fbRows || []).map(f => f.first_timer_id));
        setData((rows || []).map(r => ({ ...r, called: calledIds.has(r.id) })));
      } catch (e) { setErr(e.message); }
      setLoading(false);
    })();
  }, []);

  const filtered = data.filter(r => filter === "all" ? true : filter === "pending" ? !r.called : r.called);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Call Queue</h2>
        <p style={{ margin: "4px 0 12px", fontSize: 13, color: C.textMuted }}>Contact first-timers and log your call feedback</p>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "pending", "called"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ ...styles.btn(filter === f ? "primary" : "ghost"), padding: "6px 16px", fontSize: 13, textTransform: "capitalize" }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => (
            <div key={r.id} style={{ ...styles.card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, padding: "1rem 1.25rem" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: r.called ? C.greenLight : "#FFF3E0",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: r.called ? C.green : C.warning, fontSize: 14 }}>
                  {r.full_name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.full_name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{r.phone} · {r.membership_decision} · {r.service_date}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {r.called
                  ? <span style={styles.badge(C.green, C.greenLight)}>✓ Called</span>
                  : <span style={styles.badge(C.warning, "#FFF3E0")}>Pending</span>}
                <button style={styles.btn("primary")} onClick={() => onLogFeedback(r)}>Log Feedback</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No records.</p>}
        </div>
      )}
    </div>
  );
}

// ── Experience Team: log feedback ─────────────────────────────────────────────
function LogFeedback({ person, onBack }) {
  const [form, setForm] = useState({
    call_status: "", experience_rating: "", returning: "", notes: "", follow_up_date: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.call_status) { setErr("Please set call status."); return; }
    setLoading(true); setErr("");
    try {
      await sb("call_feedback", {
        method: "POST",
        body: JSON.stringify({ first_timer_id: person.id, ...form }),
      });
      setDone(true);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{ ...styles.card, textAlign: "center", padding: "3rem" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
      <h3 style={{ color: C.green }}>Feedback logged for {person.full_name}</h3>
      <button style={{ ...styles.btn("outline"), marginTop: 16 }} onClick={onBack}>← Back to queue</button>
    </div>
  );

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button style={styles.btn("ghost")} onClick={onBack}>←</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Log Feedback — {person.full_name}</h2>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: C.textMuted }}>{person.phone} · visited {person.service_date}</p>
        </div>
      </div>
      <Alert type="error" msg={err} onClose={() => setErr("")} />
      <Input label="Call Status" id="call_status" type="select" required value={form.call_status} onChange={set("call_status")}
        options={[{ value: "Reached", label: "Reached – spoke with person" }, { value: "Not Reached", label: "Not Reached – no answer" }, { value: "Callback Requested", label: "Callback Requested" }, { value: "Wrong Number", label: "Wrong Number" }]} />
      <Input label="Experience Rating" id="exp_rating" type="select" value={form.experience_rating} onChange={set("experience_rating")}
        options={[{ value: "Excellent", label: "Excellent" }, { value: "Good", label: "Good" }, { value: "Average", label: "Average" }, { value: "Poor", label: "Poor" }]} />
      <Input label="Returning?" id="returning" type="select" value={form.returning} onChange={set("returning")}
        options={[{ value: "Yes", label: "Yes – will return" }, { value: "Maybe", label: "Maybe" }, { value: "No", label: "No" }, { value: "Undecided", label: "Undecided" }]} />
      <Input label="Follow-up Date" id="followup" type="date" value={form.follow_up_date} onChange={set("follow_up_date")} />
      <Input label="Notes / Conversation Summary" id="notes" type="textarea" value={form.notes} onChange={set("notes")} placeholder="Key points from the conversation…" />
      <button style={{ ...styles.btn("primary"), width: "100%", padding: 12, fontSize: 15 }} onClick={submit} disabled={loading}>
        {loading ? "Saving…" : "Save Feedback"}
      </button>
    </div>
  );
}

// ── All Feedback Table ────────────────────────────────────────────────────────
function AllFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await sb("call_feedback?select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc&limit=300");
        setRows(data || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const statusColor = {
    Reached: [C.green, C.greenLight], "Not Reached": [C.danger, C.dangerLight],
    "Callback Requested": [C.warning, C.warningLight], "Wrong Number": [C.textMuted, C.bg],
  };

  const filtered = rows.filter(r => !filter || r.call_status === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>All Feedback ({rows.length})</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ ...styles.input, width: 200 }}>
          <option value="">All statuses</option>
          {["Reached", "Not Reached", "Callback Requested", "Wrong Number"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <p style={{ color: C.textMuted }}>Loading…</p> : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map(r => {
            const ft = r.first_timers || {};
            const [col, bg] = statusColor[r.call_status] || [C.textMuted, C.bg];
            return (
              <div key={r.id} style={{ ...styles.card, padding: "1rem 1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{ft.full_name}</span>
                    <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 8 }}>{ft.phone} · {ft.service_date}</span>
                  </div>
                  <span style={styles.badge(col, bg)}>{r.call_status}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: r.notes ? 8 : 0 }}>
                  {r.experience_rating && <span style={styles.tag(C.textSecondary, C.bg)}>Rating: {r.experience_rating}</span>}
                  {r.returning && <span style={styles.tag(C.info, C.infoLight)}>Returning: {r.returning}</span>}
                  {r.follow_up_date && <span style={styles.tag(C.textMuted, C.bg)}>Follow-up: {r.follow_up_date}</span>}
                </div>
                {r.notes && <p style={{ margin: 0, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>{r.notes}</p>}
              </div>
            );
          })}
          {filtered.length === 0 && <p style={{ color: C.textMuted, textAlign: "center", marginTop: 40 }}>No feedback yet.</p>}
        </div>
      )}
    </div>
  );
}

// ── Pastoral Report ───────────────────────────────────────────────────────────
function Report() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let ftQuery = "first_timers?select=membership_decision,life_stage,gender,areas_of_interest";
      if (dateFrom) ftQuery += `&service_date=gte.${dateFrom}`;
      if (dateTo) ftQuery += `&service_date=lte.${dateTo}`;

      const ft = await sb(ftQuery) || [];
      const fb = await sb("call_feedback?select=call_status,experience_rating,returning") || [];

      const count = (arr, key) => arr.reduce((acc, r) => { acc[r[key] || "Unknown"] = (acc[r[key] || "Unknown"] || 0) + 1; return acc; }, {});
      const areaCount = {};
      ft.forEach(r => {
        let areas = [];
        try { areas = JSON.parse(r.areas_of_interest || "[]"); } catch {}
        areas.forEach(a => { areaCount[a] = (areaCount[a] || 0) + 1; });
      });

      setStats({
        total: ft.length,
        totalCalls: fb.length,
        decisions: count(ft, "membership_decision"),
        lifeStage: count(ft, "life_stage"),
        gender: count(ft, "gender"),
        callStatus: count(fb, "call_status"),
        rating: count(fb, "experience_rating"),
        returning: count(fb, "returning"),
        areas: areaCount,
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: C.textMuted }}>Loading report…</p>;
  if (!stats) return null;

  const Bar = ({ label, value, max, color }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: C.textSecondary }}>{label}</span>
        <span style={{ fontWeight: 600, color: C.textPrimary }}>{value}</span>
      </div>
      <div style={{ height: 8, background: C.border, borderRadius: 4 }}>
        <div style={{ height: 8, background: color || C.green, borderRadius: 4, width: `${Math.round((value / (max || 1)) * 100)}%`, transition: "width 0.5s" }} />
      </div>
    </div>
  );

  const maxDecision = Math.max(...Object.values(stats.decisions), 1);
  const maxArea = Math.max(...Object.values(stats.areas), 1);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Pastoral Report</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>Membership retention overview</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ ...styles.input, width: 150 }} placeholder="From" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ ...styles.input, width: 150 }} placeholder="To" />
          <button style={styles.btn("primary")} onClick={load}>Filter</button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Stat label="First-Timers" value={stats.total} accent={C.green} />
        <Stat label="Calls Logged" value={stats.totalCalls} accent={C.navy} />
        <Stat label="Members" value={stats.decisions["Member"] || 0} accent={C.greenAccent} />
        <Stat label="Reached" value={stats.callStatus["Reached"] || 0} accent={C.gold} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Membership decision */}
        <div style={styles.card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Membership Decision</h3>
          {Object.entries(stats.decisions).map(([k, v]) => <Bar key={k} label={k} value={v} max={maxDecision} color={k === "Member" ? C.green : k === "Visitor" ? C.info : C.gold} />)}
        </div>

        {/* Call outcomes */}
        <div style={styles.card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Call Outcomes</h3>
          {Object.entries(stats.callStatus).map(([k, v]) => <Bar key={k} label={k} value={v} max={Math.max(...Object.values(stats.callStatus), 1)} color={k === "Reached" ? C.green : C.textMuted} />)}
        </div>

        {/* Returning likelihood */}
        <div style={styles.card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Returning Likelihood</h3>
          {Object.entries(stats.returning).map(([k, v]) => <Bar key={k} label={k} value={v} max={Math.max(...Object.values(stats.returning), 1)} color={k === "Yes" ? C.green : k === "Maybe" ? C.gold : C.danger} />)}
        </div>

        {/* Gender & Life Stage */}
        <div style={styles.card}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Gender & Life Stage</h3>
          {Object.entries(stats.gender).map(([k, v]) => <Bar key={k} label={k} value={v} max={stats.total} color={k === "Female" ? "#E91E63" : C.navy} />)}
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
            {Object.entries(stats.lifeStage).map(([k, v]) => <Bar key={k} label={k} value={v} max={stats.total} color={C.gold} />)}
          </div>
        </div>

        {/* Areas of Interest (full width) */}
        <div style={{ ...styles.card, gridColumn: "1 / -1" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Areas of Interest</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            {Object.entries(stats.areas).map(([k, v]) => {
              const label = AREAS.find(a => a.value === k)?.label.split("(")[0].trim() || k;
              return <Bar key={k} label={label} value={v} max={maxArea} color={C.greenMid} />;
            })}
            {Object.keys(stats.areas).length === 0 && <p style={{ color: C.textMuted }}>No area data yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
const ACCOUNTS = [
  { username: "dofficer1", password: "dofficer1", role: "dofficer" },
  { username: "expteam1", password: "expteam1", role: "expteam" },
  { username: "pasteam1", password: "pasteam1", role: "pasteam" },
];

function Login({ onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const submit = () => {
    const match = ACCOUNTS.find(a => a.username === u && a.password === p);
    if (!match) { setErr("Invalid username or password."); return; }
    onLogin(match.role, match.username);
  };
  return (
    <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...styles.card, width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.green,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px" }}>✦</div>
          <h2 style={{ margin: 0, color: C.textPrimary }}>The Envoys</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>Membership Retention Dashboard</p>
        </div>
        <Alert type="error" msg={err} onClose={() => setErr("")} />
        <Input label="Username" id="username" value={u} onChange={e => setU(e.target.value)} placeholder="e.g. dofficer1" />
        <Input label="Password" id="password" type="password" value={p} onChange={e => setP(e.target.value)} placeholder="••••••••" />
        <button style={{ ...styles.btn("primary"), width: "100%", padding: 12, marginTop: 8 }} onClick={submit}>Sign In</button>
        <div style={{ marginTop: 20, padding: "12px", background: C.bg, borderRadius: 8, fontSize: 12, color: C.textMuted }}>
          <strong>Demo credentials:</strong><br />
          dofficer1 / expteam1 / pasteam1
        </div>
      </div>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [active, setActive] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [showPublicForm, setShowPublicForm] = useState(false);

  // Check URL for public form
  useEffect(() => {
    if (window.location.hash === "#register") setShowPublicForm(true);
  }, []);

  const login = (role, user) => {
    setSession({ role, user });
    setActive(NAV[role][0].id);
  };
  const logout = () => { setSession(null); setActive(null); };

  if (showPublicForm) return <PublicForm />;
  if (!session) return <Login onLogin={login} />;

  const { role, user } = session;

  const renderContent = () => {
    if (active === "addmember") return (
      <FirstTimerForm onSuccess={() => setActive("firsttimers")} />
    );
    if (active === "firsttimers") {
      if (editTarget) return (
        <FirstTimerForm editData={editTarget} onCancel={() => setEditTarget(null)} onSuccess={() => { setEditTarget(null); setActive("firsttimers"); }} />
      );
      return <FirstTimersList onEdit={(r) => setEditTarget(r)} />;
    }
    if (active === "callqueue") {
      if (feedbackTarget) return <LogFeedback person={feedbackTarget} onBack={() => setFeedbackTarget(null)} />;
      return <CallQueue onLogFeedback={(r) => setFeedbackTarget(r)} />;
    }
    if (active === "logfeedback") return <AllFeedback />;
    if (active === "allfeedback") return <AllFeedback />;
    if (active === "report") return <Report />;
    return null;
  };

  return (
    <div style={styles.page}>
      <Sidebar role={role} active={active} setActive={(v) => { setActive(v); setEditTarget(null); setFeedbackTarget(null); }} user={user} onLogout={logout} />
      <div style={{ marginLeft: 220, padding: "2rem", minHeight: "100vh" }}>
        <div style={{ maxWidth: 900 }}>{renderContent()}</div>
      </div>
    </div>
  );
}
