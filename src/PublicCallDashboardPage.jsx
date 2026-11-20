import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, CircleCheck, ContactRound, Download, KeyRound, PhoneCall, RefreshCw, Search, UserRound, Users } from "lucide-react";
import { CallPageFrame, callStatusLabel, downloadCallCSV, Field, invokeCallCampaign, normalizeNigerianPhone } from "./callCampaignUtils.jsx";

const OUTCOMES = [
  ["not_called", "Not called"],
  ["reachable", "Reachable"],
  ["call_back_later", "Call Back Later"],
  ["unavailable", "Unavailable"],
  ["invalid_number", "Invalid Number"],
  ["wrong_contact", "Wrong Contact"],
];

function formatCreatedDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function PublicCallDashboardPage() {
  const [campaignKey, setCampaignKey] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const openDashboard = async event => {
    event?.preventDefault();
    const key = campaignKey.trim();
    if (key.length < 20) {
      setError("Enter the campaign key with at least 20 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await invokeCallCampaign("get_public_outbound_call_campaign_dashboard", { p_campaign_key: key });
      if (!result?.campaign) {
        setData(null);
        setError("That campaign key was not recognized. Check the key and try again.");
      } else {
        setData(result);
      }
    } catch (err) {
      setData(null);
      setError(err.message || "Unable to load the campaign dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const metrics = data?.metrics;
  const total = Number(metrics?.total_contacts || 0);
  const outcomes = OUTCOMES.map(([key, label]) => [label, Number(metrics?.[key] || 0)]);
  const maxOutcome = Math.max(1, ...outcomes.map(([, count]) => count));
  const contacts = data?.contacts || [];
  const visibleContacts = useMemo(() => contacts.filter(contact => {
    const searchable = `${contact.full_name || ""} ${normalizeNigerianPhone(contact.phone)} ${contact.caller_name || ""}`.toLowerCase();
    return (!query || searchable.includes(query.toLowerCase())) && (statusFilter === "all" || (contact.status || "pending") === statusFilter);
  }), [contacts, query, statusFilter]);

  const downloadResponses = () => {
    const header = ["Name", "Phone", "Membership status", "Caller", "Current status", "Attempts", "Call status", "Feedback", "Callback time", "Call time"];
    const rows = contacts.flatMap(contact => {
      const logs = contact.logs?.length ? contact.logs : [{ outcome: "", feedback: "", callback_at: "", created_at: "" }];
      return logs.map(log => [contact.full_name, normalizeNigerianPhone(contact.phone), contact.membership_status, contact.caller_name, callStatusLabel(contact.status), contact.attempt_count, callStatusLabel(log.outcome), log.feedback, log.callback_at, log.created_at]);
    });
    const filename = `${(data?.campaign?.name || "campaign").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-responses.csv`;
    downloadCallCSV(filename, [header, ...rows]);
  };

  return <CallPageFrame eyebrow="Outreach workspace" title="Campaign manager" subtitle="Review progress, caller activity and every logged response." wide>
    <nav className="public-call-dashboard-nav" aria-label="Call campaign pages">
      <a className="campaign-nav-current" href="/calls-dashboard" aria-current="page"><BarChart3 size={18} aria-hidden="true" /> Analytics dashboard</a>
      <div className="campaign-nav-actions">
        <a className="campaign-button secondary" href="/members-followup"><UserRound size={17} aria-hidden="true" /> Caller page</a>
        <a className="campaign-button secondary" href="/calls/allocate"><ContactRound size={17} aria-hidden="true" /> Allocate contacts</a>
      </div>
    </nav>
    {!data && <section className="outbound-panel public-call-key-panel">
      <div className="outbound-section-heading"><span className="outbound-icon"><KeyRound size={19} aria-hidden="true" /></span><div><h2>Open a campaign dashboard</h2><p>Enter the campaign key shared with the pastorate team to view its progress.</p></div></div>
      <form className="public-call-key-form" onSubmit={openDashboard}>
        <Field label="Campaign key"><input type="password" value={campaignKey} onChange={event => setCampaignKey(event.target.value)} placeholder="Enter campaign key" autoComplete="one-time-code" minLength={20} required /></Field>
        <button className="campaign-button" type="submit" disabled={loading}>{loading ? "Loading dashboard…" : "Open dashboard"}</button>
      </form>
      {error && <p className="campaign-error" role="alert">{error}</p>}
    </section>}
    {data?.campaign && <>
      <div className="public-call-campaign-heading">
        <div><span className="outbound-kicker">{data.campaign.status === "closed" ? "Closed campaign" : "Active campaign"}</span><h2>{data.campaign.name}</h2><p><CalendarDays size={15} aria-hidden="true" /> Created {formatCreatedDate(data.campaign.created_at)}</p></div>
        <button className="campaign-icon-button" type="button" onClick={openDashboard} aria-label="Refresh campaign dashboard" disabled={loading}><RefreshCw size={18} aria-hidden="true" /></button>
      </div>
      <div className="campaign-stats campaign-stats-four public-call-dashboard-stats">
        <div className="campaign-stat-card stat-total"><span className="campaign-stat-icon"><Users size={18} aria-hidden="true" /></span><strong>{total.toLocaleString()}</strong><span>Total contacts</span></div>
        <div className="campaign-stat-card stat-called"><span className="campaign-stat-icon"><PhoneCall size={18} aria-hidden="true" /></span><strong>{Number(metrics?.numbers_called || 0).toLocaleString()}</strong><span>Numbers called</span></div>
        <div className="campaign-stat-card stat-reached"><span className="campaign-stat-icon"><CircleCheck size={18} aria-hidden="true" /></span><strong>{Number(metrics?.reached || 0).toLocaleString()}</strong><span>Reached</span></div>
        <div className="campaign-stat-card stat-unassigned"><span className="campaign-stat-icon"><ContactRound size={18} aria-hidden="true" /></span><strong>{Number(metrics?.awaiting_allocation || 0).toLocaleString()}</strong><span>Awaiting allocation</span></div>
      </div>
      <section className="outbound-panel campaign-analytics-panel public-call-outcomes">
        <div className="outbound-section-heading"><span className="outbound-icon"><BarChart3 size={19} aria-hidden="true" /></span><div><h2>Call outcomes</h2><p>Current outcome for each contact, including follow-up and unreachable categories.</p></div></div>
        <div className="campaign-outcome-grid">{outcomes.map(([label, count]) => <div className="campaign-outcome" key={label}><div><span>{label}</span><strong>{count.toLocaleString()}</strong></div><div className="campaign-bar-track"><span style={{ width: `${Math.round(count / maxOutcome * 100)}%` }} /></div></div>)}</div>
      </section>
      <section className="outbound-panel public-call-caller-performance">
        <div className="outbound-section-heading"><span className="outbound-icon"><Users size={19} aria-hidden="true" /></span><div><h2>Caller performance</h2><p>Allocation and outcomes for each caller.</p></div></div>
        <div className="campaign-manager-list campaign-manager-list-analytics">{(data.callers || []).map((caller, index) => <article key={`${caller.name}-${index}`}><strong title={caller.name}><Users size={16} aria-hidden="true" />{caller.name}</strong><span>{Number(caller.total || 0).toLocaleString()} assigned · {Number(caller.called || 0).toLocaleString()} called · {Number(caller.reached || 0).toLocaleString()} reached · {Number(caller.callbacks || 0).toLocaleString()} callbacks · {Number(caller.not_reached || 0).toLocaleString()} not reached</span></article>)}</div>
      </section>
      <section className="outbound-panel campaign-analytics-panel public-call-records">
        <div className="campaign-table-heading"><div><h2>Call records</h2><p>{visibleContacts.length.toLocaleString()} of {contacts.length.toLocaleString()} contacts</p></div><button className="campaign-button secondary" type="button" onClick={downloadResponses}><Download size={17} aria-hidden="true" /> Download responses</button></div>
        <div className="campaign-queue-controls campaign-manager-filters"><Field label="Search records"><span className="campaign-search-field"><Search size={17} aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, phone or caller" /></span></Field><Field label="Filter by call status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="pending">Not called</option><option value="reachable">Reachable</option><option value="call_back_later">Call Back Later</option><option value="unavailable">Unavailable</option><option value="invalid_number">Invalid Number</option><option value="wrong_contact">Wrong Contact</option></select></Field></div>
        <div className="campaign-manager-table-wrap"><table className="campaign-manager-table"><thead><tr><th scope="col">Name</th><th scope="col">Phone</th><th scope="col">Membership</th><th scope="col">Caller</th><th scope="col">Status</th><th scope="col">Latest feedback &amp; history</th></tr></thead><tbody>{visibleContacts.map(contact => {
          const phone = normalizeNigerianPhone(contact.phone);
          const latestLog = contact.logs?.[0];
          return <tr key={contact.id}><td data-label="Name">{contact.full_name}</td><td data-label="Phone"><a href={`tel:${phone}`}>{phone}</a></td><td data-label="Membership">{contact.membership_status || "—"}</td><td data-label="Caller">{contact.caller_name || "Unassigned"}</td><td data-label="Status"><span className={`campaign-status status-${contact.status || "pending"}`}>{callStatusLabel(contact.status)}</span></td><td data-label="Latest feedback" className="campaign-latest-feedback">{latestLog?.feedback || "—"}{latestLog?.callback_at && <small>Callback: {new Date(latestLog.callback_at).toLocaleString()}</small>}{contact.logs?.length > 0 && <details className="campaign-call-history"><summary>View all {contact.logs.length} call{contact.logs.length === 1 ? "" : "s"}</summary><div>{contact.logs.map((log, index) => <article key={`${contact.id}-${index}`}><strong>{callStatusLabel(log.outcome)} · {new Date(log.created_at).toLocaleString()}</strong><p>{log.feedback || "No feedback entered."}</p>{log.callback_at && <small>Callback: {new Date(log.callback_at).toLocaleString()}</small>}</article>)}</div></details>}</td></tr>;
        })}</tbody></table></div>
        {visibleContacts.length === 0 && <div className="campaign-empty"><h3>No records match these filters</h3><p>Change the search or call status filter to see more records.</p><button className="campaign-button secondary" type="button" onClick={() => { setQuery(""); setStatusFilter("all"); }}>Clear filters</button></div>}
      </section>
      <p className="public-call-dashboard-updated">Dashboard data refreshes when this page is opened or refreshed.</p>
    </>}
  </CallPageFrame>;
}
