'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys, createTranslationGetter } from '@/lib/i18n/language-package'
import { LoadingSkeleton, DetailPageShell } from '@/components/ui/v2'
import { SetPageMeta } from '@/lib/ui/usePageMeta'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'
import { qualityNameKey } from '@/lib/i18n/ui-keys'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import CompanionProfileShowcase from '@/components/companions/CompanionProfileShowcase'
import CompanionStarSkill from '@/components/companions/CompanionStarSkill'
import { isCompanionListed } from '@/lib/game/hidden-companion-ids'

export default function CompanionDetailClient() {
  const { id } = useParams()
  const companionId = parseInt(id as string, 10)
  const { lang } = useLanguage()
  const { t, site } = useUiTranslation()

  const [companion, setCompanion] = useState<any>(null)
  const [resource, setResource] = useState<any>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isReady, setIsReady] = useState(false)

  const getT = useCallback(
    (key?: string) => createTranslationGetter(translations)(key),
    [translations]
  )

  useEffect(() => {
    if (!companionId || Number.isNaN(companionId)) return

    if (!isCompanionListed(companionId)) {
      setCompanion(null)
      setIsReady(true)
      return
    }

    const load = async () => {
      setIsReady(false)

      const { data: spirit } = await supabase
        .from('SpiritConfig')
        .select('*')
        .eq('id', companionId)
        .maybeSingle()

      if (!spirit) {
        setCompanion(null)
        setIsReady(true)
        return
      }

      const { data: res } = spirit.skins
        ? await supabase
            .from('ArtifactResourcesConfig')
            .select('id, preview_icon, item_icon')
            .eq('id', spirit.skins)
            .maybeSingle()
        : { data: null }

      const keys = new Set<string>()
      if (spirit.name) keys.add(spirit.name)
      if (spirit.desc) keys.add(spirit.desc)
      if (spirit.init_quality != null) {
        keys.add(qualityNameKey(spirit.init_quality))
      }

      const translated = await translateKeys(Array.from(keys), lang)

      setCompanion(spirit)
      setResource(res)
      setTranslations(translated)
      setIsReady(true)
    }

    load()
  }, [companionId, lang])

  const qualityLabel = useMemo(
    () =>
      companion?.init_quality != null
        ? getT(qualityNameKey(companion.init_quality))
        : '',
    [companion, getT]
  )

  const nameHtml = useMemo(
    () => applySkillValues(getT(companion?.name), 0, {}),
    [companion?.name, getT]
  )

  const descriptionHtml = useMemo(
    () =>
      companion?.desc ? applySkillValues(getT(companion.desc), 0, {}) : undefined,
    [companion?.desc, getT]
  )

  if (!isReady) {
    return <LoadingSkeleton variant="detail" />
  }

  if (!companion) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">{site('companionNotFound')}</p>
        <Link href="/companions" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          {t(UI_KEYS.common.loginBack)}
        </Link>
      </div>
    )
  }

  return (
    <>
      <SetPageMeta title={getT(companion?.name)} />
      <DetailPageShell
        backHref="/companions"
        backLabel={t(UI_KEYS.common.loginBack)}
        title={getT(companion.name)}
        header={
          <CompanionProfileShowcase
            companionId={companion.id}
            name={nameHtml}
            qualityLabel={qualityLabel}
            descriptionHtml={descriptionHtml}
            dbPreviewPath={resource?.preview_icon}
            skinsId={companion.skins}
          />
        }
      >
        {companion.skill_id && (
          <section className="panel">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              {t(UI_KEYS.companion.starSkill)}
            </h2>
            <CompanionStarSkill skillId={companion.skill_id} />
          </section>
        )}
      </DetailPageShell>
    </>
  )
}
