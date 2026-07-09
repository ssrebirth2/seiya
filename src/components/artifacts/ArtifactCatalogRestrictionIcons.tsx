'use client'

import GameImage from '@/components/ui/GameImage'
import { artifactRestrictionChipKey } from '@/lib/game/artifact-equip'
import type { ForceCardRestrictionChip } from '@/lib/game/force-card-equip'
import { formatPlainLabel } from '@/lib/game/apply-skill-values'

type ArtifactCatalogRestrictionIconsProps = {
  chips: ForceCardRestrictionChip[]
  getT: (key?: string) => string
}

/** Top-right stack — one row per restriction icon, no fixed type slots. */
export function ArtifactCatalogRestrictionIcons({
  chips,
  getT,
}: ArtifactCatalogRestrictionIconsProps) {
  const visible = chips.filter((chip) => chip.iconSrc)
  if (!visible.length) return null

  return (
    <div className="artifact-catalog-cell__type-icons" role="list" aria-label="Equip restrictions">
      {visible.map((chip) => {
        const label = formatPlainLabel(getT(chip.labelKey), 0, {})
        return (
          <span key={artifactRestrictionChipKey(chip)} className="artifact-catalog-cell__type-icon-wrap" role="listitem">
            <GameImage
              src={chip.iconSrc!}
              rawSrc={chip.iconSrc}
              alt=""
              title={label}
              aria-label={label}
              className="artifact-catalog-cell__type-icon"
            />
          </span>
        )
      })}
    </div>
  )
}

export default ArtifactCatalogRestrictionIcons
