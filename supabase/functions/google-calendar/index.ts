import {createClient} from 'npm:@supabase/supabase-js@2.105.0';
import {createHandler} from './service.ts';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createHandler(client));
