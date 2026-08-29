import type { ConsumeEntry } from '@/lib/game/parse-game-data'

export function consumeRefKey(item: ConsumeEntry): string {
  return `${item.type ?? 'prop'}:${item.sid ?? 0}`
}
