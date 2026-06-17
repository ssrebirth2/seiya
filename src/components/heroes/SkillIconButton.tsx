'use client'

import GameImage from '@/components/ui/GameImage'
import { resolveSkillIconUrl } from '@/lib/game/resolve-skill-icon'
import {
  getSkillBorderPath,
  getSkillSelectPath,
  isAwakenSkillRow,
} from '@/lib/game/skill-ui-sprites'

type SkillIconButtonProps = {
  skill: Record<string, unknown>
  name: string
  selected?: boolean
  onClick?: () => void
  className?: string
}

/** Skill slot: glow → icon → border (_1 | _3). */
export function SkillIconButton({
  skill,
  name,
  selected = false,
  onClick,
  className = '',
}: SkillIconButtonProps) {
  const isAwaken = isAwakenSkillRow(skill)
  const borderSrc = getSkillBorderPath(isAwaken)
  const selectSrc = getSkillSelectPath()
  const iconSrc = resolveSkillIconUrl(skill as { iconpath?: string | null })

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      aria-pressed={selected}
      className={`skill-icon-btn${isAwaken ? ' skill-icon-btn--awaken' : ''} ${className}`.trim()}
    >
      <div className="skill-icon-btn__canvas">
        {selected && (
          <GameImage
            src={selectSrc}
            rawSrc={selectSrc}
            alt=""
            aria-hidden
            className="skill-icon-btn__select"
          />
        )}
        {iconSrc && (
          <GameImage src={iconSrc} rawSrc={iconSrc} alt={name} className="skill-icon-btn__icon" />
        )}
        <GameImage
          src={borderSrc}
          rawSrc={borderSrc}
          alt=""
          aria-hidden
          className="skill-icon-btn__border"
        />
      </div>
    </button>
  )
}
