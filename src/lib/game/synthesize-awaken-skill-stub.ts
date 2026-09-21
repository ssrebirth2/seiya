import type { SkillConfigRow } from '@/lib/game/skill-completeness'

/** Awaken SkillConfig levels use value ids `skillId * 10 + level` (e.g. 61180 → 611801). */
export function awakenSkillLevelValueId(skillId: number, level: number): number {
  return skillId * 10 + level
}

/**
 * Some hero awaken `add_skill` ids are referenced in HeroAwakenInfoConfig but missing
 * from SkillConfig (e.g. 61180). Rebuild a minimal row from the same LC key conventions
 * as neighboring awaken skills (61170 / 61190).
 */
export function synthesizeAwakenSkillStub(skillId: number): SkillConfigRow {
  const levels = [1, 2, 3, 4] as const
  const desList = (prefix: string) =>
    levels.map((level) => {
      const value = awakenSkillLevelValueId(skillId, level)
      return { des: `LC_SKILL_${prefix}_${value}`, value }
    })

  return {
    skillid: skillId,
    name: `LC_SKILL_skill_name_${skillId}`,
    iconpath: `Textures/Hero/SkillIcon/Texture/SkillIcon_${skillId}`,
    skill_type: 1,
    skill_des: desList('skill_des'),
    skill_sketch: desList('skill_sketch'),
    awaken_skill_des: desList('awaken'),
  }
}
