import pg from 'pg'

const password = process.argv[2]
if (!password) { console.error('Uso: node scripts/check-storage.mjs <senha>'); process.exit(1) }

const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.nlruyaczomnigsxzkfqm.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

// Colunas que existem na tabela
const cols = await client.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'storage' AND table_name = 'buckets'
  ORDER BY ordinal_position;
`)
console.log('Colunas de storage.buckets:', cols.rows.map(r => r.column_name).join(', '))

// Buckets existentes
const buckets = await client.query(`SELECT id, name, public FROM storage.buckets;`)
console.log('Buckets:', buckets.rows)

// RLS habilitado?
const rls = await client.query(`
  SELECT relname, relrowsecurity FROM pg_class
  WHERE relname = 'objects' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'storage');
`)
console.log('RLS em storage.objects:', rls.rows)

// Policies existentes em storage.objects
const policies = await client.query(`
  SELECT policyname FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
  ORDER BY policyname;
`)
console.log('Policies em storage.objects:', policies.rows.map(r => r.policyname))

await client.end()
