-- A.D. Engineering — Step 7: 18" Down Pipe (4" × 4" square, 2" collar folded inward). Adds only. Safe to run again.
do $$
declare md bigint; c18 bigint;
begin
  select id into md from public.categories where parent_id is null and name_en = 'Down Pipe' limit 1;
  if md is null then insert into public.categories (parent_id, name, name_en, sort) values (null, 'ඩවුන් පයිප්', 'Down Pipe', 4) returning id into md; end if;
  update public.categories set sort = case name when 'සිවිලිම්' then 5 when 'යකඩ වහල' then 6 when 'උපාංග' then 7 end
   where parent_id is null and name in ('සිවිලිම්','යකඩ වහල','උපාංග');
  select id into c18 from public.categories where parent_id = md and name = '18" ඩවුන් පයිප්' limit 1;
  if c18 is null then insert into public.categories (parent_id, name, name_en, sort) values (md, '18" ඩවුන් පයිප්', '18" Down Pipe', 1) returning id into c18; end if;
  if not exists (select 1 from public.products where model = 'pipe18') then
    insert into public.products (model, name, category_id, size, colour, variants, price, fixing_price, unit, in_stock, sort, description)
    values ('pipe18', '18" Down Pipe', c18, '18"', 'Korean', '[]'::jsonb, null, null, 'per ft', true, 1,
      '4" × 4" හතරැස් පයිප්පය · අගල් 2ක කොලරය ඇතුළට නැමෙනවා · Korean තහඩු');
  end if;
end $$;
