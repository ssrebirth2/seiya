'use client'

import { ConsumeEntityRow } from '@/components/game/ConsumeEntityRow'
import type { ExchangeBlock } from '@/lib/game/item-business'
import type { ExchangeConditionRow } from '@/lib/game/load-item-detail'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

const EXCHANGE_LABEL_KEYS: Record<string, string> = {
  compose: UI_KEYS.item.materialCompose,
  decompose: UI_KEYS.item.materialDecompose,
  exchange: UI_KEYS.item.materialExchange,
}

type ItemExchangeSectionProps = {
  exchangeBlocks: ExchangeBlock[]
  exchangeConditions: ExchangeConditionRow[]
  consumeRefMap: ConsumeRefMap
  getT: (key?: string) => string
  embedded?: boolean
}

export function ItemExchangeSection({
  exchangeBlocks,
  exchangeConditions,
  consumeRefMap,
  getT,
  embedded = false,
}: ItemExchangeSectionProps) {
  const { t } = useUiTranslation()

  const hasConditions = exchangeConditions.some((c) => c.unlock != null)
  if (!exchangeBlocks.length && !hasConditions) return null

  const BlockWrap = embedded ? 'div' : 'section'
  const TitleTag = embedded ? 'h3' : 'h2'
  const blockClass = embedded ? 'surface panel space-y-3' : 'item-detail-section'
  const titleClass = embedded
    ? 'text-sm font-semibold text-foreground'
    : 'item-detail-section__title'

  return (
    <div className={embedded ? 'space-y-4' : undefined}>
      {exchangeBlocks.map((block, idx) => (
        <BlockWrap key={idx} className={blockClass}>
          <TitleTag className={titleClass}>
            {t(EXCHANGE_LABEL_KEYS[block.labelKey] ?? UI_KEYS.item.materialExchange)}
          </TitleTag>
          {block.consume.length > 0 ? (
            <div className="mb-3">
              <p className="mb-2 text-xs text-text-muted">{t(UI_KEYS.common.consume)}</p>
              <div className="space-y-2">
                {block.consume.map((entry, i) => (
                  <ConsumeEntityRow key={`c-${i}`} entry={entry} consumeRefMap={consumeRefMap} />
                ))}
              </div>
            </div>
          ) : null}
          {block.get.length > 0 ? (
            <div>
              <p className="mb-2 text-xs text-text-muted">{t(UI_KEYS.common.preview)}</p>
              <div className="space-y-2">
                {block.get.map((entry, i) => (
                  <ConsumeEntityRow key={`g-${i}`} entry={entry} consumeRefMap={consumeRefMap} />
                ))}
              </div>
            </div>
          ) : null}
        </BlockWrap>
      ))}

      {hasConditions ? (
        <BlockWrap className={blockClass}>
          <TitleTag className={titleClass}>{t(UI_KEYS.common.unlockCondition)}</TitleTag>
          <ul className="space-y-1 text-sm text-text-muted">
            {exchangeConditions.flatMap((cond) => {
              const unlock = cond.unlock
              const lines = Array.isArray(unlock)
                ? unlock.map((u) => {
                    if (typeof u === 'object' && u && 'desc' in u) {
                      const desc = (u as { desc?: string }).desc
                      return desc ? getT(desc) : ''
                    }
                    return String(u)
                  })
                : [String(unlock)]
              return lines.filter(Boolean).map((line, i) => (
                <li key={`${cond.id}-${i}`}>{line}</li>
              ))
            })}
          </ul>
        </BlockWrap>
      ) : null}
    </div>
  )
}
