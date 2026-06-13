/** LoginView logo sprites — paths mirror game `UI/Sprites/LanguageRes/{lang}/loginview`. */

export type SiteLogoSpec = {
  src: string
  /** Native pixel width from game asset */
  width: number
  /** Native pixel height from game asset */
  height: number
  /** Render width on desktop top dock (px); height follows aspect ratio */
  displayWidth: number
}

export const SITE_LOGO_INTL: SiteLogoSpec = {
  src: '/assets/resources/ui/sprites/languageres/en/loginview/zhdl_img_logo_4.png',
  width: 346,
  height: 150,
  displayWidth: 300,
}

export const SITE_LOGO_CN: SiteLogoSpec = {
  src: '/assets/resources/ui/sprites/languageres/cn/loginview/zhdl_img_logo_1.png',
  width: 333,
  height: 237,
  displayWidth: 220,
}

const LOGO_MAX_DISPLAY_WIDTH_PX = 160

export function getSiteLogoSpec(lang: string): SiteLogoSpec {
  return lang === 'CN' ? SITE_LOGO_CN : SITE_LOGO_INTL
}

export function getSiteLogoPath(lang: string): string {
  return getSiteLogoSpec(lang).src
}

export function getSiteLogoEffectiveDisplayWidth(spec: SiteLogoSpec): number {
  return Math.min(spec.displayWidth, LOGO_MAX_DISPLAY_WIDTH_PX)
}

export function getSiteLogoDisplayHeight(spec: SiteLogoSpec): number {
  const width = getSiteLogoEffectiveDisplayWidth(spec)
  return Math.round(width * (spec.height / spec.width))
}
