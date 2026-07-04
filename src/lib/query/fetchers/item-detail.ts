import { loadItemDetail, type ItemDetailBundle } from '@/lib/game/load-item-detail'

export async function fetchItemDetail(
  itemId: number,
  lang: string
): Promise<ItemDetailBundle | null> {
  if (!Number.isFinite(itemId)) return null
  return loadItemDetail(itemId, lang)
}
