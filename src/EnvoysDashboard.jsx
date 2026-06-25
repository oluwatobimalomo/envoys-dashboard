// ─────────────────────────────────────────────────────────────────────────────
// THE ENVOYS — Membership Retention Dashboard  v4
// Cabinet Grotesk (headings) · Satoshi (body) · Green + Gold palette
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from "react";

// ── Global CSS (injected once) ────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// REPLACE THESE WITH YOUR REAL SUPABASE CREDENTIALS
// Supabase → Settings → API
// ─────────────────────────────────────────────────────────────────────────────
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

const CREDS_MISSING =
  SUPABASE_URL.includes("YOUR_PROJECT_ID") ||
  SUPABASE_ANON_KEY === "YOUR_ANON_KEY";

async function sb(path, opts = {}) {
  if (CREDS_MISSING) throw new Error("CREDS_MISSING");
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        apikey:         SUPABASE_ANON_KEY,
        Authorization:  `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer:         opts.prefer || "return=representation",
        ...opts.headers,
      },
      ...opts,
    });
  } catch (e) {
    throw new Error(`Network error — cannot reach Supabase. Check your SUPABASE_URL and internet connection. (${e.message})`);
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
  green:         "#1A7A3C",
  greenDark:     "#0F5228",
  greenMid:      "#22963F",
  greenLight:    "#E8F5EC",
  greenXLight:   "#F2FAF5",
  gold:          "#F5A623",
  goldDark:      "#B87800",
  goldLight:     "#FEF6E4",
  goldMid:       "#FAC75A",
  amber:         "#D97706",
  amberLight:    "#FFF8EB",
  bg:            "#F4F7F5",
  surface:       "#FFFFFF",
  border:        "#D9E5DC",
  sidebar:       "#0B1F12",
  textPrimary:   "#0F2318",
  textSecondary: "#4A6355",
  textMuted:     "#7A9585",
  danger:        "#C0392B",
  dangerLight:   "#FDEDEC",
  flag:          "#DC2626",
  flagLight:     "#FEF2F2",
};
const F = { head: "'Cabinet Grotesk','Segoe UI',sans-serif", body: "'Satoshi','Inter',sans-serif" };

// ── Call status taxonomy ──────────────────────────────────────────────────────
// reached → green / call_back → amber / incorrect_contact → red
const STATUS_META = {
  "Reached":             { label: "Reached",            indicator: C.green,  bg: C.greenLight,  group: "reached"   },
  "Call Back":           { label: "Call Back",           indicator: C.amber,  bg: C.amberLight,  group: "callback"  },
  "Incorrect Contact":   { label: "Incorrect Contact",   indicator: C.danger, bg: C.dangerLight, group: "incorrect" },
};
// raw values callers can pick in the dropdown
const CALL_STATUS_OPTIONS = [
  { value: "Reached",           label: "Reached — spoke with person"    },
  { value: "Not Reached",       label: "Not Reached — no answer"        },
  { value: "Callback Requested",label: "Callback Requested by visitor"  },
  { value: "Wrong Number",      label: "Wrong Number"                   },
];
// normalise raw → display category
function normaliseStatus(raw) {
  if (!raw) return null;
  if (raw === "Reached")            return "Reached";
  if (raw === "Wrong Number")       return "Incorrect Contact";
  return "Call Back"; // Not Reached, Callback Requested
}
function statusMeta(raw) {
  const norm = normaliseStatus(raw) || raw;
  return STATUS_META[norm] || { label: norm, indicator: C.textMuted, bg: C.bg, group: "other" };
}

// ── Roles ─────────────────────────────────────────────────────────────────────
const ROLE_META = {
  admin:    { label: "Admin",         col: C.goldDark, bg: C.goldLight  },
  dofficer: { label: "Data Officer",  col: C.green,    bg: C.greenLight },
  expteam:  { label: "Experience Team", col: C.green,  bg: C.greenLight },
  pasteam:  { label: "Pastoral Team", col: C.goldDark, bg: C.goldLight  },
};
const NAV = {
  admin: [
    { id: "admin_overview", label: "Overview",   icon: "🏠" },
    { id: "admin_users",    label: "Users",      icon: "👤" },
    { id: "admin_adduser",  label: "Add User",   icon: "➕" },
    { id: "firsttimers",    label: "First-Timers",icon: "👥"},
    { id: "report",         label: "Report",     icon: "📊" },
    { id: "allfeedback",    label: "All Feedback",icon: "📋"},
    { id: "flagged",        label: "Flagged",    icon: "🚩" },
    { id: "qrcode",         label: "QR Code",    icon: "📲" },
  ],
  dofficer: [
    { id: "firsttimers", label: "First-Timers", icon: "👥" },
    { id: "addmember",   label: "Add Record",   icon: "➕" },
    { id: "qrcode",      label: "QR Code",      icon: "📲" },
  ],
  expteam: [
    { id: "callqueue",   label: "Call Queue",   icon: "📞" },
    { id: "callbacks",   label: "Call Backs",   icon: "🔄" },
    { id: "allfeedback", label: "All Feedback", icon: "📋" },
    { id: "flagged",     label: "Flagged",      icon: "🚩" },
  ],
  pasteam: [
    { id: "report",      label: "Report",       icon: "📊" },
    { id: "allfeedback", label: "All Feedback", icon: "📋" },
    { id: "flagged",     label: "Flagged",      icon: "🚩" },
  ],
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputBase = {
  width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${C.border}`,
  fontSize:14, color:C.textPrimary, background:C.surface, outline:"none",
  fontFamily:F.body, transition:"border-color .15s", display:"block",
};
const btn = (v="primary") => ({
  padding:"10px 20px", borderRadius:8, border:"none", cursor:"pointer",
  fontWeight:600, fontSize:14, fontFamily:F.body, lineHeight:1.4,
  ...(v==="primary" ? {background:C.green,  color:"#fff"} :
      v==="gold"    ? {background:C.gold,   color:"#fff"} :
      v==="amber"   ? {background:C.amber,  color:"#fff"} :
      v==="outline" ? {background:"transparent",color:C.green,border:`1.5px solid ${C.green}`} :
      v==="danger"  ? {background:C.danger, color:"#fff"} :
                      {background:C.bg,color:C.textSecondary,border:`1px solid ${C.border}`}),
});
const card = { background:C.surface, borderRadius:14, border:`1px solid ${C.border}`, padding:"1.5rem" };
const badge = (col,bg) => ({
  display:"inline-block", padding:"3px 11px", borderRadius:20,
  fontSize:12, fontWeight:600, color:col, background:bg, whiteSpace:"nowrap",
});
const dot = (col) => ({
  display:"inline-block", width:9, height:9, borderRadius:"50%",
  background:col, marginRight:6, flexShrink:0,
});

// ── FieldInput — must stay at MODULE SCOPE to avoid remount/focus loss ────────
function FieldInput({ label, id, type="text", required, value, onChange, placeholder, options, hint }) {
  const [focused, setFocused] = useState(false);
  const base = { ...inputBase, borderColor: focused ? C.green : C.border };

  const wrap = (children) => (
    <div style={{ marginBottom:16 }}>
      <label htmlFor={id} style={{ display:"block", fontSize:13, fontWeight:500,
        color:C.textSecondary, marginBottom:6, fontFamily:F.body }}>
        {label}{required && <span style={{color:C.danger}}> *</span>}
      </label>
      {children}
      {hint && <div style={{fontSize:11,color:C.textMuted,marginTop:4}}>{hint}</div>}
    </div>
  );

  if (type==="select") return wrap(
    <select id={id} value={value} onChange={onChange} required={required}
      style={{...base,background:C.surface}}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}>
      <option value="">Select…</option>
      {(options||[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  if (type==="textarea") return wrap(
    <textarea id={id} value={value} onChange={onChange} placeholder={placeholder}
      rows={3} style={{...base,resize:"vertical"}}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} />
  );

  if (type==="multicheck") {
    const sel = Array.isArray(value) ? value : [];
    return wrap(
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:2}}>
        {(options||[]).map(o=>{
          const on=sel.includes(o.value);
          return (
            <button key={o.value} type="button"
              onClick={()=>onChange(on?sel.filter(x=>x!==o.value):[...sel,o.value])}
              style={{padding:"7px 13px",borderRadius:20,fontSize:13,cursor:"pointer",
                border:`1.5px solid ${on?C.green:C.border}`,
                background:on?C.greenLight:C.surface,
                color:on?C.green:C.textSecondary,
                fontWeight:on?700:400,fontFamily:F.body}}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  if (type==="toggle") {
    return (
      <div style={{marginBottom:16}}>
        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",
          fontSize:13,fontWeight:500,color:C.textSecondary,fontFamily:F.body}}>
          <div onClick={()=>onChange(!value)}
            style={{width:40,height:22,borderRadius:11,background:value?C.flag:C.border,
              position:"relative",transition:"background .2s",flexShrink:0,cursor:"pointer"}}>
            <div style={{position:"absolute",top:3,left:value?20:3,width:16,height:16,
              borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
          </div>
          {label}
          {value && <span style={{fontSize:12,color:C.flag,fontWeight:700}}>⚠ Will be flagged</span>}
        </label>
        {hint && <div style={{fontSize:11,color:C.textMuted,marginTop:4,marginLeft:50}}>{hint}</div>}
      </div>
    );
  }

  return wrap(
    <input id={id} type={type} value={value} onChange={onChange}
      required={required} placeholder={placeholder} style={base}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} />
  );
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function Logo({ size=48 }) {
  const [failed,setFailed]=useState(false);
  if (failed) return (
    <div style={{width:size,height:size,borderRadius:"50%",background:C.green,
      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
      fontSize:size*.42,fontWeight:800,color:"#fff",fontFamily:F.head}}>E</div>
  );
  return <img src="/logo.png" alt="The Envoys" onError={()=>setFailed(true)}
    style={{width:size,height:size,objectFit:"contain",flexShrink:0,display:"block"}}/>;
}

function Alert({ type, msg, onClose }) {
  if (!msg) return null;
  const col = type==="error"?C.danger:type==="warn"?C.amber:C.green;
  const bg  = type==="error"?C.dangerLight:type==="warn"?C.amberLight:C.greenLight;
  return (
    <div style={{background:bg,border:`1px solid ${col}`,borderRadius:8,
      padding:"10px 14px",fontSize:13,color:col,
      display:"flex",justifyContent:"space-between",marginBottom:16,lineHeight:1.5}}>
      <span style={{flex:1}}>{msg}</span>
      {onClose&&<button onClick={onClose} style={{background:"none",border:"none",
        cursor:"pointer",color:col,fontWeight:700,fontSize:18,lineHeight:1,
        padding:"0 0 0 12px",flexShrink:0}}>×</button>}
    </div>
  );
}

function Stat({ label, value, accent, sub }) {
  return (
    <div style={{...card,textAlign:"center",padding:"1.1rem 1rem"}}>
      <div style={{fontSize:28,fontWeight:800,color:accent||C.green,fontFamily:F.head}}>{value}</div>
      <div style={{fontSize:12,color:C.textMuted,marginTop:3}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:accent||C.green,marginTop:2}}>{sub}</div>}
    </div>
  );
}

function CredsBanner() {
  return (
    <div style={{background:C.dangerLight,border:`1.5px solid ${C.danger}`,
      borderRadius:10,padding:"20px 24px",marginBottom:24}}>
      <div style={{fontWeight:800,fontSize:15,color:C.danger,fontFamily:F.head,marginBottom:8}}>
        ⚠️ Supabase credentials not configured
      </div>
      <p style={{margin:"0 0 12px",fontSize:13,color:C.danger,lineHeight:1.6}}>
        Open <code>src/EnvoysDashboard.jsx</code> and replace the two placeholder values at the top:
      </p>
      <div style={{background:"#fff",border:`1px solid ${C.danger}`,borderRadius:6,
        padding:"10px 14px",fontSize:12,lineHeight:1.9,color:C.textPrimary,fontFamily:"monospace"}}>
        const SUPABASE_URL = "https://<b>your-project-id</b>.supabase.co";<br/>
        const SUPABASE_ANON_KEY = "<b>your-anon-key</b>";
      </div>
      <p style={{margin:"12px 0 0",fontSize:12,color:C.textMuted}}>
        Supabase → Settings → API. Save → commit → push → Vercel redeploys.
      </p>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ role, active, setActive, user, onLogout, mobileOpen, onClose, flagCount=0 }) {
  const ri = ROLE_META[role] || ROLE_META.expteam;
  return (
    <>
      {mobileOpen&&<div onClick={onClose}
        style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:98}}/>}
      <div className={`sidebar${mobileOpen?" open":""}`}
        style={{width:230,background:C.sidebar,minHeight:"100vh",
          display:"flex",flexDirection:"column",position:"fixed",top:0,left:0,zIndex:100}}>
        <div style={{padding:"22px 18px 16px",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <Logo size={42}/>
            <div>
              <div style={{color:"#fff",fontWeight:800,fontSize:13,fontFamily:F.head,lineHeight:1.25}}>
                THE ENVOYS
              </div>
              <div style={{color:C.gold,fontSize:10,letterSpacing:".08em"}}>EnvoysByte</div>
            </div>
          </div>
          <span style={{...badge(ri.col,ri.bg),fontSize:11}}>{ri.label}</span>
          <div style={{color:"rgba(255,255,255,.35)",fontSize:11,marginTop:6}}>{user}</div>
        </div>
        <nav style={{flex:1,padding:"8px 0",overflowY:"auto"}}>
          {(NAV[role]||[]).map(item=>{
            const on=active===item.id;
            const isFlag=item.id==="flagged";
            return (
              <button key={item.id} onClick={()=>{setActive(item.id);onClose?.();}}
                style={{display:"flex",alignItems:"center",gap:10,width:"100%",
                  padding:"11px 18px",border:"none",cursor:"pointer",
                  background:on?"rgba(245,166,35,.12)":"transparent",
                  color:on?C.gold:"rgba(255,255,255,.5)",
                  fontSize:13,fontWeight:on?700:400,fontFamily:F.body,textAlign:"left",
                  borderLeft:`3px solid ${on?C.gold:"transparent"}`,transition:"all .15s"}}>
                <span style={{fontSize:16}}>{item.icon}</span>
                <span style={{flex:1}}>{item.label}</span>
                {isFlag&&flagCount>0&&(
                  <span style={{background:C.flag,color:"#fff",borderRadius:10,
                    fontSize:10,fontWeight:700,padding:"1px 7px"}}>{flagCount}</span>
                )}
              </button>
            );
          })}
        </nav>
        <button onClick={onLogout}
          style={{margin:14,padding:10,borderRadius:8,border:"1px solid rgba(255,255,255,.13)",
            background:"transparent",color:"rgba(255,255,255,.4)",cursor:"pointer",fontSize:13,fontFamily:F.body}}>
          Sign out
        </button>
      </div>
    </>
  );
}

function MobileHeader({ onMenu, title }) {
  return (
    <div className="mob-header"
      style={{position:"sticky",top:0,zIndex:50,background:C.sidebar,
        padding:"12px 16px",alignItems:"center",gap:12,
        borderBottom:"1px solid rgba(255,255,255,.07)"}}>
      <button onClick={onMenu} style={{background:"none",border:"none",color:"#fff",
        fontSize:22,cursor:"pointer",padding:0,lineHeight:1}}>☰</button>
      <Logo size={28}/>
      <span style={{color:"#fff",fontWeight:700,fontSize:14,fontFamily:F.head}}>{title||"The Envoys"}</span>
    </div>
  );
}

// ── Areas of Interest ─────────────────────────────────────────────────────────
const AREAS = [
  {value:"billionpreneur",label:"Billionpreneur Hub (Entrepreneurs, Startups, Business)"},
  {value:"ceos",          label:"CEOs Hub (Corporate, Career, Executives)"},
  {value:"directors",     label:"Directors Hub (Governance, Politics, Nation Building)"},
  {value:"scholars",      label:"Scholars Hub (Researchers, Students, Academics)"},
  {value:"creatives",     label:"Creatives Hub (Designers, Tech People)"},
  {value:"ministry",      label:"Ministry Hub (Pastoral & Apostleship)"},
  {value:"indecisive",    label:"Indecisive"},
];

const BLANK_FT = {
  full_name:"", phone:"", gender:"", email:"", dob:"",
  marital_status:"", house_address:"", nearest_landmark:"",
  membership_decision:"", life_stage:"", heard_from:"",
  areas_of_interest:[], service_feedback:"",
  service_date: new Date().toISOString().slice(0,10),
};

// ── Safe JSON parse for areas ─────────────────────────────────────────────────
function parseAreas(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ── First-Timer Form ──────────────────────────────────────────────────────────
function FirstTimerForm({ onSuccess, editData, onCancel }) {
  const [form, setForm] = useState(() =>
    editData
      ? { ...editData, areas_of_interest: parseAreas(editData.areas_of_interest) }
      : { ...BLANK_FT }
  );
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  const settersRef=useRef({});
  const set=useCallback((key)=>{
    if (!settersRef.current[key]) {
      settersRef.current[key]=(valOrEvt)=>{
        const val=valOrEvt&&valOrEvt.target!==undefined?valOrEvt.target.value:valOrEvt;
        setForm(f=>({...f,[key]:val}));
      };
    }
    return settersRef.current[key];
  },[]);

  const submit=async()=>{
    if (!form.full_name.trim()||!form.phone.trim()||!form.gender){
      setErr("Full name, phone and gender are required."); return;
    }
    setLoading(true); setErr("");
    try {
      const payload={...form,areas_of_interest:JSON.stringify(form.areas_of_interest)};
      if (editData?.id) {
        await sb(`first_timers?id=eq.${editData.id}`,{method:"PATCH",body:JSON.stringify(payload)});
      } else {
        await sb("first_timers",{method:"POST",body:JSON.stringify(payload)});
      }
      onSuccess();
    } catch(e){setErr(e.message);}
    setLoading(false);
  };

  const SH=({title})=>(
    <div style={{fontSize:11,fontWeight:700,letterSpacing:".09em",color:C.textMuted,
      textTransform:"uppercase",marginBottom:16,paddingBottom:8,
      borderBottom:`2px solid ${C.greenLight}`,fontFamily:F.head}}>{title}</div>
  );

  return (
    <div style={card}>
      {CREDS_MISSING&&<CredsBanner/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:24,flexWrap:"wrap",gap:10}}>
        <div>
          <h2 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:800}}>
            {editData?"Edit Record":"New First-Timer"}
          </h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textMuted}}>Service date: {form.service_date}</p>
        </div>
        {onCancel&&<button style={btn("ghost")} onClick={onCancel}>← Back</button>}
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>

      <div style={{marginBottom:28}}>
        <SH title="Personal Information"/>
        <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <FieldInput label="Full Name"    id="fn" required value={form.full_name} onChange={set("full_name")} placeholder="e.g. Adaeze Okafor"/>
          <FieldInput label="Phone Number" id="ph" required value={form.phone}     onChange={set("phone")}     placeholder="+234 xxx xxx xxxx"/>
        </div>
        <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <FieldInput label="Gender" id="gd" type="select" required value={form.gender} onChange={set("gender")}
            options={[{value:"Male",label:"Male"},{value:"Female",label:"Female"}]}/>
          <FieldInput label="Email Address" id="em" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com"/>
        </div>
        <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <FieldInput label="Date of Birth"  id="db" type="date"   value={form.dob}           onChange={set("dob")}/>
          <FieldInput label="Marital Status" id="ms" type="select" value={form.marital_status} onChange={set("marital_status")}
            options={[{value:"Single",label:"Single"},{value:"Married",label:"Married"},
                      {value:"Divorced",label:"Divorced"},{value:"Widowed",label:"Widowed"}]}/>
        </div>
        <FieldInput label="House Address"    id="ha" value={form.house_address}    onChange={set("house_address")}    placeholder="Street, City"/>
        <FieldInput label="Nearest Landmark" id="nl" value={form.nearest_landmark} onChange={set("nearest_landmark")} placeholder="e.g. Near Chevron Roundabout"/>
      </div>

      <div style={{marginBottom:28}}>
        <SH title="Your Visit"/>
        <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
          <FieldInput label="Membership Decision" id="md" type="select" required value={form.membership_decision} onChange={set("membership_decision")}
            options={[{value:"Member",label:"Member"},{value:"Visitor",label:"Visitor"},{value:"Undecided",label:"Undecided"}]}/>
          <FieldInput label="Life Stage" id="ls" type="select" value={form.life_stage} onChange={set("life_stage")}
            options={[{value:"Student",label:"Student"},{value:"Employee",label:"Employee"},{value:"Business Owner",label:"Business Owner"}]}/>
        </div>
        <FieldInput label="How did you hear about us?" id="hf" value={form.heard_from}    onChange={set("heard_from")}    placeholder="e.g. Friend, Social media, Flyer…"/>
        <FieldInput label="Area of Interest"           id="ai" type="multicheck"           value={form.areas_of_interest} onChange={set("areas_of_interest")} options={AREAS}/>
        <FieldInput label="Service Feedback"           id="sf" type="textarea"             value={form.service_feedback}  onChange={set("service_feedback")}  placeholder="What was your experience like today?"/>
      </div>

      <button style={{...btn("primary"),width:"100%",padding:"13px",fontSize:15}}
        onClick={submit} disabled={loading}>
        {loading?"Saving…":editData?"Update Record":"Submit"}
      </button>
    </div>
  );
}

// ── Public self-registration ──────────────────────────────────────────────────
function PublicForm() {
  const [done,setDone]=useState(false);
  if (done) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.body,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{...card,maxWidth:480,textAlign:"center",padding:"3rem 2rem"}}>
        <div style={{fontSize:52,marginBottom:16}}>✅</div>
        <h2 style={{color:C.green,margin:"0 0 10px",fontFamily:F.head,fontWeight:800}}>Thank you for visiting!</h2>
        <p style={{color:C.textSecondary,fontSize:14,lineHeight:1.7}}>
          We're glad you joined us today. Our Envoys Experience Team will be in touch shortly.
        </p>
      </div>
    </div>
  );
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.body,padding:"2rem 1rem"}}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Logo size={80}/></div>
          <h1 style={{margin:0,color:C.textPrimary,fontSize:24,fontFamily:F.head,fontWeight:800}}>
            Welcome to <span style={{color:C.green}}>The Envoys</span>
          </h1>
          <p style={{color:C.textMuted,fontSize:13,marginTop:8,lineHeight:1.6}}>
            Fill in your details so we can stay connected with you
          </p>
        </div>
        <FirstTimerForm onSuccess={()=>setDone(true)}/>
      </div>
    </div>
  );
}

// ── QR Code ───────────────────────────────────────────────────────────────────
function QRCodePage() {
  const liveUrl=window.location.origin+"/register";
  const [custom,setCustom]=useState(liveUrl);
  const [display,setDisplay]=useState(liveUrl);
  const qrSrc=`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=16&color=1A7A3C&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
  const download=()=>{
    const a=document.createElement("a");
    a.href=`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&color=1A7A3C&bgcolor=ffffff&data=${encodeURIComponent(display)}`;
    a.download="envoys-registration-qr.png"; a.target="_blank"; a.click();
  };
  return (
    <div>
      <h2 style={{margin:"0 0 6px",fontSize:22,fontFamily:F.head,fontWeight:800}}>Registration QR Code</h2>
      <p style={{margin:"0 0 24px",fontSize:13,color:C.textMuted}}>
        Display or print this QR code — visitors scan it to open the first-timer registration form.
      </p>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
        <div style={{...card,textAlign:"center",flex:"0 0 auto"}}>
          <img src={qrSrc} alt="QR Code" width={240} height={240} style={{display:"block",borderRadius:8}}/>
          <div style={{marginTop:12,fontSize:11,color:C.textMuted,wordBreak:"break-all",maxWidth:240}}>{display}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:14,flexWrap:"wrap"}}>
            <button style={btn("primary")} onClick={download}>⬇ Download PNG</button>
            <button style={btn("outline")} onClick={()=>window.open(display,"_blank")}>Open Link</button>
          </div>
        </div>
        <div style={{...card,flex:1,minWidth:260}}>
          <div style={{fontWeight:700,fontSize:14,fontFamily:F.head,marginBottom:4}}>Form URL</div>
          <p style={{fontSize:13,color:C.textMuted,margin:"0 0 14px",lineHeight:1.6}}>
            Auto-set to your live site. Update below if your URL has changed.
          </p>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,fontWeight:500,color:C.textSecondary,marginBottom:6}}>Registration URL</label>
            <input value={custom} onChange={e=>setCustom(e.target.value)}
              style={{...inputBase,borderColor:C.border}} placeholder="https://your-site.vercel.app/#register"/>
          </div>
          <button style={{...btn("gold"),width:"100%"}} onClick={()=>setDisplay(custom)}>Update QR Code</button>
          <div style={{marginTop:20,padding:14,background:C.greenXLight,borderRadius:8,fontSize:12,color:C.textSecondary,lineHeight:1.7}}>
            <strong style={{color:C.green}}>💡 Tip</strong><br/>
            Download the PNG → print on a card, banner, or welcome screen.<br/>
            Recommended print size: at least <strong>5 × 5 cm</strong> for reliable scanning.
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data Officer: First-Timers list ───────────────────────────────────────────
function FirstTimersList({ onEdit }) {
  const [data,setData]=useState([]);
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");

  const load=useCallback(async()=>{
    setLoading(true); setErr("");
    try { setData((await sb("first_timers?order=created_at.desc&limit=300"))||[]); }
    catch(e){ setErr(e.message); }
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const filtered=data.filter(r=>
    r.full_name?.toLowerCase().includes(search.toLowerCase())||r.phone?.includes(search));

  const dc={
    Member:    [C.green,   C.greenLight],
    Visitor:   [C.goldDark,C.goldLight ],
    Undecided: [C.amber,   C.amberLight],
  };

  return (
    <div>
      {CREDS_MISSING&&<CredsBanner/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>First-Timers Registry</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textMuted}}>{data.length} total records</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone…"
            style={{...inputBase,width:200,borderColor:C.border}}/>
          <button style={btn("outline")} onClick={load}>↺ Refresh</button>
        </div>
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      {loading?<p style={{color:C.textMuted}}>Loading…</p>:(
        <div style={{display:"grid",gap:10}}>
          {filtered.map(r=>{
            const [col,bg]=dc[r.membership_decision]||[C.textMuted,C.bg];
            return (
              <div key={r.id} style={{...card,display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:12,padding:"1rem 1.25rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:C.greenLight,
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                    fontSize:16,fontWeight:800,color:C.green,fontFamily:F.head}}>
                    {r.full_name?.charAt(0)||"?"}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,fontFamily:F.head}}>{r.full_name}</div>
                    <div style={{fontSize:12,color:C.textMuted}}>{r.phone} · {r.gender} · {r.service_date}</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span style={badge(col,bg)}>{r.membership_decision||"–"}</span>
                  <button style={btn("outline")} onClick={()=>onEdit(r)}>Edit</button>
                </div>
              </div>
            );
          })}
          {!loading&&filtered.length===0&&(
            <p style={{color:C.textMuted,textAlign:"center",marginTop:40}}>No records found.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Experience Team: Call Queue ───────────────────────────────────────────────
function CallQueue({ onLogFeedback }) {
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [filter,setFilter]=useState("pending");

  const load=useCallback(async()=>{
    setLoading(true); setErr("");
    try {
      const rows  = await sb("first_timers?order=created_at.desc&limit=300");
      const fbRows= await sb("call_feedback?select=first_timer_id,call_status,caller_name,created_at&order=created_at.desc");
      // keep only latest feedback per first_timer
      const fbMap={};
      (fbRows||[]).forEach(f=>{
        if (!fbMap[f.first_timer_id]) fbMap[f.first_timer_id]=f;
      });
      setData((rows||[]).map(r=>({...r, latestFb: fbMap[r.id]||null})));
    } catch(e){ setErr(e.message); }
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const pending  = data.filter(r=>!r.latestFb);
  const reached  = data.filter(r=>r.latestFb&&normaliseStatus(r.latestFb.call_status)==="Reached");
  const callback = data.filter(r=>r.latestFb&&normaliseStatus(r.latestFb.call_status)==="Call Back");
  const incorrect= data.filter(r=>r.latestFb&&normaliseStatus(r.latestFb.call_status)==="Incorrect Contact");

  const views={pending,reached,callback,incorrect,all:data};
  const filtered=views[filter]||data;

  const tabs=[
    {k:"pending",   label:`Pending (${pending.length})`,   col:C.gold   },
    {k:"callback",  label:`Call Back (${callback.length})`,col:C.amber  },
    {k:"reached",   label:`Reached (${reached.length})`,   col:C.green  },
    {k:"incorrect", label:`Incorrect (${incorrect.length})`,col:C.danger},
    {k:"all",       label:`All (${data.length})`,          col:C.textMuted},
  ];

  return (
    <div>
      {CREDS_MISSING&&<CredsBanner/>}
      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>Call Queue</h2>
        <p style={{margin:"4px 0 14px",fontSize:13,color:C.textMuted}}>
          Track and log calls for every first-timer
        </p>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setFilter(t.k)}
              style={{...btn(filter===t.k?"primary":"ghost"),padding:"6px 14px",fontSize:12,
                background:filter===t.k?t.col:C.bg,
                color:filter===t.k?"#fff":C.textSecondary,
                border:`1px solid ${filter===t.k?t.col:C.border}`}}>
              {t.label}
            </button>
          ))}
          <button style={{...btn("ghost"),padding:"6px 14px",fontSize:12,marginLeft:"auto"}} onClick={load}>↺</button>
        </div>
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      {loading?<p style={{color:C.textMuted}}>Loading…</p>:(
        <div style={{display:"grid",gap:10}}>
          {filtered.map(r=>{
            const fb=r.latestFb;
            const norm=fb?normaliseStatus(fb.call_status):null;
            const sm=fb?statusMeta(fb.call_status):{indicator:C.gold,bg:C.goldLight,label:"Pending"};
            return (
              <div key={r.id} style={{...card,display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:12,padding:"1rem 1.25rem"}}>
                <div style={{display:"flex",gap:12,alignItems:"center",flex:1,minWidth:0}}>
                  <div style={{width:40,height:40,borderRadius:"50%",flexShrink:0,
                    background:sm.bg,display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:800,color:sm.indicator,fontSize:15,fontFamily:F.head}}>
                    {r.full_name?.charAt(0)}
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:14,fontFamily:F.head}}>{r.full_name}</div>
                    <div style={{fontSize:12,color:C.textMuted}}>
                      {r.phone} · {r.membership_decision} · {r.service_date}
                    </div>
                    {fb?.caller_name&&(
                      <div style={{fontSize:11,color:C.textMuted,marginTop:2}}>
                        Last called by <strong>{fb.caller_name}</strong>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
                  <span style={{display:"flex",alignItems:"center",...badge(sm.indicator,sm.bg)}}>
                    <span style={dot(sm.indicator)}/>{sm.label}
                  </span>
                  <button style={btn("primary")} onClick={()=>onLogFeedback(r)}>Log Feedback</button>
                </div>
              </div>
            );
          })}
          {filtered.length===0&&(
            <p style={{color:C.textMuted,textAlign:"center",marginTop:40}}>No records in this category.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Call-back queue (Experience Team) ─────────────────────────────────────────
function CallBackQueue({ onLogFeedback }) {
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        const rows  = await sb("first_timers?order=created_at.desc&limit=300");
        const fbRows= await sb("call_feedback?select=first_timer_id,call_status,caller_name,follow_up_date,notes,created_at&order=created_at.desc");
        const fbMap={};
        (fbRows||[]).forEach(f=>{if(!fbMap[f.first_timer_id])fbMap[f.first_timer_id]=f;});
        const cb=(rows||[])
          .map(r=>({...r,latestFb:fbMap[r.id]||null}))
          .filter(r=>r.latestFb&&normaliseStatus(r.latestFb.call_status)==="Call Back");
        setData(cb);
      } catch(e){setErr(e.message);}
      setLoading(false);
    })();
  },[]);

  return (
    <div>
      {CREDS_MISSING&&<CredsBanner/>}
      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>Call Backs</h2>
        <p style={{margin:"4px 0 0",fontSize:13,color:C.textMuted}}>
          {data.length} people needing a follow-up call
        </p>
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      {loading?<p style={{color:C.textMuted}}>Loading…</p>:(
        <div style={{display:"grid",gap:10}}>
          {data.map(r=>{
            const fb=r.latestFb;
            return (
              <div key={r.id} style={{...card,padding:"1rem 1.25rem",
                borderLeft:`4px solid ${C.amber}`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,fontFamily:F.head}}>{r.full_name}</div>
                    <div style={{fontSize:12,color:C.textMuted}}>{r.phone} · {r.service_date}</div>
                    {fb?.follow_up_date&&(
                      <div style={{fontSize:12,color:C.amber,marginTop:3}}>
                        📅 Follow-up: {fb.follow_up_date}
                      </div>
                    )}
                    {fb?.notes&&(
                      <div style={{fontSize:12,color:C.textSecondary,marginTop:4,lineHeight:1.5}}>
                        Note: {fb.notes}
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap"}}>
                    <span style={{...badge(C.amber,C.amberLight),display:"flex",alignItems:"center"}}>
                      <span style={dot(C.amber)}/>Call Back
                    </span>
                    <button style={btn("primary")} onClick={()=>onLogFeedback(r)}>Log New Call</button>
                  </div>
                </div>
              </div>
            );
          })}
          {data.length===0&&(
            <div style={{...card,textAlign:"center",padding:"3rem",color:C.textMuted}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontWeight:700,fontFamily:F.head}}>No call-backs pending</div>
              <div style={{fontSize:13,marginTop:4}}>All follow-up calls are up to date.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Log Feedback (supports create + edit/update) ──────────────────────────────
function LogFeedback({ person, onBack, callerName="" }) {
  const BLANK_FB={
    call_status:"", experience_rating:"", returning_likelihood:"",
    notes:"", follow_up_date:"", caller_name:callerName,
    flagged_for_pastoral:false, flag_reason:"",
  };
  const [form,setForm]       =useState(BLANK_FB);
  const [existingId,setExistingId]=useState(null); // set if editing existing record
  const [loading,setLoading] =useState(false);
  const [fetching,setFetching]=useState(true);
  const [done,setDone]       =useState(false);
  const [err,setErr]         =useState("");
  const [isEdit,setIsEdit]   =useState(false);

  // On mount: check if feedback already exists for this person and pre-fill
  useEffect(()=>{
    (async()=>{
      setFetching(true);
      try {
        const rows=await sb(`call_feedback?first_timer_id=eq.${person.id}&order=created_at.desc&limit=1`);
        if (rows&&rows.length>0) {
          const r=rows[0];
          setExistingId(r.id);
          setIsEdit(true);
          setForm({
            call_status:          r.call_status||"",
            experience_rating:    r.experience_rating||"",
            returning_likelihood: r.returning||"",
            notes:                r.notes||"",
            follow_up_date:       r.follow_up_date||"",
            caller_name:          r.caller_name||callerName,
            flagged_for_pastoral: r.flagged_for_pastoral||false,
            flag_reason:          r.flag_reason||"",
          });
        }
      } catch(e){ /* no existing record is fine */ }
      setFetching(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[person.id]);

  const lsRef=useRef({});
  const lset=useCallback((key)=>{
    if (!lsRef.current[key]) {
      lsRef.current[key]=(e)=>{
        const val=e&&e.target!==undefined?e.target.value:e;
        setForm(f=>({...f,[key]:val}));
      };
    }
    return lsRef.current[key];
  },[]);

  const isReached=form.call_status==="Reached";

  const submit=async()=>{
    if (!form.call_status){setErr("Call status is required.");return;}
    if (!form.caller_name.trim()){setErr("Please enter your name as the caller.");return;}
    if (form.flagged_for_pastoral&&!form.flag_reason.trim()){
      setErr("Please describe the reason for flagging.");return;
    }
    setLoading(true); setErr("");
    try {
      const payload={
        first_timer_id:       person.id,
        call_status:          form.call_status,
        experience_rating:    isReached?(form.experience_rating||null):null,
        returning:            isReached?(form.returning_likelihood||null):null,
        notes:                form.notes||null,
        follow_up_date:       form.follow_up_date||null,
        caller_name:          form.caller_name,
        flagged_for_pastoral: form.flagged_for_pastoral,
        flag_reason:          form.flagged_for_pastoral?(form.flag_reason||null):null,
      };
      if (existingId) {
        // Update existing record
        await sb(`call_feedback?id=eq.${existingId}`,{method:"PATCH",body:JSON.stringify(payload)});
      } else {
        // Create new record
        await sb("call_feedback",{method:"POST",body:JSON.stringify(payload)});
      }
      setDone(true);
    } catch(e){setErr(e.message);}
    setLoading(false);
  };

  if (fetching) return <div style={{...card,textAlign:"center",padding:"3rem",color:C.textMuted}}>Loading…</div>;

  if (done) return (
    <div style={{...card,textAlign:"center",padding:"3rem"}}>
      <div style={{fontSize:48,marginBottom:12}}>✅</div>
      <h3 style={{color:C.green,fontFamily:F.head,margin:"0 0 8px"}}>
        Feedback {isEdit?"updated":"logged"} for {person.full_name}
      </h3>
      {form.flagged_for_pastoral&&(
        <div style={{...badge(C.flag,C.flagLight),marginTop:8,fontSize:13,display:"inline-block"}}>
          🚩 Flagged for Pastoral Team attention
        </div>
      )}
      <button style={{...btn("outline"),marginTop:20}} onClick={onBack}>← Back to queue</button>
    </div>
  );

  return (
    <div style={card}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,flexWrap:"wrap"}}>
        <button style={btn("ghost")} onClick={onBack}>←</button>
        <div>
          <h2 style={{margin:0,fontSize:18,fontFamily:F.head,fontWeight:800}}>
            {isEdit?"Update Feedback":"Log Feedback"} — {person.full_name}
          </h2>
          <p style={{margin:"3px 0 0",fontSize:13,color:C.textMuted}}>
            {person.phone} · visited {person.service_date}
          </p>
        </div>
      </div>
      {isEdit&&(
        <div style={{marginBottom:16,padding:"8px 14px",background:C.goldLight,
          borderRadius:8,fontSize:13,color:C.goldDark,fontWeight:600}}>
          ✏️ Editing existing feedback record — changes will overwrite the previous entry.
        </div>
      )}
      {CREDS_MISSING&&<CredsBanner/>}
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>

      <FieldInput label="Your Name (Caller)" id="cn" required
        value={form.caller_name} onChange={lset("caller_name")}
        placeholder="e.g. Tunde Adeyemi"
        hint="Identifies who made the call for activity tracking"/>

      <FieldInput label="Call Status" id="cs" type="select" required
        value={form.call_status} onChange={lset("call_status")}
        options={CALL_STATUS_OPTIONS}/>

      {form.call_status&&(()=>{
        const sm=statusMeta(form.call_status);
        return (
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:-8,marginBottom:16,
            padding:"8px 12px",borderRadius:8,background:sm.bg,fontSize:13,color:sm.indicator,fontWeight:600}}>
            <span style={dot(sm.indicator)}/>
            Will be logged as: <strong>{sm.label}</strong>
          </div>
        );
      })()}

      {isReached&&(
        <>
          <FieldInput label="Experience Rating" id="er" type="select"
            value={form.experience_rating} onChange={lset("experience_rating")}
            options={[{value:"Excellent",label:"Excellent"},{value:"Good",label:"Good"},
                      {value:"Average",label:"Average"},{value:"Poor",label:"Poor"}]}/>
          <FieldInput label="Returning?" id="rl" type="select"
            value={form.returning_likelihood} onChange={lset("returning_likelihood")}
            options={[{value:"Yes",label:"Yes — will return"},{value:"Maybe",label:"Maybe"},
                      {value:"No",label:"No"},{value:"Undecided",label:"Undecided"}]}/>
        </>
      )}

      {!isReached&&form.call_status&&(
        <FieldInput label="Scheduled Call-back Date" id="fd" type="date"
          value={form.follow_up_date} onChange={lset("follow_up_date")}
          hint="Set a date to remind the team to call back"/>
      )}

      <FieldInput label="Notes" id="nt" type="textarea"
        value={form.notes} onChange={lset("notes")}
        placeholder={isReached?"Key points from the conversation…":"Reason / any context for the team…"}/>

      <div style={{background:C.flagLight,border:`1px solid #FECACA`,borderRadius:10,
        padding:"16px",marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,fontFamily:F.head,color:C.flag,marginBottom:8}}>
          🚩 Flag for Pastoral Team
        </div>
        <FieldInput label="Flag this person for Pastoral Team attention" id="fp" type="toggle"
          value={form.flagged_for_pastoral} onChange={lset("flagged_for_pastoral")}
          hint="Use this if the visitor raised a concern, prayer request, or needs pastoral follow-up"/>
        {form.flagged_for_pastoral&&(
          <FieldInput label="Reason for flagging" id="fr" type="textarea" required
            value={form.flag_reason} onChange={lset("flag_reason")}
            placeholder="Describe the concern that needs pastoral attention…"/>
        )}
      </div>

      <button style={{...btn("primary"),width:"100%",padding:13,fontSize:15}}
        onClick={submit} disabled={loading}>
        {loading?"Saving…":isEdit?"Update Feedback":"Save Feedback"}
      </button>
    </div>
  );
}

// ── All Feedback ──────────────────────────────────────────────────────────────
function AllFeedback() {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [filter,setFilter]=useState("");
  const [search,setSearch]=useState("");

  useEffect(()=>{
    (async()=>{
      setLoading(true); setErr("");
      try {
        const data=await sb("call_feedback?select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc&limit=300");
        setRows(data||[]);
      } catch(e){setErr(e.message);}
      setLoading(false);
    })();
  },[]);

  const filtered=rows.filter(r=>{
    const norm=normaliseStatus(r.call_status);
    const matchFilter=!filter||norm===filter;
    const ft=r.first_timers||{};
    const matchSearch=!search||
      ft.full_name?.toLowerCase().includes(search.toLowerCase())||
      r.caller_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter&&matchSearch;
  });

  return (
    <div>
      {CREDS_MISSING&&<CredsBanner/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:20,flexWrap:"wrap",gap:12}}>
        <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>
          All Feedback ({rows.length})
        </h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search name or caller…" style={{...inputBase,width:180,borderColor:C.border}}/>
          <select value={filter} onChange={e=>setFilter(e.target.value)}
            style={{...inputBase,width:180,borderColor:C.border}}>
            <option value="">All statuses</option>
            <option value="Reached">Reached</option>
            <option value="Call Back">Call Back</option>
            <option value="Incorrect Contact">Incorrect Contact</option>
          </select>
        </div>
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      {loading?<p style={{color:C.textMuted}}>Loading…</p>:(
        <div style={{display:"grid",gap:10}}>
          {filtered.map(r=>{
            const ft=r.first_timers||{};
            const sm=statusMeta(r.call_status);
            return (
              <div key={r.id} style={{...card,padding:"1rem 1.25rem",
                borderLeft:r.flagged_for_pastoral?`4px solid ${C.flag}`:`4px solid ${sm.indicator}`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:14,fontFamily:F.head}}>{ft.full_name}</span>
                    <span style={{fontSize:12,color:C.textMuted,marginLeft:8}}>{ft.phone} · {ft.service_date}</span>
                    {r.caller_name&&(
                      <span style={{fontSize:12,color:C.textMuted,marginLeft:8}}>· Called by <strong>{r.caller_name}</strong></span>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    {r.flagged_for_pastoral&&(
                      <span style={{...badge(C.flag,C.flagLight),fontSize:11}}>🚩 Flagged</span>
                    )}
                    <span style={{...badge(sm.indicator,sm.bg),display:"flex",alignItems:"center"}}>
                      <span style={dot(sm.indicator)}/>{sm.label}
                    </span>
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:(r.notes||r.flag_reason)?8:0}}>
                  {r.experience_rating&&<span style={{...badge(C.textSecondary,C.bg),fontSize:11}}>Rating: {r.experience_rating}</span>}
                  {r.returning&&<span style={{...badge(C.goldDark,C.goldLight),fontSize:11}}>Returning: {r.returning}</span>}
                  {r.follow_up_date&&<span style={{...badge(C.amber,C.amberLight),fontSize:11}}>Follow-up: {r.follow_up_date}</span>}
                </div>
                {r.notes&&<p style={{margin:"0 0 4px",fontSize:13,color:C.textSecondary,lineHeight:1.55}}>{r.notes}</p>}
                {r.flag_reason&&(
                  <p style={{margin:0,fontSize:13,color:C.flag,lineHeight:1.55,
                    background:C.flagLight,padding:"6px 10px",borderRadius:6}}>
                    🚩 {r.flag_reason}
                  </p>
                )}
              </div>
            );
          })}
          {filtered.length===0&&<p style={{color:C.textMuted,textAlign:"center",marginTop:40}}>No feedback yet.</p>}
        </div>
      )}
    </div>
  );
}

// ── Flagged Records ───────────────────────────────────────────────────────────
function FlaggedRecords() {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");

  useEffect(()=>{
    (async()=>{
      setLoading(true); setErr("");
      try {
        const data=await sb("call_feedback?flagged_for_pastoral=eq.true&select=*,first_timers(full_name,phone,gender,membership_decision,service_date)&order=created_at.desc");
        setRows(data||[]);
      } catch(e){setErr(e.message);}
      setLoading(false);
    })();
  },[]);

  return (
    <div>
      {CREDS_MISSING&&<CredsBanner/>}
      <div style={{marginBottom:24}}>
        <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>🚩 Flagged for Pastoral</h2>
        <p style={{margin:"4px 0 0",fontSize:13,color:C.textMuted}}>
          {rows.length} record{rows.length!==1?"s":""} requiring pastoral attention
        </p>
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      {loading?<p style={{color:C.textMuted}}>Loading…</p>:(
        <div style={{display:"grid",gap:12}}>
          {rows.map(r=>{
            const ft=r.first_timers||{};
            const sm=statusMeta(r.call_status);
            return (
              <div key={r.id} style={{...card,borderLeft:`4px solid ${C.flag}`,padding:"1.1rem 1.25rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:15,fontFamily:F.head}}>{ft.full_name}</div>
                    <div style={{fontSize:12,color:C.textMuted}}>{ft.phone} · {ft.service_date}</div>
                    {r.caller_name&&(
                      <div style={{fontSize:12,color:C.textMuted,marginTop:2}}>
                        Reported by <strong>{r.caller_name}</strong>
                      </div>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"flex-start",flexWrap:"wrap"}}>
                    <span style={badge(C.flag,C.flagLight)}>🚩 Flagged</span>
                    <span style={{...badge(sm.indicator,sm.bg),display:"flex",alignItems:"center"}}>
                      <span style={dot(sm.indicator)}/>{sm.label}
                    </span>
                  </div>
                </div>
                <div style={{background:C.flagLight,borderRadius:8,padding:"10px 14px",
                  fontSize:13,color:C.flag,lineHeight:1.6}}>
                  <strong>Reason flagged:</strong> {r.flag_reason||"No reason provided"}
                </div>
                {r.notes&&(
                  <p style={{margin:"8px 0 0",fontSize:13,color:C.textSecondary,lineHeight:1.55}}>
                    <strong>Call notes:</strong> {r.notes}
                  </p>
                )}
              </div>
            );
          })}
          {rows.length===0&&(
            <div style={{...card,textAlign:"center",padding:"3rem",color:C.textMuted}}>
              <div style={{fontSize:36,marginBottom:8}}>✅</div>
              <div style={{fontWeight:700,fontFamily:F.head}}>No flagged records</div>
              <div style={{fontSize:13,marginTop:4}}>Nothing requires pastoral attention right now.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Pastoral Report ───────────────────────────────────────────────────────────
function Report() {
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [dateFrom,setDateFrom]=useState("");
  const [dateTo,setDateTo]=useState("");

  const load=useCallback(async()=>{
    setLoading(true); setErr("");
    try {
      let q="first_timers?select=membership_decision,life_stage,gender,areas_of_interest";
      if (dateFrom) q+=`&service_date=gte.${dateFrom}`;
      if (dateTo)   q+=`&service_date=lte.${dateTo}`;

      const ft=await sb(q)||[];
      const fb=await sb("call_feedback?select=call_status,experience_rating,returning,caller_name,flagged_for_pastoral")||[];

      const tally=(arr,key)=>arr.reduce((a,r)=>{
        const v=r[key]||"Unknown"; a[v]=(a[v]||0)+1; return a;
      },{});

      // safe areas tally — handles string, array, null, bad JSON
      const areasTally={};
      ft.forEach(r=>{
        parseAreas(r.areas_of_interest).forEach(v=>{
          areasTally[v]=(areasTally[v]||0)+1;
        });
      });

      // caller performance
      const callerTally={};
      fb.forEach(f=>{
        if (!f.caller_name) return;
        if (!callerTally[f.caller_name]) callerTally[f.caller_name]={total:0,reached:0};
        callerTally[f.caller_name].total++;
        if (normaliseStatus(f.call_status)==="Reached") callerTally[f.caller_name].reached++;
      });

      // normalise call statuses for display
      const callStatusNorm={};
      fb.forEach(f=>{
        const n=normaliseStatus(f.call_status)||"Unknown";
        callStatusNorm[n]=(callStatusNorm[n]||0)+1;
      });

      setStats({
        total:      ft.length,
        totalCalls: fb.length,
        flagged:    fb.filter(f=>f.flagged_for_pastoral).length,
        decisions:  tally(ft,"membership_decision"),
        lifeStage:  tally(ft,"life_stage"),
        gender:     tally(ft,"gender"),
        callStatus: callStatusNorm,
        rating:     tally(fb,"experience_rating"),
        returning:  tally(fb,"returning"),
        areas:      areasTally,
        callers:    callerTally,
      });
    } catch(e){setErr(e.message);}
    setLoading(false);
  },[dateFrom,dateTo]);

  useEffect(()=>{load();},[load]);

  if (loading) return <p style={{color:C.textMuted}}>Loading report…</p>;

  const Bar=({label,value,max,color})=>(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
        <span style={{color:C.textSecondary}}>{label}</span>
        <span style={{fontWeight:600,color:C.textPrimary}}>{value}</span>
      </div>
      <div style={{height:8,background:C.border,borderRadius:4}}>
        <div style={{height:8,borderRadius:4,transition:"width .5s",
          background:color||C.green,width:`${Math.round((value/(max||1))*100)}%`}}/>
      </div>
    </div>
  );

  const SH=({t})=>(
    <div style={{fontSize:11,fontWeight:700,letterSpacing:".07em",color:C.textMuted,
      textTransform:"uppercase",marginBottom:16,fontFamily:F.head}}>{t}</div>
  );

  const maxD=Math.max(...Object.values(stats?.decisions||{}),1);
  const maxA=Math.max(...Object.values(stats?.areas||{}),1);
  const maxC=Math.max(...Object.values(stats?.callStatus||{}),1);

  const csColor=(k)=>k==="Reached"?C.green:k==="Call Back"?C.amber:C.danger;

  return (
    <div>
      {CREDS_MISSING&&<CredsBanner/>}
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",
        marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>Pastoral Report</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textMuted}}>Membership retention overview</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{...inputBase,width:150,borderColor:C.border}}/>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}
            style={{...inputBase,width:150,borderColor:C.border}}/>
          <button style={btn("primary")} onClick={load}>Filter</button>
        </div>
      </div>

      {stats&&(
        <>
          <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
            <Stat label="First-Timers"  value={stats.total}                       accent={C.green}   />
            <Stat label="Calls Logged"  value={stats.totalCalls}                  accent={C.greenMid}/>
            <Stat label="Members"       value={stats.decisions["Member"]    ||0}  accent={C.goldDark}/>
            <Stat label="Flagged"       value={stats.flagged}                     accent={C.flag}
              sub={stats.flagged>0?"Needs pastoral attention":""}/>
          </div>

          <div className="greport" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={card}>
              <SH t="Membership Decision"/>
              {Object.entries(stats.decisions).map(([k,v])=>(
                <Bar key={k} label={k} value={v} max={maxD}
                  color={k==="Member"?C.green:k==="Visitor"?C.goldMid:C.amber}/>
              ))}
              {!Object.keys(stats.decisions).length&&<p style={{color:C.textMuted,fontSize:13}}>No data yet.</p>}
            </div>

            <div style={card}>
              <SH t="Call Outcomes"/>
              {Object.entries(stats.callStatus).map(([k,v])=>(
                <Bar key={k} label={k} value={v} max={maxC} color={csColor(k)}/>
              ))}
              {!Object.keys(stats.callStatus).length&&<p style={{color:C.textMuted,fontSize:13}}>No data yet.</p>}
            </div>

            <div style={card}>
              <SH t="Returning Likelihood"/>
              {Object.entries(stats.returning).map(([k,v])=>(
                <Bar key={k} label={k} value={v}
                  max={Math.max(...Object.values(stats.returning),1)}
                  color={k==="Yes"?C.green:k==="Maybe"?C.gold:C.danger}/>
              ))}
              {!Object.keys(stats.returning).length&&<p style={{color:C.textMuted,fontSize:13}}>No data yet.</p>}
            </div>

            <div style={card}>
              <SH t="Gender & Life Stage"/>
              {Object.entries(stats.gender).map(([k,v])=>(
                <Bar key={k} label={k} value={v} max={stats.total}
                  color={k==="Female"?C.goldMid:C.green}/>
              ))}
              <div style={{borderTop:`1px solid ${C.border}`,marginTop:12,paddingTop:12}}>
                {Object.entries(stats.lifeStage).map(([k,v])=>(
                  <Bar key={k} label={k} value={v} max={stats.total} color={C.greenMid}/>
                ))}
              </div>
            </div>

            {/* Caller performance */}
            <div style={card}>
              <SH t="Caller Activity"/>
              {Object.entries(stats.callers).sort((a,b)=>b[1].total-a[1].total).map(([name,s])=>(
                <div key={name} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                    <span style={{color:C.textSecondary,fontWeight:500}}>{name}</span>
                    <span style={{color:C.textMuted,fontSize:12}}>
                      {s.reached}/{s.total} reached
                    </span>
                  </div>
                  <div style={{height:8,background:C.border,borderRadius:4}}>
                    <div style={{height:8,borderRadius:4,background:C.green,
                      width:`${Math.round((s.total/Math.max(...Object.values(stats.callers).map(x=>x.total),1))*100)}%`}}/>
                  </div>
                </div>
              ))}
              {!Object.keys(stats.callers).length&&<p style={{color:C.textMuted,fontSize:13}}>No calls logged yet.</p>}
            </div>

            <div style={{...card,gridColumn:"1 / -1"}}>
              <SH t="Areas of Interest"/>
              <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 32px"}}>
                {Object.entries(stats.areas).map(([k,v])=>{
                  const label=AREAS.find(a=>a.value===k)?.label.split("(")[0].trim()||k;
                  return <Bar key={k} label={label} value={v} max={maxA} color={C.greenMid}/>;
                })}
                {!Object.keys(stats.areas).length&&<p style={{color:C.textMuted,fontSize:13}}>No area data yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin: Overview ───────────────────────────────────────────────────────────
function AdminOverview({ setActive }) {
  const [counts,setCounts]=useState({ft:0,fb:0,flagged:0,users:0});
  useEffect(()=>{
    (async()=>{
      try {
        const ft=await sb("first_timers?select=id");
        const fb=await sb("call_feedback?select=id");
        const fl=await sb("call_feedback?flagged_for_pastoral=eq.true&select=id");
        const us=await sb("app_users?select=id");
        setCounts({ft:(ft||[]).length,fb:(fb||[]).length,flagged:(fl||[]).length,users:(us||[]).length});
      } catch{}
    })();
  },[]);
  return (
    <div>
      <h2 style={{margin:"0 0 6px",fontSize:22,fontFamily:F.head,fontWeight:800}}>Admin Overview</h2>
      <p style={{margin:"0 0 24px",fontSize:13,color:C.textMuted}}>System-wide summary</p>
      <div className="g4" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
        <Stat label="First-Timers"   value={counts.ft}      accent={C.green}/>
        <Stat label="Calls Logged"   value={counts.fb}      accent={C.greenMid}/>
        <Stat label="Flagged"        value={counts.flagged}  accent={C.flag}/>
        <Stat label="System Users"   value={counts.users}   accent={C.goldDark}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
        {[
          {id:"admin_users",label:"Manage Users",icon:"👤",desc:"View, edit and deactivate staff accounts"},
          {id:"admin_adduser",label:"Add New User",icon:"➕",desc:"Create a new staff account and assign a role"},
          {id:"firsttimers",label:"First-Timers",icon:"👥",desc:"Browse and edit all visitor records"},
          {id:"report",label:"Full Report",icon:"📊",desc:"View the Pastoral retention dashboard"},
          {id:"flagged",label:"Flagged Records",icon:"🚩",desc:"Review escalated cases"},
        ].map(item=>(
          <button key={item.id} onClick={()=>setActive(item.id)}
            style={{...card,textAlign:"left",cursor:"pointer",border:`1px solid ${C.border}`,
              padding:"1.1rem",transition:"border-color .15s"}}
            onMouseOver={e=>e.currentTarget.style.borderColor=C.green}
            onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{fontSize:24,marginBottom:8}}>{item.icon}</div>
            <div style={{fontWeight:700,fontSize:14,fontFamily:F.head,marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Admin: Users list ─────────────────────────────────────────────────────────
function AdminUsers({ onEdit }) {
  const [users,setUsers]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [msg,setMsg]=useState("");

  const load=useCallback(async()=>{
    setLoading(true);
    try { setUsers((await sb("app_users?order=created_at.desc"))||[]); }
    catch(e){ setErr(e.message); }
    setLoading(false);
  },[]);
  useEffect(()=>{load();},[load]);

  const toggleActive=async(u)=>{
    try {
      await sb(`app_users?id=eq.${u.id}`,{method:"PATCH",body:JSON.stringify({is_active:!u.is_active})});
      setMsg(`${u.username} ${u.is_active?"deactivated":"reactivated"}.`);
      load();
    } catch(e){setErr(e.message);}
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:0,fontSize:22,fontFamily:F.head,fontWeight:800}}>System Users</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:C.textMuted}}>{users.length} accounts</p>
        </div>
        <button style={btn("outline")} onClick={load}>↺ Refresh</button>
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>
      <Alert type="success" msg={msg} onClose={()=>setMsg("")}/>
      {loading?<p style={{color:C.textMuted}}>Loading…</p>:(
        <div style={{display:"grid",gap:10}}>
          {users.map(u=>{
            const rm=ROLE_META[u.role]||ROLE_META.dofficer;
            return (
              <div key={u.id} style={{...card,display:"flex",justifyContent:"space-between",
                alignItems:"center",flexWrap:"wrap",gap:12,padding:"1rem 1.25rem",
                opacity:u.is_active?1:.55}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:C.greenLight,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontWeight:800,color:C.green,fontSize:15,fontFamily:F.head,flexShrink:0}}>
                    {(u.display_name||u.username||"?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,fontFamily:F.head}}>
                      {u.display_name||u.username}
                    </div>
                    <div style={{fontSize:12,color:C.textMuted}}>@{u.username}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={badge(rm.col,rm.bg)}>{rm.label}</span>
                  {!u.is_active&&<span style={badge(C.danger,C.dangerLight)}>Inactive</span>}
                  <button style={btn("outline")} onClick={()=>onEdit(u)}>Edit</button>
                  <button style={btn(u.is_active?"danger":"ghost")} onClick={()=>toggleActive(u)}>
                    {u.is_active?"Deactivate":"Reactivate"}
                  </button>
                </div>
              </div>
            );
          })}
          {users.length===0&&<p style={{color:C.textMuted,textAlign:"center",marginTop:40}}>No users yet.</p>}
        </div>
      )}
    </div>
  );
}

// ── Admin: Add / Edit User ────────────────────────────────────────────────────
function AdminAddUser({ editUser, onSuccess, onCancel }) {
  const [form,setForm]=useState({
    username:   editUser?.username   ||"",
    password:   "",
    display_name: editUser?.display_name||"",
    role:       editUser?.role       ||"expteam",
    is_active:  editUser?.is_active  ??true,
  });
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  const settersRef=useRef({});
  const set=useCallback((key)=>{
    if (!settersRef.current[key]) {
      settersRef.current[key]=(valOrEvt)=>{
        const val=valOrEvt&&valOrEvt.target!==undefined?valOrEvt.target.value:valOrEvt;
        setForm(f=>({...f,[key]:val}));
      };
    }
    return settersRef.current[key];
  },[]);

  const submit=async()=>{
    if (!form.username.trim()){setErr("Username is required.");return;}
    if (!editUser&&!form.password.trim()){setErr("Password is required for new users.");return;}
    setLoading(true); setErr("");
    try {
      const payload={
        username:     form.username.trim().toLowerCase(),
        display_name: form.display_name.trim()||form.username.trim(),
        role:         form.role,
        is_active:    form.is_active,
        ...(form.password.trim()?{password_hash:form.password.trim()}:{}),
      };
      if (editUser?.id) {
        await sb(`app_users?id=eq.${editUser.id}`,{method:"PATCH",body:JSON.stringify(payload)});
      } else {
        await sb("app_users",{method:"POST",body:JSON.stringify(payload)});
      }
      onSuccess();
    } catch(e){setErr(e.message);}
    setLoading(false);
  };

  return (
    <div style={card}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24,flexWrap:"wrap",gap:10}}>
        <h2 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:800}}>
          {editUser?"Edit User":"Add New User"}
        </h2>
        {onCancel&&<button style={btn("ghost")} onClick={onCancel}>← Back</button>}
      </div>
      <Alert type="error" msg={err} onClose={()=>setErr("")}/>

      <div className="g2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
        <FieldInput label="Username" id="un" required value={form.username} onChange={set("username")}
          placeholder="e.g. expteam2" hint="Lowercase, no spaces. Used to log in."/>
        <FieldInput label="Display Name" id="dn" value={form.display_name} onChange={set("display_name")}
          placeholder="e.g. Tunde Adeyemi" hint="Full name shown on dashboard"/>
      </div>
      <FieldInput label={editUser?"New Password (leave blank to keep current)":"Password"} id="pw"
        type="password" required={!editUser} value={form.password} onChange={set("password")}
        placeholder="••••••••"/>
      <FieldInput label="Role" id="rl" type="select" required value={form.role} onChange={set("role")}
        options={[
          {value:"dofficer",label:"Data Officer"},
          {value:"expteam", label:"Experience Team"},
          {value:"pasteam", label:"Pastoral Team"},
          {value:"admin",   label:"Admin"},
        ]}/>

      <div style={{background:C.greenXLight,borderRadius:8,padding:"12px 14px",marginBottom:16,
        fontSize:13,color:C.textSecondary,lineHeight:1.7}}>
        <strong>Role permissions:</strong><br/>
        <strong>Data Officer</strong> — Add/edit first-timer records, generate QR code<br/>
        <strong>Experience Team</strong> — Call queue, log feedback, flag for pastoral<br/>
        <strong>Pastoral Team</strong> — View report, all feedback, flagged records<br/>
        <strong>Admin</strong> — All of the above + user management
      </div>

      <button style={{...btn("primary"),width:"100%",padding:13,fontSize:15}}
        onClick={submit} disabled={loading}>
        {loading?"Saving…":editUser?"Update User":"Create User"}
      </button>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
// Authenticates against app_users table in Supabase.
// Falls back to hardcoded accounts if DB not reachable (for initial setup).
const FALLBACK_ACCOUNTS = [
  {username:"admin",    password:"admin1",    role:"admin",    display_name:"Administrator"},
  {username:"dofficer1",password:"dofficer1", role:"dofficer", display_name:"Data Officer"},
  {username:"expteam1", password:"expteam1",  role:"expteam",  display_name:"Experience Team"},
  {username:"pasteam1", password:"pasteam1",  role:"pasteam",  display_name:"Pastoral Team"},
];

function Login({ onLogin }) {
  const [u,setU]=useState("");
  const [p,setP]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);

  const submit=async()=>{
    if (!u.trim()||!p.trim()){setErr("Enter your username and password.");return;}
    setLoading(true); setErr("");
    try {
      // Try DB first
      const rows=await sb(`app_users?username=eq.${u.trim().toLowerCase()}&is_active=eq.true&select=*`);
      if (rows&&rows.length>0) {
        const user=rows[0];
        // password stored as plain text in password_hash for demo — replace with bcrypt in production
        if (user.password_hash===p.trim()) {
          onLogin(user.role,user.display_name||user.username); setLoading(false); return;
        }
        setErr("Incorrect password."); setLoading(false); return;
      }
    } catch {
      // DB unavailable — fall through to hardcoded fallback
    }
    // Fallback
    const match=FALLBACK_ACCOUNTS.find(a=>a.username===u.trim()&&a.password===p.trim());
    if (match){onLogin(match.role,match.display_name);setLoading(false);return;}
    setErr("Invalid username or password."); setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.body,
      display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{...card,width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:16}}><Logo size={72}/></div>
          <h2 style={{margin:0,color:C.textPrimary,fontFamily:F.head,fontWeight:800,fontSize:22}}>The Envoys</h2>
          <p style={{margin:"6px 0 0",fontSize:13,color:C.textMuted}}>Membership Retention Dashboard</p>
        </div>
        {CREDS_MISSING&&<CredsBanner/>}
        <Alert type="error" msg={err} onClose={()=>setErr("")}/>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:13,fontWeight:500,color:C.textSecondary,marginBottom:6}}>Username</label>
          <input value={u} onChange={e=>setU(e.target.value)} placeholder="e.g. dofficer1"
            style={{...inputBase,borderColor:C.border}}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:13,fontWeight:500,color:C.textSecondary,marginBottom:6}}>Password</label>
          <input type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="••••••••"
            style={{...inputBase,borderColor:C.border}}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        </div>
        <button style={{...btn("primary"),width:"100%",padding:13,fontSize:15}}
          onClick={submit} disabled={loading}>
          {loading?"Signing in…":"Sign In"}
        </button>
        <div style={{marginTop:20,padding:12,background:C.greenXLight,borderRadius:8,
          fontSize:12,color:C.textSecondary}}>
          <strong>Default credentials:</strong> admin / admin1 · dofficer1 · expteam1 · pasteam1
        </div>
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session,       setSession]      =useState(null);
  const [active,        setActive]       =useState(null);
  const [editTarget,    setEditTarget]   =useState(null);
  const [feedbackTarget,setFeedbackTarget]=useState(null);
  const [editUser,      setEditUser]     =useState(null);
  const [showPublic,    setShowPublic]   =useState(false);
  const [mobileOpen,    setMobileOpen]   =useState(false);
  const [flagCount,     setFlagCount]    =useState(0);

  useEffect(()=>{
    const p=window.location.pathname;
    const h=window.location.hash;
    if (p==="/register"||p==="/register/"||h==="#register") setShowPublic(true);
  },[]);

  // Poll flagged count for sidebar badge
  useEffect(()=>{
    if (!session) return;
    (async()=>{
      try {
        const fl=await sb("call_feedback?flagged_for_pastoral=eq.true&select=id");
        setFlagCount((fl||[]).length);
      } catch{}
    })();
  },[session]);

  const login =(role,user)=>{ setSession({role,user}); setActive(NAV[role][0].id); };
  const logout=()=>{ setSession(null); setActive(null); };
  const navTo =(v)=>{ setActive(v); setEditTarget(null); setFeedbackTarget(null); setEditUser(null); setMobileOpen(false); };

  if (showPublic) return <PublicForm/>;
  if (!session)   return <Login onLogin={login}/>;

  const {role,user}=session;
  const pageTitle=NAV[role]?.find(n=>n.id===active)?.label||"Dashboard";

  const renderContent=()=>{
    // Admin
    if (active==="admin_overview") return <AdminOverview setActive={navTo}/>;
    if (active==="admin_adduser") {
      if (editUser) return <AdminAddUser editUser={editUser} onCancel={()=>{setEditUser(null);navTo("admin_users");}}
        onSuccess={()=>{setEditUser(null);navTo("admin_users");}}/>;
      return <AdminAddUser onSuccess={()=>navTo("admin_users")} onCancel={()=>navTo("admin_overview")}/>;
    }
    if (active==="admin_users") {
      if (editUser) return <AdminAddUser editUser={editUser}
        onCancel={()=>setEditUser(null)} onSuccess={()=>{setEditUser(null);navTo("admin_users");}}/>;
      return <AdminUsers onEdit={(u)=>setEditUser(u)}/>;
    }

    // Shared
    if (active==="addmember") return <FirstTimerForm onSuccess={()=>navTo("firsttimers")}/>;
    if (active==="qrcode")    return <QRCodePage/>;
    if (active==="allfeedback") return <AllFeedback/>;
    if (active==="report")      return <Report/>;
    if (active==="flagged")     return <FlaggedRecords/>;

    if (active==="firsttimers") {
      if (editTarget) return <FirstTimerForm editData={editTarget}
        onCancel={()=>setEditTarget(null)}
        onSuccess={()=>{setEditTarget(null);navTo("firsttimers");}}/>;
      return <FirstTimersList onEdit={r=>setEditTarget(r)}/>;
    }

    if (active==="callqueue") {
      if (feedbackTarget) return <LogFeedback person={feedbackTarget} callerName={user}
        onBack={()=>setFeedbackTarget(null)}/>;
      return <CallQueue onLogFeedback={r=>setFeedbackTarget(r)}/>;
    }

    if (active==="callbacks") {
      if (feedbackTarget) return <LogFeedback person={feedbackTarget} callerName={user}
        onBack={()=>setFeedbackTarget(null)}/>;
      return <CallBackQueue onLogFeedback={r=>setFeedbackTarget(r)}/>;
    }

    return null;
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:F.body,color:C.textPrimary}}>
      <MobileHeader onMenu={()=>setMobileOpen(true)} title={pageTitle}/>
      <Sidebar role={role} active={active} setActive={navTo} user={user}
        onLogout={logout} mobileOpen={mobileOpen} onClose={()=>setMobileOpen(false)}
        flagCount={flagCount}/>
      <div className="main-content" style={{marginLeft:230,padding:"2rem",minHeight:"100vh"}}>
        <div style={{maxWidth:920}}>{renderContent()}</div>
      </div>
    </div>
  );
}