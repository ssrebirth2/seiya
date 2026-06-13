'use client'

import { useEffect, useState, type ImgHTMLAttributes } from 'react'
import { IMAGE_UNAVAILABLE } from '@/lib/assets/game-images'
import {
  LANGUAGE_RES_FALLBACK,
  reportAssetMissing,
  resolveAssetUrl,
  resolveAssetUrlInitial,
  resolveCanonicalAssetPath,
} from '@/lib/assets/asset-registry'

type GameImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string
  /** Original asset path before manifest resolution (for miss reporting). */
  rawSrc?: string
}

const LANGRES_PATH_RE = /\/languageres\/([^/]+)\//i

function languageResFallbackSrc(url: string): string | undefined {
  const match = LANGRES_PATH_RE.exec(url)
  if (!match) return undefined
  if (match[1].toLowerCase() === LANGUAGE_RES_FALLBACK) return undefined
  const swapped = url.replace(LANGRES_PATH_RE, `/languageres/${LANGUAGE_RES_FALLBACK}/`)
  return resolveCanonicalAssetPath(swapped)
}

export default function GameImage({
  src,
  rawSrc,
  fallbackSrc = IMAGE_UNAVAILABLE,
  onError,
  alt = '',
  className,
  loading = 'lazy',
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
      loading={loading}
      data-unavailable={currentSrc === fallbackSrc ? 'true' : undefined}
      className={className}
      onError={(e) => {
        const original = rawSrc || srcUrl
        if (!original || currentSrc === fallbackSrc) {
          onError?.(e)
          return
        }

        const langFallback = languageResFallbackSrc(original)
        if (langFallback && currentSrc !== langFallback) {
          setCurrentSrc(langFallback)
          return
        }

        reportAssetMissing(original)
        setCurrentSrc(fallbackSrc)
        onError?.(e)
      }}
    />
  )
}
