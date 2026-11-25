-- Allow managers to clear contact assignments or archive a finished campaign
-- while retaining every campaign contact, caller, and call log for reporting.

create or replace function public.unassign_outbound_call_campaign_contacts(
  p_manager_code text,
  p_contact_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_selected_count integer;
  v_assigned_count integer;
  v_unassigned integer;
begin
  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
  for update;

  if v_campaign.id is null then
    raise exception 'Campaign manager access could not be verified.' using errcode = '28000';
  end if;
  if v_campaign.status <> 'active' then
    raise exception 'Contacts can only be unassigned from an active campaign.' using errcode = '22023';
  end if;
  if p_contact_ids is null or cardinality(p_contact_ids) < 1 or cardinality(p_contact_ids) > 10000 then
    raise exception 'Select between 1 and 10,000 allocated contacts.' using errcode = '22023';
  end if;

  v_selected_count := cardinality(p_contact_ids);
  if v_selected_count <> (select count(distinct selected.contact_id) from unnest(p_contact_ids) as selected(contact_id)) then
    raise exception 'The selected contact list contains duplicates. Refresh and try again.' using errcode = '22023';
  end if;

  perform 1
  from public.outbound_call_campaign_contacts
  where id = any(p_contact_ids)
    and campaign_id = v_campaign.id
    and caller_id is not null
  for update;

  select count(*) into v_assigned_count
  from public.outbound_call_campaign_contacts
  where id = any(p_contact_ids)
    and campaign_id = v_campaign.id
    and caller_id is not null;

  if v_assigned_count <> v_selected_count then
    raise exception 'Some selected contacts are no longer assigned in this campaign. Refresh and select them again.' using errcode = '22023';
  end if;

  update public.outbound_call_campaign_contacts
  set caller_id = null
  where id = any(p_contact_ids)
    and campaign_id = v_campaign.id
    and caller_id is not null;

  select count(*) into v_unassigned
  from public.outbound_call_campaign_contacts
  where campaign_id = v_campaign.id and caller_id is null;

  return jsonb_build_object('unassigned', v_selected_count, 'unassigned_total', v_unassigned);
end;
$$;

create or replace function public.close_outbound_call_campaign(
  p_manager_code text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
begin
  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
  for update;

  if v_campaign.id is null then
    raise exception 'Campaign manager access could not be verified.' using errcode = '28000';
  end if;

  if v_campaign.status = 'active' then
    update public.outbound_call_campaigns
    set status = 'closed'
    where id = v_campaign.id;
  end if;

  return jsonb_build_object('campaign_id', v_campaign.id, 'status', 'closed');
end;
$$;

revoke all on function public.unassign_outbound_call_campaign_contacts(text, uuid[]) from public;
revoke all on function public.close_outbound_call_campaign(text) from public;
grant execute on function public.unassign_outbound_call_campaign_contacts(text, uuid[]) to anon, authenticated;
grant execute on function public.close_outbound_call_campaign(text) to anon, authenticated;

notify pgrst, 'reload schema';
