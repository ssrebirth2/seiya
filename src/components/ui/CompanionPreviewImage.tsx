'use client'

import { useMemo, type ImgHTMLAttributes } from 'react'
import { resolveCompanionPreviewAsset } from '@/lib/assets/game-images'
import GameImage from '@/components/ui/GameImage'

type CompanionPreviewImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  dbPreviewPath?: string | null
  skinsId?: number | null
}

/** Large companion preview from primaryspirit/spirit — placeholder when missing. */
export default function CompanionPreviewImage({
  dbPreviewPath,
  skinsId,
  alt = '',
  ...props
}: CompanionPreviewImageProps) {
  const { src, rawSrc } = useMemo(
    () => resolveCompanionPreviewAsset(dbPreviewPath, skinsId),
    [dbPreviewPath, skinsId]
  )

  return <GameImage src={src} rawSrc={rawSrc} alt={alt} {...props} />
}
