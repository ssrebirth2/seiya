'use client'

import { useMemo, type CSSProperties, type ImgHTMLAttributes } from 'react'
import {
  resolveForceCardDisplayAsset,
  resolveForceCardLevelBadge,
} from '@/lib/assets/game-images'
import {
  getForceCardArtFrameInset,
} from '@/lib/game/dynamis-ui'
import GameImage from '@/components/ui/GameImage'

type ForceCardImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  cardId: number
  quality?: number
  showFrame?: boolean
  showLevelBadge?: boolean
}

export default function ForceCardImage({
  cardId,
  quality,
  showFrame = true,
  showLevelBadge = false,
  alt = '',
  className,
  ...props
}: ForceCardImageProps) {
  const { cardSrc, cardRaw, frameSrc, frameRaw } = useMemo(
    () => resolveForceCardDisplayAsset(cardId, quality),
    [cardId, quality]
  )

  const levelBadge = useMemo(
    () => (showLevelBadge ? resolveForceCardLevelBadge(quality) : { src: '' }),
    [showLevelBadge, quality]
  )

  const hasFrame = Boolean(showFrame && frameSrc)

  const framedArtStyle = useMemo((): CSSProperties | undefined => {
    if (!hasFrame) return undefined
    return getForceCardArtFrameInset()
  }, [hasFrame])

  return (
    <div
      className={`force-card-image${hasFrame ? ' force-card-image--framed' : ''} ${className ?? ''}`.trim()}
    >
      {hasFrame ? (
        <GameImage
          src={frameSrc}
          rawSrc={frameRaw}
          alt=""
          aria-hidden
          className="force-card-image__frame"
        />
      ) : null}
      <GameImage
        {...props}
        alt={alt}
        src={cardSrc}
        rawSrc={cardRaw}
        className="force-card-image__art"
        style={framedArtStyle}
      />
      {showLevelBadge && levelBadge.rawSrc ? (
        <GameImage
          src={levelBadge.src}
          rawSrc={levelBadge.rawSrc}
          alt=""
          aria-hidden
          className="force-card-image__level-badge"
        />
      ) : null}
    </div>
  )
}
