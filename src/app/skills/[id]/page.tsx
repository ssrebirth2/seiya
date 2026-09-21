import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ lang?: string }>
}

/**
 * Skills live in a single-page index. Detail URLs (changelog / old links)
 * redirect to `/skills?open={id}` which expands the matching row.
 */
export default async function SkillDetailRedirectPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { lang } = await searchParams
  const qs = new URLSearchParams()
  qs.set('open', id)
  if (lang) qs.set('lang', lang)
  redirect(`/skills?${qs.toString()}`)
}
