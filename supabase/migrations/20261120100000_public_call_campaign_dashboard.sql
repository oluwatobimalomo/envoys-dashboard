-- Public pastorate dashboard: publish campaign-level totals only, never contact PII.
create or replace function public.get_public_outbound_call_campaign_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_metrics jsonb;
begin
  select * into v_campaign
  from public.outbound_call_campaigns
  where status = 'active'
  order by created_at desc, id desc
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

revoke all on function public.get_public_outbound_call_campaign_dashboard() from public;
grant execute on function public.get_public_outbound_call_campaign_dashboard() to anon, authenticated;
