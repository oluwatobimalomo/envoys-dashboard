-- Let campaign managers add callers after creating a campaign.
-- Caller access for this RPC is based on the normalized phone number.
create or replace function public.add_outbound_call_campaign_callers(
  p_manager_code text,
  p_callers jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_caller jsonb;
  v_name text;
  v_phone text;
  v_added integer := 0;
begin
  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
  for update;

  if v_campaign.id is null then
    raise exception 'Campaign manager access could not be verified.' using errcode = '28000';
  end if;
  if v_campaign.status <> 'active' then
    raise exception 'Callers can only be added to an active campaign.' using errcode = '22023';
  end if;
  if p_callers is null or jsonb_typeof(p_callers) <> 'array' then
    raise exception 'Upload a caller CSV.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_callers) < 1 then
    raise exception 'Upload at least one caller.' using errcode = '22023';
  end if;
  if (select count(*) from public.outbound_call_campaign_callers where campaign_id = v_campaign.id)
      + jsonb_array_length(p_callers) > 100 then
    raise exception 'A campaign can have no more than 100 callers.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_callers) caller(value)
    group by btrim(coalesce(value->>'phone', ''))
    having count(*) > 1
  ) then
    raise exception 'Each caller phone number must be unique in this upload.' using errcode = '22023';
  end if;

  for v_caller in select value from jsonb_array_elements(p_callers)
  loop
    v_name := btrim(coalesce(v_caller->>'name', ''));
    v_phone := regexp_replace(coalesce(v_caller->>'phone', ''), '[^0-9]', '', 'g');
    if length(v_name) < 1 or length(v_phone) < 7 then
      raise exception 'Each caller needs a name and a valid phone number.' using errcode = '22023';
    end if;
    if exists (
      select 1 from public.outbound_call_campaign_callers existing
      where existing.access_code_hash = encode(extensions.digest(v_phone, 'sha256'), 'hex')
        and existing.campaign_id = v_campaign.id
    ) then
      raise exception 'A caller with that phone number is already in this campaign.' using errcode = '22023';
    end if;
    if exists (
      select 1
      from public.outbound_call_campaign_callers existing
      join public.outbound_call_campaigns active_campaign on active_campaign.id = existing.campaign_id
      where existing.access_code_hash = encode(extensions.digest(v_phone, 'sha256'), 'hex')
        and active_campaign.status = 'active'
        and existing.campaign_id <> v_campaign.id
    ) then
      raise exception 'That caller phone number is already assigned to another active campaign.' using errcode = '22023';
    end if;

    insert into public.outbound_call_campaign_callers (
      campaign_id, display_name, normalized_last_name, access_code_hash
    ) values (
      v_campaign.id, v_name, v_phone, encode(extensions.digest(v_phone, 'sha256'), 'hex')
    );
    v_added := v_added + 1;
  end loop;

  return jsonb_build_object('campaign_id', v_campaign.id, 'added', v_added);
end;
$$;

revoke all on function public.add_outbound_call_campaign_callers(text, jsonb) from public;
grant execute on function public.add_outbound_call_campaign_callers(text, jsonb) to anon, authenticated;
