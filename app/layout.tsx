import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AuthVault — 2FA Authenticator',
  description: 'Autenticador TOTP seguro para tus cuentas',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AuthVault' },
}

export const viewport: Viewport = {
  themeColor: '#080c10',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  )
}
