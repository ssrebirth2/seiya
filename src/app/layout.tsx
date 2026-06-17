import './globals.css'

import { ReactNode } from 'react'
import type { Metadata } from 'next'

import { TopDock } from '@/components/layout/TopDock'

import { MobileDock } from '@/components/layout/MobileDock'

import { LanguageProvider } from '@/context/language-context'

import { QueryProvider } from '@/components/layout/QueryProvider'

import { PageMetaProvider } from '@/lib/ui/usePageMeta'

import { fontInter, fontOutfit } from '@/lib/ui/fonts'

import { SITE_ONLY_LABELS } from '@/lib/i18n/ui-keys'

import { OG_DEFAULT_IMAGE, getSiteUrl } from '@/lib/metadata/site-url'



export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_ONLY_LABELS.databaseTitle,
    template: `%s | ${SITE_ONLY_LABELS.databaseTitle}`,
  },
  description: 'Hero and skill database viewer for Saint Seiya: Rebirth 2 (EX).',
  openGraph: {
    siteName: SITE_ONLY_LABELS.databaseTitle,
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: OG_DEFAULT_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_ONLY_LABELS.databaseTitle,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_ONLY_LABELS.databaseTitle,
    description: 'Hero and skill database viewer for Saint Seiya: Rebirth 2 (EX).',
    images: [OG_DEFAULT_IMAGE],
  },
}



export const viewport = {

  width: 'device-width',

  initialScale: 1,

  viewportFit: 'cover' as const,

}



const INIT_SCRIPT = `(function(){try{

  var t=localStorage.getItem('theme');

  if(t==='light')document.documentElement.classList.add('light');

}catch(e){}})();`



export default function RootLayout({ children }: { children: ReactNode }) {

  return (

    <html lang="en" suppressHydrationWarning>

      <head>

        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />

      </head>

      <body

        className={`${fontInter.variable} ${fontOutfit.variable} bg-background text-foreground antialiased`}

      >

        <LanguageProvider>

          <QueryProvider>

            <PageMetaProvider>

              <TopDock />

              <div className="flex min-h-screen flex-col overflow-hidden bg-background lg:pt-[var(--top-shell-offset)]">

                <main

                  role="main"

                  className="flex-1 overflow-y-auto p-4 max-lg:pb-[calc(var(--dock-height)+var(--dock-safe-bottom)+1rem)] sm:p-6 lg:px-8 lg:pb-8 lg:pt-4"

                >

                  <div className="mx-auto max-w-7xl space-y-8">{children}</div>

                </main>

                <MobileDock />

              </div>

            </PageMetaProvider>

          </QueryProvider>

        </LanguageProvider>

      </body>

    </html>

  )

}

