create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='spektra_google_cron') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'spektra_google_cron','Google calendar worker authentication');
 end if;
end $$;
select cron.schedule('spektra-google-calendar','*/5 * * * *', $cron$
 select net.http_post(
  url:='https://rrakzoicawqbcpnzavet.supabase.co/functions/v1/google-calendar',
  headers:=jsonb_build_object('Content-Type','application/json','x-spektra-cron',(select decrypted_secret from vault.decrypted_secrets where name='spektra_google_cron')),
  body:='{"action":"cron"}'::jsonb,timeout_milliseconds:=120000
 );
$cron$);
