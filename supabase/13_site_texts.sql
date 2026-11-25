-- =====================================================================
-- A.D. Engineering — Step 13: texts and photos edited in place from the web editor (/editor/)
--   key   = which text / photo on the website (made by the website itself, e.g. "services:1a2b3c:0" or "img:owner:…")
--   value = the new text (simple formatting only) or the new photo's URL
-- Everyone can read (the website shows them); only admins can change them.
-- =====================================================================
create table if not exists public.site_texts (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
alter table public.site_texts enable row level security;
drop policy if exists "site_texts read" on public.site_texts;
create policy "site_texts read" on public.site_texts for select using (true);
drop policy if exists "site_texts admin write" on public.site_texts;
create policy "site_texts admin write" on public.site_texts for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.site_texts to anon, authenticated;
grant insert, update, delete on public.site_texts to authenticated;
