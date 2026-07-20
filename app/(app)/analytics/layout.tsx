import { AnalyticsProvider } from '@/components/analytics/AnalyticsContext'

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
