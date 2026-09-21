/**

 * Empirical SkillConfig ID-band taxonomy (no GameDefine range enum).

 * hero/npc: skillid ≈ roleId × 10 + slot

 *

 * 60xxx–61xxx: HeroAwakenInfoConfig.add_skill

 * 65xxx: CosmoPointConfig.add_skill

 * 66xxx: HeroQualitySkillConfig.skill_info

 * 67xxx: SpiritSuitConfig.skill_id (companion suit)

 */



export type SkillIdBand =

  | 'hero'

  | 'npc'

  | 'system'

  | 'awaken'

  | 'cosmo'

  | 'quality'

  | 'spirit_suit'

  | 'combo'

  | 'bond'

  | 'talent'

  | 'force_card'

  | 'artifact'

  | 'spirit'

  | 'talent_display'

  | 'sub_skill'

  | 'mode_buff'

  | 'stub'

  | 'other'



export const SKILL_ID_BANDS: SkillIdBand[] = [

  'hero',

  'npc',

  'system',

  'awaken',

  'cosmo',

  'quality',

  'spirit_suit',

  'combo',

  'bond',

  'talent',

  'force_card',

  'artifact',

  'spirit',

  'talent_display',

  'sub_skill',

  'mode_buff',

  'stub',

  'other',

]



/** Site-only label keys for each band (see SITE_LOCALIZED_LABELS / SITE_ONLY). */

export const SKILL_BAND_LABEL_KEYS: Record<SkillIdBand, string> = {

  hero: 'skillBandHero',

  npc: 'skillBandNpc',

  system: 'skillBandSystem',

  awaken: 'skillBandAwaken',

  cosmo: 'skillBandCosmo',

  quality: 'skillBandQuality',

  spirit_suit: 'skillBandSpiritSuit',

  combo: 'skillBandCombo',

  bond: 'skillBandBond',

  talent: 'skillBandTalent',

  force_card: 'skillBandForceCard',

  artifact: 'skillBandArtifact',

  spirit: 'skillBandSpirit',

  talent_display: 'skillBandTalentDisplay',

  sub_skill: 'skillBandSubSkill',

  mode_buff: 'skillBandModeBuff',

  stub: 'skillBandStub',

  other: 'skillBandOther',

}



export function getSkillIdBand(skillId: number): SkillIdBand {

  if (!Number.isFinite(skillId) || skillId <= 0) return 'other'



  if (skillId >= 1_000_000) return 'talent_display'

  if (skillId >= 820_100 && skillId <= 829_999) return 'spirit'

  if (skillId >= 510_001 && skillId <= 519_999) return 'mode_buff'

  if (skillId >= 520_000 && skillId <= 529_999) return 'stub'

  if (skillId >= 400_000 && skillId <= 409_999) return 'artifact'

  if (skillId >= 100_000 && skillId <= 199_999) return 'sub_skill'

  if (skillId >= 90_000 && skillId <= 99_999) return 'force_card'

  if (skillId >= 80_000 && skillId <= 89_999) return 'talent'

  // 73xxx = bond skills; other 7xxxx = combo / combine skills

  if (skillId >= 73_000 && skillId <= 73_999) return 'bond'

  if (skillId >= 70_000 && skillId <= 79_999) return 'combo'

  // Split former catch-all 60xxx–69xxx “awaken”

  if (skillId >= 67_000 && skillId <= 67_999) return 'spirit_suit'

  if (skillId >= 66_000 && skillId <= 66_999) return 'quality'

  if (skillId >= 65_000 && skillId <= 65_999) return 'cosmo'

  if (skillId >= 60_000 && skillId <= 61_999) return 'awaken'

  if (skillId >= 50_000 && skillId <= 59_999) return 'system'

  if (skillId >= 20_000 && skillId <= 39_999) return 'npc'

  if (skillId >= 10_000 && skillId <= 19_999) return 'hero'



  return 'other'

}



/** Slot within hero/npc kit: skillid % 10. Slot 0 = auto-attack stub. */

export function getHeroSkillSlot(skillId: number): number | null {

  const band = getSkillIdBand(skillId)

  if (band !== 'hero' && band !== 'npc') return null

  return skillId % 10

}



export function getRoleIdFromSkillId(skillId: number): number | null {

  const band = getSkillIdBand(skillId)

  if (band !== 'hero' && band !== 'npc') return null

  return Math.floor(skillId / 10)

}



/** Auto-attack stub: hero/npc slot 0. */

export function isAutoAttackStub(skillId: number): boolean {

  return getHeroSkillSlot(skillId) === 0

}


