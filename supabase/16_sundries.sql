-- =====================================================================
-- A.D. Engineering — Step 16 (after 15): nozzle, silicone, chain cup, eng cup, iron chain, Bereka Alusis
-- (all shown in 3D on the website). Adds only. Safe to run again.
-- =====================================================================
do $$
declare acc bigint; gp bigint; rc bigint; sl bigint;
begin
  select id into acc from public.categories where parent_id is null and name_en = 'Accessories' limit 1;
  select id into gp from public.categories where parent_id = acc and name_en = 'Gutter Parts' limit 1;
  if gp is null then insert into public.categories (parent_id, name, name_en, sort) values (acc, 'වැහිපීලි කොටස්', 'Gutter Parts', 4) returning id into gp; end if;
  select id into rc from public.categories where parent_id = acc and name_en = 'Rain Chains' limit 1;
  if rc is null then insert into public.categories (parent_id, name, name_en, sort) values (acc, 'වැසි දම්වැල්', 'Rain Chains', 5) returning id into rc; end if;
  select id into sl from public.categories where parent_id = acc and name_en = 'Silicone' limit 1;
  if sl is null then insert into public.categories (parent_id, name, name_en, sort) values (acc, 'සිලිකන්', 'Silicone', 6) returning id into sl; end if;
  create temp table _s (model text, name text, cat bigint, size text, colour text, sort int, descr text, img text) on commit drop;
  insert into _s values
    ('sun-nozzle',    'Nozzle',        gp, '',               'Maroon',          1, 'වැහිපීල්ලෙන් ඩවුන් පයිප්පයට වතුර යවන nozzle · පිටත maroon පාට, ඇතුළත galvalume', 'images/packs/nozzle.jpg'),
    ('sun-endcap',    'Eng Cup',       gp, '12"',            'Maroon / Black',  2, '12" step වැහිපීල්ලේ කෙළවර වසන කොටස · නැවූ දාර සහිතයි · ඇතුළත galvalume', 'images/packs/engcup.jpg'),
    ('sun-cup',       'Chain Cup',     rc, '',               'Red / Black',     1, 'වැසි දම්වැල් කෝප්ප (rain chain cups) · මල් හැඩය · කම්බි කොකු වලින් එකට සම්බන්ධයි', 'images/packs/cups.jpg'),
    ('sun-ironchain', 'Iron Chain',    rc, '',               'Maroon / Green',  2, 'PVC ආලේප කළ යකඩ දම්වැල (PVC colour chain)', 'images/packs/ironchain.jpg'),
    ('sun-bereka',    'Bereka Alusis', rc, '8 Yards (7.2m)', 'Maroon / Black',  3, 'B&A Bereka Alusis · ප්ලාස්ටික් දම්වැල · යාර 8 (මීටර් 7.2) · Made in Sri Lanka', 'images/packs/bereka.jpg'),
    ('sun-silicon',   'Silicone',      sl, '',               '',                1, 'TEC-BOND Silicone · General Purpose', 'images/packs/silicone.jpg');
  insert into public.products (model, name, category_id, size, colour, sort, description, image_url, finishes, in_stock, unit, variants)
  select x.model, x.name, x.cat, x.size, x.colour, x.sort, x.descr, x.img, '[]'::jsonb, true, 'each', '[]'::jsonb
    from _s x where not exists (select 1 from public.products p where p.model = x.model);
end $$;

-- Iron Chain: size from its packet label (SL PVC Colour Chain, 8 yards)
update public.products set size = '8 Yards', description = 'PVC ආලේප කළ යකඩ දම්වැල (SL PVC Colour Chain) · යාර 8 · Made in Sri Lanka' where model = 'sun-ironchain';
