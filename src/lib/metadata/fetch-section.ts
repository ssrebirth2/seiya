import { translateKeys } from '@/lib/i18n/language-package'
import { SITE_LOCALIZED_LABELS, SITE_ONLY_LABELS, UI_KEYS } from '@/lib/i18n/ui-keys'
import type { EntityMetadataPayload } from '@/lib/metadata/defaults'

export type SectionKey =
  | 'home'
  | 'heroes'
  | 'companions'
  | 'artifacts'
  | 'force-cards'
  | 'team-builder'
  | 'stage-up'
  | 'gallery'
  | 'items'
  | 'skills'

const SECTION_NAV_KEYS: Record<Exclude<SectionKey, 'home' | 'items' | 'skills'>, string> = {
  heroes: UI_KEYS.nav.heroes,
  companions: UI_KEYS.nav.companions,
  artifacts: UI_KEYS.nav.artifacts,
  'force-cards': UI_KEYS.nav.forceCards,
  'team-builder': UI_KEYS.nav.teamBuilder,
  'stage-up': UI_KEYS.nav.stageUp,
  gallery: UI_KEYS.nav.galleryMode,
}

function localizedStageUpDesc(lang: string): string {
  const upper = lang.toUpperCase() as keyof typeof SITE_LOCALIZED_LABELS.stageUpDesc
  return SITE_LOCALIZED_LABELS.stageUpDesc[upper] ?? SITE_LOCALIZED_LABELS.stageUpDesc.EN
}

function localizedGalleryDesc(lang: string): string {
  const upper = lang.toUpperCase() as keyof typeof SITE_LOCALIZED_LABELS.galleryDesc
  return SITE_LOCALIZED_LABELS.galleryDesc[upper] ?? SITE_LOCALIZED_LABELS.galleryDesc.EN
}

function localizedSkillsDesc(lang: string): string {
  const upper = lang.toUpperCase() as keyof typeof SITE_LOCALIZED_LABELS.skillsCardDesc
  return SITE_LOCALIZED_LABELS.skillsCardDesc[upper] ?? SITE_LOCALIZED_LABELS.skillsCardDesc.EN
}

const SECTION_DESCRIPTIONS: Record<
  Exclude<SectionKey, 'home' | 'stage-up' | 'gallery' | 'skills'>,
  string
> = {
  heroes: SITE_ONLY_LABELS.heroesCardDesc,
  companions: SITE_ONLY_LABELS.companionsCardDesc,
  artifacts: SITE_ONLY_LABELS.artifactsCardDesc,
  'force-cards': SITE_ONLY_LABELS.forceCardsCardDesc,
  'team-builder': SITE_ONLY_LABELS.shareTeam,
  items: SITE_ONLY_LABELS.itemDatabase,
}

function localizedWelcome(lang: string): string {
  const upper = lang.toUpperCase() as keyof typeof SITE_LOCALIZED_LABELS.databaseWelcome
  return (
    SITE_LOCALIZED_LABELS.databaseWelcome[upper] ??
    SITE_LOCALIZED_LABELS.databaseWelcome.EN
  )
}

export async function fetchSectionMetadata(
  section: SectionKey,
  lang: string
): Promise<EntityMetadataPayload> {
  if (section === 'home') {
    return {
      title: SITE_ONLY_LABELS.databaseTitle,
      description: localizedWelcome(lang),
      imageUrl: null,
    }
  }

  if (section === 'items') {
    return {
      title: SITE_ONLY_LABELS.itemDatabase,
      description: SECTION_DESCRIPTIONS.items,
      imageUrl: null,
    }
  }

  if (section === 'skills') {
    const navKey = UI_KEYS.nav.skills
    const translated = await translateKeys([navKey], lang)
    return {
      title: translated[navKey] || SITE_ONLY_LABELS.skillList,
      description: localizedSkillsDesc(lang),
      imageUrl: null,
    }
  }

  const navKey = SECTION_NAV_KEYS[section]
  const translated = await translateKeys([navKey], lang)
  const description =
    section === 'stage-up'
      ? localizedStageUpDesc(lang)
      : section === 'gallery'
        ? localizedGalleryDesc(lang)
        : SECTION_DESCRIPTIONS[section]
  const title = translated[navKey] || description

  return {
    title,
    description,
    imageUrl: null,
  }
}
