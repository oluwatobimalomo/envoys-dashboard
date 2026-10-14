-- Extend convention registration fields without discarding existing records.
alter table public.mercy_convention_2026_registrations
  add column if not exists first_name text,
  add column if not exists surname text,
  add column if not exists church_denomination text,
  add column if not exists other_denomination text,
  add column if not exists country_of_residence text;

alter table public.mercy_convention_2026_registrations
  drop constraint if exists mercy_convention_2026_registrations_church_denomination_check;

alter table public.mercy_convention_2026_registrations
  add constraint mercy_convention_2026_registrations_church_denomination_check
  check (church_denomination is null or church_denomination in (
    'RCCG The Envoys', 'Other RCCG Parish', 'Other Denomination'
  ));

alter table public.mercy_convention_2026_registrations
  drop constraint if exists mercy_convention_2026_registrations_other_denomination_check;

alter table public.mercy_convention_2026_registrations
  add constraint mercy_convention_2026_registrations_other_denomination_check
  check (church_denomination <> 'Other Denomination' or nullif(btrim(other_denomination), '') is not null);

comment on column public.mercy_convention_2026_registrations.membership_status is
  'Legacy compatibility field; new forms map RCCG The Envoys to I am an Envoy and other selections to Non-Envoy.';
