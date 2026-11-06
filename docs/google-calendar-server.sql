-- Tokens and client secrets are encrypted in Vault; browser roles have no access.
create table if not exists public.servis_google_connections (
 user_id uuid primary key references auth.users(id) on delete cascade,
 client_id text not null default '', client_secret_id uuid,
 refresh_secret_id uuid, calendar_id text not null default '', calendar_name text not null default '',
 account text not null default '', mail_enabled boolean not null default false,
 enabled boolean not null default false, activated_at timestamptz,
 last_synced_at timestamptz, last_error text not null default '',
 lease_until timestamptz, lease_id uuid, cursor_at timestamptz, cursor_job text,
 updated_at timestamptz not null default now()
);
create table if not exists public.servis_google_oauth (
 state_hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 verifier text not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table if not exists public.servis_google_links (
 user_id uuid not null references auth.users(id) on delete cascade, job_id text not null,
 calendar_id text not null, event_id text not null, etag text,
 job_snapshot jsonb not null default '{}', event_snapshot jsonb not null default '{}',
 last_error text not null default '', notice text not null default '', synced_at timestamptz,
 primary key(user_id,job_id), unique(user_id,calendar_id,event_id)
);
create table if not exists public.servis_google_messages (
 user_id uuid not null references auth.users(id) on delete cascade, job_id text not null,
 kind text not null check(kind in ('invitation','three_days')), occurrence text not null,
 state text not null default 'sending', error text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(user_id,job_id,kind,occurrence)
);
create index if not exists servis_google_oauth_expiry on public.servis_google_oauth(expires_at);
create index if not exists servis_google_messages_user on public.servis_google_messages(user_id,created_at desc);
alter table public.servis_google_connections enable row level security;
alter table public.servis_google_oauth enable row level security;
alter table public.servis_google_links enable row level security;
alter table public.servis_google_messages enable row level security;
revoke all on public.servis_google_connections,public.servis_google_oauth,public.servis_google_links,public.servis_google_messages from public,anon,authenticated;
grant all on public.servis_google_connections,public.servis_google_oauth,public.servis_google_links,public.servis_google_messages to service_role;
create or replace function public.servis_google_secret(secret_id uuid default null, secret_value text default null)
returns text language plpgsql security definer set search_path='' as $$
declare result text; sid uuid;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Service only'; end if;
 if secret_value is null then select decrypted_secret into result from vault.decrypted_secrets where id=secret_id;return result;end if;
 if secret_id is null then select vault.create_secret(secret_value) into sid;
 else perform vault.update_secret(secret_id,secret_value);sid:=secret_id;end if;
 return sid::text;
end;$$;
revoke all on function public.servis_google_secret(uuid,text) from public,anon,authenticated;
grant execute on function public.servis_google_secret(uuid,text) to service_role;
create or replace function public.servis_google_lock(owner_id uuid, lock_id uuid, release boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $$
declare affected int;
begin
 if release then update public.servis_google_connections set lease_until=null,lease_id=null where user_id=owner_id and lease_id=lock_id;
 else update public.servis_google_connections set lease_until=now()+interval '5 minutes',lease_id=lock_id where user_id=owner_id and (lease_until is null or lease_until<now());end if;
 get diagnostics affected=row_count;return affected=1;
end;$$;
revoke all on function public.servis_google_lock(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.servis_google_lock(uuid,uuid,boolean) to service_role;
create or replace function public.servis_google_job_patch(owner_id uuid, job_id text, expected_job jsonb, changes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p jsonb; current_job jsonb; new_job jsonb; idx int;
begin
 select payload into p from public.servis_sync where user_id=owner_id for update;
 select value,(ordinality-1)::int into current_job,idx from jsonb_array_elements(p->'jobs') with ordinality where value->>'id'=job_id;
 if current_job is null or current_job<>expected_job then return null; end if;
 if exists(select 1 from jsonb_object_keys(changes) k where k not in ('start','duration','status','googleEvent')) then raise exception 'Unsupported job fields';end if;
 new_job:=current_job||changes||jsonb_build_object('updatedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'version',coalesce((current_job->>'version')::int,0)+1);
 update public.servis_sync set payload=jsonb_set(p,array['jobs',idx::text],new_job),revision=revision+1,updated_at=now() where user_id=owner_id;
 return new_job;
end;$$;
revoke all on function public.servis_google_job_patch(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.servis_google_job_patch(uuid,text,jsonb,jsonb) to service_role;
create or replace function public.servis_google_cron_secret()
returns text language sql security definer set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='spektra_google_cron';
$$;
revoke all on function public.servis_google_cron_secret() from public,anon,authenticated;
grant execute on function public.servis_google_cron_secret() to service_role;
