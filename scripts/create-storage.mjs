import pg from 'pg'

const password = process.argv[2]
if (!password) {
  console.error('Uso: node scripts/create-storage.mjs <senha>')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.nlruyaczomnigsxzkfqm.supabase.co:5432/postgres`,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log('Conectado ao banco.')

// 1. Criar bucket público
await client.query(`
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'menuflow-assets',
    'menuflow-assets',
    true,
    2097152,
    ARRAY['image/jpeg','image/png','image/webp']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];
`)
console.log('Bucket menuflow-assets criado/atualizado.')

// 2. RLS policies no storage.objects
const policies = [
  {
    name: 'Public read menuflow-assets',
    sql: `
      CREATE POLICY "Public read menuflow-assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'menuflow-assets');
    `,
  },
  {
    name: 'Authenticated insert menuflow-assets',
    sql: `
      CREATE POLICY "Authenticated insert menuflow-assets"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'menuflow-assets' AND auth.role() = 'authenticated');
    `,
  },
  {
    name: 'Authenticated update menuflow-assets',
    sql: `
      CREATE POLICY "Authenticated update menuflow-assets"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'menuflow-assets' AND auth.role() = 'authenticated');
    `,
  },
  {
    name: 'Authenticated delete menuflow-assets',
    sql: `
      CREATE POLICY "Authenticated delete menuflow-assets"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'menuflow-assets' AND auth.role() = 'authenticated');
    `,
  },
]

for (const policy of policies) {
  try {
    await client.query(`DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;`)
    await client.query(policy.sql)
    console.log(`Policy criada: ${policy.name}`)
  } catch (err) {
    console.error(`Erro na policy "${policy.name}":`, err.message)
  }
}

await client.end()
console.log('\nPronto! Bucket e policies configurados.')
