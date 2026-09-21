'use client'

import Link from 'next/link'
import GameImage from '@/components/ui/GameImage'
import { useLocalizedHref } from '@/lib/i18n/localized-href'
import {
  catalogOwnersForThumbs,
  ownerDisplayKey,
  type SkillOwnerDisplay,
} from '@/lib/game/skill-owner-display'
import type { SkillOwner } from '@/lib/game/skill-owners'

type SkillOwnerThumbsProps = {
  owners: SkillOwner[]
  displayMap: Map<string, SkillOwnerDisplay>
  limit?: number
  /** When true, thumbs are links (stop card navigation). */
  linkable?: boolean
  className?: string
}

/** Compact owner portraits for skill catalog cards / detail chips. */
export function SkillOwnerThumbs({
  owners,
  displayMap,
  limit = 3,
  linkable = false,
  className = '',
}: SkillOwnerThumbsProps) {
  const localized = useLocalizedHref()
  const shown = catalogOwnersForThumbs(owners, limit)
  if (!shown.length) return null

  return (
    <div
      className={`skill-owner-thumbs ${className}`.trim()}
      onClick={linkable ? (e) => e.preventDefault() : undefined}
    >
      {shown.map((owner) => {
        const display = displayMap.get(ownerDisplayKey(owner))
        const src = display?.iconUrl
        if (!src) return null
        const img = (
          <GameImage
            src={src}
            alt={display?.name || ''}
            className="skill-owner-thumb"
            title={display?.name}
          />
        )
        if (linkable && display?.href) {
          return (
            <Link
              key={ownerDisplayKey(owner)}
              href={localized(display.href)}
              className="skill-owner-thumbs__item relative z-0 hover:z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {img}
            </Link>
          )
        }
        return (
          <span key={ownerDisplayKey(owner)} className="skill-owner-thumbs__item relative">
            {img}
          </span>
        )
      })}
    </div>
  )
}
