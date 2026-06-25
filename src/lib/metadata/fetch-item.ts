import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { resolveItemIconPath } from '@/lib/game/resolve-item-icon'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/asset-registry'
import type { EntityMetadataPayload } from '@/lib/metadata/defaults'
import { toPlainMetadataText } from '@/lib/metadata/plain-text'
import { collectItemLcKeys, resolveItemTexts } from '@/lib/game/item-i18n'

export async function fetchItemMetadata(
  itemId: number,
  lang: string
): Promise<EntityMetadataPayload | null> {
  if (!Number.isFinite(itemId)) return null

  const { data: item } = await supabase
    .from('ItemConfig')
    .select('id, name, desc, icon_path, des_value')
    .eq('id', itemId)
    .maybeSingle()

  if (!item) return null

  const keys = collectItemLcKeys([
    {
      id: itemId,
      name: String(item.name),
      desc: item.desc ? String(item.desc) : undefined,
      des_value: item.des_value,
    },
  ])
  const translated = keys.length ? await translateKeys(keys, lang) : {}
  const { name, descHtml } = await resolveItemTexts(
    {
      id: itemId,
      name: String(item.name),
      desc: item.desc ? String(item.desc) : undefined,
      des_value: item.des_value,
    },
    lang,
    translated
  )

  const title = toPlainMetadataText(name)
  const description = toPlainMetadataText(descHtml || name || '')

  const iconPath = resolveItemIconPath(item.icon_path)
  const imageUrl = iconPath && iconPath !== IMAGE_UNAVAILABLE ? iconPath : null

  return { title, description, imageUrl }
}
