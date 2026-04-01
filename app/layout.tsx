import './globals.css'
import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { LanguageProvider } from '@/context/LanguageContext'
import { QueryProvider } from '@/components/QueryProvider'

export const metadata = {
  title: 'Saint Seiya: Rebirth 2 (EX)',
  description: 'Hero and skill database viewer for Saint Seiya: Rebirth 2 (EX).',
}

const CURRENT_YEAR = new Date().getFullYear()

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[var(--background)] text-[var(--foreground)] antialiased">
        <LanguageProvider>
          <QueryProvider>
          <div className="flex min-h-screen overflow-hidden bg-[var(--background)]">
            {/* 🔹 Sidebar fixa em telas grandes / retrátil em telas pequenas */}
            <Sidebar />

            {/* 🔹 Conteúdo principal */}
            <div className="flex flex-col flex-1 h-screen overflow-hidden lg:ml-[var(--sidebar-width)] bg-[var(--background)]">


              {/* Cabeçalho */}
              <header
                role="banner"
                className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)] bg-[var(--panel)] shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              >
                <p>Saint Seiya: Rebirth 2 (EX) Database</p>
              </header>

              {/* Conteúdo central */}
              <main role="main" className="flex-1 overflow-y-auto p-6 bg-[var(--background)]">
                <div className="max-w-6xl mx-auto space-y-8">{children}</div>
              </main>

              {/* Rodapé */}
              <footer
                role="contentinfo"
                className="p-4 text-center text-xs text-[var(--text-muted)] border-t border-[var(--panel-border)] bg-[var(--panel)]"
              >
                © {CURRENT_YEAR} Saint Seiya: Rebirth 2 (EX) Database — by{' '}
                <span className="text-[var(--foreground)]">@digsmartins</span>.
              </footer>
            </div>
          </div>
          </QueryProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
