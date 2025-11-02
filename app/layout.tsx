import './globals.css'
import { ReactNode } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { LanguageProvider } from '@/context/LanguageContext'

export const metadata = {
  title: 'Saint Seiya Rebirth 2 (EX)',
  description: 'Visualizador de dados de heróis e habilidades.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <body className="bg-[var(--background)] text-[var(--foreground)]">
        <LanguageProvider>
          <div className="min-h-screen flex flex-col">
            <header className="p-4 border-b border-[var(--panel-border)] bg-[var(--panel)]">
              <h1 className="text-xl font-bold">Saint Seiya Rebirth 2 (EX)</h1>
            </header>

            <div className="flex flex-1 container mx-auto gap-6 p-4">
              <div>
                <Sidebar />
              </div>
              <main className="flex-1">{children}</main>
            </div>

            <footer className="p-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--panel-border)] bg-[var(--panel)]">
              &copy; {new Date().getFullYear()} Game Data Viewer
            </footer>
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}
