'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, LogOut, User, UserCircle2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { signOut } from '@/app/actions/auth'

type Props = { email: string }

export function UserMenuTrigger({ email }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const initial = email.trim().charAt(0).toUpperCase()

  function go(path: string) {
    setOpen(false)
    router.push(path)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Abrir menú de usuario"
            className="grid size-9 place-items-center rounded-full border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {initial || <User className="size-4.5" strokeWidth={2} />}
          </button>
        }
      />
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <SheetHeader className="flex flex-row items-center gap-3 pt-3">
          <div
            className="grid size-10 place-items-center rounded-full text-base font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {initial || <UserCircle2 className="size-5" />}
          </div>
          <div className="flex flex-col gap-0.5 text-left">
            <SheetTitle className="text-sm">Tu cuenta</SheetTitle>
            <SheetDescription className="text-xs">{email || 'Sin email'}</SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-2 pb-2">
          <button
            type="button"
            onClick={() => go('/onboarding')}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <User className="size-4.5 text-muted-foreground" strokeWidth={2} />
            Ver onboarding
          </button>

          <button
            type="button"
            onClick={() => go('/onboarding')}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Building2 className="size-4.5 text-muted-foreground" strokeWidth={2} />
            Conectar otro banco
          </button>

          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4.5" strokeWidth={2} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
