import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Download, Plus, UserRoundPlus, Users, Upload } from "lucide-react";
import { CallPageFrame, downloadCallCSV, Field, invokeCallCampaign, normalizeCallerPhone, normalizeNigerianPhone, parseCallCSV } from "./callCampaignUtils.jsx";

function callerAccessValue(access) {
  const phone = normalizeCallerPhone(access);
  return phone ? normalizeNigerianPhone(phone) : access;
}
function callerAccessLabel(access) { return normalizeCallerPhone(access) ? "phone access:" : "legacy surname access:"; }

export default function CallAllocationPage({ session }) {
  const navigate = useNavigate();
  const [creatingNewCampaign, setCreatingNewCampaign] = useState(() => sessionStorage.getItem("outbound_call_new_campaign_mode") === "true");
  const [managerCode, setManagerCode] = useState(() => sessionStorage.getItem("outbound_call_new_campaign_mode") === "true" ? "" : sessionStorage.getItem("outbound_call_manager_code") || "");
  const [data, setData] = useState(null);
  const [returnManagerCode, setReturnManagerCode] = useState(() => sessionStorage.getItem("outbound_call_new_campaign_mode") === "true" ? sessionStorage.getItem("outbound_call_manager_code") || "" : "");
  const [campaignName, setCampaignName] = useState("");
  const [newManagerKey, setNewManagerKey] = useState("");
  const [confirmManagerKey, setConfirmManagerKey] = useState("");
  const [callerRows, setCallerRows] = useState([]);
  const [callerHeaders, setCallerHeaders] = useState([]);
  const [callerNameColumn, setCallerNameColumn] = useState("");
  const [callerPhoneColumn, setCallerPhoneColumn] = useState("");
  const [additionalCallerRows, setAdditionalCallerRows] = useState([]);
  const [additionalCallerHeaders, setAdditionalCallerHeaders] = useState([]);
  const [additionalCallerNameColumn, setAdditionalCallerNameColumn] = useState("");
  const [additionalCallerPhoneColumn, setAdditionalCallerPhoneColumn] = useState("");
  const [csvRows, setCsvRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [nameColumn, setNameColumn] = useState("");
  const [firstNameColumn, setFirstNameColumn] = useState("");
  const [surnameColumn, setSurnameColumn] = useState("");
  const [phoneColumn, setPhoneColumn] = useState("");
  const [membershipColumn, setMembershipColumn] = useState("");
  const [adminUsername, setAdminUsername] = useState(session?.username || "");
  const [adminPassword, setAdminPassword] = useState("");
  const [allocationSize, setAllocationSize] = useState("10");
  const [customSize, setCustomSize] = useState("");
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [additionalCallerError, setAdditionalCallerError] = useState("");
  const [additionalCallerMessage, setAdditionalCallerMessage] = useState("");

  const callers = useMemo(() => callerRows.map(row => {
    const name = (row[callerNameColumn] || "").trim();
    const phone = normalizeCallerPhone(row[callerPhoneColumn]);
    return { name, phone, last_name: phone };
  }).filter(caller => caller.name && caller.phone.length >= 7), [callerRows, callerNameColumn, callerPhoneColumn]);
  const additionalCallers = useMemo(() => additionalCallerRows.map(row => ({
    name: (row[additionalCallerNameColumn] || "").trim(),
    phone: normalizeCallerPhone(row[additionalCallerPhoneColumn]),
  })).filter(caller => caller.name && caller.phone.length >= 7), [additionalCallerRows, additionalCallerNameColumn, additionalCallerPhoneColumn]);
  const contacts = useMemo(() => csvRows.map(row => {
    const name = (nameColumn ? row[nameColumn] : [row[firstNameColumn], row[surnameColumn]].filter(Boolean).join(" ")).trim();
    const phone = normalizeNigerianPhone(row[phoneColumn]);
    const membership_status = (row[membershipColumn] || "").trim();
    const used = [nameColumn, firstNameColumn, surnameColumn, phoneColumn, membershipColumn].filter(Boolean);
    const extra_fields = Object.fromEntries(Object.entries(row).filter(([key]) => !used.includes(key)));
    return { name, phone, membership_status, extra_fields };
  }), [csvRows, nameColumn, firstNameColumn, surnameColumn, phoneColumn, membershipColumn]);
  const validContacts = contacts.filter(contact => contact.name && contact.phone);
  const duplicateCallerPhones = callers.some((caller, index) => callers.findIndex(item => item.phone === caller.phone) !== index);
  const duplicateAdditionalPhones = additionalCallers.some((caller, index) => additionalCallers.findIndex(item => item.phone === caller.phone) !== index);
  const remaining = Number(data?.unassigned || 0);
  const quantity = allocationSize === "custom" ? Number(customSize) : Number(allocationSize);
  const perCallerCapacity = data?.callers?.length ? Math.floor(remaining / data.callers.length) : 0;

  useEffect(() => {
    if (allocationSize === "custom" && customSize && Number(customSize) > perCallerCapacity) {
      setCustomSize(perCallerCapacity ? String(perCallerCapacity) : "");
    }
  }, [allocationSize, customSize, perCallerCapacity]);

  const refresh = async (code = managerCode) => {
    const result = await invokeCallCampaign("get_outbound_call_campaign_manager", { p_manager_code: code });
    setData(result);
    return result;
  };

  // Load an existing campaign when the manager opens allocation from the dashboard.
  useEffect(() => {
    if (!managerCode || creatingNewCampaign || session?.role !== "admin") return;
    let current = true;
    setBusy(true);
    invokeCallCampaign("get_outbound_call_campaign_manager", { p_manager_code: managerCode })
      .then(result => { if (current) setData(result); })
      .catch(err => { if (current) setError(err.message || "Unable to open the campaign allocation page."); })
      .finally(() => { if (current) setBusy(false); });
    return () => { current = false; };
  }, [managerCode, creatingNewCampaign, session?.role]);

  const onFile = async event => {
    setError(""); setMessage(""); setCsvRows([]); setHeaders([]);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseCallCSV(await file.text());
      if (!rows.length) throw new Error("Choose a CSV with a header row and at least one contact.");
      const columns = Object.keys(rows[0]);
      const choose = aliases => columns.find(column => aliases.includes(column.replace(/[_-]/g, " ").trim().toLowerCase())) || "";
      setCsvRows(rows); setHeaders(columns);
      setNameColumn(choose(["name", "full name", "contact name", "customer name"]));
      setFirstNameColumn(choose(["first name", "firstname", "given name"]));
      setSurnameColumn(choose(["surname", "last name", "lastname", "family name"]));
      setPhoneColumn(choose(["phone", "phone number", "mobile", "mobile number", "telephone", "tel", "contact number"]));
      setMembershipColumn(choose(["membership status", "membership", "status"]));
      setMessage(`${rows.length.toLocaleString()} rows loaded. Review the column mapping.`);
    } catch (err) { setError(err.message || "Unable to read this CSV file."); }
  };

  const onCallerFile = async event => {
    setError(""); setMessage(""); setCallerRows([]); setCallerHeaders([]);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseCallCSV(await file.text());
      if (!rows.length) throw new Error("Choose a caller CSV with a header row and at least one caller.");
      const columns = Object.keys(rows[0]);
      const choose = aliases => columns.find(column => aliases.includes(column.replace(/[_-]/g, " ").trim().toLowerCase())) || "";
      setCallerRows(rows); setCallerHeaders(columns);
      setCallerNameColumn(choose(["name", "full name", "caller name", "caller", "display name"]));
      setCallerPhoneColumn(choose(["phone", "phone number", "caller phone", "mobile", "mobile number", "telephone", "tel", "contact number"]));
      setMessage(`${rows.length.toLocaleString()} caller rows loaded. Review the name and phone columns.`);
    } catch (err) { setError(err.message || "Unable to read the caller CSV file."); }
  };

  const onAdditionalCallerFile = async event => {
    setAdditionalCallerError(""); setAdditionalCallerMessage(""); setAdditionalCallerRows([]); setAdditionalCallerHeaders([]);
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = parseCallCSV(await file.text());
      if (!rows.length) throw new Error("Choose a caller CSV with a header row and at least one caller.");
      const columns = Object.keys(rows[0]);
      const choose = aliases => columns.find(column => aliases.includes(column.replace(/[_-]/g, " ").trim())) || "";
      setAdditionalCallerRows(rows); setAdditionalCallerHeaders(columns);
      setAdditionalCallerNameColumn(choose(["name", "full name", "caller name", "caller", "display name"]));
      setAdditionalCallerPhoneColumn(choose(["phone", "phone number", "caller phone", "mobile", "mobile number", "telephone", "tel", "contact number"]));
      setAdditionalCallerMessage(`${rows.length.toLocaleString()} caller rows loaded. Review the name and phone columns.`);
    } catch (err) { setAdditionalCallerError(err.message || "Unable to read the caller CSV file."); }
  };

  const createCampaign = async event => {
    event.preventDefault(); setError(""); setMessage(""); setCreated(null);
    if (!callers.length) return setError("Upload a caller CSV and map the name and phone number columns.");
    if (duplicateCallerPhones) return setError("Each caller phone number must be unique within this campaign.");
    if (callers.length < callerRows.length) return setError("Every caller row needs a name and a valid phone number. Review the CSV column mapping and rows.");
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
      sessionStorage.removeItem("outbound_call_new_campaign_mode");
      setCreatingNewCampaign(false); setReturnManagerCode("");
      setManagerCode(newManagerCode);
      setCreated({ ...result, manager_code: newManagerCode });
      setAdminPassword("");
      const refreshed = await refresh(newManagerCode);
      setMessage("Campaign created. Contact records are ready for bulk allocation.");
    } catch (err) { setError(err.message || "Unable to create the campaign."); }
    finally { setBusy(false); }
  };

  const allocate = async event => {
    event.preventDefault(); setError(""); setMessage("");
    if (!Number.isInteger(quantity) || quantity < 1) return setError("Enter a whole number greater than zero.");
    if (!data?.callers?.length) return setError("Add at least one caller before allocating contacts.");
    if (quantity > perCallerCapacity) return setError(`Only ${perCallerCapacity} contacts per caller can be allocated equally with the ${remaining} contacts currently unassigned.`);
    setBusy(true);
    try {
      const result = await invokeCallCampaign("allocate_outbound_call_contacts_per_caller", {
        p_manager_code: managerCode.trim(), p_count_per_caller: quantity,
      });
      await refresh();
      const allocated = Number(result.allocated || 0);
      setMessage(allocated ? `${result.per_caller} contacts assigned to each of ${result.callers} callers (${allocated} total). ${result.remaining} remain unassigned.` : "There are no unassigned contacts left in this campaign.");
    } catch (err) { setError(err.message || "Unable to allocate contacts."); }
    finally { setBusy(false); }
  };

  const addCallers = async event => {
    event.preventDefault(); setAdditionalCallerError(""); setAdditionalCallerMessage("");
    if (!additionalCallers.length) return setAdditionalCallerError("Upload a caller CSV and map its name and phone number columns.");
    if (additionalCallers.length < additionalCallerRows.length) return setAdditionalCallerError("Every caller row needs a name and a valid phone number.");
    if (duplicateAdditionalPhones) return setAdditionalCallerError("Each caller phone number must be unique in the upload.");
    const existingPhones = new Set((data?.callers || []).map(caller => normalizeCallerPhone(caller.last_name)).filter(Boolean));
    if (additionalCallers.some(caller => existingPhones.has(caller.phone))) return setAdditionalCallerError("A caller phone number is already registered in this campaign.");
    if ((data?.callers?.length || 0) + additionalCallers.length > 100) return setAdditionalCallerError("A campaign can have no more than 100 callers.");
    setBusy(true);
    try {
      const result = await invokeCallCampaign("add_outbound_call_campaign_callers", {
        p_manager_code: managerCode.trim(),
        p_callers: additionalCallers.map(caller => ({ name: caller.name, phone: caller.phone })),
      });
      await refresh();
      setAdditionalCallerRows([]); setAdditionalCallerHeaders([]); setAdditionalCallerNameColumn(""); setAdditionalCallerPhoneColumn("");
      setAdditionalCallerMessage(`${Number(result.added || additionalCallers.length).toLocaleString()} callers added. They can now receive contact allocations.`);
    } catch (err) { setAdditionalCallerError(err.message || "Unable to add callers to this campaign."); }
    finally { setBusy(false); }
  };

  const startNewCampaign = () => {
    setReturnManagerCode(managerCode || sessionStorage.getItem("outbound_call_manager_code") || "");
    sessionStorage.setItem("outbound_call_new_campaign_mode", "true");
    setCreatingNewCampaign(true);
    setManagerCode("");
    setData(null);
    setCreated(null);
    setCampaignName(""); setNewManagerKey(""); setConfirmManagerKey("");
    setCallerRows([]); setCallerHeaders([]); setCallerNameColumn(""); setCallerPhoneColumn("");
    setAdditionalCallerRows([]); setAdditionalCallerHeaders([]); setAdditionalCallerNameColumn(""); setAdditionalCallerPhoneColumn("");
    setCsvRows([]); setHeaders([]); setNameColumn(""); setFirstNameColumn(""); setSurnameColumn(""); setPhoneColumn(""); setMembershipColumn("");
    setAllocationSize("10"); setCustomSize("");
    setError(""); setMessage(""); setAdditionalCallerError(""); setAdditionalCallerMessage("");
  };

  const returnToCurrentCampaign = () => {
    if (!returnManagerCode) return;
    sessionStorage.removeItem("outbound_call_new_campaign_mode");
    setCreatingNewCampaign(false);
    setManagerCode(returnManagerCode);
    setReturnManagerCode("");
    setError(""); setMessage("");
  };

  if (!session || session.role !== "admin") return <CallPageFrame eyebrow="Contact allocation" title="Admin access required" subtitle="Sign in with an admin account to upload a list and allocate contacts."><section className="outbound-panel"><a className="campaign-button" href="/app/admin_overview">Sign in as admin</a></section></CallPageFrame>;

  return <CallPageFrame eyebrow="Outreach workspace" title="Allocate contacts" subtitle="Upload callers and contacts, then assign a manageable batch to each caller.">
    <nav className="campaign-manager-nav" aria-label="Campaign management"><button type="button" className="campaign-button secondary" onClick={() => navigate("/calls")}><ArrowLeft size={17} /> Campaign dashboard</button><span className="campaign-nav-current"><Users size={17} /> Contact allocation</span></nav>
    {!data && <section className="outbound-panel">
      <div className="outbound-section-heading"><span className="outbound-icon"><Upload size={19} /></span><div><h2>Create a campaign</h2><p>Import callers by name and phone, then upload the list of contacts. Callers use their phone number to open their assigned list.</p></div></div>
      {returnManagerCode && <button type="button" className="campaign-button secondary campaign-return-button" onClick={returnToCurrentCampaign}><ArrowLeft size={17} /> Back to current campaign</button>}
      {created && <div className="campaign-created" role="status"><h3>{created.campaign_name} is ready</h3><p>{Number(created.total_contacts).toLocaleString()} contacts are waiting for allocation. Callers enter the phone number from the caller CSV.</p><div className="campaign-code-row"><strong>Manager key</strong><code>{created.manager_code}</code><button type="button" onClick={() => navigator.clipboard?.writeText(created.manager_code)}>Copy</button></div><button type="button" className="campaign-button secondary" onClick={() => downloadCallCSV("call-campaign-callers.csv", [["Caller name", "Phone number for access"], ...created.callers.map(caller => [caller.name, caller.last_name])])}><Download size={17} /> Download caller access list</button></div>}
      <form className="campaign-form" onSubmit={createCampaign}>
        <Field label="Campaign name"><input value={campaignName} onChange={event => setCampaignName(event.target.value)} placeholder="e.g. Member follow-up · November" required /></Field>
        <Field label="Campaign manager key" hint="Create a private passphrase of at least 20 characters. You’ll use it to reopen campaign records and can reset it later with your admin credentials."><input type="password" value={newManagerKey} onChange={event => setNewManagerKey(event.target.value)} autoComplete="new-password" minLength={20} placeholder="Create your manager key" required /></Field>
        <Field label="Confirm campaign manager key"><input type="password" value={confirmManagerKey} onChange={event => setConfirmManagerKey(event.target.value)} autoComplete="new-password" minLength={20} placeholder="Enter the same manager key" required /></Field>
        <Field label="Caller details CSV" hint="Upload a CSV with a header row containing each caller’s name and phone number."><input type="file" accept=".csv,text/csv" onChange={onCallerFile} required /></Field>
        {callerHeaders.length > 0 && <div className="campaign-mapping"><div className="campaign-map-grid">
          <Field label="Caller name column"><select value={callerNameColumn} onChange={event => setCallerNameColumn(event.target.value)} required><option value="">Choose column</option>{callerHeaders.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
          <Field label="Caller phone number column"><select value={callerPhoneColumn} onChange={event => setCallerPhoneColumn(event.target.value)} required><option value="">Choose column</option>{callerHeaders.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
        </div><p className="campaign-hint">{callers.length.toLocaleString()} callers mapped from {callerRows.length.toLocaleString()} rows. Caller phone numbers are normalized before access is set up.</p>{duplicateCallerPhones && <p className="campaign-warning">Duplicate caller phone numbers found. Each caller needs a unique phone number.</p>}{callers.length < callerRows.length && <p className="campaign-warning">Some rows are missing a name or a valid phone number.</p>}{callers.length > 0 && <div className="campaign-roster-preview"><strong>Caller access numbers</strong>{callers.map((caller, index) => <span key={`${caller.phone}-${index}`}>{caller.name}<b>{caller.phone}</b></span>)}</div>}</div>}
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
        <div className="outbound-workspace-heading"><div><span className="outbound-kicker">Active campaign</span><h2>{data.campaign.name}</h2><p>{data.contacts.length.toLocaleString()} contacts · {data.unassigned.toLocaleString()} unassigned</p></div><div className="campaign-allocation-heading-actions"><button type="button" className="campaign-button secondary" onClick={startNewCampaign}><Plus size={17} aria-hidden="true" /> Start new campaign</button><CheckCircle size={22} color="#167743" aria-label="Campaign active" /></div></div>
        {created && <div className="campaign-created" role="status"><h3>Campaign access details</h3><p>Keep this manager key to reopen analytics and allocations on another device.</p><div className="campaign-code-row"><strong>Manager key</strong><code>{created.manager_code}</code><button type="button" onClick={() => navigator.clipboard?.writeText(created.manager_code)}>Copy</button></div></div>}
        <div className="campaign-manager-list">{data.callers.map(caller => <article key={caller.id}><strong>{caller.name}</strong><span>{caller.total} assigned · {caller.called} called · {callerAccessLabel(caller.last_name)} <b>{callerAccessValue(caller.last_name)}</b></span></article>)}</div>
        <button type="button" className="campaign-button secondary" onClick={() => downloadCallCSV("call-campaign-caller-access.csv", [["Caller name", "Caller access phone or legacy surname"], ...data.callers.map(caller => [caller.name, callerAccessValue(caller.last_name)])])}><Download size={17} /> Download caller access list</button>
      </section>
      <section className="outbound-panel campaign-add-callers-panel">
        <div className="outbound-section-heading"><span className="outbound-icon"><UserRoundPlus size={19} aria-hidden="true" /></span><div><h2>Add callers</h2><p>Add callers to this campaign at any time. Upload a CSV with their names and phone numbers; they’ll become available in the allocation list.</p></div></div>
        <form className="campaign-form" onSubmit={addCallers}>
          <Field label="Caller details CSV" hint={`${data.callers.length} of 100 callers currently in this campaign.`}><input type="file" accept=".csv,text/csv" onChange={onAdditionalCallerFile} /></Field>
          {additionalCallerHeaders.length > 0 && <div className="campaign-mapping"><div className="campaign-map-grid">
            <Field label="Caller name column"><select value={additionalCallerNameColumn} onChange={event => setAdditionalCallerNameColumn(event.target.value)} required><option value="">Choose column</option>{additionalCallerHeaders.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
            <Field label="Caller phone number column"><select value={additionalCallerPhoneColumn} onChange={event => setAdditionalCallerPhoneColumn(event.target.value)} required><option value="">Choose column</option>{additionalCallerHeaders.map(header => <option value={header} key={header}>{header}</option>)}</select></Field>
          </div><p className="campaign-hint">{additionalCallers.length.toLocaleString()} callers mapped from {additionalCallerRows.length.toLocaleString()} rows.</p>{additionalCallers.length < additionalCallerRows.length && <p className="campaign-warning">Some rows are missing a name or a valid phone number.</p>}{duplicateAdditionalPhones && <p className="campaign-warning">Duplicate phone numbers found in this upload.</p>}{additionalCallers.length > 0 && <div className="campaign-roster-preview"><strong>Callers to add</strong>{additionalCallers.map((caller, index) => <span key={`${caller.phone}-${index}`}>{caller.name}<b>{caller.phone}</b></span>)}</div>}</div>}
          <button className="campaign-button" type="submit" disabled={busy || additionalCallers.length === 0 || data.callers.length + additionalCallers.length > 100}>{busy ? "Adding callers…" : `Add ${additionalCallers.length || "callers"}`}</button>
        </form>
        {additionalCallerError && <p className="campaign-error" role="alert">{additionalCallerError}</p>}{additionalCallerMessage && <p className="campaign-notice" role="status">{additionalCallerMessage}</p>}
      </section>
      <section className="outbound-panel">
        <div className="outbound-section-heading"><span className="outbound-icon"><Users size={19} /></span><div><h2>Allocate contacts per caller</h2><p>Choose a batch size and the same number of oldest unassigned contacts will be assigned to every caller.</p></div></div>
        <div className="campaign-allocation-capacity" aria-live="polite">
          <span>{data.callers.length} callers</span>
          <span>{remaining.toLocaleString()} unassigned</span>
          <span className={perCallerCapacity ? "is-available" : "is-unavailable"}>{perCallerCapacity ? `Up to ${perCallerCapacity.toLocaleString()} each` : "Not enough contacts for an equal batch"}</span>
        </div>
        <form className="campaign-allocation-form" onSubmit={allocate}>
          <Field label="Contacts per caller"><select value={allocationSize} onChange={event => setAllocationSize(event.target.value)}><option value="10" disabled={perCallerCapacity < 10}>10 contacts each</option><option value="20" disabled={perCallerCapacity < 20}>20 contacts each</option><option value="custom" disabled={!perCallerCapacity}>Custom amount per caller</option></select></Field>
          {allocationSize === "custom" && <Field label="Custom amount per caller"><input type="number" min="1" max={perCallerCapacity} step="1" value={customSize} onChange={event => setCustomSize(event.target.value)} disabled={!perCallerCapacity} required /></Field>}
          <button className="campaign-button" type="submit" disabled={busy || !perCallerCapacity || !data.callers.length}>{busy ? "Allocating…" : perCallerCapacity ? "Allocate to all callers" : "Not enough contacts"}</button>
        </form>
        {error && <p className="campaign-error" role="alert">{error}</p>}{message && <p className="campaign-notice" role="status">{message}</p>}
      </section>
      <div className="campaign-manager-footer"><button className="campaign-button secondary" type="button" onClick={() => navigate("/calls")}>Open campaign analytics</button></div>
    </>}
  </CallPageFrame>;
}
