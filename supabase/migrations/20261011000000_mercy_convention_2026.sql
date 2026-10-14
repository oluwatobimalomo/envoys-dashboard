create table if not exists public.mercy_convention_2026_registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  gender text,
  marital_status text,
  life_stage text,
  membership_status text not null check (membership_status in ('I am an Envoy', 'Non-Envoy')),
  house_address text,
  nearest_landmark text,
  service_date date not null default current_date,
  source text not null default 'QR',
  contacted boolean not null default false,
  contacted_by text,
  contacted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mercy_convention_2026_registrations enable row level security;

-- This dashboard uses the Supabase anon key for its existing public event forms
-- and client-side registries. Match that access model for this separate registry.
drop policy if exists "Convention registrations are readable by anon" on public.mercy_convention_2026_registrations;
create policy "Convention registrations are readable by anon"
  on public.mercy_convention_2026_registrations for select to anon using (true);

drop policy if exists "Convention registrations can be submitted by anon" on public.mercy_convention_2026_registrations;
create policy "Convention registrations can be submitted by anon"
  on public.mercy_convention_2026_registrations for insert to anon with check (true);

drop policy if exists "Convention registrations can be updated by anon" on public.mercy_convention_2026_registrations;
create policy "Convention registrations can be updated by anon"
  on public.mercy_convention_2026_registrations for update to anon using (true) with check (true);

grant select, insert, update on public.mercy_convention_2026_registrations to anon;
