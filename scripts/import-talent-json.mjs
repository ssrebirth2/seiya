/**
 * Import exported HeroTalent JSON files into Supabase.
 * Requires SUPABASE_SERVICE_ROLE_KEY (anon key cannot insert due to RLS).
 *
 * Usage:
 *   node scripts/import-talent-json.mjs
 *   node scripts/import-talent-json.mjs --dir scripts/data/talents
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

config({ path: join(root, '.env.local') })
config({ path: join(root, '.env') })

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) {
  console.error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}
if (!key) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.\n' +
      'Supabase Dashboard → Settings → API → service_role (secret).\n' +
      'The anon key is read-only for HeroTalent* tables.'
  )
  process.exit(1)
}

const dirArg = process.argv.indexOf('--dir')
const dataDir = dirArg >= 0 ? process.argv[dirArg + 1] : join(root, 'scripts', 'data', 'talents')

const client = createClient(url, key)
const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'))

for (const file of files) {
  const table = file.replace('.json', '')
  const rows = JSON.parse(readFileSync(join(dataDir, file), 'utf-8'))
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await client.from(table).upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`${table}: ${error.message}`)
      if (error.code === '42501') {
        console.error('RLS blocked write — use SUPABASE_SERVICE_ROLE_KEY, not the anon key.')
      }
      process.exit(1)
    }
  }
  console.log(`${table}: ${rows.length} rows upserted`)
}

console.log('Import complete.')
