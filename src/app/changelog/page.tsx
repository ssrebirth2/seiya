import type { Metadata } from 'next'
import ChangelogClient from './changelog-client'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Database updates for Saint Seiya: Rebirth 2 (EX) — added and updated entries.',
}

export default function ChangelogPage() {
  return <ChangelogClient />
}
