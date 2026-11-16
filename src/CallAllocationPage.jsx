import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Download, Users, Upload } from "lucide-react";
import { CallPageFrame, downloadCallCSV, Field, invokeCallCampaign, normalizeNigerianPhone, parseCallCSV } from "./callCampaignUtils.jsx";

function parseCallerRoster(text) {
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
    const [providedName, providedLastName] = line.split("|").map(value => value.trim());
    const name = providedName;
    const lastName = (providedLastName || name.split(/\s+/).filter(Boolean).at(-1) || "").toLowerCase();
    return { name, last_name: lastName };
  });
}

export default function CallAllocationPage({ session }) {
  const navigate = useNavigate();
  const [managerCode, setManagerCode] = useState(() => sessionStorage.getItem("outbound_call_manager_code") || "");
  const [data, setData] = useState(null);
  const [campaignName, setCampaignName] = useState("");
  const [newManagerKey, setNewManagerKey] = useState("");
  const [confirmManagerKey, setConfirmManagerKey] = useState("");
  const [callersText, setCallersText] = useState("");
  const [csvRows, setCsvRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [nameColumn, setNameColumn] = useState("");
  const [firstNameColumn, setFirstNameColumn] = useState("");
  const [surnameColumn, setSurnameColumn] = useState("");
  const [phoneColumn, setPhoneColumn] = useState("");
  const [membershipColumn, setMembershipColumn] = useState("");
  const [adminUsername, setAdminUsername] = useState(session?.username || "");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedCaller, setSelectedCaller] = useState("");
  const [allocationSize, setAllocationSize] = useState("10");
  const [customSize, setCustomSize] = useState("");
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const callers = useMemo(() => parseCallerRoster(callersText), [callersText]);
  const contacts = useMemo(() => csvRows.map(row => {
    const name = (nameColumn ? row[nameColumn] : [row[firstNameColumn], row[surnameColumn]].filter(Boolean).join(" ")).trim();
    const phone = normalizeNigerianPhone(row[phoneColumn]);
    const membership_status = (row[membershipColumn] || "").trim();
    const used = [nameColumn, firstNameColumn, surnameColumn, phoneColumn, membershipColumn].filter(Boolean);
    const extra_fields = Object.fromEntries(Object.entries(row).filter(([key]) => !used.includes(key)));
    return { name, phone, membership_status, extra_fields };
  }), [csvRows, nameColumn, firstNameColumn, surnameColumn, phoneColumn, membershipColumn]);
  const validContacts = contacts.filter(contact => contact.name && contact.phone);
  const duplicateLastNames = callers.some((caller, index) => callers.findIndex(item => item.last_name === caller.last_name) !== index);
  const remaining = Number(data?.unassigned || 0);
  const quantity = allocationSize === "custom" ? Number(customSize) : Number(allocationSize);

  const refresh = async (code = managerCode) => {
    const result = await invokeCallCampaign("get_outbound_call_campaign_manager", { p_manager_code: code });
    setData(result);
    if (!selectedCaller && result.callers?.[0]) setSelectedCaller(result.callers[0].id);
    return result;
  };

  // Load an existing campaign when the manager opens allocation from the dashboard.
  useEffect(() => {
    if (!managerCode || session?.role !== "admin") return;
    let current = true;
    setBusy(true);
    invokeCallCampaign("get_outbound_call_campaign_manager", { p_manager_code: managerCode })
      .then(result => { if (current) { setData(result); setSelectedCaller(result.callers?.[0]?.id || ""); } })
      .catch(err => { if (current) setError(err.message || "Unable to open the campaign allocation page."); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [managerCode, session?.role]);

  const onFile = async event => {
    setError(""); setMessage(""); setCsvRows([]); setHeaders([]);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseCallCSV(await file.text());
      if (!rows.length) throw new Error("Choose a CSV with a header row and at least one contact.");
      const columns = Object.keys(rows[0]);
      const choose = aliases => columns.find(column => aliases.includes(column.replace(/[_-]/g, " ").trim())) || "";
      setCsvRows(rows); setHeaders(columns);
      setNameColumn(choose(["name", "full name", "contact name", "customer name"]));
      setFirstNameColumn(choose(["first name", "firstname", "given name"]));
      setSurnameColumn(choose(["surname", "last name", "lastname", "family name"]));
      setPhoneColumn(choose(["phone", "phone number", "mobile", "mobile number", "telephone", "tel", "contact number"]));
      setMembershipColumn(choose(["membership status", "membership", "status"]));
      setMessage(`${rows.length.toLocaleString()} rows loaded. Review the column mapping.`);
    } catch (err) { setError(err.message || "Unable to read this CSV file."); }
  };

  const createCampaign = async event => {
    event.preventDefault(); setError(""); setMessage(""); setCreated(null);
    if (!callers.length) return setError("Add caller names, one per line.");
    if (duplicateLastNames) return setError("Caller last names must be unique within this campaign. Add a distinct last name after the | for any duplicates.");
    if (callers.some(caller => caller.last_name.length < 2)) return setError("Each caller needs a last name with at least two letters.");
    if (!validContacts.length) return setError("Map the contact name and phone columns. Each contact needs both.");
    if (newManagerKey.trim().length < 20) return setError("Choose a campaign manager key with at least 20 characters.");
    if (newManagerKey.trim() !== confirmManagerKey.trim()) return setError("The campaign manager keys do not match.");
    if (callers.length > 100 || validContacts.length > 10000) return setError("A campaign supports up to 100 callers and 10,000 contacts.");
    setBusy(true);
    try {
      const newManagerCode = newManagerKey.trim();
      const result = await invokeCallCampaign("create_outbound_call_campaign", {
        p_admin_username: adminUsername.trim(), p_admin_password: adminPassword,
        p_name: campaignName.trim(), p_manager_code: newManagerCode,
        p_callers: callers, p_contacts: validContacts,
      });
      sessionStorage.setItem("outbound_call_manager_code", newManagerCode);
      setManagerCode(newManagerCode);
      setCreated({ ...result, manager_code: newManagerCode });
      setAdminPassword("");
      const refreshed = await refresh(newManagerCode);
      if (refreshed.callers?.[0]) setSelectedCaller(refreshed.callers[0].id);
      setMessage("Campaign created. Contact records are ready for bulk allocation.");
    } catch (err) { setError(err.message || "Unable to create the campaign."); }
    finally { setBusy(false); }
  };

  const allocate = async event => {
    event.preventDefault(); setError(""); setMessage("");
    if (!selectedCaller) return setError("Choose a caller first.");
    if (!Number.isInteger(quantity) || quantity < 1) return setError("Enter a whole number greater than zero.");
    setBusy(true);
    try {
      const result = await invokeCallCampaign("allocate_outbound_call_contacts", {
        p_manager_code: managerCode.trim(), p_caller_id: selectedCaller, p_count: quantity,
      });
      await refresh();
      const allocated = Number(result.allocated || 0);
      setMessage(allocated ? `${allocated} ${allocated === 1 ? "contact has" : "contacts have"} been allocated. ${result.remaining} remain unassigned.` : "There are no unassigned contacts left in this campaign.");
    } catch (err) { setError(err.message || "Unable to allocate contacts."); }
    finally { setBusy(false); }
  };

  if (!session || session.role !== "admin") return <CallPageFrame eyebrow="Contact allocation" title="Admin access required" subtitle="Sign in with an admin account to upload a list and allocate contacts."><section className="outbound-panel"><a className="campaign-button" href="/app/admin_overview">Sign in as admin</a></section></CallPageFrame>;

  return <CallPageFrame eyebrow="Outreach workspace" title="Allocate contacts" subtitle="Upload callers and contacts, then assign a manageable batch to each caller.">
    <nav className="campaign-manager-nav" aria-label="Campaign management"><button type="button" className="campaign-button secondary" onClick={() => navigate("/calls")}><ArrowLeft size={17} /> Campaign dashboard</button><span className="campaign-nav-current"><Users size={17} /> Contact allocation</span></nav>
    {!data && <section className="outbound-panel">
      <div className="outbound-section-heading"><span className="outbound-icon"><Upload size={19} /></span><div><h2>Create a campaign</h2><p>Add caller names, then upload the list of contacts. Caller access uses the last name entered here.</p></div></div>
      {created && <div className="campaign-created" role="status"><h3>{created.campaign_name} is ready</h3><p>{Number(created.total_contacts).toLocaleString()} contacts are waiting for allocation. Callers enter their last name in lowercase or uppercase.</p><div className="campaign-code-row"><strong>Manager key</strong><code>{created.manager_code}</code><button type="button" onClick={() => navigator.clipboard?.writeText(created.manager_code)}>Copy</button></div><button type="button" className="campaign-button secondary" onClick={() => downloadCallCSV("call-campaign-callers.csv", [["Caller name", "Caller last name for access"], ...created.callers.map(caller => [caller.name, caller.last_name])])}><Download size={17} /> Download caller access list</button></div>}
      <form className="campaign-form" onSubmit={createCampaign}>
        <Field label="Campaign name"><input value={campaignName} onChange={event => setCampaignName(event.target.value)} placeholder="e.g. Member follow-up · November" required /></Field>
        <Field label="Campaign manager key" hint="Create a private passphrase of at least 20 characters. You’ll use it to reopen campaign records and can reset it later with your admin credentials."><input type="password" value={newManagerKey} onChange={event => setNewManagerKey(event.target.value)} autoComplete="new-password" minLength={20} placeholder="Create your manager key" required /></Field>
        <Field label="Confirm campaign manager key"><input type="password" value={confirmManagerKey} onChange={event => setConfirmManagerKey(event.target.value)} autoComplete="new-password" minLength={20} placeholder="Enter the same manager key" required /></Field>
        <Field label="Callers · one per line" hint="Use Full Name | Last Name if the surname is compound or different from the final word. Last names must be unique in this campaign."><textarea rows={4} value={callersText} onChange={event => setCallersText(event.target.value)} placeholder={"Ada Okafor\nJohn Bello\nMary Anne Smith | Anne Smith"} required /></Field>
        {callers.length > 0 && <div className="campaign-roster-preview"><strong>Caller access names</strong>{callers.map((caller, index) => <span key={`${caller.last_name}-${index}`}>{caller.name}<b>{caller.last_name}</b></span>)}</div>}
        <Field label="Contacts CSV"><input type="file" accept=".csv,text/csv" onChange={onFile} /></Field>
        {headers.length > 0 && <div className="campaign-mapping"><div className="campaign-map-grid">
          <Field label="Full name column"><select value={nameColumn} onChange={event => setNameColumn(event.target.value)}><option value="">Use first name + surname</option>{headers.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
          {!nameColumn && <><Field label="First name column"><select value={firstNameColumn} onChange={event => setFirstNameColumn(event.target.value)}><option value="">Choose column</option>{headers.map(header => <option value={header} key={header}>{header}</option>)}</select></Field><Field label="Surname column"><select value={surnameColumn} onChange={event => setSurnameColumn(event.target.value)}><option value="">Choose column</option>{headers.map(header => <option value={header} key={header}>{header}</option>)}</select></Field></>}
          <Field label="Phone number column"><select value={phoneColumn} onChange={event => setPhoneColumn(event.target.value)}><option value="">Choose column</option>{headers.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
          <Field label="Membership status column"><select value={membershipColumn} onChange={event => setMembershipColumn(event.target.value)}><option value="">No membership column</option>{headers.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
        </div><p className="campaign-hint">{validContacts.length.toLocaleString()} valid contacts from {csvRows.length.toLocaleString()} rows. Other CSV columns are retained.</p>{validContacts.length < csvRows.length && <p className="campaign-warning">Rows missing a name or phone number will be skipped.</p>}</div>}
        <Field label="Admin username"><input value={adminUsername} onChange={event => setAdminUsername(event.target.value)} autoComplete="username" required /></Field>
        <Field label="Admin password"><input type="password" value={adminPassword} onChange={event => setAdminPassword(event.target.value)} autoComplete="current-password" required /></Field>
        {error && <p className="campaign-error" role="alert">{error}</p>}{message && <p className="campaign-notice" role="status">{message}</p>}
        <button className="campaign-button" type="submit" disabled={busy}>{busy ? "Creating campaign…" : "Create campaign"}</button>
      </form>
    </section>}

    {data && <>
      <section className="outbound-workspace campaign-allocation-summary">
        <div className="outbound-workspace-heading"><div><span className="outbound-kicker">Active campaign</span><h2>{data.campaign.name}</h2><p>{data.contacts.length.toLocaleString()} contacts · {data.unassigned.toLocaleString()} unassigned</p></div><CheckCircle size={22} color="#167743" /></div>
        {created && <div className="campaign-created" role="status"><h3>Campaign access details</h3><p>Keep this manager key to reopen analytics and allocations on another device.</p><div className="campaign-code-row"><strong>Manager key</strong><code>{created.manager_code}</code><button type="button" onClick={() => navigator.clipboard?.writeText(created.manager_code)}>Copy</button></div></div>}
        <div className="campaign-manager-list">{data.callers.map(caller => <article key={caller.id}><strong>{caller.name}</strong><span>{caller.total} assigned · {caller.called} called · caller sign-in: <b>{caller.last_name}</b></span></article>)}</div>
        <button type="button" className="campaign-button secondary" onClick={() => downloadCallCSV("call-campaign-caller-access.csv", [["Caller name", "Caller last name for access"], ...data.callers.map(caller => [caller.name, caller.last_name])])}><Download size={17} /> Download caller access list</button>
      </section>
      <section className="outbound-panel">
        <div className="outbound-section-heading"><span className="outbound-icon"><Users size={19} /></span><div><h2>Allocate a batch</h2><p>Contacts are assigned from the unallocated list, oldest first. Choose 10, 20 or any number you need.</p></div></div>
        <form className="campaign-allocation-form" onSubmit={allocate}>
          <Field label="Assign to"><select value={selectedCaller} onChange={event => setSelectedCaller(event.target.value)} required><option value="">Choose a caller</option>{data.callers.map(caller => <option value={caller.id} key={caller.id}>{caller.name}</option>)}</select></Field>
          <Field label="Number of contacts"><select value={allocationSize} onChange={event => setAllocationSize(event.target.value)}><option value="10">10 contacts</option><option value="20">20 contacts</option><option value="custom">Custom amount</option></select></Field>
          {allocationSize === "custom" && <Field label="Custom amount"><input type="number" min="1" max={Math.max(remaining, 1)} step="1" value={customSize} onChange={event => setCustomSize(event.target.value)} required /></Field>}
          <button className="campaign-button" type="submit" disabled={busy || !remaining}>{busy ? "Allocating…" : "Allocate contacts"}</button>
        </form>
        {error && <p className="campaign-error" role="alert">{error}</p>}{message && <p className="campaign-notice" role="status">{message}</p>}
      </section>
      <div className="campaign-manager-footer"><button className="campaign-button secondary" type="button" onClick={() => navigate("/calls")}>Open campaign analytics</button></div>
    </>}
  </CallPageFrame>;
}
