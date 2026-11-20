-- Require the campaign's manager key to view its public aggregate dashboard.
-- This RPC returns campaign totals only; contact and caller records stay private.

drop function if exists public.get_public_outbound_call_campaign_dashboard();

create or replace function public.get_public_outbound_call_campaign_dashboard(
  p_campaign_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_metrics jsonb;
  v_key text := btrim(coalesce(p_campaign_key, ''));
begin
  if length(v_key) < 20 then
    return jsonb_build_object('campaign', null, 'metrics', null);
  end if;

  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(v_key, 'sha256'), 'hex')
  limit 1;

  if v_campaign.id is null then
    return jsonb_build_object('campaign', null, 'metrics', null);
  end if;

  select jsonb_build_object(
    'total_contacts', count(*),
    'numbers_called', count(*) filter (where attempt_count > 0),
    'reached', count(*) filter (where status = 'reachable'),
    'awaiting_allocation', count(*) filter (where caller_id is null),
    'not_called', count(*) filter (where attempt_count = 0),
    'call_back_later', count(*) filter (where status = 'call_back_later'),
    'unavailable', count(*) filter (where status = 'unavailable'),
    'invalid_number', count(*) filter (where status = 'invalid_number'),
    'wrong_contact', count(*) filter (where status = 'wrong_contact')
  ) into v_metrics
  from public.outbound_call_campaign_contacts
  where campaign_id = v_campaign.id;

  return jsonb_build_object(
    'campaign', jsonb_build_object(
      'name', v_campaign.name,
      'status', v_campaign.status,
      'created_at', v_campaign.created_at
    ),
    'metrics', v_metrics
  );
end;
$$;

revoke all on function public.get_public_outbound_call_campaign_dashboard(text) from public;
grant execute on function public.get_public_outbound_call_campaign_dashboard(text) to anon, authenticated;

notify pgrst, 'reload schema';
