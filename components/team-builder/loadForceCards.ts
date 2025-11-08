import { supabase } from '@/lib/supabase'

export type ForceCard = {
  id: number
  name: string
  quality: number
  condition?: string
}

export async function loadForceCards() {
  const [{ data: items }, { data: infos }] = await Promise.all([
    supabase.from('ForceCardItemConfig').select('id,name,quality'),
    supabase.from('ForceCardInfoConfig').select('id,condition'),
  ])
  const infoMap: Record<number, any> = {}
  infos?.forEach((r) => (infoMap[r.id] = r))
  return (items || []).map((i) => ({
    ...i,
    condition: infoMap[i.id]?.condition || null,
  })) as ForceCard[]
}

export function canEquipCard(hero: any, card: ForceCard): boolean {
  if (!card?.condition) return true
  try {
    const conds = JSON.parse(card.condition)
    return conds.every((c: any) => {
      const val =
        c.type === 'stance'
          ? hero.stance
          : c.type === 'occupation'
          ? hero.occupation
          : c.type === 'damagetype'
          ? hero.damagetype
          : c.type === 'camp'
          ? hero.camp
          : null
      return !c.object_id?.length || c.object_id.includes(Number(val))
    })
  } catch {
    return true
  }
}
