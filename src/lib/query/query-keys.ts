export const queryKeys = {
  heroTypeDesc: ['config', 'HeroTypeDescConfig'] as const,
  equipmentCatalogRaw: ['catalog', 'equipment', 'raw'] as const,
  heroTalents: (heroId: number, lang: string) => ['hero', heroId, 'talents', lang] as const,
}
