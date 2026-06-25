'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/language-context'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { supabase } from '@/lib/supabase-client'
import { translateKeys } from '@/lib/i18n/language-package'
import { translateItemConfigNames } from '@/lib/game/item-i18n'
import { consumeRefKey } from '@/lib/game/load-hero-talents-bundle'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'

async function buildConsumeRefMap(entries: ConsumeEntry[], lang: string): Promise<ConsumeRefMap> {
  const map: ConsumeRefMap = {}
  if (!entries.length) return map

  const numericIds = [...new Set(entries.map((e) => e.sid).filter((id): id is number => id != null && id > 0))]
  const moneyTypes = [
    ...new Set(entries.filter((e) => e.type && e.type !== 'prop').map((e) => e.type!)),
  ]

  const itemById = new Map<
    number,
    { name: string; nameKey: string; icon_path?: string | null; quality?: number }
  >()
  if (numericIds.length) {
    const { data } = await supabase
      .from('ItemConfig')
      .select('id, name, icon_path, quality, des_value')
      .in('id', numericIds)
    const rows = data || []
    const itemNames = await translateItemConfigNames(
      rows.map((r) => ({
        id: (r as { id: number }).id,
        name: String((r as { name: string }).name),
        des_value: (r as { des_value?: unknown }).des_value,
      })),
      lang
    )
    for (const row of rows) {
      const r = row as { id: number; name: string; icon_path?: string | null; quality?: number | null }
      const resolved = itemNames.get(r.id)
      itemById.set(r.id, {
        name: resolved?.name ?? r.name,
        nameKey: resolved?.nameKey ?? r.name,
        icon_path: r.icon_path,
        quality: r.quality != null ? Number(r.quality) : undefined,
      })
    }
  }

  const moneyById = new Map<
    string,
    { name: string; nameKey: string; icon_path?: string | null; quality?: number }
  >()
  if (moneyTypes.length) {
    const { data } = await supabase
      .from('MoneyConfig')
      .select('id, name, icon_path, quality')
      .in('id', moneyTypes)
    const rows = data || []
    const tmap = await translateKeys(rows.map((r) => String((r as { name: string }).name)), lang)
    for (const row of rows) {
      const r = row as { id: string; name: string; icon_path?: string | null; quality?: number | null }
      moneyById.set(r.id, {
        name: tmap[r.name] || r.name,
        nameKey: r.name,
        icon_path: r.icon_path,
        quality: r.quality != null ? Number(r.quality) : undefined,
      })
    }
  }

  for (const item of entries) {
    const key = consumeRefKey(item)
    if (map[key]) continue

    if (item.type === 'prop' && item.sid) {
      const ref = itemById.get(item.sid)
      map[key] = {
        name: ref?.name ?? `#${item.sid}`,
        nameKey: ref?.nameKey ?? String(item.sid),
        iconUrl: itemIconUrl(ref?.icon_path),
        iconPath: ref?.icon_path,
        quality: ref?.quality,
      }
      continue
    }

    if (item.type && moneyById.has(item.type)) {
      const ref = moneyById.get(item.type)!
      map[key] = {
        name: ref.name,
        nameKey: ref.nameKey,
        iconUrl: itemIconUrl(ref.icon_path),
        iconPath: ref.icon_path,
        quality: ref.quality,
      }
      continue
    }

    map[key] = {
      name: item.sid ? `#${item.sid}` : item.type || 'Unknown',
      nameKey: item.type ?? String(item.sid ?? 'unknown'),
      iconUrl: itemIconUrl(null),
    }
  }

  return map
}

function serializeEntries(entries: ConsumeEntry[]): string {
  return entries.map((e) => `${e.type ?? 'prop'}:${e.sid ?? 0}:${e.num}`).join('|')
}

export function useConsumeRefMap(entries: ConsumeEntry[]) {
  const { lang } = useLanguage()
  const [consumeRefMap, setConsumeRefMap] = useState<ConsumeRefMap>({})
  const [ready, setReady] = useState(false)

  const serialized = useMemo(() => serializeEntries(entries), [entries])

  useEffect(() => {
    let cancelled = false

    if (!entries.length) {
      setConsumeRefMap({})
      setReady(true)
      return
    }

    setReady(false)
    buildConsumeRefMap(entries, lang).then((map) => {
      if (!cancelled) {
        setConsumeRefMap(map)
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [lang, serialized, entries])

  return { consumeRefMap, ready }
}
