import { formatSkillCooldown, hasSkillCooldown } from '@/lib/game/format-skill-cooldown'

interface SkillCooldownMetaProps {
  cd: unknown
  className?: string
}

export default function SkillCooldownMeta({ cd, className = '' }: SkillCooldownMetaProps) {
  if (!hasSkillCooldown(cd)) return null
  return (
    <p className={className}>
      <strong>Cooldown:</strong> {formatSkillCooldown(cd)}
    </p>
  )
}
