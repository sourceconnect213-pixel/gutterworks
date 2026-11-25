-- =====================================================================
-- A.D. Engineering — Step 12 (run after 11): H / L / U Corner and Top Molding come in the same 7 colours as the
-- Panel Sheet; GI Channel / GI L Angle photos; new item Main Tee (2x2 ceiling grid). All shown in 3D on the website.
-- Adds / updates only. Safe to run again.
-- =====================================================================
do $$
declare ca bigint;
begin
  update public.products a set finishes = p.finishes
    from public.products p where p.model = 'ceil-panel' and a.model in ('ceil-h-joiner','ceil-wall-angle','ceil-u-trim','ceil-cove');
  update public.products set description = 'බිත්ති කොනේ සිවිලිම් රාමුව සඳහා ගැල්වනයිස් GI Channel' where model = 'ceil-gi-channel';
  update public.products set description = 'බිත්තිය දිගේ සිවිලිම් රාමුව සවි කරන ගැල්වනයිස් GI L Angle' where model = 'ceil-gi-angle';
  select id into ca from public.categories where name_en = 'Ceiling Accessories' limit 1;
  if not exists (select 1 from public.products where model = 'ceil-main-tee') then
    insert into public.products (model, name, category_id, sort, description, image_url, finishes, in_stock, unit, size, colour, variants)
    values ('ceil-main-tee', 'Main Tee', ca, 7, '2x2 සිවිලිම් ටයිල් රාමුව සඳහා Main Tee · සුදු මුහුණත, GI බඳ',
            'images/ceiling/main-tee.jpg', '[]'::jsonb, true, 'each', '', '', '[]'::jsonb);
  end if;
end $$;
