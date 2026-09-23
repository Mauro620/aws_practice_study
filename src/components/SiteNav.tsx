'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { HERRAMIENTAS_TRANSVERSALES } from '@/lib/herramientas'
import type { ServicioMeta } from '@/lib/types'

type CourseModule = { id: string; label: string }

export const COURSE_MODULES: { category: string; modules: CourseModule[] }[] = [
  {
    category: 'Módulos del curso',
    modules: [
      { id: 'bienvenida', label: 'M1 Le damos la bienvenida a AWS Academy Cloud Architecting' },
      { id: 'well-architected', label: 'M2 Marco de AWS Well-Architected' },
      { id: 'vpc', label: 'M3 Amazon VPC (Virtual Private Cloud)' },
      { id: 'ec2', label: 'M4 Amazon EC2 (Elastic Compute Cloud)' },
      { id: 'iam', label: 'M5 Protección del acceso (AWS IAM)' },
      { id: 'elasticidad', label: 'M6 Elasticidad (Auto Scaling, Target Groups y CloudWatch)' },
      { id: 'cloudfront', label: 'M7 Entrega de contenido (CloudFront, HTTPS y S3)' },
    ],
  },
]

export function navLinkClassName(active: boolean) {
  return `block min-h-11 rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
    active
      ? 'bg-accent/10 font-semibold text-accent outline outline-1 outline-accent/30'
      : 'text-foreground/80 hover:bg-black/5'
  }`
}

function NavLink({ href, children, pathname }: { href: string; children: ReactNode; pathname: string | null }) {
  const active = pathname === href

  return (
    <Link href={href} className={navLinkClassName(active)} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  )
}

function LearningNav({ servicios, pathname }: { servicios: ServicioMeta[]; pathname: string | null }) {
  const availableServices = new Set(servicios.map(({ id }) => id))

  return (
    <nav aria-label="Contenido de aprendizaje" className="space-y-5">
      {COURSE_MODULES.map(({ category, modules }) => (
        <section key={category} aria-labelledby={category}>
          <h2 id={category} className="px-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">
            {category}
          </h2>
          <ul className="mt-1 space-y-1">
            {modules.map(({ id, label }) => (
              <li key={id}>
                {availableServices.has(id) && (
                  <NavLink href={`/servicios/${id}`} pathname={pathname}>
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section aria-labelledby="guia-transversal">
        <h2 id="guia-transversal" className="px-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">
          Guía transversal
        </h2>
        <ul className="mt-1 space-y-1">
          <li>
            <NavLink href="/guia-arquitectura" pathname={pathname}>
              Guía de arquitectura AWS
            </NavLink>
          </li>
          <li>
            <NavLink href="/arquitectura-referencia" pathname={pathname}>
              Arquitectura de referencia
            </NavLink>
          </li>
          {HERRAMIENTAS_TRANSVERSALES.map((herramienta) => (
            <li key={herramienta.href}>
              <NavLink href={herramienta.href} pathname={pathname}>
                {herramienta.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </section>
    </nav>
  )
}

/** Native details keeps the mobile menu usable without JavaScript-specific disclosure state. */
export function SiteNav({ servicios }: { servicios: ServicioMeta[] }) {
  const pathname = usePathname()

  return (
    <>
      <details className="border-b border-border md:hidden">
        <summary className="min-h-11 cursor-pointer list-none px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
          Curso AWS <span aria-hidden="true">▾</span>
        </summary>
        <div className="space-y-1 px-4 pb-4">
          <LearningNav servicios={servicios} pathname={pathname} />
        </div>
      </details>

      <aside className="hidden shrink-0 border-r border-border px-4 py-8 md:sticky md:top-0 md:block md:h-dvh md:max-h-dvh md:self-start md:w-64 md:overflow-y-auto">
        <NavLink href="/" pathname={pathname}>Curso AWS</NavLink>
        <div className="mt-4">
          <LearningNav servicios={servicios} pathname={pathname} />
        </div>
      </aside>
    </>
  )
}
