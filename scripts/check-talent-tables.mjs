import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pjpllpocwyuuvgacbbot.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqcGxscG9jd3l1dXZnYWNiYm90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTM5MDIsImV4cCI6MjA3NzMyOTkwMn0.Hhf3Gt3ZdpNF002eU9ic-S81fM14D99N2aqPWLWRFAM'

const client = createClient(url, key)
const tables = [
  'AttributesIndexConfig',
  'HeroTalentConfig',
  'HeroTalentLayersConfig',
  'HeroTalentAttributeConfig',
  'HeroTalentAttributeLevelConfig',
  'HeroTalentSkillConfig',
]

for (const table of tables) {
  const { error } = await client.from(table).select('id').limit(1)
  if (error) console.log(`${table}: MISSING (${error.code})`)
  else {
    const { count } = await client.from(table).select('*', { count: 'exact', head: true })
    console.log(`${table}: OK (${count ?? 0} rows)`)
  }
}
