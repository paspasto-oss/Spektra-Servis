create view public.spektra_stock_browser with (security_invoker=true) as
select s.*,nullif(trim(regexp_replace(storage_name,'\s*/\s*','/','g')),'') as category_path
from public.spektra_live_stocks s;
create view public.spektra_stock_categories with (security_invoker=true) as
select category_path,count(*)::integer as card_count from public.spektra_stock_browser where active group by category_path;
revoke all on public.spektra_stock_browser,public.spektra_stock_categories from anon;
grant select on public.spektra_stock_browser,public.spektra_stock_categories to authenticated;
