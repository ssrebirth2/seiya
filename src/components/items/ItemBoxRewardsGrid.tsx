'use client'

import Link from 'next/link'
import { SquareItem } from '@/components/game/SquareItem'
import { SquareHeroItem } from '@/components/heroes/SquareHeroItem'
import type { BoxAwardEntry } from '@/lib/game/item-business'
import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'
import { consumeRefKey } from '@/lib/game/load-hero-talents-bundle'
import { ITEM_QUALITY_SHOW_TYPE } from '@/lib/game/item-quality-ui'
import { resolveConsumeEntry } from '@/lib/game/resolve-consume-item'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import { useHeroHeadIconMap } from '@/hooks/use-hero-head-icons'

type ItemBoxRewardsGridProps = {
  entries: BoxAwardEntry[]
  consumeRefMap: ConsumeRefMap
}

export function ItemBoxRewardsGrid({ entries, consumeRefMap }: ItemBoxRewardsGridProps) {
  const localized = useLocalizedHref()
  const { data: iconMap } = useHeroHeadIconMap()

  if (!entries.length) return null

  return (
    <ul className="item-detail-rewards-grid" role="list">
      {entries.map((entry, i) => {
        const resolved = resolveConsumeEntry(entry.award, consumeRefMap, ITEM_QUALITY_SHOW_TYPE.small)
        const ref = consumeRefMap[consumeRefKey(entry.award)]
        const href = resolved.href ? localized(resolved.href) : null
        const isHeroAward = entry.award.type === 'hero' && entry.award.sid != null && ref?.heroMeta

        const heroQuality =
          entry.award.quality != null && entry.award.quality > 0
            ? entry.award.quality
            : (ref?.quality ?? 1)

        return (
          <li
            key={`${entry.award.sid}-${entry.award.type}-${i}`}
            className={`item-detail-rewards-grid__cell${
              entry.rateLabel ? ' item-detail-rewards-grid__cell--rated' : ''
            }`}
          >
            <div className="item-detail-rewards-grid__icon-wrap">
              {entry.rateLabel ? (
                <span className="item-detail-rewards-grid__rate-badge">{entry.rateLabel}</span>
              ) : null}
              {isHeroAward ? (
                <div className="item-detail-rewards-grid__hero-slot">
                  <SquareHeroItem
                    heroId={entry.award.sid!}
                    camp={ref.heroMeta!.camp}
                    stance={ref.heroMeta!.stance}
                    damagetype={ref.heroMeta!.damagetype}
                    quality={heroQuality}
                    star={entry.award.star ?? ref.heroMeta!.star}
                    iconMap={iconMap}
                    showName={false}
                    href={href ?? undefined}
                  />
                </div>
              ) : (
                <SquareItem
                  iconSrc={resolved.iconUrl}
                  iconRawSrc={resolved.iconRawSrc}
                  frameSrc={resolved.frameSrc}
                  frameRawSrc={resolved.frameRawSrc}
                  quantity={entry.award.num}
                  name={resolved.name}
                  title={resolved.name}
                  href={href ?? undefined}
                  size="sm"
                  showQuantity
                />
              )}
            </div>
            <p className="item-detail-rewards-grid__name" title={resolved.name}>
              {href ? (
                <Link href={href} className="hover:text-accent">
                  {resolved.name}
                </Link>
              ) : (
                resolved.name
              )}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
