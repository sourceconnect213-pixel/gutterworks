-- =====================================================================
-- A.D. Engineering — Step 11 (run after 10): Panel Sheet colours + 2x2 ceiling tiles from the owner's zip,
-- supplier sizes for H / L / U Corner and Top Molding (these four are shown in 3D on the website).
-- Adds / updates only. Safe to run again.
-- =====================================================================
do $$
declare mc bigint; ct bigint;
begin
  update public.products set image_url = 'images/ceiling/pe-teak.jpg', description = 'PVC සිවිලිම් Panel Sheet · වර්ණ 7ක්',
    finishes = '[{"name":"PE+ Teak","si":"තේක්ක","img":"images/ceiling/pe-teak.jpg","sw":"images/ceiling/sw-pe-teak.jpg"},
      {"name":"PE+ Brum Teak","si":"බ්‍රම් තේක්ක","img":"images/ceiling/pe-brum-teak.jpg","sw":"images/ceiling/sw-pe-brum-teak.jpg"},
      {"name":"PE+ Kithul","si":"කිතුල්","img":"images/ceiling/pe-kithul.jpg","sw":"images/ceiling/sw-pe-kithul.jpg"},
      {"name":"PE+ Mahogani","si":"මහෝගනී","img":"images/ceiling/pe-mahogani.jpg","sw":"images/ceiling/sw-pe-mahogani.jpg"},
      {"name":"PE+ Pine Wood","si":"පයින් ලී","img":"images/ceiling/pe-pine.jpg","sw":"images/ceiling/sw-pe-pine.jpg"},
      {"name":"Brush White","si":"බ්‍රෂ් සුදු","img":"images/ceiling/brush-white.jpg","sw":"images/ceiling/sw-brush-white.jpg"},
      {"name":"Fabric White","si":"ෆැබ්‍රික් සුදු","img":"images/ceiling/fabric-white.jpg","sw":"images/ceiling/sw-fabric-white.jpg"}]'::jsonb
  where model = 'ceil-panel';

  update public.products p set size = '10 ft', description = v.descr, image_url = coalesce(v.img, p.image_url)
  from (values
    ('ceil-cove',       'බිත්තිය සහ සිවිලිම හමුවන කොනට Top Molding · දිග 10 ft · ඝනකම 1.21mm · බර 550±20g', 'images/ceiling/molding.jpg'),
    ('ceil-h-joiner',   'Panel Sheet දෙකක් එකට යා කරන H Corner · දිග 10 ft · ඝනකම 1.33mm · බර 450±20g', null),
    ('ceil-wall-angle', 'පිටත කොන් වසන L Corner · දිග 10 ft · ඝනකම 1.25mm · බර 310±20g', 'images/ceiling/lcorner.jpg'),
    ('ceil-u-trim',     'Panel Sheet කෙළවර වසන U Corner · දිග 10 ft · ඝනකම 1.06mm · බර 310±20g', null)
  ) as v(model, descr, img) where p.model = v.model;

  select id into mc from public.categories where parent_id is null and name = 'සිවිලිම්' limit 1;
  select id into ct from public.categories where parent_id = mc and name_en = '2x2 Ceiling Tiles' limit 1;
  if ct is null then insert into public.categories (parent_id, name, name_en, sort) values (mc, '2x2 සිවිලිම් ටයිල්', '2x2 Ceiling Tiles', 3) returning id into ct; end if;
  if not exists (select 1 from public.products where model = 'ceil-2x2') then
    insert into public.products (model, name, category_id, sort, description, image_url, finishes, in_stock, unit, size, colour, variants)
    values ('ceil-2x2', '2x2 සිවිලිම් ටයිල්', ct, 1, '2 ft × 2 ft සිවිලිම් ටයිල් · මෝස්තර 7ක්', 'images/ceiling/tile-1.jpg',
      '[{"name":"Design 1","si":"මෝස්තර 1","img":"images/ceiling/tile-1.jpg","sw":"images/ceiling/sw-tile-1.jpg"},
        {"name":"Design 2","si":"මෝස්තර 2","img":"images/ceiling/tile-2.jpg","sw":"images/ceiling/sw-tile-2.jpg"},
        {"name":"Design 3","si":"මෝස්තර 3","img":"images/ceiling/tile-3.jpg","sw":"images/ceiling/sw-tile-3.jpg"},
        {"name":"Design 4","si":"මෝස්තර 4","img":"images/ceiling/tile-4.jpg","sw":"images/ceiling/sw-tile-4.jpg"},
        {"name":"Design 5","si":"මෝස්තර 5","img":"images/ceiling/tile-5.jpg","sw":"images/ceiling/sw-tile-5.jpg"},
        {"name":"Design 6","si":"මෝස්තර 6","img":"images/ceiling/tile-6.jpg","sw":"images/ceiling/sw-tile-6.jpg"},
        {"name":"Design 7","si":"මෝස්තර 7","img":"images/ceiling/tile-7.jpg","sw":"images/ceiling/sw-tile-7.jpg"}]'::jsonb,
      true, 'each', '2 ft × 2 ft', '', '[]'::jsonb);
  end if;
end $$;
