import { Bell } from 'lucide-react'
import { UserMenuTrigger } from './UserMenuTrigger'

type Props = { email: string }

export function DashboardHeader({ email }: Props) {
  return (
    <header className="safe-top sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
      <div className="flex h-12 items-center justify-between px-4">
        <UserMenuTrigger email={email} />
        <button
          type="button"
          aria-label="Notificaciones"
          disabled
          className="grid size-9 place-items-center rounded-full text-muted-foreground disabled:cursor-not-allowed"
        >
          <Bell className="size-4.5" strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
