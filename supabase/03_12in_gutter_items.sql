-- =====================================================================
-- A.D. Engineering — Step 3: 12" gutter items (K and C) from the measurement sketch
-- Supabase → SQL Editor → New query → paste → Run.  Safe to run again.
-- =====================================================================
do $$
declare cat bigint;
begin
  -- the "12" වැහිපීලි" category (created in step 2); make it if missing
  select id into cat from public.categories where name = '12" වැහිපීලි' limit 1;
  if cat is null then
    insert into public.categories (parent_id, name, name_en, sort)
    values ((select id from public.categories where parent_id is null and name = 'වැහිපීලි' limit 1), '12" වැහිපීලි', '12" Gutters', 1)
    returning id into cat;
  end if;

  -- K: the existing 12" gutter item becomes "12" Gutter — K"
  update public.products
     set name = '12" Gutter — K', size = '12"', price = 250, fixing_price = 500, unit = 'per ft',
         model = 'gutter12', category_id = cat, in_stock = true, sort = 1,
         description = '12" තහඩුව · පළල 4½" · උස 4¼"'
   where model = 'gutter12' and (name like '12" Box Gutter%' or name = '12" Gutter — K');
  if not found then
    insert into public.products (name, size, price, fixing_price, unit, model, category_id, in_stock, sort, description)
    values ('12" Gutter — K', '12"', 250, 500, 'per ft', 'gutter12', cat, true, 1, '12" තහඩුව · පළල 4½" · උස 4¼"');
  end if;

  -- C
  if not exists (select 1 from public.products where name = '12" Gutter — C') then
    insert into public.products (name, size, price, fixing_price, unit, model, category_id, in_stock, sort, description)
    values ('12" Gutter — C', '12"', 175, 400, 'per ft', 'gutter12', cat, true, 2, '12" තහඩුව · පළල 4½" · උස 4¼"');
  end if;
end $$;
