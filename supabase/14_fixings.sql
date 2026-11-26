-- =====================================================================
-- A.D. Engineering — Step 14: boxed fixings (shown in 3D: the box from the owner's photos + the pieces in front)
-- Adds only. Safe to run again.
-- =====================================================================
do $$
declare acc bigint; fx bigint;
begin
  select id into acc from public.categories where parent_id is null and name_en = 'Accessories' limit 1;
  if acc is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'උපාංග', 'Accessories', 9) returning id into acc; end if;
  select id into fx from public.categories where parent_id = acc and name_en = 'Nails, Screws & Bolts' limit 1;
  if fx is null then insert into public.categories (parent_id, name, name_en, sort) values (acc, 'ඇණ / ඉස්කුරුප්පු / බෝල්ට්', 'Nails, Screws & Bolts', 1) returning id into fx; end if;

  create temp table _f (model text, name text, size text, sort int, descr text, img text) on commit drop;
  insert into _f values
    ('pack-cn1',  'කොන්ක්‍රීට් ඇණ 1"',  '1"',          1, 'Hardened Steel Concrete Nails · 444 · අඟල 1 · 900g පෙට්ටිය', 'images/packs/n1-front.jpg'),
    ('pack-cn15', 'කොන්ක්‍රීට් ඇණ 1½"', '1½"',         2, 'Hardened Steel Concrete Nails · ZTC · අඟල් 1½',             'images/packs/n2-front.jpg'),
    ('pack-ws15', 'Wood Screws 1½"',     '1½"',         3, 'Self-drilling wood screws · hex head + rubber washer · අඟල් 1½ · 400 pcs පෙට්ටිය', 'images/packs/s1-front.jpg'),
    ('pack-nb',   'Nut & Bolt',          '3/16" × 1½"', 4, 'Galvanized roofing bolts & square nuts · 3/16" × 1½" · One gross (144) පෙට්ටිය', 'images/packs/b1-front.jpg');
  insert into public.products (model, name, category_id, size, colour, sort, description, image_url, finishes, in_stock, unit, variants)
  select f.model, f.name, fx, f.size, '', f.sort, f.descr, f.img, '[]'::jsonb, true, 'each', '[]'::jsonb
    from _f f where not exists (select 1 from public.products p where p.model = f.model);
end $$;
