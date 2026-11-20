-- Reassign selected contacts between callers without deleting their call logs.
create or replace function public.reassign_outbound_call_campaign_contacts(
  p_manager_code text,
  p_contact_ids uuid[],
  p_caller_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_contact_count integer;
  v_reassigned integer;
begin
  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
  limit 1;

  if v_campaign.id is null then
    raise exception 'Campaign manager access could not be verified.' using errcode = '28000';
  end if;
  if p_caller_id is null or not exists (
    select 1 from public.outbound_call_campaign_callers
    where id = p_caller_id and campaign_id = v_campaign.id
  ) then
    raise exception 'Choose a caller from this campaign.' using errcode = '22023';
  end if;
  if p_contact_ids is null or cardinality(p_contact_ids) < 1 then
    raise exception 'Select at least one allocated contact to reassign.' using errcode = '22023';
  end if;
  if cardinality(p_contact_ids) > 10000 then
    raise exception 'Reassign no more than 10,000 contacts at a time.' using errcode = '22023';
  end if;
  if cardinality(p_contact_ids) <> (select count(distinct selected.contact_id) from unnest(p_contact_ids) as selected(contact_id)) then
    raise exception 'The selected contact list contains duplicates. Refresh and try again.' using errcode = '22023';
  end if;

  perform 1
  from public.outbound_call_campaign_contacts
  where id = any(p_contact_ids)
    and campaign_id = v_campaign.id
    and caller_id is not null
  for update;

  select count(*) into v_contact_count
  from public.outbound_call_campaign_contacts
  where id = any(p_contact_ids)
    and campaign_id = v_campaign.id
    and caller_id is not null;

  if v_contact_count <> cardinality(p_contact_ids) then
    raise exception 'Some selected contacts are no longer allocated in this campaign. Refresh and select them again.' using errcode = '22023';
  end if;

  update public.outbound_call_campaign_contacts
  set caller_id = p_caller_id
  where id = any(p_contact_ids)
    and campaign_id = v_campaign.id
    and caller_id is not null
    and caller_id <> p_caller_id;
  get diagnostics v_reassigned = row_count;

  return jsonb_build_object('reassigned', v_reassigned, 'caller_id', p_caller_id);
end;
$$;

revoke all on function public.reassign_outbound_call_campaign_contacts(text, uuid[], uuid) from public;
grant execute on function public.reassign_outbound_call_campaign_contacts(text, uuid[], uuid) to anon, authenticated;

notify pgrst, 'reload schema';
