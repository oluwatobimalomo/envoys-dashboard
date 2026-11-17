-- Allocate an equal batch to selected callers who have not received contacts yet.
create or replace function public.allocate_outbound_call_contacts_to_selected_callers(
  p_manager_code text,
  p_caller_ids uuid[],
  p_count_per_caller integer
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_selected_count integer;
  v_distinct_count integer;
  v_campaign_caller_count integer;
  v_already_allocated_count integer;
  v_required integer;
  v_available integer;
  v_allocated integer := 0;
  v_remaining integer;
begin
  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
    and status = 'active'
  for update;

  if v_campaign.id is null then
    raise exception 'Manager access could not be verified.' using errcode = '28000';
  end if;
  if p_caller_ids is null or cardinality(p_caller_ids) < 1 or cardinality(p_caller_ids) > 100 then
    raise exception 'Select between 1 and 100 callers.' using errcode = '22023';
  end if;
  if p_count_per_caller is null or p_count_per_caller < 1 or p_count_per_caller > 10000 then
    raise exception 'Choose a quantity between 1 and 10,000 contacts per caller.' using errcode = '22023';
  end if;

  v_selected_count := cardinality(p_caller_ids);
  select count(distinct selected.id) into v_distinct_count
  from unnest(p_caller_ids) as selected(id);
  if v_distinct_count <> v_selected_count then
    raise exception 'A caller can only be selected once.' using errcode = '22023';
  end if;

  select count(*) into v_campaign_caller_count
  from public.outbound_call_campaign_callers caller
  where caller.campaign_id = v_campaign.id and caller.id = any(p_caller_ids);
  if v_campaign_caller_count <> v_selected_count then
    raise exception 'One or more selected callers do not belong to this campaign.' using errcode = '22023';
  end if;

  select count(distinct contact.caller_id) into v_already_allocated_count
  from public.outbound_call_campaign_contacts contact
  where contact.campaign_id = v_campaign.id and contact.caller_id = any(p_caller_ids);
  if v_already_allocated_count > 0 then
    raise exception 'Selected callers must not already have allocated contacts. Refresh the caller list and try again.' using errcode = '22023';
  end if;

  v_required := v_selected_count * p_count_per_caller;
  select count(*) into v_available
  from public.outbound_call_campaign_contacts
  where campaign_id = v_campaign.id and caller_id is null;
  if v_available < v_required then
    raise exception 'This allocation needs % unassigned contacts (% per caller for % callers), but only % remain.',
      v_required, p_count_per_caller, v_selected_count, v_available
      using errcode = '22023';
  end if;

  with caller_order as materialized (
    select caller.id, row_number() over (order by caller.created_at, caller.id) as caller_number
    from public.outbound_call_campaign_callers caller
    where caller.campaign_id = v_campaign.id and caller.id = any(p_caller_ids)
  ),
  locked_contacts as materialized (
    select contact.id, contact.created_at
    from public.outbound_call_campaign_contacts contact
    where contact.campaign_id = v_campaign.id and contact.caller_id is null
    order by contact.created_at, contact.id
    limit v_required
    for update skip locked
  ),
  numbered_contacts as (
    select id, row_number() over (order by created_at, id) as contact_number
    from locked_contacts
  ),
  assigned as (
    update public.outbound_call_campaign_contacts contact
    set caller_id = caller.id
    from numbered_contacts next_contact
    join caller_order caller
      on caller.caller_number = ((next_contact.contact_number - 1) / p_count_per_caller) + 1
    where contact.id = next_contact.id
    returning contact.id
  )
  select count(*) into v_allocated from assigned;

  if v_allocated <> v_required then
    raise exception 'The available contacts changed during allocation. Please refresh and try again.' using errcode = '40001';
  end if;

  select count(*) into v_remaining
  from public.outbound_call_campaign_contacts
  where campaign_id = v_campaign.id and caller_id is null;

  return jsonb_build_object(
    'allocated', v_allocated,
    'per_caller', p_count_per_caller,
    'callers', v_selected_count,
    'remaining', v_remaining
  );
end;
$$;

revoke all on function public.allocate_outbound_call_contacts_to_selected_callers(text, uuid[], integer) from public;
grant execute on function public.allocate_outbound_call_contacts_to_selected_callers(text, uuid[], integer) to anon, authenticated;
