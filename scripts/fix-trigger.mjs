import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { Client } = require('pg')

const client = new Client({
  host: 'db.nlruyaczomnigsxzkfqm.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.argv[2],
  ssl: { rejectUnauthorized: false },
})

await client.connect()

// 1. Diagnose: check if trigger exists
const { rows: triggers } = await client.query(`
  select trigger_name, event_object_schema, event_object_table, action_timing
  from information_schema.triggers
  where trigger_name = 'on_auth_user_created'
`)
console.log('Triggers encontrados:', triggers.length ? triggers : 'NENHUM')

// 2. Check if function exists
const { rows: funcs } = await client.query(`
  select proname, prosecdef from pg_proc where proname = 'handle_new_user'
`)
console.log('Função handle_new_user:', funcs.length ? funcs : 'NÃO ENCONTRADA')

// 3. Fix: recreate function (null-safe) + trigger
await client.query(`
  create or replace function public.handle_new_user()
  returns trigger as $$
  begin
    insert into public.users (id, name)
    values (
      new.id,
      coalesce(
        nullif(trim(new.raw_user_meta_data->>'name'), ''),
        split_part(new.email, '@', 1)
      )
    )
    on conflict (id) do nothing;
    return new;
  end;
  $$ language plpgsql security definer;
`)
console.log('✅  Função handle_new_user recriada (null-safe)')

await client.query(`
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
`)
console.log('✅  Trigger on_auth_user_created recriado em auth.users')

// 4. Insert the current user manually
await client.query(`
  insert into public.users (id, name)
  values ('bcda1fca-9a66-4ae5-ab11-a624c8687020', 'Vitor de Melo')
  on conflict (id) do update set name = excluded.name;
`)
console.log('✅  Usuário Vitor de Melo inserido em public.users')

// 5. Verify
const { rows } = await client.query(`
  select id, name, created_at from public.users
  where id = 'bcda1fca-9a66-4ae5-ab11-a624c8687020'
`)
console.log('Verificação:', rows)

await client.end()
