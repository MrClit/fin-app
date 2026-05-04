import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px] min-h-screen overflow-clip bg-background">
      <main className="pb-[90px] animate-fade-in">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
