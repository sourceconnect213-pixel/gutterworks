-- =====================================================================
-- A.D. Engineering — Step 2: categories (run ONCE, after setup.sql)
-- Supabase → SQL Editor → New query → paste everything → Run
-- Safe to run again.
-- =====================================================================

-- Main categories (e.g. වැහිපීලි, සිවිලිම්) and sub-categories (e.g. 12" වැහිපීලි, PVC සිවිලිම්)
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  parent_id bigint references public.categories(id) on delete cascade,  -- null = main category
  name text not null,                 -- Sinhala name shown first
  name_en text default '',            -- English name (optional)
  note text default '',               -- short description (optional)
  image_url text,
  sort int default 0,
  created_at timestamptz default now()
);
create index if not exists categories_parent_idx on public.categories(parent_id);

-- Extra item details
alter table public.products add column if not exists category_id bigint references public.categories(id) on delete set null;
alter table public.products add column if not exists size text default '';          -- e.g. 12"
alter table public.products add column if not exists colour text default '';        -- e.g. Maroon
alter table public.products add column if not exists fixing_price numeric;          -- සවි කිරීමේ මිල
alter table public.products add column if not exists model text default '';         -- 3D model key, e.g. gutter12
create index if not exists products_category_idx on public.products(category_id);

-- Security: everyone can read, only admins can change
alter table public.categories enable row level security;
drop policy if exists "read categories"  on public.categories;  create policy "read categories"  on public.categories for select using (true);
drop policy if exists "admin categories" on public.categories;  create policy "admin categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
grant select on public.categories to anon, authenticated;
grant all on public.categories to authenticated;

-- Starter categories (only added if there are none yet)
do $$
declare g bigint; c bigint; r bigint; g12 bigint;
begin
  if not exists (select 1 from public.categories) then
    insert into public.categories (name, name_en, sort) values ('වැහිපීලි', 'Gutters', 1) returning id into g;
    insert into public.categories (name, name_en, sort) values ('සිවිලිම්', 'Ceilings', 2) returning id into c;
    insert into public.categories (name, name_en, sort) values ('යකඩ වහල', 'Roofing', 3) returning id into r;
    insert into public.categories (name, name_en, sort) values ('උපාංග', 'Accessories', 4);

    insert into public.categories (parent_id, name, name_en, sort) values (g, '12" වැහිපීලි', '12" Gutters', 1) returning id into g12;

    -- the 12" box gutter already shown on the website
    insert into public.products (name, description, category_id, category, size, colour, price, fixing_price, unit, in_stock, model, sort)
    values ('12" Box Gutter', 'Amano colour coated · 12" sheet', g12, 'gutter', '12"', 'Maroon', 275, 500, 'per ft', true, 'gutter12', 1);

    -- older items without a category go under the matching main category
    update public.products set category_id = g where category_id is null and category = 'gutter';
    update public.products set category_id = c where category_id is null and category = 'ceiling';
    update public.products set category_id = r where category_id is null and category = 'roofing';
  end if;
end $$;
