import './globals.css'
import { ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { LanguageProvider } from '@/context/language-context'
import { QueryProvider } from '@/components/layout/QueryProvider'

export const metadata = {
  title: 'Saint Seiya: Rebirth 2 (EX)',
  description: 'Hero and skill database viewer for Saint Seiya: Rebirth 2 (EX).',
}

const CURRENT_YEAR = new Date().getFullYear()

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <LanguageProvider>
          <QueryProvider>
          <div className="flex min-h-screen overflow-hidden bg-background">
            {/* 🔹 Sidebar fixa em telas grandes / retrátil em telas pequenas */}
            <Sidebar />

            {/* 🔹 Conteúdo principal */}
            <div className="flex h-screen flex-1 flex-col overflow-hidden bg-background lg:ml-[var(--sidebar-width)]">


              {/* Cabeçalho */}
              <header
                role="banner"
                className="sticky top-0 z-30 flex items-center justify-between border-b border-panel-border bg-panel px-6 py-4 shadow-[var(--header-shadow)]"
              >
                <p className="text-sm font-medium text-foreground sm:text-base">
                  Saint Seiya: Rebirth 2 (EX) Database
                </p>
              </header>

              {/* Conteúdo central */}
              <main role="main" className="flex-1 overflow-y-auto bg-background p-6">
                <div className="max-w-6xl mx-auto space-y-8">{children}</div>
              </main>

              {/* Rodapé */}
              <footer
                role="contentinfo"
                className="border-t border-panel-border bg-panel p-4 text-center text-xs text-text-muted"
              >
                © {CURRENT_YEAR} Saint Seiya: Rebirth 2 (EX) Database — by{' '}
                <span className="text-foreground">@digsmartins</span>.
              </footer>
            </div>
          </div>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
