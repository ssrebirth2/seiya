'use client'

import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { squareHeroHeadUrl } from '@/lib/assets/game-images'
import type { HeroHeadIconMap } from '@/lib/game/fetch-hero-head-icons'
import {
  getQualityIconClassName,
  getQualityIconPath,
  getSquareHeroBgFramePath,
  getSquareHeroTypeIcons,
  getStarIconPath,
} from '@/lib/game/hero-ui-sprites'
import {
  includeInfoGoStyle,
  includeInfoRootStyle,
  squareHeroGoStyle,
  squareHeroHeadSlotStyle,
  squareHeroQualityBadgeStyle,
  squareHeroQualityStackStyle,
  squareHeroTypeIconStyle,
} from '@/lib/game/ui-layout'
import { useLanguage } from '@/context/language-context'

export type SquareHeroItemProps = {
  heroId: number
  camp: number
  stance: number
  damagetype: number
  quality: number
  iconMap?: HeroHeadIconMap
  showQuality?: boolean
  showTypeIcons?: boolean
  level?: number
  star?: number
  name?: React.ReactNode
  showName?: boolean
  href?: string
  className?: string
  onClick?: () => void
}

type LayerImage = {
  key: string
  src: string
  style: React.CSSProperties
  rawSrc?: string
  className?: string
}

/** Above portrait but below quality badge (prefab sibling 7 vs 13). */
function typeIconStyle(goKey: 'damageType' | 'camp' | 'pos' | 'defenseType'): React.CSSProperties {
  return squareHeroTypeIconStyle(goKey)
}

/**
 * IncludeInfoSquareHeroHead + UISquareHeroItem.
 * Paint order from prefab siblingIndex; @_aorimage_bg mSpriteName = dstxk_box_1.
 */
export function SquareHeroItem({
  heroId,
  camp,
  stance,
  damagetype,
  quality,
  iconMap,
  showQuality = true,
  showTypeIcons = true,
  level,
  star,
  name,
  showName = true,
  href,
  className = '',
  onClick,
}: SquareHeroItemProps) {
  const { lang } = useLanguage()
  const portrait = squareHeroHeadUrl(heroId, iconMap)
  const typeIcons = getSquareHeroTypeIcons(damagetype, stance, camp, lang)
  const frameSrc = getSquareHeroBgFramePath()
  const qualitySrc =
    showQuality && quality > 0 ? getQualityIconPath(quality, quality) : ''
  const starIcon = getStarIconPath()

  const images: LayerImage[] = []

  images.push({
    key: 'frame-bg',
    src: frameSrc,
    rawSrc: frameSrc,
    style: squareHeroGoStyle('bg'),
    className: 'square-hero-item__frame',
  })

  images.push({
    key: 'portrait',
    src: portrait,
    style: squareHeroGoStyle('portrait'),
    className: 'square-hero-item__portrait',
  })

  if (showTypeIcons && typeIcons.damageType) {
    images.push({
      key: 'damage',
      src: typeIcons.damageType,
      style: typeIconStyle('damageType'),
    })
  }
  if (showTypeIcons && typeIcons.camp) {
    images.push({
      key: 'camp',
      src: typeIcons.camp,
      style: typeIconStyle('camp'),
    })
  }
  if (showTypeIcons && typeIcons.position) {
    images.push({
      key: 'pos',
      src: typeIcons.position,
      style: typeIconStyle('pos'),
    })
  }
  if (showTypeIcons && typeIcons.defenseType) {
    images.push({
      key: 'defense',
      src: typeIcons.defenseType,
      style: typeIconStyle('defenseType'),
    })
  }

  images.sort(
    (a, b) =>
      (Number(a.style.zIndex) || 0) - (Number(b.style.zIndex) || 0)
  )

  const showQualityBadge = Boolean(qualitySrc)
  const headOnly = !showName || !name

  const card = (
    <div className={`square-hero-item ${className}`.trim()} style={includeInfoRootStyle({ headOnly })}>
      <div className="square-hero-item__head" style={squareHeroHeadSlotStyle({ headOnly })}>
        {images.map((layer) => (
          <GameImage
            key={`${layer.key}-${layer.src}`}
            src={layer.src}
            alt=""
            aria-hidden
            className={`square-hero-item__layer${layer.className ? ` ${layer.className}` : ''}`}
            style={layer.style}
            rawSrc={layer.rawSrc}
            loading={layer.key === 'portrait' ? 'lazy' : undefined}
          />
        ))}

        {showQualityBadge ? (
          <div
            className="square-hero-item__quality-stack"
            style={squareHeroQualityStackStyle()}
            aria-hidden
          >
            <GameImage
              src={qualitySrc}
              alt=""
              className={`square-hero-item__layer square-hero-item__quality-badge ${getQualityIconClassName(quality, quality)}`.trim()}
              style={squareHeroQualityBadgeStyle()}
              rawSrc={qualitySrc}
            />
          </div>
        ) : null}

        {level != null && level > 0 ? (
          <div className="square-hero-item__level-wrap" style={squareHeroGoStyle('levelMask')}>
            <span className="square-hero-item__level" style={squareHeroGoStyle('levelText')}>
              {level}
            </span>
          </div>
        ) : null}

        {star != null && star > 0 ? (
          <div
            className="square-hero-item__stars"
            style={squareHeroGoStyle('starRoot')}
            aria-hidden
          >
            {Array.from({ length: star }, (_, i) => (
              <GameImage
                key={i}
                src={starIcon}
                alt=""
                className="square-hero-item__star-icon"
              />
            ))}
          </div>
        ) : null}
      </div>

      {showName && name ? (
        <div className="square-hero-item__name" style={includeInfoGoStyle('heroName')}>
          {name}
        </div>
      ) : null}
    </div>
  )

  const interactiveClass = 'square-hero-item-link'

  if (href) {
    return (
      <Link href={href} className={interactiveClass} onClick={onClick}>
        {card}
      </Link>
    )
  }

  if (onClick) {
    return (
      <button type="button" className={interactiveClass} onClick={onClick}>
        {card}
      </button>
    )
  }

  return card
}
