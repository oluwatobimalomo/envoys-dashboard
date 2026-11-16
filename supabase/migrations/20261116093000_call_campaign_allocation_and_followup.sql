-- Split caller access from campaign management. Callers identify themselves by
-- their surname; managers retain the high-entropy campaign key.
alter table public.outbound_call_campaign_callers
  drop constraint if exists outbound_call_campaign_callers_access_code_hash_key;
alter table public.outbound_call_campaign_callers
  add column if not exists normalized_last_name text;
update public.outbound_call_campaign_callers
set normalized_last_name = lower(reverse(split_part(reverse(btrim(display_name)), ' ', 1)))
where normalized_last_name is null;
alter table public.outbound_call_campaign_callers
  alter column normalized_last_name set not null;
alter table public.outbound_call_campaign_callers
  alter column access_code_hash drop not null;
create unique index if not exists outbound_call_callers_campaign_last_name_idx
  on public.outbound_call_campaign_callers (campaign_id, access_code_hash);

alter table public.outbound_call_campaign_contacts
  alter column caller_id drop not null;
alter table public.outbound_call_campaign_contacts
  add column if not exists membership_status text not null default '';
alter table public.outbound_call_campaign_contacts
  drop constraint if exists outbound_call_campaign_contacts_status_check;
alter table public.outbound_call_campaign_contacts
  add constraint outbound_call_campaign_contacts_status_check
  check (status in ('pending', 'callback', 'done', 'reachable', 'call_back_later', 'unavailable', 'invalid_number', 'wrong_contact'));
alter table public.outbound_call_campaign_logs
  add column if not exists callback_at timestamptz;
alter table public.outbound_call_campaign_logs
  drop constraint if exists outbound_call_campaign_logs_outcome_check;
alter table public.outbound_call_campaign_logs
  add constraint outbound_call_campaign_logs_outcome_check
  check (outcome in ('reached', 'no_answer', 'busy', 'callback', 'wrong_number', 'reachable', 'call_back_later', 'unavailable', 'invalid_number', 'wrong_contact'));

drop function if exists public.get_outbound_call_workspace(text);

create or replace function public.create_outbound_call_campaign(
  p_admin_username text,
  p_admin_password text,
  p_name text,
  p_manager_code text,
  p_callers jsonb,
  p_contacts jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign_id uuid;
  v_caller jsonb;
  v_contact jsonb;
  v_caller_id uuid;
  v_index integer := 0;
  v_username text := lower(btrim(coalesce(p_admin_username, '')));
  v_saved_password text;
  v_created_callers jsonb := '[]'::jsonb;
  v_last_name text;
begin
  if v_username = '' or coalesce(p_admin_password, '') = '' then
    raise exception 'Enter admin credentials to create a campaign.' using errcode = '22023';
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
  if length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception 'Enter a campaign name.' using errcode = '22023';
  end if;
  if length(coalesce(p_manager_code, '')) < 20 then
    raise exception 'Manager access code is invalid.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_callers) <> 'array' or jsonb_array_length(p_callers) < 1 or jsonb_array_length(p_callers) > 100 then
    raise exception 'Add between 1 and 100 callers.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_contacts) <> 'array' or jsonb_array_length(p_contacts) < 1 or jsonb_array_length(p_contacts) > 10000 then
    raise exception 'Upload between 1 and 10,000 contacts.' using errcode = '22023';
  end if;
  if exists (
    select lower(btrim(value->>'last_name'))
    from jsonb_array_elements(p_callers)
    group by lower(btrim(value->>'last_name'))
    having count(*) > 1
  ) then
    raise exception 'Each caller needs a distinct last name within this campaign.' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_callers) input(value)
    join public.outbound_call_campaign_callers existing
      on existing.access_code_hash = encode(extensions.digest(lower(btrim(input.value->>'last_name')), 'sha256'), 'hex')
    join public.outbound_call_campaigns active_campaign
      on active_campaign.id = existing.campaign_id and active_campaign.status = 'active'
  ) then
    raise exception 'A caller with that last name already has an active campaign list. Close the earlier campaign or use a distinct caller surname.' using errcode = '22023';
  end if;

  insert into public.outbound_call_campaigns (name, manager_code_hash)
  values (btrim(p_name), encode(extensions.digest(p_manager_code, 'sha256'), 'hex'))
  returning id into v_campaign_id;

  for v_caller in select value from jsonb_array_elements(p_callers)
  loop
    v_last_name := lower(btrim(coalesce(v_caller->>'last_name', '')));
    if length(btrim(coalesce(v_caller->>'name', ''))) < 1 or length(v_last_name) < 2 then
      raise exception 'Each caller needs a name and a last name of at least two characters.' using errcode = '22023';
    end if;
    insert into public.outbound_call_campaign_callers (campaign_id, display_name, normalized_last_name, access_code_hash)
    values (
      v_campaign_id,
      btrim(v_caller->>'name'),
      v_last_name,
      encode(extensions.digest(v_last_name, 'sha256'), 'hex')
    ) returning id into v_caller_id;
    v_created_callers := v_created_callers || jsonb_build_array(jsonb_build_object(
      'id', v_caller_id, 'name', btrim(v_caller->>'name'), 'last_name', v_last_name
    ));
  end loop;

  for v_contact in select value from jsonb_array_elements(p_contacts)
  loop
    if length(btrim(coalesce(v_contact->>'name', ''))) < 1 or length(btrim(coalesce(v_contact->>'phone', ''))) < 5 then
      raise exception 'A contact is missing a name or phone number.' using errcode = '22023';
    end if;
    insert into public.outbound_call_campaign_contacts (campaign_id, caller_id, full_name, phone, membership_status, extra_fields)
    values (
      v_campaign_id,
      null,
      btrim(v_contact->>'name'),
      btrim(v_contact->>'phone'),
      btrim(coalesce(v_contact->>'membership_status', '')),
      coalesce(v_contact->'extra_fields', '{}'::jsonb)
    );
    v_index := v_index + 1;
  end loop;

  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'campaign_name', btrim(p_name),
    'manager_code', p_manager_code,
    'total_contacts', v_index,
    'callers', v_created_callers
  );
end;
$$;

create or replace function public.get_outbound_call_workspace(p_last_name text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_caller public.outbound_call_campaign_callers%rowtype;
  v_campaign public.outbound_call_campaigns%rowtype;
  v_contacts jsonb;
  v_last_name text := lower(btrim(coalesce(p_last_name, '')));
begin
  select * into v_caller
  from public.outbound_call_campaign_callers a
  where a.access_code_hash = encode(extensions.digest(v_last_name, 'sha256'), 'hex')
    and exists (select 1 from public.outbound_call_campaigns c where c.id = a.campaign_id and c.status = 'active')
  order by a.created_at desc
  limit 1;
  if v_caller.id is null then raise exception 'No active caller list matches that last name.' using errcode = '28000'; end if;

  select * into v_campaign from public.outbound_call_campaigns
  where id = v_caller.campaign_id and status = 'active';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'membership_status', c.membership_status,
    'status', c.status, 'attempt_count', c.attempt_count, 'last_called_at', c.last_called_at,
    'callback_at', (select max(l.callback_at) from public.outbound_call_campaign_logs l where l.contact_id = c.id and l.outcome = 'call_back_later'),
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
      'outcome', l.outcome, 'feedback', l.feedback, 'callback_at', l.callback_at, 'created_at', l.created_at
    ) order by l.created_at desc) from public.outbound_call_campaign_logs l where l.contact_id = c.id), '[]'::jsonb)
  ) order by c.created_at, c.id), '[]'::jsonb)
  into v_contacts
  from public.outbound_call_campaign_contacts c
  where c.campaign_id = v_campaign.id and c.caller_id = v_caller.id;

  return jsonb_build_object(
    'campaign', jsonb_build_object('id', v_campaign.id, 'name', v_campaign.name),
    'caller', jsonb_build_object('id', v_caller.id, 'name', v_caller.display_name),
    'contacts', v_contacts
  );
end;
$$;

create or replace function public.save_member_followup_call(
  p_last_name text,
  p_contact_id uuid,
  p_outcome text,
  p_feedback text default '',
  p_callback_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_caller public.outbound_call_campaign_callers%rowtype;
  v_contact public.outbound_call_campaign_contacts%rowtype;
  v_log_id uuid;
begin
  select * into v_caller from public.outbound_call_campaign_callers a
  where a.access_code_hash = encode(extensions.digest(lower(btrim(coalesce(p_last_name, ''))), 'sha256'), 'hex')
    and exists (select 1 from public.outbound_call_campaigns c where c.id = a.campaign_id and c.status = 'active')
  order by a.created_at desc limit 1;
  if v_caller.id is null then raise exception 'No caller list matches that last name.' using errcode = '28000'; end if;
  if p_outcome not in ('reachable', 'call_back_later', 'unavailable', 'invalid_number', 'wrong_contact') then
    raise exception 'Choose a valid call status.' using errcode = '22023';
  end if;
  if length(coalesce(p_feedback, '')) > 5000 then
    raise exception 'Feedback must be under 5,000 characters.' using errcode = '22023';
  end if;
  if p_outcome = 'call_back_later' and p_callback_at is null then
    raise exception 'Choose a callback date and time.' using errcode = '22023';
  end if;

  select * into v_contact from public.outbound_call_campaign_contacts
  where id = p_contact_id and caller_id = v_caller.id and campaign_id = v_caller.campaign_id
  for update;
  if v_contact.id is null then raise exception 'This contact is not assigned to your list.' using errcode = '42501'; end if;

  insert into public.outbound_call_campaign_logs (campaign_id, contact_id, caller_id, outcome, feedback, callback_at)
  values (v_contact.campaign_id, v_contact.id, v_caller.id, p_outcome, btrim(coalesce(p_feedback, '')), p_callback_at)
  returning id into v_log_id;

  update public.outbound_call_campaign_contacts
  set status = p_outcome, attempt_count = attempt_count + 1, last_called_at = now()
  where id = v_contact.id;

  return jsonb_build_object('log_id', v_log_id, 'status', p_outcome, 'attempt_count', v_contact.attempt_count + 1);
end;
$$;

create or replace function public.allocate_outbound_call_contacts(
  p_manager_code text,
  p_caller_id uuid,
  p_count integer
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_allocated integer := 0;
begin
  select * into v_campaign from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
    and status = 'active' limit 1;
  if v_campaign.id is null then raise exception 'Manager access could not be verified.' using errcode = '28000'; end if;
  if p_count is null or p_count < 1 or p_count > 10000 then
    raise exception 'Choose a quantity between 1 and 10,000.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.outbound_call_campaign_callers where id = p_caller_id and campaign_id = v_campaign.id) then
    raise exception 'Choose a caller in this campaign.' using errcode = '22023';
  end if;

  with next_contacts as (
    select id from public.outbound_call_campaign_contacts
    where campaign_id = v_campaign.id and caller_id is null
    order by created_at, id
    limit p_count
    for update skip locked
  ), assigned as (
    update public.outbound_call_campaign_contacts c
    set caller_id = p_caller_id
    from next_contacts n
    where c.id = n.id
    returning c.id
  ) select count(*) into v_allocated from assigned;

  return jsonb_build_object('allocated', v_allocated, 'remaining', (
    select count(*) from public.outbound_call_campaign_contacts where campaign_id = v_campaign.id and caller_id is null
  ));
end;
$$;

create or replace function public.get_outbound_call_campaign_manager(p_manager_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_campaign public.outbound_call_campaigns%rowtype;
  v_callers jsonb;
  v_contacts jsonb;
  v_unassigned integer;
begin
  select * into v_campaign from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
  limit 1;
  if v_campaign.id is null then raise exception 'Manager access could not be verified.' using errcode = '28000'; end if;

  select count(*) into v_unassigned from public.outbound_call_campaign_contacts
  where campaign_id = v_campaign.id and caller_id is null;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.display_name, 'last_name', c.normalized_last_name,
    'total', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id),
    'called', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id and x.attempt_count > 0),
    'reached', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id and x.status = 'reachable'),
    'callbacks', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id and x.status = 'call_back_later'),
    'not_reached', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id and x.status in ('unavailable', 'invalid_number', 'wrong_contact'))
  ) order by c.display_name), '[]'::jsonb)
  into v_callers from public.outbound_call_campaign_callers c where c.campaign_id = v_campaign.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'caller_id', c.caller_id, 'full_name', c.full_name, 'phone', c.phone, 'membership_status', c.membership_status,
    'status', c.status, 'attempt_count', c.attempt_count, 'last_called_at', c.last_called_at,
    'caller_name', a.display_name,
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
      'outcome', l.outcome, 'feedback', l.feedback, 'callback_at', l.callback_at, 'created_at', l.created_at, 'caller_id', l.caller_id
    ) order by l.created_at desc) from public.outbound_call_campaign_logs l where l.contact_id = c.id), '[]'::jsonb)
  ) order by c.created_at, c.id), '[]'::jsonb)
  into v_contacts
  from public.outbound_call_campaign_contacts c
  left join public.outbound_call_campaign_callers a on a.id = c.caller_id
  where c.campaign_id = v_campaign.id;

  return jsonb_build_object(
    'campaign', jsonb_build_object('id', v_campaign.id, 'name', v_campaign.name, 'status', v_campaign.status, 'created_at', v_campaign.created_at),
    'callers', v_callers,
    'contacts', v_contacts,
    'unassigned', v_unassigned
  );
end;
$$;

revoke all on function public.save_member_followup_call(text, uuid, text, text, timestamptz) from public;
revoke all on function public.allocate_outbound_call_contacts(text, uuid, integer) from public;
grant execute on function public.get_outbound_call_workspace(text) to anon, authenticated;
grant execute on function public.save_member_followup_call(text, uuid, text, text, timestamptz) to anon, authenticated;
grant execute on function public.allocate_outbound_call_contacts(text, uuid, integer) to anon, authenticated;
grant execute on function public.get_outbound_call_campaign_manager(text) to anon, authenticated;
