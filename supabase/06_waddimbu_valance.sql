-- A.D. Engineering — Step 6: 12" Waddimbu Valance Board (4 designs). Adds only. Safe to run again.
-- Prices kept for the admin app (not shown on the website): Korean 255 / 375 · Chinese 175 / 275
do $$
declare mv bigint; c12 bigint;
  v jsonb := '[{"name":"Korean","code":"K","price":255,"fixing_price":375},{"name":"Chinese","code":"C","price":175,"fixing_price":275}]';
begin
  select id into mv from public.categories where parent_id is null and name_en = 'Valance Board' limit 1;
  select id into c12 from public.categories where parent_id = mv and name = '12" වඩිම්බු වැලන්ස් බෝඩ්' limit 1;
  if c12 is null then insert into public.categories (parent_id, name, name_en, sort) values (mv, '12" වඩිම්බු වැලන්ස් බෝඩ්', '12" Waddimbu Valance Board', 2) returning id into c12; end if;
  create temp table _items (model text, name text, sort int) on commit drop;
  insert into _items values
    ('val12a', '12" Waddimbu Valance Board · මෝස්තර 1', 1), ('val12b', '12" Waddimbu Valance Board · මෝස්තර 2', 2),
    ('val12c', '12" Waddimbu Valance Board · මෝස්තර 3', 3), ('val12d', '12" Waddimbu Valance Board · මෝස්තර 4', 4);
  update public.products p set name = i.name, category_id = c12, size = '12"', colour = 'Korean', variants = v,
      price = 255, fixing_price = 375, unit = 'per ft', in_stock = true, sort = i.sort,
      description = '12" තහඩුවෙන් හදන වඩිම්බු Valance Board · Korean තහඩු'
    from _items i where p.model = i.model;
  insert into public.products (model, name, category_id, size, colour, variants, price, fixing_price, unit, in_stock, sort, description)
  select i.model, i.name, c12, '12"', 'Korean', v, 255, 375, 'per ft', true, i.sort, '12" තහඩුවෙන් හදන වඩිම්බු Valance Board · Korean තහඩු'
    from _items i where not exists (select 1 from public.products p where p.model = i.model);
end $$;
