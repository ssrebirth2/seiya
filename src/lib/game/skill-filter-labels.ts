import { SKILL_BAND_LABEL_KEYS, type SkillIdBand } from '@/lib/game/skill-id-band'
import type { SkillOwnerType } from '@/lib/game/skill-owners'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import type { SiteLabelKey } from '@/lib/i18n/use-ui-translation'

type Translate = (key: string) => string
type SiteTranslate = (key: SiteLabelKey) => string

/** Prefer shared UI LC keys; fall back to site-only band labels. */
export function skillBandFilterLabel(
  band: SkillIdBand,
  t: Translate,
  site: SiteTranslate
): string {
  switch (band) {
    case 'hero':
      return t(UI_KEYS.nav.heroes)
    case 'force_card':
      return t(UI_KEYS.nav.forceCards)
    case 'artifact':
      return t(UI_KEYS.nav.artifacts)
    case 'spirit':
      return t(UI_KEYS.nav.companions)
    case 'awaken':
      return t(UI_KEYS.common.awakening)
    case 'cosmo':
      return t(UI_KEYS.hero.cosmoTitle)
    case 'quality':
      return t(UI_KEYS.common.quality)
    case 'spirit_suit':
      return t('LC_PRIMARYSPIRIT_equip_suit')
    case 'combo':
      return t(UI_KEYS.hero.combineSkills)
    case 'bond':
      return t(UI_KEYS.hero.bondSkills)
    case 'talent':
      return t(UI_KEYS.hero.talentsTab)
    case 'system':
      return t(UI_KEYS.common.system)
    default:
      return site(SKILL_BAND_LABEL_KEYS[band] as SiteLabelKey)
  }
}

const OWNER_SITE_KEYS: Record<SkillOwnerType, SiteLabelKey> = {
  hero: 'skillOwnerHero',
  force_card: 'skillOwnerForceCard',
  artifact: 'skillOwnerArtifact',
  spirit: 'skillOwnerSpirit',
  npc: 'skillOwnerNpc',
  system: 'skillOwnerSystem',
}

/** Prefer shared UI LC keys; fall back to site-only owner labels. */
export function skillOwnerFilterLabel(
  kind: SkillOwnerType,
  t: Translate,
  site: SiteTranslate
): string {
  switch (kind) {
    case 'hero':
      return t(UI_KEYS.nav.heroes)
    case 'force_card':
      return t(UI_KEYS.nav.forceCards)
    case 'artifact':
      return t(UI_KEYS.nav.artifacts)
    case 'spirit':
      return t(UI_KEYS.nav.companions)
    case 'system':
      return t(UI_KEYS.common.system)
    case 'npc':
      return site(OWNER_SITE_KEYS.npc)
    default:
      return site(OWNER_SITE_KEYS[kind] ?? 'skillOwnerHero')
  }
}
