import Link from 'next/link'
import type { ServicioMeta } from '@/lib/types'

// Standalone interactive tools (CIDR calculator, VPC builder, ...) live outside
// the per-Servicio content tree, so they're listed here rather than derived
// from content/servicios like NavList below.
const TOOLS: { href: string; label: string }[] = [
  { href: '/herramientas/cidr', label: 'Calculadora de CIDR' },
  { href: '/herramientas/rutas', label: 'Simulador de tablas de rutas' },
  { href: '/herramientas/constructor-vpc', label: 'Constructor visual de VPC' },
]

function NavList({ servicios }: { servicios: ServicioMeta[] }) {
  return (
    <ul className="space-y-1">
      {servicios.map((servicio) => (
        <li key={servicio.id}>
          <Link
            href={`/servicios/${servicio.id}`}
            className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-black/5"
          >
            <span className="text-foreground/40">M{servicio.modulo}</span> {servicio.nombre}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function ToolsList() {
  return (
    <ul className="space-y-1">
      {TOOLS.map((tool) => (
        <li key={tool.href}>
          <Link href={tool.href} className="block rounded-md px-2 py-1.5 text-sm text-foreground/80 hover:bg-black/5">
            {tool.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function NavSections({ servicios }: { servicios: ServicioMeta[] }) {
  return (
    <>
      <p className="px-2 text-xs font-medium tracking-wide text-foreground/40 uppercase">Servicios del curso</p>
      <NavList servicios={servicios} />
      <p className="mt-6 px-2 text-xs font-medium tracking-wide text-foreground/40 uppercase">Herramientas</p>
      <ToolsList />
    </>
  )
}

/** No JS: <details> gives a free, accessible collapse on mobile; md: breakpoint switches to a static sidebar. */
export function SiteNav({ servicios }: { servicios: ServicioMeta[] }) {
  return (
    <>
      <details className="border-b border-border md:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-semibold">Curso AWS ▾</summary>
        <nav aria-label="Servicios del curso" className="space-y-1 px-4 pb-4">
          <NavSections servicios={servicios} />
        </nav>
      </details>

      <aside className="hidden shrink-0 border-r border-border px-4 py-8 md:block md:w-64">
        <Link href="/" className="px-2 font-semibold">
          Curso AWS
        </Link>
        <nav aria-label="Servicios del curso" className="mt-4 space-y-1">
          <NavSections servicios={servicios} />
        </nav>
      </aside>
    </>
  )
}
