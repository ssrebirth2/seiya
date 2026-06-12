'use client'

import { useTeamStore } from '@/lib/team-builder/stores/use-team-store'
import { useEquipmentStore } from '@/lib/team-builder/stores/use-equipment-store'
import { encodeTeam } from '@/lib/team-builder/team-share-codec'
import { useState } from 'react'
import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'

export default function ShareButton() {
  const { t, site } = useUiTranslation()
  const { team } = useTeamStore()
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!team || team.length === 0) {
      alert('Assemble a team before sharing.')
      return
    }

    const allEquipment = useEquipmentStore.getState().equipment || {}
    const equipment: Record<number, { artifact: number | null; cards: number[] }> = {}

    for (const [heroId, eq] of Object.entries(allEquipment)) {
      if (eq && (eq.artifact || (eq.cards && eq.cards.length > 0))) {
        equipment[Number(heroId)] = {
          artifact: eq.artifact || null,
          cards: eq.cards || [],
        }
      }
    }

    const payload = {
      team: team.map((h: any) => ({
        id: h.id,
        position: h.position,
        stance: h.stance,
        baseStance: h.baseStance,
      })),
      equipment,
    }

    let url = ''

    try {
      const code = encodeTeam(payload)
      url = `${window.location.origin}/team-builder#${code}`

      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Error generating share link:', err)
      if (url) window.prompt(`${t(UI_KEYS.common.copy)}:`, url)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="rounded border border-panel-border bg-panel px-4 py-2 text-foreground transition hover:bg-accent hover:text-accent-fg"
      title={site('shareTeam')}
    >
      {copied ? t(UI_KEYS.common.copySuccess) : site('shareTeam')}
    </button>
  )
}
