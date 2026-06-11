'use client'

import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import {
  reportAssetMissing,
  resolveAssetUrl,
  resolveAssetUrlInitial,
} from '@/lib/assets/asset-registry'

type GameImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string
  /** Original asset path before manifest resolution (for miss reporting). */
  rawSrc?: string
}

export default function GameImage({
  src,
  rawSrc,
  fallbackSrc = IMAGE_UNAVAILABLE,
  onError,
  alt = '',
  className,
  ...props
}: GameImageProps) {
  const srcUrl = typeof src === 'string' ? src : undefined

  const [currentSrc, setCurrentSrc] = useState(() =>
    srcUrl && srcUrl !== fallbackSrc
      ? resolveAssetUrlInitial(srcUrl, fallbackSrc)
      : fallbackSrc
  )

  useEffect(() => {
    if (!srcUrl || srcUrl === fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      return
    }
    setCurrentSrc(resolveAssetUrl(srcUrl, fallbackSrc))
  }, [srcUrl, fallbackSrc])

  return (
    <img
      {...props}
      alt={alt}
      src={currentSrc}
      data-unavailable={currentSrc === fallbackSrc ? 'true' : undefined}
      className={className}
      onError={(e) => {
        const original = rawSrc || srcUrl
        if (currentSrc !== fallbackSrc && original) {
          reportAssetMissing(original)
          setCurrentSrc(fallbackSrc)
        }
        onError?.(e)
      }}
    />
  )
}
