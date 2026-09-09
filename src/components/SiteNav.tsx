'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { ServicioMeta } from '@/lib/types'

type CourseModule = { id: string; label: string }

export const COURSE_MODULES: { category: string; modules: CourseModule[] }[] = [
  {
    category: 'Módulos AWS Cloud Architecture',
    modules: [
      { id: 'bienvenida', label: 'M1 Le damos la bienvenida a AWS Academy Cloud Architecting' },
      { id: 'well-architected', label: 'M2 Marco de AWS Well-Architected' },
      { id: 'iam', label: 'M3 Protección del acceso (AWS IAM)' },
    ],
  },
  {
    category: 'Recursos de clase/servicios en nube',
    modules: [
      { id: 'vpc', label: 'M1 Amazon VPC (Virtual Private Cloud)' },
      { id: 'ec2', label: 'M2 Amazon EC2 (Elastic Compute Cloud)' },
    ],
  },
]

type Lab = { href: string; label: string }

export const LAB_GROUPS: { label: string; items: Lab[] }[] = [
  {
    label: 'Red y conectividad',
    items: [
      { href: '/herramientas/cidr', label: 'Calculadora de CIDR' },
      { href: '/herramientas/constructor-vpc', label: 'Constructor visual de VPC' },
      { href: '/herramientas/rutas', label: 'Simulador de tablas de rutas' },
    ],
  },
  {
    label: 'Cómputo y seguridad',
    items: [
      { href: '/herramientas/ec2', label: 'Explorador de tipos de instancia EC2' },
      { href: '/herramientas/sg-nacl', label: 'Verificador SG vs NACL' },
      { href: '/herramientas/iam', label: 'Evaluador de políticas IAM' },
    ],
  },
  {
    label: 'Práctica y costos',
    items: [
      { href: '/herramientas/comparador-costos', label: 'Comparador de costos EC2' },
      { href: '/herramientas/motor-practica', label: 'Motor de práctica tipo examen' },
    ],
  },
]

export const LABS = LAB_GROUPS.flatMap(({ items }) => items)

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
        </ul>
      </section>
    </nav>
  )
}

function LabsNav({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Laboratorios interactivos" className="mt-6 space-y-2">
      <h2 className="px-2 text-xs font-medium tracking-wide text-foreground/50 uppercase">Laboratorios interactivos</h2>
      {LAB_GROUPS.map(({ label, items }) => {
        const active = items.some((item) => item.href === pathname)

        return (
          <details key={label} open={active} aria-label={label} className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-md px-2 py-2 text-sm font-medium text-foreground/80 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
              <span className="mr-2 text-foreground/45 transition-transform group-open:rotate-90" aria-hidden="true">›</span>
              {label}
            </summary>
            <ul className="mt-1 ml-4 space-y-1 border-l border-border pl-2">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} pathname={pathname}>{item.label}</NavLink>
                </li>
              ))}
            </ul>
          </details>
        )
      })}
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
          <LabsNav pathname={pathname} />
        </div>
      </details>

      <aside className="hidden shrink-0 border-r border-border px-4 py-8 md:sticky md:top-0 md:block md:h-dvh md:max-h-dvh md:self-start md:w-64 md:overflow-y-auto">
        <NavLink href="/" pathname={pathname}>Curso AWS</NavLink>
        <div className="mt-4">
          <LearningNav servicios={servicios} pathname={pathname} />
          <LabsNav pathname={pathname} />
        </div>
      </aside>
    </>
  )
}
