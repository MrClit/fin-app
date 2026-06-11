import { notFound } from 'next/navigation'
import { CATEGORY_META } from '@/lib/theme'
import type { CategoryId } from '@/types'
import CategoryDetailClient from '@/components/analytics/CategoryDetailClient'

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!(id in CATEGORY_META)) notFound()
  return <CategoryDetailClient categoryId={id as CategoryId} />
}
