-- =====================================================================
-- A.D. Engineering — Supabase setup
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run
-- Before running, change the admin email on the line marked  <<< CHANGE
-- =====================================================================

-- ---------- Admins (only these emails can edit) ----------
create table if not exists public.admins (
  email text primary key
);
insert into public.admins (email) values ('adengineering486@gmail.com')   -- <<< CHANGE if needed
on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- ---------- Site settings (one row) ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  phone_orders text default '076 449 3749',
  phone_owner text default '075 535 0030',
  whatsapp text default '94764493749',
  email text default 'adengineering486@gmail.com',
  shop_main text default 'Weediyawatta Junction, Udugampola',
  shop_branch text default 'Airport Road, Unnaruwa, Minuwangoda',
  hours text default 'Tue – Sun · 8.30 AM – 5.30 PM',
  closed_note text default 'සඳුදා වසා ඇත · Closed on Mondays',
  years text default '16',
  projects text default '500',
  warranty text default '10',
  updated_at timestamptz default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

-- ---------- Items for sale (stock) ----------
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  description text default '',
  category text default 'gutter',          -- gutter | ceiling | roofing | other
  price numeric,                            -- null = "call for price"
  unit text default '',                     -- e.g. "per foot", "each"
  in_stock boolean default true,
  image_url text,
  sort int default 0,
  created_at timestamptz default now()
);

-- ---------- Price list (services) ----------
create table if not exists public.prices (
  id bigint generated always as identity primary key,
  title text not null,
  detail text default '',
  price text not null,                      -- free text, e.g. "Rs. 1,250" or "Rs. 900 – 1,200"
  unit text default '',
  sort int default 0,
  created_at timestamptz default now()
);

-- ---------- Gallery photos ----------
create table if not exists public.photos (
  id bigint generated always as identity primary key,
  url text not null,
  thumb_url text,
  category text default 'gutter',           -- gutter | ceiling
  caption text default '',
  path text,                                -- storage path (for delete)
  thumb_path text,
  created_at timestamptz default now()
);

-- ---------- Customer requests (from the website form) ----------
create table if not exists public.requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null check (char_length(phone) between 6 and 30),
  service text default '' check (char_length(service) <= 120),
  location text default '' check (char_length(location) <= 200),
  details text default '' check (char_length(details) <= 2000),
  status text default 'new' check (status in ('new','contacted','done')),
  created_at timestamptz default now()
);

-- ---------- Row Level Security ----------
alter table public.admins   enable row level security;
alter table public.settings enable row level security;
alter table public.products enable row level security;
alter table public.prices   enable row level security;
alter table public.photos   enable row level security;
alter table public.requests enable row level security;

-- public can read site content
drop policy if exists "read settings" on public.settings;  create policy "read settings" on public.settings for select using (true);
drop policy if exists "read products" on public.products;  create policy "read products" on public.products for select using (true);
drop policy if exists "read prices"   on public.prices;    create policy "read prices"   on public.prices   for select using (true);
drop policy if exists "read photos"   on public.photos;    create policy "read photos"   on public.photos   for select using (true);

-- admins can change site content
drop policy if exists "admin settings" on public.settings; create policy "admin settings" on public.settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin products" on public.products; create policy "admin products" on public.products for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin prices"   on public.prices;   create policy "admin prices"   on public.prices   for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin photos"   on public.photos;   create policy "admin photos"   on public.photos   for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin admins"   on public.admins;   create policy "admin admins"   on public.admins   for select using (public.is_admin());

-- anyone can send a request; only admins can read / update / delete
drop policy if exists "send request"  on public.requests;  create policy "send request"  on public.requests for insert with check (status = 'new');
drop policy if exists "admin requests" on public.requests; create policy "admin requests" on public.requests for all using (public.is_admin()) with check (public.is_admin());

grant select on public.settings, public.products, public.prices, public.photos to anon, authenticated;
grant insert on public.requests to anon, authenticated;
grant all on public.settings, public.products, public.prices, public.photos, public.requests to authenticated;
grant select on public.admins to authenticated;

-- ---------- Photo storage (public bucket) ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "public read photos" on storage.objects;
create policy "public read photos" on storage.objects for select using (bucket_id = 'photos');
drop policy if exists "admin upload photos" on storage.objects;
create policy "admin upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'photos' and public.is_admin());
drop policy if exists "admin update photos" on storage.objects;
create policy "admin update photos" on storage.objects for update to authenticated using (bucket_id = 'photos' and public.is_admin());
drop policy if exists "admin delete photos" on storage.objects;
create policy "admin delete photos" on storage.objects for delete to authenticated using (bucket_id = 'photos' and public.is_admin());
