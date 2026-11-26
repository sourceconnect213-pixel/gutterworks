-- =====================================================================
-- A.D. Engineering — Step 15 (after 14): blind rivets (Hasky silver, maroon) and the Hasky 4" stone turbo disc,
-- shown in 3D (box from the owner's photos + the rivets / disc). Adds only. Safe to run again.
-- =====================================================================
do $$
declare acc bigint; rv bigint; dc bigint;
begin
  select id into acc from public.categories where parent_id is null and name_en = 'Accessories' limit 1;
  select id into rv from public.categories where parent_id = acc and name_en = 'Blind Rivets' limit 1;
  if rv is null then insert into public.categories (parent_id, name, name_en, sort) values (acc, 'රිවට්', 'Blind Rivets', 2) returning id into rv; end if;
  select id into dc from public.categories where parent_id = acc and name_en = 'Cutting Discs' limit 1;
  if dc is null then insert into public.categories (parent_id, name, name_en, sort) values (acc, 'කපන තැටි', 'Cutting Discs', 3) returning id into dc; end if;
  create temp table _r (model text, name text, cat bigint, size text, colour text, sort int, descr text, img text) on commit drop;
  insert into _r values
    ('pack-rv-hasky',  'Hasky Blind Rivets', rv, '1/8" × 1/2"', 'Silver', 1, 'Aluminium / steel blind rivets · 3.2mm × 12.7mm · 1000 pcs පෙට්ටිය', 'images/packs/r1-front.jpg'),
    ('pack-rv-maroon', 'Blind Rivets',       rv, '1/8" × 1/2"', 'Maroon', 2, 'Maroon පාට blind rivets · 3.2mm × 12.7mm · 1000 pcs පෙට්ටිය',       'images/packs/r2-front.jpg'),
    ('pack-disc4',     'Hasky Stone Turbo Disc', dc, 'Ø4" (105mm)', '', 1, 'කොන්ක්‍රීට් / ගල් කපන disc · Ø105 × 2 × 20/16mm · max 14,550 rpm · granite, marble · පෙට්ටියක 12', 'images/packs/d1-front.jpg');
  insert into public.products (model, name, category_id, size, colour, sort, description, image_url, finishes, in_stock, unit, variants)
  select r.model, r.name, r.cat, r.size, r.colour, r.sort, r.descr, r.img, '[]'::jsonb, true, 'each', '[]'::jsonb
    from _r r where not exists (select 1 from public.products p where p.model = r.model);
end $$;
