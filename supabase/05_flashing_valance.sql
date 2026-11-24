-- =====================================================================
-- A.D. Engineering — Step 5: Badge Flashing + Valance Board items (from sketches)
--   12" flashing : Korean 250 / 500 · Chinese 175 / 400   (sale / fixing, per ft)
--   18" flashing : Korean 350 / 600 · Chinese 250 / 500
--   9" valance   : Korean 200 / 300 · Chinese 150 / 250
-- Adds only (no deletes). Safe to run again.
-- =====================================================================
do $$
declare mf bigint; mv bigint; f12 bigint; f18 bigint; v9 bigint;
  v12 jsonb := '[{"name":"Korean","code":"K","price":250,"fixing_price":500},{"name":"Chinese","code":"C","price":175,"fixing_price":400}]';
  v18 jsonb := '[{"name":"Korean","code":"K","price":350,"fixing_price":600},{"name":"Chinese","code":"C","price":250,"fixing_price":500}]';
  vv9 jsonb := '[{"name":"Korean","code":"K","price":200,"fixing_price":300},{"name":"Chinese","code":"C","price":150,"fixing_price":250}]';
begin
  select id into mf from public.categories where parent_id is null and name_en = 'Badge Flashing' limit 1;
  if mf is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'බැජ් ෆ්ලෑෂින්', 'Badge Flashing', 2) returning id into mf; end if;
  select id into mv from public.categories where parent_id is null and name_en = 'Valance Board' limit 1;
  if mv is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'වැලන්ස් බෝඩ්', 'Valance Board', 3) returning id into mv; end if;
  -- keep the original order after the two new groups
  update public.categories set sort = 4 where parent_id is null and name = 'සිවිලිම්' and sort < 4;
  update public.categories set sort = 5 where parent_id is null and name = 'යකඩ වහල' and sort < 5;
  update public.categories set sort = 6 where parent_id is null and name = 'උපාංග' and sort < 6;

  select id into f12 from public.categories where parent_id = mf and name = '12" ෆ්ලෑෂින්' limit 1;
  if f12 is null then insert into public.categories (parent_id, name, name_en, sort) values (mf, '12" ෆ්ලෑෂින්', '12" Flashing', 1) returning id into f12; end if;
  select id into f18 from public.categories where parent_id = mf and name = '18" ෆ්ලෑෂින්' limit 1;
  if f18 is null then insert into public.categories (parent_id, name, name_en, sort) values (mf, '18" ෆ්ලෑෂින්', '18" Flashing', 2) returning id into f18; end if;
  select id into v9 from public.categories where parent_id = mv and name = '9" වැලන්ස් බෝඩ්' limit 1;
  if v9 is null then insert into public.categories (parent_id, name, name_en, sort) values (mv, '9" වැලන්ස් බෝඩ්', '9" Valance Board', 1) returning id into v9; end if;

  create temp table _items (model text, name text, cat bigint, size text, v jsonb, sort int, descr text) on commit drop;
  insert into _items values
    ('flash12',  '12" Badge Flashing',                   f12, '12"', v12, 1, '12" තහඩුවෙන් හදන Badge Flashing'),
    ('flash18a', '18" Badge Flashing · උළු වහලය සඳහා', f18, '18"', v18, 1, '18" තහඩුවෙන් · උළු වහලය සඳහා'),
    ('flash18b', '18" Badge Flashing · මෝස්තර 2',       f18, '18"', v18, 2, '18" තහඩුවෙන් හදන Badge Flashing'),
    ('flash18c', '18" Badge Flashing · මෝස්තර 3',       f18, '18"', v18, 3, '18" තහඩුවෙන් හදන Badge Flashing'),
    ('val9a',    '9" Valance Board · මෝස්තර 1',          v9,  '9"',  vv9, 1, '9" තහඩුවෙන් හදන Valance Board'),
    ('val9b',    '9" Valance Board · මෝස්තර 2',          v9,  '9"',  vv9, 2, '9" තහඩුවෙන් හදන Valance Board');

  update public.products p set
      name = i.name, category_id = i.cat, size = i.size, colour = 'Korean / Chinese',
      variants = i.v, price = (i.v->0->>'price')::numeric, fixing_price = (i.v->0->>'fixing_price')::numeric,
      unit = 'per ft', in_stock = true, sort = i.sort, description = i.descr
    from _items i where p.model = i.model;

  insert into public.products (model, name, category_id, size, colour, variants, price, fixing_price, unit, in_stock, sort, description)
  select i.model, i.name, i.cat, i.size, 'Korean / Chinese', i.v, (i.v->0->>'price')::numeric, (i.v->0->>'fixing_price')::numeric,
         'per ft', true, i.sort, i.descr
    from _items i where not exists (select 1 from public.products p where p.model = i.model);
end $$;
