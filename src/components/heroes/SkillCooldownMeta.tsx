'use client'

import { formatSkillCooldown, hasSkillCooldown } from '@/lib/game/format-skill-cooldown'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

interface SkillCooldownMetaProps {
  cd: unknown
  className?: string
}

export default function SkillCooldownMeta({ cd, className = '' }: SkillCooldownMetaProps) {
  const { t } = useUiTranslation()

  if (!hasSkillCooldown(cd)) return null
  return (
    <p className={className}>
      <strong>{t(UI_KEYS.common.cooldown)}:</strong> {formatSkillCooldown(cd)}
    </p>
  )
}
