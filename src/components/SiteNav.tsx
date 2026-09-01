import Link from 'next/link'
import type { ServicioMeta } from '@/lib/types'

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

/** No JS: <details> gives a free, accessible collapse on mobile; md: breakpoint switches to a static sidebar. */
export function SiteNav({ servicios }: { servicios: ServicioMeta[] }) {
  return (
    <>
      <details className="border-b border-border md:hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-semibold">Curso AWS ▾</summary>
        <nav aria-label="Servicios del curso" className="px-4 pb-4">
          <NavList servicios={servicios} />
        </nav>
      </details>

      <aside className="hidden shrink-0 border-r border-border px-4 py-8 md:block md:w-64">
        <Link href="/" className="px-2 font-semibold">
          Curso AWS
        </Link>
        <nav aria-label="Servicios del curso" className="mt-4">
          <NavList servicios={servicios} />
        </nav>
      </aside>
    </>
  )
}
