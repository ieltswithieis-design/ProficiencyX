-- LingoFi Supabase persistence
-- Run this entire script in Supabase Dashboard -> SQL Editor.
-- The application server uses the service-role key only; it is never sent to browsers.

create table if not exists public.lingofi_data (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.lingofi_data_blobs (
  key text primary key,
  data_base64 text not null,
  updated_at timestamptz not null default now()
);

create index if not exists lingofi_data_updated_at_idx
  on public.lingofi_data (updated_at desc);

create index if not exists lingofi_data_blobs_updated_at_idx
  on public.lingofi_data_blobs (updated_at desc);

-- Keep these tables private. Server-side service_role access bypasses RLS.
alter table public.lingofi_data enable row level security;
alter table public.lingofi_data_blobs enable row level security;

revoke all on table public.lingofi_data from anon, authenticated;
revoke all on table public.lingofi_data_blobs from anon, authenticated;

-- Optional: make timestamps update automatically when a row changes.
create or replace function public.lingofi_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lingofi_data_touch on public.lingofi_data;
create trigger lingofi_data_touch
before update on public.lingofi_data
for each row execute function public.lingofi_touch_updated_at();

drop trigger if exists lingofi_data_blobs_touch on public.lingofi_data_blobs;
create trigger lingofi_data_blobs_touch
before update on public.lingofi_data_blobs
for each row execute function public.lingofi_touch_updated_at();

-- Verify:
select key, pg_column_size(data) as bytes, updated_at
from public.lingofi_data
order by updated_at desc;

select key, length(data_base64) as base64_chars, updated_at
from public.lingofi_data_blobs
order by updated_at desc;
