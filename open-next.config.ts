import { defineCloudflareConfig } from '@opennextjs/cloudflare'
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache'

/** SSG-only site: no ISR/revalidateTag — static assets cache is sufficient. */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
})
