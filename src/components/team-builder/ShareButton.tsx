'use client'

import { useTeamStore } from '@/lib/team-builder/stores/use-team-store'
import { useEquipmentStore } from '@/lib/team-builder/stores/use-equipment-store'
import { encodeTeam } from '@/lib/team-builder/team-share-codec'
import { useState } from 'react'

export default function ShareButton() {
  const { team } = useTeamStore()
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (!team || team.length === 0) {
      alert('Assemble a team before sharing.')
      return
    }

    // ✅ Obtém equipamentos e inclui apenas heróis que têm algo equipado
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

    // ✅ Payload completo: time + equipamentos
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
      if (url) window.prompt('Copy this link manually:', url)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="rounded border border-panel-border bg-panel px-4 py-2 text-foreground transition hover:bg-accent hover:text-accent-fg"
      title="Generate a shareable team link"
    >
      {copied ? 'Copied!' : 'Share Team'}
    </button>
  )
}
