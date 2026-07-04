'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import type { LinkedEntity } from '@/lib/game/item-args-resolver'
import type { ItemConfigRow } from '@/lib/game/load-item-detail'
import { ITEM_QUALITY_SHOW_TYPE, resolveItemQualityFramePath } from '@/lib/game/item-quality-ui'
import { itemIconUrl } from '@/lib/game/resolve-item-icon'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ItemDetailHeaderProps = {
  item: ItemConfigRow
  resolvedName: string
  resolvedDescHtml?: string
  linkedEntity: LinkedEntity | null
}

const LINKED_LABEL_KEYS: Record<LinkedEntity['kind'], string> = {
  hero: UI_KEYS.nav.heroes,
  artifact: UI_KEYS.nav.artifacts,
  spirit: UI_KEYS.nav.companions,
  force_card: UI_KEYS.nav.forceCards,
}

export function ItemDetailHeader({
  item,
  resolvedName,
  resolvedDescHtml,
  linkedEntity,
}: ItemDetailHeaderProps) {
  const { t } = useUiTranslation()
  const localized = useLocalizedHref()
  const largeFrame =
    item.quality > 0 ? resolveItemQualityFramePath(ITEM_QUALITY_SHOW_TYPE.large, item.quality) : null

  return (
    <section className="surface panel force-card-detail-header">
      <div className="force-card-detail-header__layout">
        <div className="force-card-detail-header__art item-detail-header__art flex justify-center">
          <SquareItem
            iconSrc={itemIconUrl(item.icon_path)}
            frameSrc={largeFrame?.src}
            frameRawSrc={largeFrame?.rawSrc}
            name={resolvedName}
            size="lg"
            showType={ITEM_QUALITY_SHOW_TYPE.large}
            showQuantity={false}
            displayMode="native"
          />
        </div>

        <div className="force-card-detail-header__body">
          <div className="force-card-detail-header__meta">
            <span className="text-xs text-text-muted">ID {item.id}</span>
          </div>

          <h1 className="force-card-detail-header__title">{resolvedName}</h1>

          {resolvedDescHtml ? (
            <div
              className="force-card-detail-header__story-text mt-3"
              dangerouslySetInnerHTML={{ __html: resolvedDescHtml }}
            />
          ) : null}

          {linkedEntity ? (
            <p className="mt-3 text-sm">
              <span className="text-text-muted">{t(LINKED_LABEL_KEYS[linkedEntity.kind])}: </span>
              <Link
                href={localized(linkedEntity.href)}
                className="font-medium text-accent hover:underline"
              >
                #{linkedEntity.id}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
