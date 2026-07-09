'use client'

import { useMemo } from 'react'
import { SquareItem } from '@/components/game/SquareItem'
import { resolveArtifactListIcon } from '@/lib/assets/game-images'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { useConsumeRefMap, EMPTY_CONSUME_ENTRIES } from '@/hooks/use-consume-ref-map'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type ArtifactMaterialPanelProps = {
  artifactId: number
  frameQuality?: number
  itemIconPath?: string | null
  copies?: number
  consumeMoney?: unknown
  consumeItem?: unknown
  exchangeNum?: number
  emptyLabel?: string
  layout?: 'inline' | 'panel'
  consumeRefMap?: ConsumeRefMap
  consumeRefReady?: boolean
}

function ArtifactCopyChip({
  artifactId,
  frameQuality,
  itemIconPath,
  quantity,
}: {
  artifactId: number
  frameQuality: number
  itemIconPath?: string | null
  quantity: number
}) {
  if (quantity <= 0) return null

  const portrait = resolveArtifactListIcon(itemIconPath)
  const frame =
    frameQuality > 0 ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, frameQuality) : null

  return (
    <SquareItem
      iconSrc={portrait.src}
      iconRawSrc={portrait.rawSrc}
      frameSrc={frame?.src}
      frameRawSrc={frame?.rawSrc}
      quantity={quantity}
      size="sm"
      showQuantity
      href={`/artifacts/${artifactId}`}
    />
  )
}

function InlineConsumeItems({
  items,
  consumeRefMap,
  ready,
}: {
  items: ConsumeEntry[]
  consumeRefMap: ConsumeRefMap
  ready: boolean
}) {
  if (!ready || !items.length) return null

  return (
    <>
      {items.map((item, i) => {
        const resolved = resolveConsumeEntry(item, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
        return (
          <SquareItem
            key={`${item.sid}-${item.type}-${i}`}
            iconSrc={resolved.iconUrl}
            iconRawSrc={resolved.iconRawSrc}
            frameSrc={resolved.frameSrc}
            frameRawSrc={resolved.frameRawSrc}
            quantity={item.num}
            name={resolved.name}
            title={resolved.name}
            href={resolved.href}
            size="sm"
            showQuantity
          />
        )
      })}
    </>
  )
}

export function ArtifactMaterialPanel({
  artifactId,
  frameQuality = 0,
  itemIconPath,
  copies = 0,
  consumeMoney,
  consumeItem,
  exchangeNum,
  emptyLabel = '—',
  layout = 'inline',
  consumeRefMap: externalConsumeRefMap,
  consumeRefReady,
}: ArtifactMaterialPanelProps) {
  const { t } = useUiTranslation()

  const moneyItems = useMemo(
    () => normalizeConsumeList(consumeMoney).filter((c) => Number(c.num) > 0),
    [consumeMoney]
  )
  const materialItems = useMemo(() => normalizeConsumeList(consumeItem), [consumeItem])
  const allEntries = useMemo(() => [...moneyItems, ...materialItems], [moneyItems, materialItems])

  const internalRef = useConsumeRefMap(externalConsumeRefMap ? EMPTY_CONSUME_ENTRIES : allEntries)
  const consumeRefMap = externalConsumeRefMap ?? internalRef.consumeRefMap
  const ready = consumeRefReady ?? internalRef.ready

  const hasCopies = (copies ?? 0) > 0
  const hasMoney = moneyItems.length > 0
  const hasMaterials = materialItems.length > 0
  const hasExchange = (exchangeNum ?? 0) > 0

  if (!hasCopies && !hasMoney && !hasMaterials && !hasExchange) {
    return <span className="force-card-material-empty">{emptyLabel}</span>
  }

  const chips = (
    <div className="force-card-material-row">
      {hasCopies ? (
        <ArtifactCopyChip
          artifactId={artifactId}
          frameQuality={frameQuality}
          itemIconPath={itemIconPath}
          quantity={copies ?? 0}
        />
      ) : null}
      <InlineConsumeItems items={moneyItems} consumeRefMap={consumeRefMap} ready={ready} />
      <InlineConsumeItems items={materialItems} consumeRefMap={consumeRefMap} ready={ready} />
    </div>
  )

  if (layout === 'inline') {
    if (!hasExchange) return chips

    return (
      <div className="artifact-material-inline">
        {chips}
        <p className="artifact-material-inline__meta">
          {t(UI_KEYS.item.cumulativeTotal)}: ×{exchangeNum}
        </p>
      </div>
    )
  }

  return (
    <div className="force-card-material-panel force-card-material-panel--consume-only">
      <div className="force-card-material-consume">
        {chips}
        {hasExchange ? (
          <p className="artifact-material-inline__meta">
            {t(UI_KEYS.item.cumulativeTotal)}: ×{exchangeNum}
          </p>
        ) : null}
      </div>
    </div>
  )
}
