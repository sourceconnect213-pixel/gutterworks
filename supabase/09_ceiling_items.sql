-- =====================================================================
-- A.D. Engineering — Step 9: ceiling (i-Panel) items + accessories, in the colours from the owner's photos
-- Adds only. Safe to run again. Photos live in the website's images/ceiling/ folder.
-- =====================================================================
alter table public.products add column if not exists finishes jsonb not null default '[]'::jsonb;

do $$
declare mc bigint; cp bigint; ca bigint;
begin
  select id into mc from public.categories where parent_id is null and name = 'සිවිලිම්' limit 1;
  if mc is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'සිවිලිම්', 'Ceilings', 7) returning id into mc; end if;
  select id into cp from public.categories where parent_id = mc and name_en = 'i-Panel Ceiling' limit 1;
  if cp is null then insert into public.categories (parent_id, name, name_en, sort) values (mc, 'අයි පැනල් සිවිලිම්', 'i-Panel Ceiling', 1) returning id into cp; end if;
  select id into ca from public.categories where parent_id = mc and name_en = 'Ceiling Accessories' limit 1;
  if ca is null then insert into public.categories (parent_id, name, name_en, sort) values (mc, 'සිවිලිම් උපාංග', 'Ceiling Accessories', 2) returning id into ca; end if;

  create temp table _c (model text, name text, cat bigint, sort int, descr text, img text, fin jsonb) on commit drop;
  insert into _c values
    ('ceil-panel', 'PVC i-Panel සිවිලිම් තහඩු', cp, 1, 'PVC i-Panel ceiling sheet · වර්ණ 6ක්',
      'images/ceiling/panel-oak.jpg',
      '[{"name":"Golden Oak","si":"ගෝල්ඩන් ඕක්","img":"images/ceiling/panel-oak.jpg","sw":"images/ceiling/sw-oak.jpg"},
        {"name":"Walnut Brown","si":"වෝල්නට් දුඹුරු","img":"images/ceiling/panel-walnut.jpg","sw":"images/ceiling/sw-walnut.jpg"},
        {"name":"White Wood","si":"සුදු ලී","img":"images/ceiling/panel-whitewood.jpg","sw":"images/ceiling/sw-whitewood.jpg"},
        {"name":"Grey","si":"අළු","img":"images/ceiling/panel-grey.jpg","sw":"images/ceiling/sw-grey.jpg"},
        {"name":"Black","si":"කළු","img":"images/ceiling/panel-black.jpg","sw":"images/ceiling/sw-black.jpg"},
        {"name":"Light Blue","si":"ලා නිල්","img":"images/ceiling/panel-white.jpg","sw":"images/ceiling/sw-white.jpg"}]'),
    ('ceil-wall-angle', 'Wall Angle (L කෝණ)', ca, 1, 'බිත්තිය දිගේ සිවිලිම් දාරය වසන L කෝණ පටිය',
      'images/ceiling/angle-wood.jpg',
      '[{"name":"Teak Wood","si":"ලී පාට","img":"images/ceiling/angle-wood.jpg","sw":"images/ceiling/sw-angle-teak.jpg"},
        {"name":"White Wood","si":"සුදු ලී","img":"images/ceiling/angle-whitewood.jpg","sw":"images/ceiling/sw-angle-whitewood.jpg"},
        {"name":"White","si":"සුදු","img":"images/ceiling/angle-white.jpg","sw":"images/ceiling/sw-pvcwhite.jpg"}]'),
    ('ceil-h-joiner', 'H Joiner', ca, 2, 'පැනල් දෙකක් එකට යා කරන H පටිය', 'images/ceiling/h-joiner.jpg', '[]'),
    ('ceil-u-trim', 'U Trim (End Cap)', ca, 3, 'පැනල් කෙළවර වසන U පටිය', 'images/ceiling/trim-u.jpg', '[]'),
    ('ceil-edge-trim', 'Edge Trim', ca, 4, 'සිවිලිම් දාර සඳහා trim පටිය', 'images/ceiling/trim-round.jpg', '[]'),
    ('ceil-cove', 'Cove / Scotia', ca, 5, 'බිත්තිය සහ සිවිලිම හමුවන කොනට cove පටිය', 'images/ceiling/cove.jpg', '[]'),
    ('ceil-gi-channel', 'GI Channel (රාමුව)', ca, 6, 'ගැල්වනයිස් යකඩ channel · සිවිලිම් රාමුව සඳහා', 'images/ceiling/gi-channel.jpg', '[]'),
    ('ceil-gi-angle', 'GI Angle', ca, 7, 'ගැල්වනයිස් යකඩ කෝණ · රාමුව බිත්තියට සවි කිරීමට', 'images/ceiling/gi-angle.jpg', '[]');

  update public.products p set name = c.name, category_id = c.cat, sort = c.sort, description = c.descr,
      image_url = c.img, finishes = c.fin, in_stock = true, unit = 'each', size = '', colour = '', variants = '[]'::jsonb
    from _c c where p.model = c.model;
  insert into public.products (model, name, category_id, sort, description, image_url, finishes, in_stock, unit, size, colour, variants)
  select c.model, c.name, c.cat, c.sort, c.descr, c.img, c.fin, true, 'each', '', '', '[]'::jsonb
    from _c c where not exists (select 1 from public.products p where p.model = c.model);
end $$;
