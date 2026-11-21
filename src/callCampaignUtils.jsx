import { sb } from "./lib/supabase.js";

export const CALL_OUTCOMES = [
  ["reachable", "Reachable"],
  ["call_back_later", "Call Back Later"],
  ["unavailable", "Unavailable"],
  ["invalid_number", "Invalid Number"],
  ["wrong_contact", "Wrong Contact"],
];

export function invokeCallCampaign(functionName, body) {
  return sb(`rpc/${functionName}`, { method: "POST", body: JSON.stringify(body) }).then(result => Array.isArray(result) ? result[0] : result);
}

export function parseCallCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  const source = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const content = rows.filter(values => values.some(value => value.trim()));
  if (content.length < 2) return [];
  const headers = content[0].map(value => value.trim().toLowerCase());
  return content.slice(1).map(values => Object.fromEntries(headers.map((header, i) => [header, (values[i] || "").trim()])));
}

export function downloadCallCSV(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function callStatusLabel(status) {
  return CALL_OUTCOMES.find(([value]) => value === status)?.[1] || (status === "pending" ? "Not called" : status || "Unassigned");
}

export function normalizeNigerianPhone(phone) {
  const source = String(phone ?? "").trim();
  const digits = source.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return `+${digits}`;
  if (!source.startsWith("+") && digits.length === 11 && digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (!source.startsWith("+") && digits.length === 10) return `+234${digits}`;
  return `+${digits}`;
}

export function normalizeCallerPhone(phone) {
  return normalizeNigerianPhone(phone).replace(/\D/g, "");
}

export function Field({ label, hint, children }) {
  return <label className="campaign-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function CallPageFrame({ eyebrow, title, subtitle, children, wide = false }) {
  return <main className={`outbound-calls${wide ? " outbound-calls-wide" : ""}`}><div className={`outbound-shell${wide ? " outbound-shell-wide" : ""}`}>
    <header className="outbound-header">
      <span className="outbound-kicker">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
    {children}
  </div></main>;
}
