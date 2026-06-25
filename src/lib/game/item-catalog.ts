/** Item catalog rules — default sort by id; other sorts tie-break on id. */

export const ITEM_CATALOG_PAGE_SIZE = 48

export type ItemCatalogIndexRow = {
  id: number
  name: string
  type: number
  quality: number
  icon_path?: string | null
  sort_weight: number
  des_value?: unknown
}

export type ItemCatalogSortKey = 'sort_weight' | 'name' | 'id' | 'quality'

export type ItemBagTab = {
  itemType: string
  nameKey: string
}

/** Bag tabs 0–4 from ItemTypeConfig; tab 5 (force card) is a separate site section. */
export const ITEM_BAG_TABS: ItemBagTab[] = [
  { itemType: '0', nameKey: 'LC_COMMON_bag_tab_all' },
  { itemType: '1', nameKey: 'LC_COMMON_bag_tab_role' },
  { itemType: '2', nameKey: 'LC_COMMON_bag_tab_consume' },
  { itemType: '3', nameKey: 'LC_COMMON_bag_tab_material' },
  { itemType: '4', nameKey: 'LC_COMMON_bag_tab_resource' },
]

export function isItemCatalogListed(row: { type: number | string | null | undefined }): boolean {
  const type = Number(row.type)
  if (!Number.isFinite(type)) return true
  return type !== 5
}

export function matchesBagTab(row: ItemCatalogIndexRow, tabItemType: string): boolean {
  if (!tabItemType || tabItemType === '0') return true
  return String(row.type) === tabItemType
}

export function getItemQualityTiers(rows: ItemCatalogIndexRow[]): number[] {
  const set = new Set<number>()
  for (const row of rows) {
    if (row.quality > 0) set.add(row.quality)
  }
  return [...set].sort((a, b) => a - b)
}

export function compareCatalogItems(
  a: ItemCatalogIndexRow,
  b: ItemCatalogIndexRow,
  sortBy: ItemCatalogSortKey,
  nameOf: (row: ItemCatalogIndexRow) => string
): number {
  switch (sortBy) {
    case 'name': {
      const cmp = nameOf(a).localeCompare(nameOf(b))
      return cmp !== 0 ? cmp : a.id - b.id
    }
    case 'quality': {
      const cmp = b.quality - a.quality
      return cmp !== 0 ? cmp : a.id - b.id
    }
    case 'id':
      return a.id - b.id
    case 'sort_weight':
    default: {
      const cmp = b.sort_weight - a.sort_weight
      return cmp !== 0 ? cmp : a.id - b.id
    }
  }
}

export function filterCatalogIndex(
  rows: ItemCatalogIndexRow[],
  opts: {
    tab: string
    quality: string
    search: string
    sortBy: ItemCatalogSortKey
    nameOf: (row: ItemCatalogIndexRow) => string
  }
): ItemCatalogIndexRow[] {
  const search = opts.search.trim().toLowerCase()
  const idSearch = /^\d+$/.test(search) ? Number(search) : null

  let result = rows.filter((row) => {
    if (!matchesBagTab(row, opts.tab)) return false
    if (opts.quality && String(row.quality) !== opts.quality) return false
    if (!search) return true
    if (idSearch != null && row.id === idSearch) return true
    const label = opts.nameOf(row).toLowerCase()
    if (label.includes(search)) return true
    return row.name.toLowerCase().includes(search)
  })

  result = [...result].sort((a, b) => compareCatalogItems(a, b, opts.sortBy, opts.nameOf))
  return result
}
