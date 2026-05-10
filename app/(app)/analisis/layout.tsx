import { AnalyticsProvider } from '@/contexts/AnalyticsContext'

export default function AnalisisLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
