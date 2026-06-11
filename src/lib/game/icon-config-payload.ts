/** Column indices from IconConfig.lua `format` (role_circle_icon_path = 7, role_square_icon_path = 8). */
export const ICON_CONFIG_PAYLOAD = {
  role_circle_icon_path: '7',
  role_square_icon_path: '8',
  role_bar_icon_path: '9',
  role_combine_icon_path: '13',
} as const

export type IconConfigPayload = Record<string, unknown>

export function iconPathFromPayload(
  payload: IconConfigPayload | null | undefined,
  field: keyof typeof ICON_CONFIG_PAYLOAD
): string | null {
  if (!payload) return null
  const raw = payload[ICON_CONFIG_PAYLOAD[field]]
  return typeof raw === 'string' && raw.trim() ? raw : null
}

export function parseInitialSkinId(roleInitialSkins: unknown): number | null {
  if (Array.isArray(roleInitialSkins) && roleInitialSkins.length > 0) {
    const skin = Number(roleInitialSkins[0])
    return Number.isFinite(skin) ? skin : null
  }
  if (typeof roleInitialSkins === 'string') {
    try {
      const parsed = JSON.parse(roleInitialSkins)
      return parseInitialSkinId(parsed)
    } catch {
      return null
    }
  }
  return null
}
