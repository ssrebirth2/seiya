'use client'

import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

type Props = {
  showRecycle?: boolean
}

export function ForceCardSkillTableHeader({ showRecycle = true }: Props) {
  const { t } = useUiTranslation()

  return (
    <thead>
      <tr>
        <th scope="col">{t(UI_KEYS.common.grade)}</th>
        <th scope="col">{t(UI_KEYS.forceCard.effect)}</th>
        <th scope="col">{t(UI_KEYS.common.consume)}</th>
        {showRecycle ? <th scope="col">{t(UI_KEYS.forceCard.recycleGain)}</th> : null}
      </tr>
    </thead>
  )
}
