'use client'

import { useState } from 'react'
import { LogOut, User, UserCircle2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { signOut } from '@/app/actions/auth'
import { ThemeToggle } from '@/components/theme-toggle'

type Props = { email: string; avatarUrl?: string | null; fullName?: string | null }

export function UserMenuTrigger({ email, avatarUrl, fullName }: Props) {
  const [open, setOpen] = useState(false)
  // Si la imagen remota (avatar de Google) falla o la bloquea una extensión,
  // se cae a la inicial en vez de dejar el círculo vacío.
  const [imgError, setImgError] = useState(false)
  const initial = (fullName?.trim() || email.trim()).charAt(0).toUpperCase()
  const showAvatar = Boolean(avatarUrl) && !imgError

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label="Abrir menú de usuario"
            className="grid size-9 place-items-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar remoto de Google, sin optimización de next/image
              <img
                src={avatarUrl!}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="size-full object-cover"
              />
            ) : (
              initial || <User className="size-4.5" strokeWidth={2} />
            )}
          </button>
        }
      />
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
      >
        <SheetHeader className="flex flex-row items-center gap-3 pt-3">
          <div
            className="grid size-10 place-items-center overflow-hidden rounded-full text-base font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {showAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar remoto de Google, sin optimización de next/image
              <img
                src={avatarUrl!}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="size-full object-cover"
              />
            ) : (
              initial || <UserCircle2 className="size-5" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 text-left">
            <SheetTitle className="text-sm">{fullName || 'Tu cuenta'}</SheetTitle>
            <SheetDescription className="text-xs">{email || 'Sin email'}</SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-2 pb-2">
          <ThemeToggle />
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

        <p className="px-3 pt-1 text-center text-xs text-muted-foreground">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </p>
      </SheetContent>
    </Sheet>
  )
}
