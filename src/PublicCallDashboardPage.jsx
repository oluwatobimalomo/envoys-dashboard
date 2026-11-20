import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarDays, CircleCheck, ContactRound, PhoneCall, RefreshCw, UserRound, Users } from "lucide-react";
import { CallPageFrame, invokeCallCampaign } from "./callCampaignUtils.jsx";

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await invokeCallCampaign("get_public_outbound_call_campaign_dashboard", {});
      setData(result);
    } catch (err) {
      setError(err.message || "Unable to load the campaign dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const metrics = data?.metrics;
  const total = Number(metrics?.total_contacts || 0);
  const outcomes = OUTCOMES.map(([key, label]) => [label, Number(metrics?.[key] || 0)]);
  const maxOutcome = Math.max(1, ...outcomes.map(([, count]) => count));

  return <CallPageFrame eyebrow="Outreach workspace" title="Campaign manager" subtitle="Review progress, caller activity and every logged response." wide>
    <nav className="public-call-dashboard-nav" aria-label="Call campaign pages">
      <a className="campaign-nav-current" href="/calls-dashboard" aria-current="page"><BarChart3 size={18} aria-hidden="true" /> Analytics dashboard</a>
      <div className="campaign-nav-actions">
        <a className="campaign-button secondary" href="/members-followup"><UserRound size={17} aria-hidden="true" /> Caller page</a>
        <a className="campaign-button secondary" href="/calls/allocate"><ContactRound size={17} aria-hidden="true" /> Allocate contacts</a>
      </div>
    </nav>
    {error && <section className="outbound-panel public-call-dashboard-state" role="alert"><p>{error}</p><button className="campaign-button secondary" type="button" onClick={refresh}><RefreshCw size={16} aria-hidden="true" /> Try again</button></section>}
    {!error && loading && <section className="outbound-panel public-call-dashboard-state" role="status">Loading campaign progress…</section>}
    {!error && !loading && data?.campaign && <>
      <div className="public-call-campaign-heading">
        <div><span className="outbound-kicker">{data.campaign.status === "closed" ? "Closed campaign" : "Active campaign"}</span><h2>{data.campaign.name}</h2><p><CalendarDays size={15} aria-hidden="true" /> Created {formatCreatedDate(data.campaign.created_at)}</p></div>
        <button className="campaign-icon-button" type="button" onClick={refresh} aria-label="Refresh campaign dashboard" disabled={loading}><RefreshCw size={18} aria-hidden="true" /></button>
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
      <p className="public-call-dashboard-updated">Dashboard data refreshes when this page is opened or refreshed.</p>
    </>}
    {!error && !loading && !data?.campaign && <section className="outbound-panel public-call-dashboard-state"><h2>No active campaign</h2><p>Campaign progress will appear here when a follow-up campaign is active.</p></section>}
  </CallPageFrame>;
}
