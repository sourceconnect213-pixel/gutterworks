-- A.D. Engineering — Step 8: 18" Ridge Cap (2 designs) + 12" Wall Flashing (2 designs). Adds only. Safe to run again.
--   18" ridge cap     : Korean 375 / 600 · Chinese 275 / 500   (sale / fixing, per ft)
--   12" wall flashing : Korean 260 / 500 · Chinese 175 / 400
do $$
declare mr bigint; mw bigint; r18 bigint; w12 bigint;
  vr jsonb := '[{"name":"Korean","code":"K","price":375,"fixing_price":600},{"name":"Chinese","code":"C","price":275,"fixing_price":500}]';
  vw jsonb := '[{"name":"Korean","code":"K","price":260,"fixing_price":500},{"name":"Chinese","code":"C","price":175,"fixing_price":400}]';
begin
  select id into mr from public.categories where parent_id is null and name_en = 'Ridge Cap' limit 1;
  if mr is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'රිජ් කැප්', 'Ridge Cap', 5) returning id into mr; end if;
  select id into mw from public.categories where parent_id is null and name_en = 'Wall Flashing' limit 1;
  if mw is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'වෝල් ෆ්ලෑෂින්', 'Wall Flashing', 6) returning id into mw; end if;
  -- keep the original groups after the two new ones
  update public.categories set sort = case name when 'සිවිලිම්' then 7 when 'යකඩ වහල' then 8 when 'උපාංග' then 9 end
   where parent_id is null and name in ('සිවිලිම්','යකඩ වහල','උපාංග');

  select id into r18 from public.categories where parent_id = mr and name = '18" රිජ් කැප්' limit 1;
  if r18 is null then insert into public.categories (parent_id, name, name_en, sort) values (mr, '18" රිජ් කැප්', '18" Ridge Cap', 1) returning id into r18; end if;
  select id into w12 from public.categories where parent_id = mw and name = '12" වෝල් ෆ්ලෑෂින්' limit 1;
  if w12 is null then insert into public.categories (parent_id, name, name_en, sort) values (mw, '12" වෝල් ෆ්ලෑෂින්', '12" Wall Flashing', 1) returning id into w12; end if;

  create temp table _items (model text, name text, cat bigint, size text, v jsonb, sort int, descr text) on commit drop;
  insert into _items values
    ('ridge18a', '18" Ridge Cap · මෝස්තර 1',     r18, '18"', vr, 1, '18" තහඩුවෙන් හදන Ridge Cap · Korean තහඩු'),
    ('ridge18b', '18" Ridge Cap · මෝස්තර 2',     r18, '18"', vr, 2, '18" තහඩුවෙන් හදන Ridge Cap · Korean තහඩු'),
    ('wall12a',  '12" Wall Flashing · මෝස්තර 1', w12, '12"', vw, 1, '12" තහඩුවෙන් හදන Wall Flashing · Korean තහඩු'),
    ('wall12b',  '12" Wall Flashing · මෝස්තර 2', w12, '12"', vw, 2, '12" තහඩුවෙන් හදන Wall Flashing · Korean තහඩු');

  update public.products p set
      name = i.name, category_id = i.cat, size = i.size, colour = 'Korean',
      variants = i.v, price = (i.v->0->>'price')::numeric, fixing_price = (i.v->0->>'fixing_price')::numeric,
      unit = 'per ft', in_stock = true, sort = i.sort, description = i.descr
    from _items i where p.model = i.model;

  insert into public.products (model, name, category_id, size, colour, variants, price, fixing_price, unit, in_stock, sort, description)
  select i.model, i.name, i.cat, i.size, 'Korean', i.v, (i.v->0->>'price')::numeric, (i.v->0->>'fixing_price')::numeric,
         'per ft', true, i.sort, i.descr
    from _items i where not exists (select 1 from public.products p where p.model = i.model);
end $$;
