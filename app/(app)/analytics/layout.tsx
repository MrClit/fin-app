import { AnalyticsProvider } from '@/contexts/AnalyticsContext'

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <AnalyticsProvider>{children}</AnalyticsProvider>
}
