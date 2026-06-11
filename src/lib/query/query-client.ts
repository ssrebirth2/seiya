import { QueryClient } from '@tanstack/react-query'
import { GAME_CONFIG_STALE_MS } from '@/lib/query/query-config'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: GAME_CONFIG_STALE_MS,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/** Same singleton on the client as QueryProvider so Zustand/helpers can use fetchQuery. */
export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient()
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}
