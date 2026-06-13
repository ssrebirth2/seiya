import { UI_KEYS } from '@/lib/i18n/ui-keys'
import type { FunOpenIconKey } from '@/lib/game/fun-open-icons'

export type FunctionShortcutIcon = FunOpenIconKey | 'lucide-home'

export type FunctionShortcutItem = {
  href: string
  lcKey: string
  icon: FunctionShortcutIcon
}

export const CATALOG_SHORTCUTS: FunctionShortcutItem[] = [
  { href: '/heroes', lcKey: UI_KEYS.nav.heroes, icon: 'heroes' },
  { href: '/artifacts', lcKey: UI_KEYS.nav.artifacts, icon: 'artifacts' },
  { href: '/companions', lcKey: UI_KEYS.nav.companions, icon: 'companions' },
  { href: '/force-cards', lcKey: UI_KEYS.nav.forceCards, icon: 'forceCards' },
  // Items page incomplete — re-enable when ready:
  // { href: '/items', lcKey: UI_KEYS.nav.items, icon: 'bag' },
]

export const TOOLS_SHORTCUTS: FunctionShortcutItem[] = [
  { href: '/team-builder', lcKey: UI_KEYS.nav.teamBuilder, icon: 'teamBuilder' },
]

export const HOME_SHORTCUTS: FunctionShortcutItem[] = [
  ...CATALOG_SHORTCUTS,
  ...TOOLS_SHORTCUTS,
]
