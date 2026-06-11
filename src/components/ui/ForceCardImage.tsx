'use client'

import { useMemo, type ImgHTMLAttributes } from 'react'
import { resolveForceCardDisplayAsset } from '@/lib/assets/game-images'
import GameImage from '@/components/ui/GameImage'

type ForceCardImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  cardId: number
  quality?: number
  showFrame?: boolean
}

export default function ForceCardImage({
  cardId,
  quality,
  showFrame = true,
  alt = '',
  className,
  ...props
}: ForceCardImageProps) {
  const { cardSrc, cardRaw, frameSrc, frameRaw } = useMemo(
    () => resolveForceCardDisplayAsset(cardId, quality),
    [cardId, quality]
  )

  return (
    <div className={`relative inline-block ${className ?? ''}`}>
      <GameImage
        {...props}
        alt={alt}
        src={cardSrc}
        rawSrc={cardRaw}
        className="relative z-0 w-full rounded-2xl object-contain bg-panel-hover"
      />
      {showFrame && frameSrc && (
        <GameImage
          src={frameSrc}
          rawSrc={frameRaw}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 select-none object-cover"
        />
      )}
    </div>
  )
}
