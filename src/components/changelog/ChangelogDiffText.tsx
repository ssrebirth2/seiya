'use client'

import type { ChangelogChange, LangTextMap } from '@/lib/changelog/types'
import { useLanguage } from '@/context/language-context'
import { SITE_LANGUAGES, SITE_LANGUAGE_CODES } from '@/lib/i18n/site-languages'
import { useUiTranslation } from '@/lib/i18n/use-ui-translation'

type ChangelogDiffTextProps = {
  change: ChangelogChange
  className?: string
}

type LangDiff = {
  code: string
  label: string
  before: string
  after: string
}

function langLabel(code: string): string {
  const entry = SITE_LANGUAGES.find((l) => l.code === code)
  if (!entry) return code
  return entry.label.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim() || code
}

function collectLangDiffs(
  beforeMap: LangTextMap | undefined,
  afterMap: LangTextMap | undefined,
  preferredLang: string
): LangDiff[] {
  const codes = [preferredLang, ...SITE_LANGUAGE_CODES.filter((c) => c !== preferredLang)]
  const diffs: LangDiff[] = []
  const seen = new Set<string>()

  for (const code of codes) {
    if (seen.has(code)) continue
    seen.add(code)
    const beforeRaw = beforeMap?.[code]
    const afterRaw = afterMap?.[code]
    if (beforeRaw == null && afterRaw == null) continue
    let b = typeof beforeRaw === 'string' ? beforeRaw.trim() : String(beforeRaw ?? '').trim()
    let a = typeof afterRaw === 'string' ? afterRaw.trim() : String(afterRaw ?? '').trim()
    if (!b && !a) continue
    if (b === a) continue
    if (b.startsWith('LC_') && a.startsWith('LC_')) continue
    if (b.startsWith('LC_') && !a) continue
    if (a.startsWith('LC_') && !b) continue
    if (b.startsWith('LC_')) b = ''
    if (a.startsWith('LC_')) a = ''
    if (!b && !a) continue
    if (b === a) continue
    diffs.push({ code, label: langLabel(code), before: b, after: a })
  }

  return diffs
}

function DiffBlock({ before, after }: { before: string; after: string }) {
  return (
    <div className="patch-notes-diff__pair">
      {before ? (
        <p className="patch-notes-diff__before">
          <span aria-hidden="true">−</span>
          <span>{before}</span>
        </p>
      ) : null}
      {after ? (
        <p className="patch-notes-diff__after">
          <span aria-hidden="true">+</span>
          <span>{after}</span>
        </p>
      ) : null}
    </div>
  )
}

export function ChangelogDiffText({ change, className = '' }: ChangelogDiffTextProps) {
  const { lang } = useLanguage()
  const { site } = useUiTranslation()
  const diffs = collectLangDiffs(change.before, change.after, lang)

  if (diffs.length === 0) return null

  const currentChanged = diffs.some((d) => d.code === lang)
  const sameContent = diffs.every(
    (d) => d.before === diffs[0].before && d.after === diffs[0].after
  )
  const showInline = diffs.length === 1 || sameContent

  return (
    <div className={`patch-notes-diff ${className}`.trim()}>
      <p className="patch-notes-diff__caption">
        {site('changelogChangedIn')}{' '}
        <strong>{diffs.map((d) => d.code).join(', ')}</strong>
        {!currentChanged ? <> — {site('changelogUnchangedIn')}</> : null}
      </p>
      {showInline ? (
        <DiffBlock before={diffs[0].before} after={diffs[0].after} />
      ) : (
        <div className="patch-notes-diff__langs">
          {diffs.map((d) => (
            <details key={d.code} className="patch-notes-diff__lang">
              <summary>{d.label}</summary>
              <DiffBlock before={d.before} after={d.after} />
            </details>
          ))}
        </div>
      )}
    </div>
  )
}

export function listChangedLangCodes(change: ChangelogChange, preferredLang: string): string[] {
  return collectLangDiffs(change.before, change.after, preferredLang).map((d) => d.code)
}
