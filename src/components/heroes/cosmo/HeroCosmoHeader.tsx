'use client'

import GameImage from '@/components/ui/GameImage'
import { useLanguage } from '@/context/language-context'
import { cosmoBackgroundPath } from '@/lib/assets/cosmo-images'
import { createTranslationGetter } from '@/lib/i18n/language-package'
import { UI_KEYS } from '@/lib/i18n/ui-keys'
import type { HeroCosmoData } from '@/lib/game/cosmo-types'

/** Native Cosmo texture size from game assets (e.g. Cosmo_1001.png). */
const COSMO_ART_W = 1024
const COSMO_ART_H = 939

type Props = {
  data: HeroCosmoData
  translations: Record<string, string>
}

export default function HeroCosmoHeader({ data, translations }: Props) {
  const { lang } = useLanguage()
  const getT = createTranslationGetter(translations, { lang })
  const constellationName = data.constellationNameKey
    ? getT(data.constellationNameKey)
    : getT(data.galleryNameKey)
  const bgSrc = cosmoBackgroundPath(data.heroId, data.path)

  return (
    <section className="hero-cosmo-constellation space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {getT(UI_KEYS.hero.constellation)}
      </h3>
      <figure className="mx-auto flex w-full max-w-[min(100%,32rem)] flex-col items-center gap-3">
        <div
          className="hero-cosmo-header__frame w-full"
          style={{ aspectRatio: `${COSMO_ART_W} / ${COSMO_ART_H}` }}
        >
          <div className="hero-cosmo-header__frame-sky" aria-hidden />
          <GameImage
            src={bgSrc}
            rawSrc={bgSrc}
            alt=""
            width={COSMO_ART_W}
            height={COSMO_ART_H}
            className="hero-cosmo-header__texture relative z-[1] h-full w-full object-contain"
          />
        </div>
        <figcaption className="font-display text-center text-lg font-semibold text-text sm:text-xl">
          {constellationName}
        </figcaption>
      </figure>
    </section>
  )
}
