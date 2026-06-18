-- ════════════════════════════════════════════════════════════════
--  LEADS  — customer/sales enquiries from the public website
--  Separate from support_tickets: these are NEW CUSTOMERS, not support.
--  Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  phone        text,
  company      text,
  message      text,
  source       text,                                   -- 'home', 'pricing', 'querry', 'product:watchparty', ...
  interest     text,                                   -- optional: plan / service the lead asked about
  product_id   uuid references public.products(id) on delete set null,
  status       text not null default 'new',            -- new | contacted | qualified | won | lost
  admin_notes  text
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);

-- keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──
alter table public.leads enable row level security;

-- Anyone on the public site (anon key) may SUBMIT a lead, but cannot read others'.
drop policy if exists "anon can submit leads" on public.leads;
create policy "anon can submit leads"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Only signed-in admins may read leads.
drop policy if exists "authenticated can read leads" on public.leads;
create policy "authenticated can read leads"
  on public.leads for select
  to authenticated
  using (true);

-- Only signed-in admins may update status / notes.
drop policy if exists "authenticated can update leads" on public.leads;
create policy "authenticated can update leads"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

-- Realtime so new leads appear live in the admin console.
alter publication supabase_realtime add table public.leads;
