-- Independent outbound call campaigns. Callers do not need app accounts:
-- managers authenticate with an active admin account to create a campaign,
-- and each caller receives a random bearer code scoped to their own records.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.outbound_call_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  manager_code_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.outbound_call_campaign_callers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outbound_call_campaigns(id) on delete cascade,
  display_name text not null,
  access_code_hash text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.outbound_call_campaign_contacts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outbound_call_campaigns(id) on delete cascade,
  caller_id uuid not null references public.outbound_call_campaign_callers(id) on delete cascade,
  full_name text not null,
  phone text not null,
  extra_fields jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'callback', 'done')),
  attempt_count integer not null default 0,
  last_called_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.outbound_call_campaign_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outbound_call_campaigns(id) on delete cascade,
  contact_id uuid not null references public.outbound_call_campaign_contacts(id) on delete cascade,
  caller_id uuid not null references public.outbound_call_campaign_callers(id) on delete cascade,
  outcome text not null check (outcome in ('reached', 'no_answer', 'busy', 'callback', 'wrong_number')),
  feedback text not null default '',
  callback_date date,
  created_at timestamptz not null default now()
);

create index if not exists outbound_call_campaign_contacts_queue_idx
  on public.outbound_call_campaign_contacts (campaign_id, caller_id, status, created_at);
create index if not exists outbound_call_campaign_logs_contact_idx
  on public.outbound_call_campaign_logs (contact_id, created_at desc);

alter table public.outbound_call_campaigns enable row level security;
alter table public.outbound_call_campaign_callers enable row level security;
alter table public.outbound_call_campaign_contacts enable row level security;
alter table public.outbound_call_campaign_logs enable row level security;

revoke all on public.outbound_call_campaigns from public, anon, authenticated;
revoke all on public.outbound_call_campaign_callers from public, anon, authenticated;
revoke all on public.outbound_call_campaign_contacts from public, anon, authenticated;
revoke all on public.outbound_call_campaign_logs from public, anon, authenticated;

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
  v_caller_ids uuid[] := array[]::uuid[];
  v_caller jsonb;
  v_contact jsonb;
  v_caller_id uuid;
  v_index integer := 0;
  v_username text := lower(btrim(coalesce(p_admin_username, '')));
  v_saved_password text;
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

  insert into public.outbound_call_campaigns (name, manager_code_hash)
  values (btrim(p_name), encode(extensions.digest(p_manager_code, 'sha256'), 'hex'))
  returning id into v_campaign_id;

  for v_caller in select value from jsonb_array_elements(p_callers)
  loop
    if length(btrim(coalesce(v_caller->>'name', ''))) < 1 or length(coalesce(v_caller->>'code', '')) < 16 then
      raise exception 'One of the caller names or access codes is invalid.' using errcode = '22023';
    end if;
    insert into public.outbound_call_campaign_callers (campaign_id, display_name, access_code_hash)
    values (v_campaign_id, btrim(v_caller->>'name'), encode(extensions.digest(v_caller->>'code', 'sha256'), 'hex'))
    returning id into v_caller_id;
    v_caller_ids := array_append(v_caller_ids, v_caller_id);
  end loop;

  for v_contact in select value from jsonb_array_elements(p_contacts)
  loop
    if length(btrim(coalesce(v_contact->>'name', ''))) < 1 or length(btrim(coalesce(v_contact->>'phone', ''))) < 5 then
      raise exception 'A contact is missing a name or phone number.' using errcode = '22023';
    end if;
    v_caller_id := v_caller_ids[(v_index % array_length(v_caller_ids, 1)) + 1];
    insert into public.outbound_call_campaign_contacts (campaign_id, caller_id, full_name, phone, extra_fields)
    values (
      v_campaign_id,
      v_caller_id,
      btrim(v_contact->>'name'),
      btrim(v_contact->>'phone'),
      coalesce(v_contact->'extra_fields', '{}'::jsonb)
    );
    v_index := v_index + 1;
  end loop;

  return jsonb_build_object(
    'campaign_id', v_campaign_id,
    'campaign_name', btrim(p_name),
    'manager_code', p_manager_code,
    'total_contacts', v_index,
    'callers', p_callers
  );
end;
$$;

create or replace function public.get_outbound_call_workspace(p_access_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_caller public.outbound_call_campaign_callers%rowtype;
  v_campaign public.outbound_call_campaigns%rowtype;
  v_contacts jsonb;
begin
  select * into v_caller from public.outbound_call_campaign_callers
  where access_code_hash = encode(extensions.digest(btrim(coalesce(p_access_code, '')), 'sha256'), 'hex')
  limit 1;
  if v_caller.id is null then raise exception 'Caller code is invalid.' using errcode = '28000'; end if;

  select * into v_campaign from public.outbound_call_campaigns
  where id = v_caller.campaign_id and status = 'active';
  if v_campaign.id is null then raise exception 'This campaign is closed.' using errcode = '22023'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'extra_fields', c.extra_fields,
    'status', c.status, 'attempt_count', c.attempt_count, 'last_called_at', c.last_called_at,
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
      'outcome', l.outcome, 'feedback', l.feedback, 'callback_date', l.callback_date, 'created_at', l.created_at
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

create or replace function public.save_outbound_call_response(
  p_access_code text,
  p_contact_id uuid,
  p_outcome text,
  p_feedback text default '',
  p_callback_date date default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  v_caller public.outbound_call_campaign_callers%rowtype;
  v_contact public.outbound_call_campaign_contacts%rowtype;
  v_status text;
  v_log_id uuid;
begin
  select * into v_caller from public.outbound_call_campaign_callers
  where access_code_hash = encode(extensions.digest(btrim(coalesce(p_access_code, '')), 'sha256'), 'hex')
  limit 1;
  if v_caller.id is null then raise exception 'Caller code is invalid.' using errcode = '28000'; end if;
  if p_outcome not in ('reached', 'no_answer', 'busy', 'callback', 'wrong_number') then
    raise exception 'Select a valid call outcome.' using errcode = '22023';
  end if;
  if length(coalesce(p_feedback, '')) > 5000 then
    raise exception 'Feedback must be under 5,000 characters.' using errcode = '22023';
  end if;
  if p_outcome = 'callback' and p_callback_date is null then
    raise exception 'Choose a callback date.' using errcode = '22023';
  end if;

  select * into v_contact from public.outbound_call_campaign_contacts
  where id = p_contact_id and caller_id = v_caller.id and campaign_id = v_caller.campaign_id
  for update;
  if v_contact.id is null then raise exception 'This contact is not assigned to you.' using errcode = '42501'; end if;

  v_status := case when p_outcome in ('reached', 'wrong_number') then 'done' when p_outcome = 'callback' then 'callback' else 'pending' end;
  insert into public.outbound_call_campaign_logs (campaign_id, contact_id, caller_id, outcome, feedback, callback_date)
  values (v_contact.campaign_id, v_contact.id, v_caller.id, p_outcome, btrim(coalesce(p_feedback, '')), p_callback_date)
  returning id into v_log_id;

  update public.outbound_call_campaign_contacts
  set status = v_status, attempt_count = attempt_count + 1, last_called_at = now()
  where id = v_contact.id;

  return jsonb_build_object('log_id', v_log_id, 'status', v_status, 'attempt_count', v_contact.attempt_count + 1);
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
begin
  select * into v_campaign from public.outbound_call_campaigns
  where manager_code_hash = encode(extensions.digest(btrim(coalesce(p_manager_code, '')), 'sha256'), 'hex')
  limit 1;
  if v_campaign.id is null then raise exception 'Manager code is invalid.' using errcode = '28000'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'name', c.display_name,
    'total', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id),
    'completed', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id and x.status = 'done'),
    'pending', (select count(*) from public.outbound_call_campaign_contacts x where x.caller_id = c.id and x.status <> 'done')
  ) order by c.display_name), '[]'::jsonb)
  into v_callers from public.outbound_call_campaign_callers c where c.campaign_id = v_campaign.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'full_name', c.full_name, 'phone', c.phone, 'extra_fields', c.extra_fields,
    'status', c.status, 'attempt_count', c.attempt_count, 'last_called_at', c.last_called_at,
    'caller_name', a.display_name,
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
      'outcome', l.outcome, 'feedback', l.feedback, 'callback_date', l.callback_date, 'created_at', l.created_at
    ) order by l.created_at desc) from public.outbound_call_campaign_logs l where l.contact_id = c.id), '[]'::jsonb)
  ) order by c.created_at, c.id), '[]'::jsonb)
  into v_contacts
  from public.outbound_call_campaign_contacts c
  join public.outbound_call_campaign_callers a on a.id = c.caller_id
  where c.campaign_id = v_campaign.id;

  return jsonb_build_object(
    'campaign', jsonb_build_object('id', v_campaign.id, 'name', v_campaign.name, 'status', v_campaign.status, 'created_at', v_campaign.created_at),
    'callers', v_callers,
    'contacts', v_contacts
  );
end;
$$;

revoke all on function public.create_outbound_call_campaign(text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.get_outbound_call_workspace(text) from public;
revoke all on function public.save_outbound_call_response(text, uuid, text, text, date) from public;
revoke all on function public.get_outbound_call_campaign_manager(text) from public;
grant execute on function public.create_outbound_call_campaign(text, text, text, text, jsonb, jsonb) to anon, authenticated;
grant execute on function public.get_outbound_call_workspace(text) to anon, authenticated;
grant execute on function public.save_outbound_call_response(text, uuid, text, text, date) to anon, authenticated;
grant execute on function public.get_outbound_call_campaign_manager(text) to anon, authenticated;
