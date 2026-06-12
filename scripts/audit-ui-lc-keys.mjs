/**
 * Read-only audit: verify UI LC keys exist in LanguagePackage_CN/EN/PT on Supabase.
 * Usage: node scripts/audit-ui-lc-keys.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uiKeysPath = join(__dirname, '../src/lib/i18n/ui-keys.ts')
const source = readFileSync(uiKeysPath, 'utf8')
const keys = [...new Set(source.match(/LC_[A-Za-z0-9_]+/g) || [])].sort()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pjpllpocwyuuvgacbbot.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcGxscG9jd3l1dXZnYWNiYm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTM5MDIsImV4cCI6MjA3NzMyOTkwMn0.Hhf3Gt3ZdpNF002eU9ic-S81fM14D99N2aqPWLWRFAM'
const client = createClient(url, key)

const LANGS = ['CN', 'EN', 'PT']
const CHUNK = 200

async function fetchKeys(table, keyList) {
  const found = new Map()
  for (let i = 0; i < keyList.length; i += CHUNK) {
    const part = keyList.slice(i, i + CHUNK)
    const { data, error } = await client.from(table).select('key,value').in('key', part)
    if (error) {
      console.error(`Error querying ${table}:`, error.message)
      process.exit(1)
    }
    for (const row of data || []) {
      const text = row.value || ''
      found.set(row.key, text)
    }
  }
  return found
}

console.log(`Auditing ${keys.length} UI LC keys...\n`)

let hasGap = false
for (const lang of LANGS) {
  const table = `LanguagePackage_${lang}`
  const found = await fetchKeys(table, keys)
  const missing = []
  const empty = []

  for (const k of keys) {
    const val = found.get(k)
    if (val == null) missing.push(k)
    else if (!String(val).trim()) empty.push(k)
  }

  console.log(`=== ${lang} ===`)
  console.log(`  present: ${keys.length - missing.length - empty.length}/${keys.length}`)
  if (missing.length) {
    hasGap = true
    console.log(`  missing (${missing.length}):`, missing.slice(0, 10).join(', '), missing.length > 10 ? '...' : '')
  }
  if (empty.length) {
    hasGap = true
    console.log(`  empty (${empty.length}):`, empty.slice(0, 10).join(', '), empty.length > 10 ? '...' : '')
  }
  console.log('')
}

process.exit(hasGap ? 1 : 0)
