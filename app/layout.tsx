import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeColorSync } from '@/components/theme-color-sync'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: {
    default: 'Finanzas',
    template: '%s · Finanzas',
  },
  description: 'App de gestión financiera personal',
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    // `black-translucent`: el contenido se dibuja bajo la status bar y iOS ajusta
    // solo el color de los iconos (hora/batería) según el fondo. El color de la
    // franja lo define el elemento fijo `StatusBarBackdrop` (ver más abajo), no el
    // `<meta theme-color>` (Safari ya no lo usa en standalone).
    statusBarStyle: 'black-translucent',
    title: 'Finanzas',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={dmSans.variable} suppressHydrationWarning>
      <body className="min-h-full antialiased">
        {/*
          Franja de la status bar (PWA iOS standalone). Safari muestrea el color
          de un elemento `position: fixed` superior; al pintarlo con `--background`
          (color sólido vía variable CSS) la franja coincide con el fondo y se
          actualiza en vivo al alternar tema. Solo color sólido — gradientes/imagen
          no funcionan.
        */}
        <div
          aria-hidden
          className="fixed inset-x-0 top-0 z-50 h-[env(safe-area-inset-top)] bg-background"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ThemeColorSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
