'use client'

import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { circleHeroHeadUrl } from '@/lib/assets/game-images'
import type { HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { formatPlainLabel } from '@/lib/game/apply-skill-values'
import { useLocalizedHref } from '@/lib/i18n/localized-href'

type ForceCardRestrictionChipsProps = {
  chips: ForceCardRestrictionChip[]
  getT: (key?: string) => string
  iconMap?: HeroHeadIconMap
  compact?: boolean
  /** Detail page: icon + plain label text (list/catalog stays icon-only). */
  showLabels?: boolean
  /** Detail header: icon without circular frame. */
  borderless?: boolean
}

export function ForceCardRestrictionChips({
  chips,
  getT,
  iconMap,
  compact = false,
  showLabels = false,
  borderless = false,
}: ForceCardRestrictionChipsProps) {
  const localized = useLocalizedHref()
  if (!chips.length) return null

  return (
    <div
      className={`force-card-restriction-chips${compact ? ' force-card-restriction-chips--compact' : ''}${showLabels ? ' force-card-restriction-chips--labeled' : ''}${borderless ? ' force-card-restriction-chips--borderless' : ''}`}
      role="list"
    >
      {chips.map((chip) => {
        const label = formatPlainLabel(getT(chip.labelKey), 0, {})
        const iconSrc =
          chip.type === 'hero_sids'
            ? circleHeroHeadUrl(chip.objectId, iconMap)
            : chip.iconSrc

        if (!iconSrc) return null

        const icon = (
          <GameImage
            src={iconSrc}
            rawSrc={iconSrc}
            alt=""
            aria-hidden={showLabels}
            className="force-card-restriction-chips__icon"
          />
        )

        const chipProps = {
          title: showLabels ? undefined : label,
          'aria-label': label,
        }

        if (showLabels) {
          const rowInner = (
            <>
              <span className="force-card-restriction-chips__chip">{icon}</span>
              <span className="force-card-restriction-chips__label text-sm font-semibold leading-snug text-foreground">
                {label}
              </span>
            </>
          )

          if (chip.heroHref) {
            return (
              <Link
                key={`${chip.type}-${chip.objectId}`}
                href={localized(chip.heroHref)}
                className="force-card-restriction-chips__row"
                role="listitem"
                {...chipProps}
              >
                {rowInner}
              </Link>
            )
          }

          return (
            <span
              key={`${chip.type}-${chip.objectId}`}
              className="force-card-restriction-chips__row"
              role="listitem"
              {...chipProps}
            >
              {rowInner}
            </span>
          )
        }

        if (chip.heroHref) {
          return (
            <Link
              key={`${chip.type}-${chip.objectId}`}
              href={localized(chip.heroHref)}
              className="force-card-restriction-chips__chip"
              role="listitem"
              {...chipProps}
            >
              {icon}
            </Link>
          )
        }

        return (
          <span
            key={`${chip.type}-${chip.objectId}`}
            className="force-card-restriction-chips__chip"
            role="listitem"
            {...chipProps}
          >
            {icon}
          </span>
        )
      })}
    </div>
  )
}
