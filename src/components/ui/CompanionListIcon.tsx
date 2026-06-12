'use client'

import { useMemo, type ImgHTMLAttributes } from 'react'
import { resolveCompanionListIcon } from '@/lib/assets/game-images'
import GameImage from '@/components/ui/GameImage'

type CompanionListIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  dbItemIconPath?: string | null
}

/** List / thumbnail icon from ArtifactResourcesConfig.item_icon. */
export default function CompanionListIcon({
  dbItemIconPath,
  alt = '',
  ...props
}: CompanionListIconProps) {
  const { src, rawSrc } = useMemo(
    () => resolveCompanionListIcon(dbItemIconPath),
    [dbItemIconPath]
  )

  return <GameImage src={src} rawSrc={rawSrc} alt={alt} {...props} />
}
