/**
 * Roda scripts/migrations.sql no Supabase remoto.
 * Uso: node scripts/run-migrations.mjs <DB_PASSWORD>
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const { Client } = require('pg')

const password = process.argv[2]
if (!password) {
  console.error('❌  Uso: node scripts/run-migrations.mjs <DB_PASSWORD>')
  console.error('    Encontre a senha em: Supabase Dashboard → Settings → Database → Database password')
  process.exit(1)
}

const __dir = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dir, 'migrations.sql'), 'utf8')

const client = new Client({
  host: 'db.nlruyaczomnigsxzkfqm.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
})

console.log('🔗  Conectando ao banco...')
await client.connect()

console.log('🚀  Rodando migrations...')
try {
  await client.query(sql)
  console.log('✅  Migrations aplicadas com sucesso!')
} catch (err) {
  console.error('❌  Erro ao rodar migrations:')
  console.error(err.message)
  process.exit(1)
} finally {
  await client.end()
}
