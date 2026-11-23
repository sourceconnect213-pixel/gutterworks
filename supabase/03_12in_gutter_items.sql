-- =====================================================================
-- A.D. Engineering — Step 3: 12" gutter items from the measurement sketch
--   K = Korean   (sale Rs. 250 / ft, fixing Rs. 500 / ft)
--   C = Chinese  (sale Rs. 175 / ft, fixing Rs. 400 / ft)
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

  -- Korean: reuse the existing 12" gutter item (old names included) so nothing is duplicated
  update public.products
     set name = '12" Gutter — Korean (K)', size = '12"', colour = 'Korean',
         price = 250, fixing_price = 500, unit = 'per ft', model = 'gutter12',
         category_id = cat, in_stock = true, sort = 1,
         description = 'Korean තහඩුව · 12" · පළල 4½" · උස 4¼"'
   where name in ('12" Box Gutter', '12" Gutter — K', '12" Gutter — Korean (K)');
  if not found then
    insert into public.products (name, size, colour, price, fixing_price, unit, model, category_id, in_stock, sort, description)
    values ('12" Gutter — Korean (K)', '12"', 'Korean', 250, 500, 'per ft', 'gutter12', cat, true, 1, 'Korean තහඩුව · 12" · පළල 4½" · උස 4¼"');
  end if;

  -- Chinese
  update public.products
     set name = '12" Gutter — Chinese (C)', size = '12"', colour = 'Chinese',
         price = 175, fixing_price = 400, unit = 'per ft', model = 'gutter12',
         category_id = cat, in_stock = true, sort = 2,
         description = 'Chinese තහඩුව · 12" · පළල 4½" · උස 4¼"'
   where name in ('12" Gutter — C', '12" Gutter — Chinese (C)');
  if not found then
    insert into public.products (name, size, colour, price, fixing_price, unit, model, category_id, in_stock, sort, description)
    values ('12" Gutter — Chinese (C)', '12"', 'Chinese', 175, 400, 'per ft', 'gutter12', cat, true, 2, 'Chinese තහඩුව · 12" · පළල 4½" · උස 4¼"');
  end if;
end $$;
