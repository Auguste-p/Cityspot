alter table public.users
  add column if not exists "cityLat" double precision,
  add column if not exists "cityLng" double precision;
