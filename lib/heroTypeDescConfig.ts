import { supabase } from '@/lib/supabase'

export async function fetchHeroTypeDescMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('HeroTypeDescConfig').select('key, desc')
  if (error) {
    console.error('HeroTypeDescConfig:', error.message)
    return {}
  }
  const map: Record<string, string> = {}
  data?.forEach((row) => {
    map[row.key] = row.desc
  })
  return map
}
