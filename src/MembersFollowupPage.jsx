import { Fragment, useMemo, useState } from "react";
import { CalendarClock, Phone, RefreshCw, Search, Users, PhoneCall, CircleCheck, PhoneOff, ClipboardPenLine, CircleUserRound, CircleDot, Ban, UserRoundX } from "lucide-react";
import { CallPageFrame, CALL_OUTCOMES, callStatusLabel, Field, invokeCallCampaign, normalizeCallerPhone, normalizeNigerianPhone } from "./callCampaignUtils.jsx";

const statusIcons = { pending: CircleDot, reachable: CircleCheck, call_back_later: CalendarClock, unavailable: PhoneOff, invalid_number: Ban, wrong_contact: UserRoundX };

function compactContactName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 3) return `${parts[0]} ${parts[1]} ${parts[2].charAt(0)}.`;
  if (parts.length > 3) return `${parts.slice(0, 2).join(" ")} ${parts.slice(2).map(part => `${part.charAt(0)}.`).join(" ")}`;
  if (parts.length === 2) {
    const [first, last] = parts;
    if (first.length >= 16 && last.length >= 4) return `${first} ${last.charAt(0)}.`;
    if (last.length >= 16 && first.length >= 4) return `${first.charAt(0)}. ${last}`;
  }
  return parts.join(" ");
}

export default function MembersFollowupPage() {
  const [lastName, setLastName] = useState("");
  const [enteredPhone, setEnteredPhone] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [search, setSearch] = useState("");
  const [openContact, setOpenContact] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [feedback, setFeedback] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const contacts = workspace?.contacts || [];
  const visibleContacts = useMemo(() => contacts.filter(contact => `${contact.full_name} ${normalizeNigerianPhone(contact.phone)} ${contact.membership_status || ""}`.toLowerCase().includes(search.toLowerCase())), [contacts, search]);
  const called = contacts.filter(contact => Number(contact.attempt_count) > 0).length;
  const reached = contacts.filter(contact => contact.status === "reachable").length;
  const notReached = contacts.filter(contact => ["unavailable", "invalid_number", "wrong_contact"].includes(contact.status)).length;

  const openList = async event => {
    event?.preventDefault();
    const normalizedPhone = normalizeCallerPhone(enteredPhone);
    const normalized = normalizedPhone || enteredPhone.trim().toLowerCase();
    if (!normalized) { setError("Enter your caller phone number."); return; }
    if (normalizedPhone && normalizedPhone.length < 7) { setError("Enter a complete caller phone number."); return; }
    setBusy(true); setError(""); setNotice(""); setWorkspace(null); setOpenContact(null);
    try {
      const result = await invokeCallCampaign("get_outbound_call_workspace", { p_last_name: normalized });
      setLastName(normalized); setWorkspace(result);
    } catch (err) { setError(err.message || "Unable to open your assigned list. Check the phone number and try again."); }
    finally { setBusy(false); }
  };

  const refresh = async () => {
    if (!lastName) return;
    setBusy(true); setError("");
    try { setWorkspace(await invokeCallCampaign("get_outbound_call_workspace", { p_last_name: lastName.trim().toLowerCase() })); }
    catch (err) { setError(err.message || "Unable to refresh your call list."); }
    finally { setBusy(false); }
  };

  const saveCall = async (event, contact) => {
    event.preventDefault(); setError(""); setNotice("");
    if (!callStatus) { setError("Choose a call status."); return; }
    if (callStatus === "call_back_later" && !callbackAt) { setError("Choose the date and time for the callback."); return; }
    setBusy(true);
    try {
      await invokeCallCampaign("save_member_followup_call", {
        p_last_name: lastName.trim().toLowerCase(),
        p_contact_id: contact.id,
        p_outcome: callStatus,
        p_feedback: feedback,
        p_callback_at: callStatus === "call_back_later" ? new Date(callbackAt).toISOString() : null,
      });
      setWorkspace(await invokeCallCampaign("get_outbound_call_workspace", { p_last_name: lastName.trim().toLowerCase() }));
      setOpenContact(null); setCallStatus(""); setFeedback(""); setCallbackAt("");
      setNotice(`Call response saved for ${contact.full_name}.`);
    } catch (err) { setError(err.message || "Unable to save this call response."); }
    finally { setBusy(false); }
  };

  if (!workspace) return <CallPageFrame eyebrow="Members follow-up" title="Call Entry Channel" subtitle="View allocated calls and log call status.">
    <section className="outbound-panel caller-entry-panel">
      <div className="outbound-section-heading"><span className="outbound-icon"><Phone size={19} /></span><div><h2>Caller access</h2><p>Use the phone number supplied to the campaign manager.</p></div></div>
      <form className="campaign-caller-login" onSubmit={openList}>
        <Field label="Phone number" hint=""><input type="text" value={enteredPhone} onChange={event => setEnteredPhone(event.target.value)} autoComplete="tel" placeholder="Enter your phone number" required /></Field>
        {error && <p className="campaign-error" role="alert">{error}</p>}
        <button className="campaign-button" type="submit" disabled={busy}>{busy ? "Opening your list…" : "Open my call list"}</button>
      </form>
    </section>
  </CallPageFrame>;

  return <CallPageFrame eyebrow={workspace.campaign.name} title={`Hello, ${workspace.caller.name}`} subtitle="Your assigned contacts for follow-up calls.">
    <div className="campaign-caller-toolbar"><span className="campaign-caller-identity"><CircleUserRound size={17} aria-hidden="true" /> Caller workspace</span><button className="campaign-button secondary campaign-refresh-button" type="button" onClick={refresh} disabled={busy}><RefreshCw size={17} aria-hidden="true" />{busy ? "Refreshing…" : "Refresh list"}</button></div>
    <div className="campaign-stats campaign-stats-four">
      <div className="campaign-stat-card stat-total"><span className="campaign-stat-icon"><Users size={18} aria-hidden="true" /></span><strong>{contacts.length.toLocaleString()}</strong><span>Total assigned</span></div>
      <div className="campaign-stat-card stat-called"><span className="campaign-stat-icon"><PhoneCall size={18} aria-hidden="true" /></span><strong>{called.toLocaleString()}</strong><span>Numbers called</span></div>
      <div className="campaign-stat-card stat-reached"><span className="campaign-stat-icon"><CircleCheck size={18} aria-hidden="true" /></span><strong>{reached.toLocaleString()}</strong><span>Reached</span></div>
      <div className="campaign-stat-card stat-unreached"><span className="campaign-stat-icon"><PhoneOff size={18} aria-hidden="true" /></span><strong>{notReached.toLocaleString()}</strong><span>Not reached</span></div>
    </div>
    <section className="outbound-panel caller-list-panel">
      <div className="campaign-table-heading"><div className="campaign-caller-heading"><span className="outbound-icon"><Users size={19} aria-hidden="true" /></span><div><h2>Assigned contacts</h2><p>{visibleContacts.length.toLocaleString()} of {contacts.length.toLocaleString()} shown</p></div></div></div>
      <div className="campaign-queue-controls campaign-caller-search"><Field label="Search assigned contacts"><span className="campaign-search-field"><Search size={17} aria-hidden="true" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or number" /></span></Field></div>
      {error && <p className="campaign-error" role="alert">{error}</p>}{notice && <p className="campaign-notice" role="status">{notice}</p>}
      {contacts.length === 0 ? <div className="campaign-empty"><h3>No contacts assigned yet</h3><p>Your campaign manager will assign your first batch here.</p></div> : visibleContacts.length === 0 ? <div className="campaign-empty"><h3>No contacts match that search</h3><p>Clear your search to see your assigned list again.</p><button className="campaign-button secondary" type="button" onClick={() => setSearch("")}>Clear search</button></div> : <div className="campaign-caller-table-wrap"><table className="campaign-caller-table"><thead><tr><th scope="col">No.</th><th scope="col">Name</th><th scope="col">Phone number</th><th scope="col">Membership<br />status</th><th scope="col">Call status</th><th scope="col"><span className="sr-only">Call action</span></th></tr></thead><tbody>
        {visibleContacts.map((contact, index) => <Fragment key={contact.id}>
          <tr className="campaign-caller-row">
            <td data-label="No.">{index + 1}</td>
            <td data-label="Name"><span className="campaign-caller-name"><span className="campaign-mobile-contact-num">#{index + 1}</span><span className="campaign-contact-avatar" aria-hidden="true">{contact.full_name.trim().charAt(0).toUpperCase()}</span><strong title={contact.full_name} aria-label={contact.full_name}>{compactContactName(contact.full_name)}</strong></span></td>
            <td data-label="Phone number">{(() => { const phone = normalizeNigerianPhone(contact.phone); return <a className="campaign-phone" href={`tel:${phone}`}><Phone size={15} aria-hidden="true" />{phone}</a>; })()}</td>
            <td data-label="Membership status">{contact.membership_status || "—"}</td>
            <td data-label="Call status">{(() => { const StatusIcon = statusIcons[contact.status] || CircleDot; return <span className={`campaign-status status-${contact.status || "pending"}`}><StatusIcon size={14} aria-hidden="true" />{callStatusLabel(contact.status)}</span>; })()}{contact.status === "call_back_later" && contact.callback_at && <small className="campaign-callback-hint"><CalendarClock size={13} aria-hidden="true" />{new Date(contact.callback_at).toLocaleString()}</small>}</td>
            <td data-label="Call action" className="campaign-call-action-cell"><button type="button" className="campaign-button secondary campaign-log-button" onClick={() => { setOpenContact(openContact === contact.id ? null : contact.id); setCallStatus(""); setFeedback(""); setCallbackAt(""); setError(""); }} aria-expanded={openContact === contact.id}>{openContact === contact.id ? <><CircleCheck size={16} aria-hidden="true" />Close</> : <><ClipboardPenLine size={16} aria-hidden="true" />Log call</>}</button></td>
          </tr>
          {openContact === contact.id && <tr className="campaign-inline-log" key={`${contact.id}-log`}><td colSpan="6"><form className="campaign-inline-log-form" onSubmit={event => saveCall(event, contact)}>
            <div className="campaign-inline-log-heading"><h3>Log call · {contact.full_name}</h3><span>{normalizeNigerianPhone(contact.phone)}</span></div>
            <div className="campaign-map-grid"><Field label="Call status"><select value={callStatus} onChange={event => setCallStatus(event.target.value)} required><option value="">Choose call status</option>{CALL_OUTCOMES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
              {callStatus === "call_back_later" && <Field label="Callback date and time"><input type="datetime-local" value={callbackAt} onChange={event => setCallbackAt(event.target.value)} required /></Field>}</div>
            <Field label="Feedback"><textarea rows={3} value={feedback} onChange={event => setFeedback(event.target.value)} maxLength={5000} placeholder="Add a brief call summary or next step" /></Field>
            {error && <p className="campaign-error" role="alert">{error}</p>}
            <div className="campaign-dialog-actions"><button className="campaign-button secondary" type="button" disabled={busy} onClick={() => setOpenContact(null)}>Cancel</button><button className="campaign-button" type="submit" disabled={busy}>{busy ? "Saving…" : "Save call"}</button></div>
          </form></td></tr>}
        </Fragment>)}
      </tbody></table></div>}
    </section>
  </CallPageFrame>;
}
