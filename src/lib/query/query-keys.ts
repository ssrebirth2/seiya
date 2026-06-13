export const queryKeys = {
  heroHeadIcons: ['config', 'heroHeadIcons'] as const,
  heroTypeDesc: ['config', 'HeroTypeDescConfig'] as const,
  equipmentCatalogRaw: ['catalog', 'equipment', 'raw'] as const,
  catalogCounts: ['catalog', 'counts'] as const,
  heroTalents: (heroId: number, lang: string) => ['hero', heroId, 'talents', lang] as const,
}
