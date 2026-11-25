-- =====================================================================
-- A.D. Engineering — Step 10: ceiling item names as the owner calls them (run after 09)
-- Edge Trim is not sold: hidden from the website (in_stock = false), not deleted.
-- =====================================================================
update public.products p set name = v.name, sort = v.sort, description = v.descr
from (values
 ('ceil-panel','Panel Sheet',1,'PVC සිවිලිම් Panel Sheet · වර්ණ 6ක්'),
 ('ceil-wall-angle','L Corner',1,'බිත්තිය දිගේ සිවිලිම් දාරය වසන L Corner පටිය'),
 ('ceil-h-joiner','H Corner',2,'Panel Sheet දෙකක් එකට යා කරන H Corner පටිය'),
 ('ceil-u-trim','U Corner',3,'Panel Sheet කෙළවර වසන U Corner පටිය'),
 ('ceil-cove','Top Molding',4,'බිත්තිය සහ සිවිලිම හමුවන කොනට Top Molding'),
 ('ceil-gi-channel','GI Channel',5,'ගැල්වනයිස් යකඩ channel · සිවිලිම් රාමුව සඳහා'),
 ('ceil-gi-angle','GI L Angle',6,'ගැල්වනයිස් යකඩ L angle · රාමුව බිත්තියට සවි කිරීමට')
) as v(model,name,sort,descr) where p.model = v.model;
update public.products set in_stock = false where model = 'ceil-edge-trim';
