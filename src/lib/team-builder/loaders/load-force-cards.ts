export type ForceCard = {
  id: number
  name: string
  quality: number
  condition?: string
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
