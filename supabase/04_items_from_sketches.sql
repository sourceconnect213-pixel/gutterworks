-- =====================================================================
-- A.D. Engineering — Step 4: items from the measurement sketches
-- One item per design; Korean (K) and Chinese (C) are versions of the same item.
--   12"  : Korean 250 / 500   · Chinese 175 / 400   (sale / fixing, per ft)
--   18"  : Korean 350 / 600   · Chinese 250 / 500
-- Safe to run again.
-- =====================================================================
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;

do $$
declare gut bigint; c12 bigint; c18 bigint; keep bigint;
  v12 jsonb := '[{"name":"Korean","code":"K","price":250,"fixing_price":500},{"name":"Chinese","code":"C","price":175,"fixing_price":400}]';
  v18 jsonb := '[{"name":"Korean","code":"K","price":350,"fixing_price":600},{"name":"Chinese","code":"C","price":250,"fixing_price":500}]';
begin
  select id into gut from public.categories where parent_id is null and name = 'වැහිපීලි' limit 1;
  select id into c12 from public.categories where name = '12" වැහිපීලි' limit 1;
  if c12 is null then insert into public.categories (parent_id, name, name_en, sort) values (gut, '12" වැහිපීලි', '12" Gutters', 1) returning id into c12; end if;
  select id into c18 from public.categories where name = '18" වැහිපීලි' limit 1;
  if c18 is null then insert into public.categories (parent_id, name, name_en, sort) values (gut, '18" වැහිපීලි', '18" Gutters', 2) returning id into c18; end if;

  -- 12" step gutter: merge the separate Korean / Chinese rows into one item
  select id into keep from public.products where model = 'gutter12' order by sort, id limit 1;
  if keep is null then
    insert into public.products (name, model, category_id) values ('12" Step Gutter', 'gutter12', c12) returning id into keep;
  end if;
  delete from public.products where model = 'gutter12' and id <> keep;

  -- upsert by model key
  create temp table _items (model text, name text, cat bigint, size text, v jsonb, sort int) on commit drop;
  insert into _items values
    ('gutter12', '12" Step Gutter',          c12, '12"', v12, 1),
    ('box12',    '12" Box Gutter',           c12, '12"', v12, 2),
    ('g18a',     '18" Gutter · මෝස්තර 1',   c18, '18"', v18, 1),
    ('g18b',     '18" Gutter · මෝස්තර 2',   c18, '18"', v18, 2),
    ('g18c',     '18" Gutter · මෝස්තර 3',   c18, '18"', v18, 3),
    ('g18d',     '18" Gutter · මෝස්තර 4',   c18, '18"', v18, 4),
    ('g18e',     '18" Gutter · මෝස්තර 5',   c18, '18"', v18, 5);

  update public.products p set
      name = i.name, category_id = i.cat, size = i.size, colour = 'Korean / Chinese',
      variants = i.v, price = (i.v->0->>'price')::numeric, fixing_price = (i.v->0->>'fixing_price')::numeric,
      unit = 'per ft', in_stock = true, sort = i.sort,
      description = i.size || ' තහඩුවෙන් හදන වැහිපීලි · Korean / Chinese තහඩු'
    from _items i where p.model = i.model;

  insert into public.products (model, name, category_id, size, colour, variants, price, fixing_price, unit, in_stock, sort, description)
  select i.model, i.name, i.cat, i.size, 'Korean / Chinese', i.v, (i.v->0->>'price')::numeric, (i.v->0->>'fixing_price')::numeric,
         'per ft', true, i.sort, i.size || ' තහඩුවෙන් හදන වැහිපීලි · Korean / Chinese තහඩු'
    from _items i where not exists (select 1 from public.products p where p.model = i.model);
end $$;
