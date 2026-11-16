-- Allocate the same-size batch to every caller in a campaign atomically.
create or replace function public.allocate_outbound_call_contacts_per_caller(
  p_manager_code text,
  p_count_per_caller integer
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_caller_count integer;
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
  if p_count_per_caller is null or p_count_per_caller < 1 or p_count_per_caller > 10000 then
    raise exception 'Choose a per-caller quantity between 1 and 10,000.' using errcode = '22023';
  end if;

  select count(*) into v_caller_count
  from public.outbound_call_campaign_callers
  where campaign_id = v_campaign.id;
  if v_caller_count < 1 then
    raise exception 'Add at least one caller before allocating contacts.' using errcode = '22023';
  end if;

  v_required := v_caller_count * p_count_per_caller;
  select count(*) into v_available
  from public.outbound_call_campaign_contacts
  where campaign_id = v_campaign.id and caller_id is null;
  if v_available < v_required then
    raise exception 'This allocation needs % unassigned contacts (% per caller for % callers), but only % remain.',
      v_required, p_count_per_caller, v_caller_count, v_available
      using errcode = '22023';
  end if;

  with caller_order as materialized (
    select id, row_number() over (order by created_at, id) as caller_number
    from public.outbound_call_campaign_callers
    where campaign_id = v_campaign.id
  ),
  locked_contacts as materialized (
    select id, created_at
    from public.outbound_call_campaign_contacts
    where campaign_id = v_campaign.id and caller_id is null
    order by created_at, id
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
    'callers', v_caller_count,
    'remaining', v_remaining
  );
end;
$$;

revoke all on function public.allocate_outbound_call_contacts_per_caller(text, integer) from public;
grant execute on function public.allocate_outbound_call_contacts_per_caller(text, integer) to anon, authenticated;
