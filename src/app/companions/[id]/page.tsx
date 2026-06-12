'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase-client'
import { useLanguage } from '@/context/language-context'
import { translateKeys } from '@/lib/i18n/language-package'
import { applySkillValues } from '@/lib/game/apply-skill-values'
import CompanionProfileShowcase from '@/components/companions/CompanionProfileShowcase'
import CompanionStarSkill from '@/components/companions/CompanionStarSkill'
import { isCompanionListed } from '@/lib/game/hidden-companion-ids'

export default function CompanionDetailPage() {
  const { id } = useParams()
  const companionId = parseInt(id as string, 10)
  const { lang } = useLanguage()

  const [companion, setCompanion] = useState<any>(null)
  const [resource, setResource] = useState<any>(null)
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isReady, setIsReady] = useState(false)

  const getT = useCallback(
    (key?: string) => translations[key || ''] || key || '',
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
        keys.add(`LC_COMMON_quality_name_${spirit.init_quality}`)
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
        ? getT(`LC_COMMON_quality_name_${companion.init_quality}`)
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
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner h-10 w-10" />
          <p className="text-sm text-text-muted">Loading companion profile...</p>
        </div>
      </div>
    )
  }

  if (!companion) {
    return (
      <div className="panel py-12 text-center">
        <p className="mb-4 text-text-muted">Companion not found.</p>
        <Link href="/companions" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Companions
        </Link>
      </div>
    )
  }

  return (
    <div className="page-stack -mx-2 sm:mx-0">
      <CompanionProfileShowcase
        companionId={companion.id}
        name={nameHtml}
        qualityLabel={qualityLabel}
        descriptionHtml={descriptionHtml}
        dbPreviewPath={resource?.preview_icon}
        skinsId={companion.skins}
      />

      {companion.skill_id && (
        <section className="panel">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Star Skill
          </h2>
          <CompanionStarSkill skillId={companion.skill_id} />
        </section>
      )}
    </div>
  )
}
