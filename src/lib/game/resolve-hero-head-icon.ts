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
