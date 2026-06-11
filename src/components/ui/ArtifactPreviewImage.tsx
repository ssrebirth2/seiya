'use client'

import { useMemo, type ImgHTMLAttributes } from 'react'
import { resolveArtifactPreviewAsset } from '@/lib/assets/game-images'
import GameImage from '@/components/ui/GameImage'

type ArtifactPreviewImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  artifactId: number
  dbPreviewPath?: string | null
}

/** Large ArtifactShowView preview from Supabase — placeholder when missing, never SkillIcon. */
export default function ArtifactPreviewImage({
  artifactId,
  dbPreviewPath,
  alt = '',
  ...props
}: ArtifactPreviewImageProps) {
  const { src, rawSrc } = useMemo(
    () => resolveArtifactPreviewAsset(dbPreviewPath, artifactId),
    [dbPreviewPath, artifactId]
  )

  return <GameImage src={src} rawSrc={rawSrc} alt={alt} {...props} />
}
