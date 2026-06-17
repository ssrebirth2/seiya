'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import CompanionPreviewImage from '@/components/ui/CompanionPreviewImage'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type CompanionProfileShowcaseProps = {
  companionId: number
  name: string
  qualityLabel?: string
  descriptionHtml?: string
  dbPreviewPath?: string | null
  skinsId?: number | null
}

export default function CompanionProfileShowcase({
  companionId,
  name,
  qualityLabel,
  descriptionHtml,
  dbPreviewPath,
  skinsId,
}: CompanionProfileShowcaseProps) {
  const { t } = useUiTranslation()

  return (
    <section className="companion-profile-header">
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <Link
          href="/companions"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-text-muted transition hover:text-foreground sm:mb-6 sm:text-sm"
        >
          <ArrowLeft size={14} className="shrink-0" />
          {t(UI_KEYS.common.loginBack)}
        </Link>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
          <div className="companion-profile-art-frame w-full shrink-0 lg:w-auto">
            <CompanionPreviewImage
              dbPreviewPath={dbPreviewPath}
              skinsId={skinsId}
              alt={name}
              className="companion-profile-art"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-4 text-center lg:pt-2 lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              {qualityLabel && <span className="badge-accent">{qualityLabel}</span>}
              <span className="text-xs text-text-muted">ID {companionId}</span>
            </div>

            <h1
              className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
              dangerouslySetInnerHTML={{ __html: name }}
            />

            {descriptionHtml && (
              <div
                className="mx-auto max-w-prose text-sm leading-relaxed text-text-muted lg:mx-0 lg:max-w-xl lg:text-base"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
