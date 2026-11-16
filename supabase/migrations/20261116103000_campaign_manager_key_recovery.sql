-- Allow an administrator to recover campaign access without exposing campaign
-- records or storing manager keys in plaintext. Verification follows the same
-- custom admin credential check used when creating a campaign.

create or replace function public.list_outbound_call_campaigns_for_admin(
  p_admin_username text,
  p_admin_password text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_username text := lower(btrim(coalesce(p_admin_username, '')));
  v_saved_password text;
  v_campaigns jsonb;
begin
  if v_username = '' or coalesce(p_admin_password, '') = '' then
    raise exception 'Enter admin credentials to verify campaign access.' using errcode = '22023';
  end if;

  select password_hash into v_saved_password
  from public.app_users
  where lower(username) = v_username and is_active is true and role = 'admin'
  limit 1;

  if v_saved_password is null or (
    v_saved_password <> encode(extensions.digest(v_username || ':' || btrim(p_admin_password), 'sha256'), 'hex')
    and v_saved_password <> btrim(p_admin_password)
  ) then
    raise exception 'Admin credentials could not be verified.' using errcode = '28000';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'status', c.status,
    'created_at', c.created_at,
    'total_contacts', (select count(*) from public.outbound_call_campaign_contacts x where x.campaign_id = c.id),
    'called_contacts', (select count(*) from public.outbound_call_campaign_contacts x where x.campaign_id = c.id and x.attempt_count > 0)
  ) order by c.created_at desc), '[]'::jsonb)
  into v_campaigns
  from public.outbound_call_campaigns c;

  return jsonb_build_object('campaigns', v_campaigns);
end;
$$;

create or replace function public.reset_outbound_call_campaign_manager_key(
  p_admin_username text,
  p_admin_password text,
  p_campaign_id uuid,
  p_manager_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_username text := lower(btrim(coalesce(p_admin_username, '')));
  v_saved_password text;
  v_campaign public.outbound_call_campaigns%rowtype;
  v_key_hash text;
begin
  if v_username = '' or coalesce(p_admin_password, '') = '' then
    raise exception 'Enter admin credentials to verify campaign access.' using errcode = '22023';
  end if;

  select password_hash into v_saved_password
  from public.app_users
  where lower(username) = v_username and is_active is true and role = 'admin'
  limit 1;

  if v_saved_password is null or (
    v_saved_password <> encode(extensions.digest(v_username || ':' || btrim(p_admin_password), 'sha256'), 'hex')
    and v_saved_password <> btrim(p_admin_password)
  ) then
    raise exception 'Admin credentials could not be verified.' using errcode = '28000';
  end if;

  if p_campaign_id is null or length(btrim(coalesce(p_manager_key, ''))) < 20 then
    raise exception 'Choose a campaign and a manager key with at least 20 characters.' using errcode = '22023';
  end if;

  select * into v_campaign
  from public.outbound_call_campaigns
  where id = p_campaign_id
  for update;

  if v_campaign.id is null then
    raise exception 'The selected campaign could not be found.' using errcode = '22023';
  end if;

  v_key_hash := encode(extensions.digest(btrim(p_manager_key), 'sha256'), 'hex');
  update public.outbound_call_campaigns
  set manager_code_hash = v_key_hash
  where id = v_campaign.id;

  return jsonb_build_object('campaign_id', v_campaign.id, 'campaign_name', v_campaign.name);
end;
$$;

revoke all on function public.list_outbound_call_campaigns_for_admin(text, text) from public;
revoke all on function public.reset_outbound_call_campaign_manager_key(text, text, uuid, text) from public;
grant execute on function public.list_outbound_call_campaigns_for_admin(text, text) to anon, authenticated;
grant execute on function public.reset_outbound_call_campaign_manager_key(text, text, uuid, text) to anon, authenticated;
