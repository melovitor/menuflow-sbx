/**
 * Roda qualquer .sql no Supabase remoto via pg (JavaScript puro).
 * Uso: node scripts/run-sql.mjs <arquivo.sql> <DB_PASSWORD>
 *
 * Exemplos:
 *   node scripts/run-sql.mjs scripts/migrations.sql minhasenha
 *   node scripts/run-sql.mjs scripts/rls.sql minhasenha
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const require = createRequire(import.meta.url)
const { Client } = require('pg')

const [, , sqlFile, password] = process.argv

if (!sqlFile || !password) {
  console.error('Uso: node scripts/run-sql.mjs <arquivo.sql> <DB_PASSWORD>')
  console.error('')
  console.error('Exemplos:')
  console.error('  node scripts/run-sql.mjs scripts/migrations.sql SENHA')
  console.error('  node scripts/run-sql.mjs scripts/rls.sql SENHA')
  console.error('')
  console.error('Senha em: Supabase Dashboard → Settings → Database → Database password')
  process.exit(1)
}

const sql = readFileSync(resolve(sqlFile), 'utf8')

const client = new Client({
  host: 'db.nlruyaczomnigsxzkfqm.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password,
  ssl: { rejectUnauthorized: false },
})

console.log(`🔗  Conectando ao banco...`)
await client.connect()
console.log(`🚀  Rodando ${sqlFile}...`)

try {
  await client.query(sql)
  console.log(`✅  ${sqlFile} aplicado com sucesso!`)
} catch (err) {
  console.error(`❌  Erro:`, err.message)
  process.exit(1)
} finally {
  await client.end()
}
