import { normalizeForceCardConditionList } from '@/lib/game/parse-game-data'

export type ForceCard = {
  id: number
  name: string
  quality: number
  condition?: string
}

export function canEquipCard(hero: any, card: ForceCard): boolean {
  const conds = normalizeForceCardConditionList(card?.condition)
  if (!conds.length) return true

  return conds.every((c) => {
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
    return !c.object_id.length || c.object_id.includes(Number(val))
  })
}
