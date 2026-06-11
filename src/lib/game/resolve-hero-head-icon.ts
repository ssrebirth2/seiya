import { IMAGE_UNAVAILABLE, resolveAssetUrl } from '@/lib/assets/asset-registry'
import {
  iconPathFromPayload,
  type IconConfigPayload,
} from '@/lib/game/icon-config-payload'

/** IconConfig `role_*_icon_path` → public asset URL under /assets/resources/. */
export function convertHeroHeadIconPath(rawPath?: string | null): string {
  if (!rawPath) return ''

  const cleanPath = rawPath.replace(/^\/+/, '')
  const lastSlashIndex = cleanPath.lastIndexOf('/')
  let dir = ''
  let file = cleanPath

  if (lastSlashIndex !== -1) {
    dir = cleanPath.substring(0, lastSlashIndex)
    file = cleanPath.substring(lastSlashIndex + 1)
  }

  return `/assets/resources/${dir.toLowerCase()}/${file}.png`
}

export function resolveHeroHeadIconUrl(rawPath?: string | null): string {
  const path = convertHeroHeadIconPath(rawPath)
  return path ? resolveAssetUrl(path) : IMAGE_UNAVAILABLE
}

export function squareHeadUrlFromIconPayload(payload: IconConfigPayload | null | undefined): string {
  return resolveHeroHeadIconUrl(iconPathFromPayload(payload, 'role_square_icon_path'))
}

export function circleHeadUrlFromIconPayload(payload: IconConfigPayload | null | undefined): string {
  return resolveHeroHeadIconUrl(iconPathFromPayload(payload, 'role_circle_icon_path'))
}
