import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { SiteNav } from '@/components/SiteNav'
import { getAllServicios } from '@/lib/content'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Curso AWS — Estudio activo',
  description: 'App de estudio para AWS Academy Cloud Architecting',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const servicios = getAllServicios()

  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col md:flex-row">
        <SiteNav servicios={servicios} />
        <main className="min-w-0 flex-1">{children}</main>
      </body>
    </html>
  )
}
