'use client'

import { useQuery } from '@tanstack/react-query'
import { loadChangelog } from '@/lib/changelog/load-changelog'
import { queryKeys } from '@/lib/query/query-keys'

export function useDbChangelog() {
  return useQuery({
    queryKey: queryKeys.dbChangelog,
    queryFn: loadChangelog,
    // Changelog JSON changes on sync — don't keep a 30min stale copy of old titles
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
