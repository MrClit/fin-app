import { ThemeToggle } from '@/components/theme-toggle'

export default function HomePage() {
  return (
    <div className="px-6 pt-14 flex flex-col gap-4">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <p className="text-muted-foreground text-sm">Dashboard — próximamente</p>
    </div>
  )
}
