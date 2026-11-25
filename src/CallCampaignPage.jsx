import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, BarChart3, Download, RefreshCw, Search, Users, UserRoundPlus, PhoneCall, CircleCheck, ContactRound } from "lucide-react";
import { CallPageFrame, callStatusLabel, downloadCallCSV, Field, invokeCallCampaign, normalizeNigerianPhone } from "./callCampaignUtils.jsx";

function managerExportRows(data) {
  const headers = ["Name", "Phone", "Membership status", "Caller", "Current status", "Attempts", "Call status", "Feedback", "Callback time", "Call time"];
  const callerNames = new Map((data.callers || []).map(caller => [caller.id, caller.name]));
  const rows = data.contacts.flatMap(contact => {
    const logs = contact.logs?.length ? contact.logs : [{ outcome: "", feedback: "", callback_at: "", created_at: "" }];
    return logs.map(log => [contact.full_name, normalizeNigerianPhone(contact.phone), contact.membership_status, callerNames.get(log.caller_id) || contact.caller_name || "", callStatusLabel(contact.status), contact.attempt_count, callStatusLabel(log.outcome), log.feedback, log.callback_at, log.created_at]);
  });
  return [headers, ...rows];
}

function analytics(data) {
  const contacts = data.contacts || [];
  return {
    assigned: contacts.filter(contact => contact.caller_id).length,
    unassigned: Number(data.unassigned || 0),
    called: contacts.filter(contact => Number(contact.attempt_count) > 0).length,
    reached: contacts.filter(contact => contact.status === "reachable").length,
    callbacks: contacts.filter(contact => contact.status === "call_back_later").length,
    unavailable: contacts.filter(contact => contact.status === "unavailable").length,
    invalid: contacts.filter(contact => contact.status === "invalid_number").length,
    wrong: contacts.filter(contact => contact.status === "wrong_contact").length,
  };
}

export default function CallCampaignPage({ session }) {
  const navigate = useNavigate();
  const [managerCode, setManagerCode] = useState(() => sessionStorage.getItem("outbound_call_manager_code") || "");
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  const [reassignCallerId, setReassignCallerId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [closingCampaign, setClosingCampaign] = useState(false);
  const [confirmCloseCampaign, setConfirmCloseCampaign] = useState(false);
  const [reallocationMessage, setReallocationMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recoveringKey, setRecoveringKey] = useState(false);
  const [recoveryAdminUsername, setRecoveryAdminUsername] = useState(session?.username || "");
  const [recoveryAdminPassword, setRecoveryAdminPassword] = useState("");
  const [recoverableCampaigns, setRecoverableCampaigns] = useState([]);
  const [recoveryCampaignId, setRecoveryCampaignId] = useState("");
  const [newManagerKey, setNewManagerKey] = useState("");
  const [confirmManagerKey, setConfirmManagerKey] = useState("");

  const load = async event => {
    event?.preventDefault();
    if (!managerCode.trim()) { setError("Enter the campaign manager key."); return; }
    setLoading(true); setError("");
    try {
      const result = await invokeCallCampaign("get_outbound_call_campaign_manager", { p_manager_code: managerCode.trim() });
      setData(result);
      sessionStorage.setItem("outbound_call_manager_code", managerCode.trim());
    } catch (err) { setError(err.message || "Unable to load campaign analytics. Check the manager key."); }
    finally { setLoading(false); }
  };

  const findCampaignsForKeyReset = async event => {
    event.preventDefault(); setLoading(true); setError("");
    try {
      const result = await invokeCallCampaign("list_outbound_call_campaigns_for_admin", {
        p_admin_username: recoveryAdminUsername.trim(), p_admin_password: recoveryAdminPassword,
      });
      const campaigns = result.campaigns || [];
      setRecoverableCampaigns(campaigns);
      setRecoveryCampaignId(campaigns[0]?.id || "");
      if (!campaigns.length) setError("No call campaigns were found for this administrator account.");
    } catch (err) { setError(err.message || "Unable to verify admin access or find campaigns."); }
    finally { setLoading(false); }
  };

  const resetManagerKey = async event => {
    event.preventDefault(); setLoading(true); setError("");
    const key = newManagerKey.trim();
    if (key.length < 20) { setError("Choose a manager key with at least 20 characters."); setLoading(false); return; }
    if (key !== confirmManagerKey.trim()) { setError("The manager keys do not match."); setLoading(false); return; }
    try {
      await invokeCallCampaign("reset_outbound_call_campaign_manager_key", {
        p_admin_username: recoveryAdminUsername.trim(), p_admin_password: recoveryAdminPassword,
        p_campaign_id: recoveryCampaignId, p_manager_key: key,
      });
      const result = await invokeCallCampaign("get_outbound_call_campaign_manager", { p_manager_code: key });
      sessionStorage.setItem("outbound_call_manager_code", key);
      setManagerCode(key); setData(result); setRecoveringKey(false);
      setRecoveryAdminPassword(""); setNewManagerKey(""); setConfirmManagerKey("");
    } catch (err) { setError(err.message || "Unable to reset the campaign manager key."); }
    finally { setLoading(false); }
  };

  const toggleContactSelection = contactId => {
    setSelectedContactIds(current => current.includes(contactId)
      ? current.filter(id => id !== contactId)
      : [...current, contactId]);
  };

  const reassignSelectedContacts = async () => {
    if (!selectedContactIds.length || !reassignCallerId) return;
    setReassigning(true);
    setError("");
    setReallocationMessage("");
    try {
      const result = await invokeCallCampaign("reassign_outbound_call_campaign_contacts", {
        p_manager_code: managerCode.trim(),
        p_contact_ids: selectedContactIds,
        p_caller_id: reassignCallerId,
      });
      const movedCount = Number(result?.reassigned || selectedContactIds.length);
      setSelectedContactIds([]);
      setReassignCallerId("");
      setReallocationMessage(`${movedCount.toLocaleString()} contact${movedCount === 1 ? "" : "s"} reassigned. Existing call records were kept.`);
      await load();
    } catch (err) {
      setError(err.message || "Unable to reassign the selected contacts.");
    } finally {
      setReassigning(false);
    }
  };

  const unassignSelectedContacts = async () => {
    if (!selectedContactIds.length) return;
    setUnassigning(true);
    setError("");
    setReallocationMessage("");
    try {
      const result = await invokeCallCampaign("unassign_outbound_call_campaign_contacts", {
        p_manager_code: managerCode.trim(),
        p_contact_ids: selectedContactIds,
      });
      const count = Number(result?.unassigned || selectedContactIds.length);
      setSelectedContactIds([]);
      setReallocationMessage(`${count.toLocaleString()} contact${count === 1 ? "" : "s"} unassigned. Call feedback and history are preserved.`);
      await load();
    } catch (err) {
      setError(err.message || "Unable to unassign the selected contacts.");
    } finally {
      setUnassigning(false);
    }
  };

  const closeCampaign = async () => {
    setClosingCampaign(true);
    setError("");
    try {
      await invokeCallCampaign("close_outbound_call_campaign", { p_manager_code: managerCode.trim() });
      setConfirmCloseCampaign(false);
      setSelectedContactIds([]);
      await load();
    } catch (err) {
      setError(err.message || "Unable to close this campaign.");
    } finally {
      setClosingCampaign(false);
    }
  };

  const startFreshCampaign = () => {
    sessionStorage.setItem("outbound_call_new_campaign_mode", "true");
    navigate("/calls/allocate");
  };

  const metrics = data ? analytics(data) : null;
  const visible = useMemo(() => (data?.contacts || []).filter(contact => {
    const haystack = `${contact.full_name} ${normalizeNigerianPhone(contact.phone)} ${contact.caller_name || ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (statusFilter === "all" || contact.status === statusFilter);
  }), [data, query, statusFilter]);
  const visibleAssignedIds = visible.filter(contact => contact.caller_id).map(contact => contact.id);
  const allVisibleSelected = visibleAssignedIds.length > 0 && visibleAssignedIds.every(id => selectedContactIds.includes(id));
  const toggleVisibleSelection = () => {
    setSelectedContactIds(current => allVisibleSelected
      ? current.filter(id => !visibleAssignedIds.includes(id))
      : [...new Set([...current, ...visibleAssignedIds])]);
  };
  const outcomes = metrics ? [
    ["Not called", Math.max(0, data.contacts.length - metrics.called)],
    ["Reachable", metrics.reached], ["Call Back Later", metrics.callbacks], ["Unavailable", metrics.unavailable],
    ["Invalid Number", metrics.invalid], ["Wrong Contact", metrics.wrong],
  ] : [];
  const maxOutcome = Math.max(1, ...outcomes.map(([, count]) => count));

  if (!session || session.role !== "admin") return <CallPageFrame eyebrow="Campaign manager" title="Manager access required" subtitle="Sign in with an admin account to manage campaign allocation and analytics.">
    <section className="outbound-panel"><a className="campaign-button" href="/app/admin_overview">Sign in as admin</a></section>
  </CallPageFrame>;

  return <CallPageFrame eyebrow="Outreach workspace" title="Campaign manager" subtitle="Review progress, caller activity and every logged response.">
    <nav className="campaign-manager-nav" aria-label="Campaign management"><span className="campaign-nav-current"><BarChart3 size={17} /> Analytics dashboard</span><div className="campaign-nav-actions"><a className="campaign-button secondary" href="/members-followup">Caller page</a>{data?.campaign.status === "closed" ? <button type="button" className="campaign-button" onClick={startFreshCampaign}><UserRoundPlus size={17} /> Start new campaign</button> : <button type="button" className="campaign-button secondary" onClick={() => navigate("/calls/allocate")}><UserRoundPlus size={17} /> Allocate contacts</button>}</div></nav>
    {!data && <section className="outbound-panel">
      <div className="outbound-section-heading"><span className="outbound-icon"><BarChart3 size={19} /></span><div><h2>Open campaign analytics</h2><p>Use the campaign manager key created with the contact upload.</p></div></div>
      <form className="campaign-access-form" onSubmit={load}>
        <Field label="Campaign manager key"><input value={managerCode} onChange={event => setManagerCode(event.target.value)} placeholder="Paste the manager key" autoComplete="one-time-code" required /></Field>
        <button className="campaign-button" type="submit" disabled={loading}>{loading ? "Loading…" : "Open dashboard"}</button>
      </form>
      <button className="campaign-button secondary campaign-recovery-toggle" type="button" onClick={() => { setRecoveringKey(value => !value); setError(""); setRecoverableCampaigns([]); }}>Forgot manager key?</button>
      {recoveringKey && <section className="campaign-key-recovery">
        <div><h3>Reset a campaign manager key</h3><p>Verify with your admin credentials, choose the campaign, then set a new private key. Existing call records stay in place.</p></div>
        <form className="campaign-form" onSubmit={findCampaignsForKeyReset}>
          <Field label="Admin username"><input value={recoveryAdminUsername} onChange={event => setRecoveryAdminUsername(event.target.value)} autoComplete="username" required /></Field>
          <Field label="Admin password"><input type="password" value={recoveryAdminPassword} onChange={event => setRecoveryAdminPassword(event.target.value)} autoComplete="current-password" required /></Field>
          <button className="campaign-button secondary" type="submit" disabled={loading}>{loading ? "Verifying…" : "Find my campaigns"}</button>
        </form>
        {recoverableCampaigns.length > 0 && <form className="campaign-form" onSubmit={resetManagerKey}>
          <Field label="Campaign"><select value={recoveryCampaignId} onChange={event => setRecoveryCampaignId(event.target.value)} required>{recoverableCampaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.name} · {campaign.status} · {Number(campaign.total_contacts).toLocaleString()} contacts</option>)}</select></Field>
          <Field label="New campaign manager key" hint="Use a private passphrase with at least 20 characters."><input type="password" value={newManagerKey} onChange={event => setNewManagerKey(event.target.value)} autoComplete="new-password" minLength={20} placeholder="Create your new manager key" required /></Field>
          <Field label="Confirm new campaign manager key"><input type="password" value={confirmManagerKey} onChange={event => setConfirmManagerKey(event.target.value)} autoComplete="new-password" minLength={20} placeholder="Enter the same manager key" required /></Field>
          <button className="campaign-button" type="submit" disabled={loading}>{loading ? "Resetting key…" : "Reset key and open dashboard"}</button>
        </form>}
      </section>}
      {error && <p className="campaign-error" role="alert">{error}</p>}
    </section>}
    {data && <>
      <div className="outbound-workspace-heading">
        <div><span className="outbound-kicker">{data.campaign.status === "closed" ? "Closed campaign" : "Active campaign"}</span><h2>{data.campaign.name}</h2><p>Created {new Date(data.campaign.created_at).toLocaleDateString()}</p></div>
        <div className="campaign-header-actions">{data.campaign.status === "active" && <button className="campaign-button secondary" type="button" onClick={() => setConfirmCloseCampaign(true)}>Close campaign</button>}<button className="campaign-icon-button" type="button" onClick={load} aria-label="Refresh campaign analytics"><RefreshCw size={18} /></button></div>
      </div>
      {data.campaign.status === "closed" && <div className="campaign-archive-notice"><strong>This campaign is archived.</strong><span>Caller access is closed. Allocations, call statuses, and feedback remain available here and in the response download. Use “Start new campaign” to create a fresh caller workspace.</span></div>}
      {confirmCloseCampaign && data.campaign.status === "active" && <div className="campaign-close-confirm" role="alertdialog" aria-labelledby="close-campaign-title" aria-describedby="close-campaign-description"><div><strong id="close-campaign-title">Close this campaign?</strong><p id="close-campaign-description">Caller access will stop. This campaign’s assignments and call feedback remain saved and downloadable. You can create a fresh campaign and import the same callers again.</p></div><div><button className="campaign-button secondary" type="button" onClick={() => setConfirmCloseCampaign(false)} disabled={closingCampaign}>Keep it open</button><button className="campaign-button" type="button" onClick={closeCampaign} disabled={closingCampaign}>{closingCampaign ? "Closing…" : "Close campaign"}</button></div></div>}
      <div className="campaign-stats campaign-stats-four">
        <div className="campaign-stat-card stat-total"><span className="campaign-stat-icon"><Users size={18} aria-hidden="true" /></span><strong>{data.contacts.length.toLocaleString()}</strong><span>Total contacts</span></div>
        <div className="campaign-stat-card stat-called"><span className="campaign-stat-icon"><PhoneCall size={18} aria-hidden="true" /></span><strong>{metrics.called.toLocaleString()}</strong><span>Numbers called</span></div>
        <div className="campaign-stat-card stat-reached"><span className="campaign-stat-icon"><CircleCheck size={18} aria-hidden="true" /></span><strong>{metrics.reached.toLocaleString()}</strong><span>Reached</span></div>
        <div className="campaign-stat-card stat-unassigned"><span className="campaign-stat-icon"><ContactRound size={18} aria-hidden="true" /></span><strong>{metrics.unassigned.toLocaleString()}</strong><span>Awaiting allocation</span></div>
      </div>
      <section className="outbound-panel campaign-analytics-panel">
        <div className="outbound-section-heading"><span className="outbound-icon"><BarChart3 size={19} /></span><div><h2>Call outcomes</h2><p>Current outcome for each contact, including follow-up and unreachable categories.</p></div></div>
        <div className="campaign-outcome-grid">{outcomes.map(([label, count]) => <div className="campaign-outcome" key={label}><div><span>{label}</span><strong>{count.toLocaleString()}</strong></div><div className="campaign-bar-track"><span style={{ width: `${Math.round(count / maxOutcome * 100)}%` }} /></div></div>)}</div>
      </section>
      <section className="outbound-panel">
        <div className="outbound-section-heading campaign-caller-performance-heading"><span className="outbound-icon"><Users size={19} /></span><div><h2>Caller performance</h2><p>Allocation and outcomes for each caller.</p></div><button type="button" className="campaign-button secondary" onClick={() => navigate("/calls/allocate")}><UserRoundPlus size={17} aria-hidden="true" /> Add callers</button></div>
        <div className="campaign-manager-list campaign-manager-list-analytics">{data.callers.map(caller => <article key={caller.id}><strong title={caller.name}><Users size={16} aria-hidden="true" />{caller.name}</strong><span>{caller.total} assigned · {caller.called} called · {caller.reached} reached · {caller.callbacks} callbacks · {caller.not_reached} not reached</span></article>)}</div>
      </section>
      <section className="outbound-panel campaign-analytics-panel">
        <div className="campaign-table-heading"><div><h2>Call records</h2><p>{visible.length.toLocaleString()} of {data.contacts.length.toLocaleString()} contacts</p></div><button className="campaign-button secondary" type="button" onClick={() => downloadCallCSV(`${data.campaign.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-campaign-responses.csv`, managerExportRows(data))}><Download size={17} /> Download responses</button></div>
        <div className="campaign-queue-controls campaign-manager-filters"><Field label="Search records"><span className="campaign-search-field"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, phone or caller" /></span></Field><Field label="Filter by call status"><select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="pending">Not called</option><option value="reachable">Reachable</option><option value="call_back_later">Call Back Later</option><option value="unavailable">Unavailable</option><option value="invalid_number">Invalid Number</option><option value="wrong_contact">Wrong Contact</option></select></Field></div>
        {data.campaign.status === "active" && <div className="campaign-reassign-toolbar">
          <div className="campaign-reassign-selection"><strong>{selectedContactIds.length.toLocaleString()} selected</strong><button type="button" className="campaign-button secondary" onClick={toggleVisibleSelection}>{allVisibleSelected ? "Deselect visible" : "Select visible"}</button><button type="button" className="campaign-text-button" onClick={() => setSelectedContactIds([])} disabled={!selectedContactIds.length}>Clear</button></div>
          <div className="campaign-reassign-actions"><Field label="Reassign to caller"><select value={reassignCallerId} onChange={event => setReassignCallerId(event.target.value)}><option value="">Choose caller</option>{data.callers.map(caller => <option key={caller.id} value={caller.id}>{caller.name}</option>)}</select></Field><button type="button" className="campaign-button" onClick={reassignSelectedContacts} disabled={!selectedContactIds.length || !reassignCallerId || reassigning}><ArrowRightLeft size={17} aria-hidden="true" />{reassigning ? "Reassigning…" : "Reassign contacts"}</button><button type="button" className="campaign-button secondary" onClick={unassignSelectedContacts} disabled={!selectedContactIds.length || reassigning || unassigning}>{unassigning ? "Unassigning…" : "Unassign selected"}</button></div>
          <p className="campaign-reassign-hint">Reassign or unassign selected contacts. Their call history stays saved under this campaign.</p>
        </div>}
        {reallocationMessage && <p className="campaign-notice" role="status">{reallocationMessage}</p>}
        {error && data && <p className="campaign-error" role="alert">{error}</p>}
        <div className="campaign-manager-table-wrap"><table className="campaign-manager-table"><thead><tr><th scope="col">Name</th><th scope="col">Phone</th><th scope="col">Membership</th><th scope="col">Caller</th><th scope="col">Status</th><th scope="col">Latest feedback & history</th></tr></thead><tbody>{visible.map(contact => { const phone = normalizeNigerianPhone(contact.phone); return <tr key={contact.id}><td data-label="Name"><label className="campaign-reassign-contact">{data.campaign.status === "active" && <input type="checkbox" aria-label={`Select ${contact.full_name} for reassignment or unassignment`} checked={selectedContactIds.includes(contact.id)} onChange={() => toggleContactSelection(contact.id)} disabled={!contact.caller_id} />}<span>{contact.full_name}</span></label></td><td data-label="Phone"><a href={`tel:${phone}`}>{phone}</a></td><td data-label="Membership">{contact.membership_status || "—"}</td><td data-label="Caller">{contact.caller_name || "Unassigned"}</td><td data-label="Status"><span className={`campaign-status status-${contact.status || "pending"}`}>{callStatusLabel(contact.status)}</span></td><td data-label="Latest feedback" className="campaign-latest-feedback">{contact.logs?.[0]?.feedback || "—"}{contact.logs?.[0]?.callback_at && <small>Callback: {new Date(contact.logs[0].callback_at).toLocaleString()}</small>}{contact.logs?.length > 0 && <details className="campaign-call-history"><summary>View all {contact.logs.length} call{contact.logs.length === 1 ? "" : "s"}</summary><div>{contact.logs.map((log, index) => <article key={`${contact.id}-${index}`}><strong>{callStatusLabel(log.outcome)} · {new Date(log.created_at).toLocaleString()}{log.caller_id && data.callers.find(caller => caller.id === log.caller_id)?.name ? ` · ${data.callers.find(caller => caller.id === log.caller_id).name}` : ""}</strong><p>{log.feedback || "No feedback entered."}</p>{log.callback_at && <small>Callback: {new Date(log.callback_at).toLocaleString()}</small>}</article>)}</div></details>}</td></tr>; })}</tbody></table></div>
        {visible.length === 0 && <div className="campaign-empty"><h3>No records match these filters</h3><p>Change the search or call status filter to see more records.</p><button className="campaign-button secondary" type="button" onClick={() => { setQuery(""); setStatusFilter("all"); }}>Clear filters</button></div>}
      </section>
      <div className="campaign-manager-footer"><button className="campaign-button secondary" type="button" onClick={() => { sessionStorage.removeItem("outbound_call_manager_code"); setManagerCode(""); setData(null); }}>Close campaign dashboard</button></div>
    </>}
  </CallPageFrame>;
}
