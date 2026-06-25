'use client'

import { useMemo } from 'react'
import { SquareItem } from '@/components/game/SquareItem'
import { resolveForceCardListIcon } from '@/lib/assets/game-images'
import { normalizeConsumeList } from '@/lib/game/parse-game-data'
import type { ConsumeEntry } from '@/lib/game/parse-game-data'
import { useConsumeRefMap } from '@/hooks/use-consume-ref-map'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export type ForceCardMaterialPanelProps = {
  cardId?: number
  configId?: number
  cardQuality?: number
  consume?: unknown
  decomposeReturn?: unknown
  consumeCurrency?: unknown
  emptyLabel?: string
  showSectionLabels?: boolean
  sections?: 'both' | 'consume' | 'recycle'
  /** `inline` = flat row for table cells; `panel` = stacked sections with labels */
  layout?: 'inline' | 'panel'
}

function resolveCardId(rowCardId: unknown, configId?: number): number | undefined {
  const fromRow = Number(rowCardId)
  if (!Number.isNaN(fromRow) && fromRow > 0) return fromRow
  if (configId != null && configId > 10) return Math.floor(configId / 10)
  return undefined
}

function CardCopyChip({
  cardId,
  quality,
  quantity,
}: {
  cardId: number
  quality: number
  quantity: number
}) {
  if (quantity <= 0) return null

  const portrait = resolveForceCardListIcon(cardId, true)
  const frame =
    quality > 0 ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.small, quality) : null

  return (
    <SquareItem
      iconSrc={portrait.src}
      iconRawSrc={portrait.rawSrc}
      frameSrc={frame?.src}
      frameRawSrc={frame?.rawSrc}
      quantity={quantity}
      size="sm"
      showQuantity
      href={`/force-cards/${cardId}`}
    />
  )
}

function InlineConsumeItems({
  items,
  consumeRefMap,
  ready,
}: {
  items: ConsumeEntry[]
  consumeRefMap: ReturnType<typeof useConsumeRefMap>['consumeRefMap']
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

function InlineMaterialRow({
  cardId,
  cardQuality,
  copies,
  consumeItems,
  recycleItems,
  refundCopies,
  consumeRefMap,
  ready,
  mode,
  emptyLabel,
}: {
  cardId?: number
  cardQuality: number
  copies: number
  consumeItems: ConsumeEntry[]
  recycleItems: ConsumeEntry[]
  refundCopies: number
  consumeRefMap: ReturnType<typeof useConsumeRefMap>['consumeRefMap']
  ready: boolean
  mode: 'consume' | 'recycle'
  emptyLabel: string
}) {
  const hasCopies = copies > 0 && cardId != null
  const hasConsumeItems = consumeItems.length > 0
  const hasRecycleItems = recycleItems.length > 0
  const hasRefundCopies = refundCopies > 0 && cardId != null

  if (mode === 'consume') {
    if (!hasCopies && !hasConsumeItems) {
      return <span className="force-card-material-empty">{emptyLabel}</span>
    }

    return (
      <div className="force-card-material-row">
        {hasCopies ? <CardCopyChip cardId={cardId} quality={cardQuality} quantity={copies} /> : null}
        <InlineConsumeItems items={consumeItems} consumeRefMap={consumeRefMap} ready={ready} />
      </div>
    )
  }

  if (hasRecycleItems) {
    return (
      <div className="force-card-material-row">
        <InlineConsumeItems items={recycleItems} consumeRefMap={consumeRefMap} ready={ready} />
      </div>
    )
  }

  if (hasRefundCopies) {
    return (
      <div className="force-card-material-row">
        <CardCopyChip cardId={cardId} quality={cardQuality} quantity={refundCopies} />
      </div>
    )
  }

  return <span className="force-card-material-empty">{emptyLabel}</span>
}

export function ForceCardMaterialPanel({
  cardId,
  configId,
  cardQuality = 1,
  consume,
  decomposeReturn,
  consumeCurrency,
  emptyLabel = '—',
  showSectionLabels = true,
  sections = 'both',
  layout = 'panel',
}: ForceCardMaterialPanelProps) {
  const { t } = useUiTranslation()
  const resolvedCardId = resolveCardId(cardId, configId)

  const consumeItems = useMemo(() => normalizeConsumeList(consume), [consume])
  const recycleItems = useMemo(() => normalizeConsumeList(decomposeReturn), [decomposeReturn])
  const allEntries = useMemo(() => [...consumeItems, ...recycleItems], [consumeItems, recycleItems])
  const { consumeRefMap, ready } = useConsumeRefMap(allEntries)

  const copies = consumeCurrency != null && consumeCurrency !== '' ? Number(consumeCurrency) : NaN
  const hasCopies = !Number.isNaN(copies) && copies > 0

  const refundCopies =
    decomposeReturn != null && decomposeReturn !== '' && recycleItems.length === 0
      ? Number(decomposeReturn)
      : NaN
  const hasRefundCopies = !Number.isNaN(refundCopies) && refundCopies > 0

  const showConsume = sections === 'both' || sections === 'consume'
  const showRecycle = sections === 'both' || sections === 'recycle'

  if (layout === 'inline') {
    if (showConsume && !showRecycle) {
      return (
        <InlineMaterialRow
          cardId={resolvedCardId}
          cardQuality={cardQuality}
          copies={hasCopies ? copies : 0}
          consumeItems={consumeItems}
          recycleItems={[]}
          refundCopies={0}
          consumeRefMap={consumeRefMap}
          ready={ready}
          mode="consume"
          emptyLabel={emptyLabel}
        />
      )
    }

    if (showRecycle && !showConsume) {
      return (
        <InlineMaterialRow
          cardId={resolvedCardId}
          cardQuality={cardQuality}
          copies={0}
          consumeItems={[]}
          recycleItems={recycleItems}
          refundCopies={hasRefundCopies ? refundCopies : 0}
          consumeRefMap={consumeRefMap}
          ready={ready}
          mode="recycle"
          emptyLabel={emptyLabel}
        />
      )
    }
  }

  const hasCost = hasCopies || consumeItems.length > 0
  const hasRecycle = recycleItems.length > 0 || hasRefundCopies

  if (showConsume && !showRecycle) {
    if (!hasCost) return <span className="force-card-material-empty">{emptyLabel}</span>
    return (
      <div className="force-card-material-panel force-card-material-panel--consume-only">
        <div className="force-card-material-consume">
          {showSectionLabels ? (
            <span className="force-card-material-section__label">{t(UI_KEYS.common.consume)}</span>
          ) : null}
          <div className="force-card-material-row">
            {hasCopies && resolvedCardId ? (
              <CardCopyChip cardId={resolvedCardId} quality={cardQuality} quantity={copies} />
            ) : null}
            <InlineConsumeItems items={consumeItems} consumeRefMap={consumeRefMap} ready={ready} />
          </div>
        </div>
      </div>
    )
  }

  if (showRecycle && !showConsume) {
    if (!hasRecycle) return <span className="force-card-material-empty">{emptyLabel}</span>
    return (
      <div className="force-card-material-panel force-card-material-panel--recycle-only">
        <div className="force-card-material-recycle">
          {showSectionLabels ? (
            <span className="force-card-material-section__label">{t(UI_KEYS.forceCard.recycleGain)}</span>
          ) : null}
          <div className="force-card-material-row">
            <InlineConsumeItems items={recycleItems} consumeRefMap={consumeRefMap} ready={ready} />
            {hasRefundCopies && resolvedCardId ? (
              <CardCopyChip cardId={resolvedCardId} quality={cardQuality} quantity={refundCopies} />
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (!hasCost && !hasRecycle) {
    return <span className="force-card-material-empty">{emptyLabel}</span>
  }

  return (
    <div className="force-card-material-panel">
      {hasCost ? (
        <div className="force-card-material-consume">
          {showSectionLabels ? (
            <span className="force-card-material-section__label">{t(UI_KEYS.common.consume)}</span>
          ) : null}
          <div className="force-card-material-row">
            {hasCopies && resolvedCardId ? (
              <CardCopyChip cardId={resolvedCardId} quality={cardQuality} quantity={copies} />
            ) : null}
            <InlineConsumeItems items={consumeItems} consumeRefMap={consumeRefMap} ready={ready} />
          </div>
        </div>
      ) : null}
      {hasRecycle ? (
        <div className="force-card-material-recycle">
          {showSectionLabels ? (
            <span className="force-card-material-section__label">{t(UI_KEYS.forceCard.recycleGain)}</span>
          ) : null}
          <div className="force-card-material-row">
            <InlineConsumeItems items={recycleItems} consumeRefMap={consumeRefMap} ready={ready} />
            {hasRefundCopies && resolvedCardId ? (
              <CardCopyChip cardId={resolvedCardId} quality={cardQuality} quantity={refundCopies} />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated use ForceCardMaterialPanel */
export function ForceCardConsumeRow(props: ForceCardMaterialPanelProps) {
  return <ForceCardMaterialPanel {...props} />
}
