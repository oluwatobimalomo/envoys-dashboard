-- Include campaign records in the key-protected pastorate dashboard.
-- A campaign manager key is required; caller phone credentials are not exposed.
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
  v_callers jsonb;
  v_contacts jsonb;
  v_key text := btrim(coalesce(p_campaign_key, ''));
begin
  if length(v_key) < 20 then
    return jsonb_build_object('campaign', null, 'metrics', null, 'callers', '[]'::jsonb, 'contacts', '[]'::jsonb);
  end if;

  select * into v_campaign
  from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(v_key, 'sha256'), 'hex')
  limit 1;

  if v_campaign.id is null then
    return jsonb_build_object('campaign', null, 'metrics', null, 'callers', '[]'::jsonb, 'contacts', '[]'::jsonb);
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'name', caller_stats.name,
    'total', caller_stats.total,
    'called', caller_stats.called,
    'reached', caller_stats.reached,
    'callbacks', caller_stats.callbacks,
    'not_reached', caller_stats.not_reached
  ) order by caller_stats.name), '[]'::jsonb)
  into v_callers
  from (
    select
      c.display_name as name,
      count(x.id) as total,
      count(x.id) filter (where x.attempt_count > 0) as called,
      count(x.id) filter (where x.status = 'reachable') as reached,
      count(x.id) filter (where x.status = 'call_back_later') as callbacks,
      count(x.id) filter (where x.status in ('unavailable', 'invalid_number', 'wrong_contact')) as not_reached
    from public.outbound_call_campaign_callers c
    left join public.outbound_call_campaign_contacts x
      on x.caller_id = c.id and x.campaign_id = v_campaign.id
    where c.campaign_id = v_campaign.id
    group by c.id, c.display_name
  ) as caller_stats;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'full_name', c.full_name,
    'phone', c.phone,
    'membership_status', c.membership_status,
    'status', c.status,
    'attempt_count', c.attempt_count,
    'caller_name', caller.display_name,
    'logs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'outcome', l.outcome,
        'feedback', l.feedback,
        'callback_at', l.callback_at,
        'created_at', l.created_at
      ) order by l.created_at desc)
      from public.outbound_call_campaign_logs l
      where l.contact_id = c.id
    ), '[]'::jsonb)
  ) order by c.created_at, c.id), '[]'::jsonb)
  into v_contacts
  from public.outbound_call_campaign_contacts c
  left join public.outbound_call_campaign_callers caller on caller.id = c.caller_id
  where c.campaign_id = v_campaign.id;

  return jsonb_build_object(
    'campaign', jsonb_build_object(
      'name', v_campaign.name,
      'status', v_campaign.status,
      'created_at', v_campaign.created_at
    ),
    'metrics', v_metrics,
    'callers', v_callers,
    'contacts', v_contacts
  );
end;
$$;

revoke all on function public.get_public_outbound_call_campaign_dashboard(text) from public;
grant execute on function public.get_public_outbound_call_campaign_dashboard(text) to anon, authenticated;

notify pgrst, 'reload schema';
