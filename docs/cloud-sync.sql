-- Separate from price quotes. Per-user snapshot, optimistic revision check.
create table public.servis_sync (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 1 check (revision > 0),
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 26214400),
 updated_at timestamptz not null default now()
);
alter table public.servis_sync enable row level security;
revoke all on public.servis_sync from anon;
grant select, insert, update on public.servis_sync to authenticated;
create policy servis_owner_select on public.servis_sync for select to authenticated using ((select auth.uid()) = user_id);
create policy servis_owner_insert on public.servis_sync for insert to authenticated with check ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
create policy servis_owner_update on public.servis_sync for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id and not coalesce((select auth.jwt()->>'is_anonymous')::boolean,false));
create function public.servis_sync_write(expected_revision bigint, new_payload jsonb)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare result bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if expected_revision = 0 then
   insert into public.servis_sync(user_id,payload) values(auth.uid(),new_payload)
   on conflict(user_id) do nothing returning revision into result;
 else
   update public.servis_sync set payload=new_payload, revision=revision+1,updated_at=now()
   where user_id=auth.uid() and revision=expected_revision returning revision into result;
 end if;
 return coalesce(result,0);
end $$;
revoke all on function public.servis_sync_write(bigint,jsonb) from public,anon;
grant execute on function public.servis_sync_write(bigint,jsonb) to authenticated;
