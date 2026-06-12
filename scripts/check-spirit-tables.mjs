import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pjpllpocwyuuvgacbbot.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcGxscG9jd3l1dXZnYWNiYm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTM5MDIsImV4cCI6MjA3NzMyOTkwMn0.Hhf3Gt3ZdpNF002eU9ic-S81fM14D99N2aqPWLWRFAM'

const client = createClient(url, key)

const tables = [
  'SpiritConfig',
  'SpiritStarIndexConfig',
  'SpiritStarConfig',
  'SpiritAttrConfig',
  'SpiritLevelConfig',
  'SpiritStarLevelConfig',
  'SpiritRiseQualityInfoConfig',
  'SpiritStarLossConfig',
]

const expected = {
  SpiritConfig: 31,
  SpiritStarIndexConfig: 4,
  SpiritStarConfig: 22,
  SpiritAttrConfig: 5,
  SpiritLevelConfig: 140,
  SpiritStarLevelConfig: 70,
  SpiritRiseQualityInfoConfig: 3,
  SpiritStarLossConfig: 7,
}

let hasError = false

for (const table of tables) {
  const { error } = await client.from(table).select('id').limit(1)
  if (error) {
    console.log(`${table}: MISSING (${error.code})`)
    hasError = true
    continue
  }

  const { count } = await client.from(table).select('*', { count: 'exact', head: true })
  const rowCount = count ?? 0
  const exp = expected[table]
  const status = exp != null && rowCount !== exp ? 'WARN' : 'OK'
  if (status === 'WARN') hasError = true
  console.log(`${table}: ${status} (${rowCount} rows, expected ${exp})`)
}

process.exit(hasError ? 1 : 0)
