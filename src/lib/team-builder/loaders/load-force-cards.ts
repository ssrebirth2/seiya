import { canEquipForceCard } from '@/lib/game/force-card-equip'

export type ForceCard = {
  id: number
  name: string
  quality: number
  condition?: string
}

/** @deprecated use canEquipForceCard from force-card-equip */
export function canEquipCard(hero: any, card: ForceCard): boolean {
  return canEquipForceCard(hero, card?.condition)
}

export { canEquipForceCard }
