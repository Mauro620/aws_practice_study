import Link from 'next/link'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { HERRAMIENTAS_POR_SERVICIO } from '@/lib/herramientas'
import { MDX_OPTIONS } from '@/lib/mdx-options'
import type { Servicio } from '@/lib/types'
import { CidrCalculator } from './CidrCalculator'
import { NivelSelector } from './NivelSelector'
import { VpcBuilder } from './VpcBuilder'
import { VpcReferenceDiagram } from './VpcReferenceDiagram'

const MDX_COMPONENTS = { VpcReferenceDiagram, CidrCalculator, VpcBuilder }

export async function ServicioView({ servicio }: { servicio: Servicio }) {
  const herramientas = HERRAMIENTAS_POR_SERVICIO[servicio.id] ?? []
  const niveles = await Promise.all(
    servicio.niveles.map(async (nivel) => ({
      numero: nivel.numero,
      titulo: nivel.titulo,
      node: <MDXRemote source={nivel.contenido} components={MDX_COMPONENTS} options={MDX_OPTIONS} />,
    })),
  )

  return (
    <article className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <p className="text-sm font-medium text-accent">
        Módulo {servicio.modulo} · {servicio.categoria}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{servicio.nombre}</h1>
      <p className="mt-3 text-lg text-foreground/70">{servicio.resumenUnaLinea}</p>

      <div className="prose prose-slate mt-8 max-w-none">
        <NivelSelector niveles={niveles} />
      </div>

      {herramientas.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Herramientas relacionadas</h2>
          <p className="mt-2 text-foreground/70">Practicá lo que acabás de leer con estas herramientas interactivas.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {herramientas.map((herramienta) => (
              <li key={herramienta.href}>
                <Link
                  href={herramienta.href}
                  className="block min-h-11 rounded-md border border-border p-4 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span className="font-medium text-accent">{herramienta.label}</span>
                  <p className="mt-1 text-sm text-foreground/70">{herramienta.descripcion}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {servicio.erroresFrecuentes.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Errores frecuentes</h2>
          <ul className="mt-4 space-y-2">
            {servicio.erroresFrecuentes.map((error) => (
              <li key={error.descripcion} className="flex gap-3 text-foreground/80">
                <span aria-hidden className="text-accent">
                  —
                </span>
                {error.descripcion}
              </li>
            ))}
          </ul>
        </section>
      )}

      {servicio.glosario.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">Glosario</h2>
          <dl className="mt-4 divide-y divide-border">
            {servicio.glosario.map((termino) => (
              <div key={termino.termino} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="font-medium">{termino.termino}</dt>
                <dd className="text-foreground/70">{termino.definicion}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </article>
  )
}
