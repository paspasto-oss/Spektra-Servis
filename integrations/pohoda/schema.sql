-- Separate mirror: does not modify the legacy quotation catalogue or POHODA.
create table public.spektra_live_stocks (
 id text primary key check (id ~ '^[0-9]+$'),
 code text, plu text, name text not null, unit text, storage_name text,
 storage_ref text, quantity_available numeric, quantity_issuable numeric,
 synced_at timestamptz not null, active boolean not null default true
);
create index spektra_live_stocks_name_id on public.spektra_live_stocks(name,id);
create table public.spektra_stock_sync (
 singleton boolean primary key default true check(singleton),
 company_ico text not null check(company_ico='53690036'),
 accounting_year integer not null check(accounting_year=2026),
 exported_at timestamptz not null, received_at timestamptz not null default now(),
 card_count integer not null check(card_count>0), updated_by uuid not null references auth.users(id)
);
alter table public.spektra_live_stocks enable row level security;
alter table public.spektra_stock_sync enable row level security;
grant select,insert,update,delete on public.spektra_live_stocks,public.spektra_stock_sync to authenticated;
revoke all on public.spektra_live_stocks,public.spektra_stock_sync from anon;
create policy stock_read on public.spektra_live_stocks for select to authenticated using(exists(select 1 from public.app_users where user_id=(select auth.uid()) and active));
create policy sync_read on public.spektra_stock_sync for select to authenticated using(exists(select 1 from public.app_users where user_id=(select auth.uid()) and active));
create policy stock_admin on public.spektra_live_stocks for all to authenticated using(exists(select 1 from public.app_users where user_id=(select auth.uid()) and active and role='admin')) with check(exists(select 1 from public.app_users where user_id=(select auth.uid()) and active and role='admin'));
create policy sync_admin on public.spektra_stock_sync for all to authenticated using(exists(select 1 from public.app_users where user_id=(select auth.uid()) and active and role='admin')) with check(exists(select 1 from public.app_users where user_id=(select auth.uid()) and active and role='admin'));
create function public.spektra_sync_stocks(p_company text,p_year integer,p_exported_at timestamptz,p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path='' set statement_timeout='60s' as $$
declare n integer; previous public.spektra_stock_sync%rowtype;
begin
 if not exists(select 1 from public.app_users where user_id=auth.uid() and active and role='admin') then raise exception 'Only an active administrator may synchronize'; end if;
 if p_company is distinct from '53690036' or p_year is distinct from 2026 then raise exception 'Wrong company or accounting year'; end if;
 if p_exported_at is null or p_exported_at>now()+interval '10 minutes' or p_exported_at<now()-interval '7 days' then raise exception 'Invalid export time'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Expected array'; end if;
 n:=jsonb_array_length(p_rows);
 if n<1 or n>100000 then raise exception 'Invalid card count'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where jsonb_typeof(r) <> 'object' or coalesce(r->>'id','') !~ '^[0-9]+$' or length(r->>'id')>20 or nullif(trim(r->>'name'),'') is null or length(r->>'name')>2000) then raise exception 'Invalid card'; end if;
 if (select count(distinct r->>'id') from jsonb_array_elements(p_rows) r)<>n then raise exception 'Duplicate POHODA IDs'; end if;
 perform pg_advisory_xact_lock(53690036,2026);
 select * into previous from public.spektra_stock_sync where singleton;
 if previous.exported_at is not null and p_exported_at<=previous.exported_at then return jsonb_build_object('status','already_current','count',previous.card_count); end if;
 if previous.card_count is not null and n<previous.card_count*0.9 then raise exception 'Export lost more than 10 percent of cards; review before publishing'; end if;
 insert into public.spektra_live_stocks(id,code,plu,name,unit,storage_name,storage_ref,quantity_available,quantity_issuable,synced_at)
 select r.id,r.code,r.plu,r.name,r.unit,r.storage_name,r.storage_ref,r.quantity_available,r.quantity_issuable,p_exported_at
 from jsonb_to_recordset(p_rows) as r(id text,code text,plu text,name text,unit text,storage_name text,storage_ref text,quantity_available numeric,quantity_issuable numeric)
 on conflict(id) do update set code=excluded.code,plu=excluded.plu,name=excluded.name,unit=excluded.unit,storage_name=excluded.storage_name,storage_ref=excluded.storage_ref,quantity_available=excluded.quantity_available,quantity_issuable=excluded.quantity_issuable,synced_at=excluded.synced_at,active=true;
 delete from public.spektra_live_stocks where synced_at<>p_exported_at;
 insert into public.spektra_stock_sync(singleton,company_ico,accounting_year,exported_at,card_count,updated_by) values(true,p_company,p_year,p_exported_at,n,auth.uid())
 on conflict(singleton) do update set exported_at=excluded.exported_at,received_at=now(),card_count=n,updated_by=auth.uid();
 return jsonb_build_object('status','published','count',n,'exported_at',p_exported_at);
end $$;
revoke all on function public.spektra_sync_stocks(text,integer,timestamptz,jsonb) from public,anon;
grant execute on function public.spektra_sync_stocks(text,integer,timestamptz,jsonb) to authenticated;
