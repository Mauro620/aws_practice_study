'use client'

import { useMemo, useState } from 'react'
import {
  type TipoInstanciaParseado,
  familiasInstancia,
  parsearTipoInstancia,
} from '@/lib/ec2-instances'

const PROCESADOR_LEYENDA: Record<string, string> = {
  '': 'Intel (default cuando no hay letra)',
  a: 'AMD',
  g: 'AWS Graviton (ARM)',
  i: 'Intel (cuando hay que desambiguar de Graviton)',
}

const ATRIBUTO_LEYENDA: Record<string, string> = {
  d: 'Almacenamiento local NVMe (instance store)',
  n: 'Red mejorada (mayor ancho de banda)',
  e: 'Memoria o almacenamiento extendido',
  z: 'Alta frecuencia de reloj',
  b: 'Ancho de banda de EBS optimizado',
  flex: 'Rendimiento variable, más barato',
}

const EJEMPLOS = ['t3.micro', 'm7g.medium', 'm7gd.xlarge', 'c6in.4xlarge', 'r6i.2xlarge']

function descriptorProcesador(proc: string | null): string {
  if (proc === null) return 'Intel (default cuando no hay letra)'
  return PROCESADOR_LEYENDA[proc] ?? proc
}

function descriptorAtributo(a: string): string {
  return ATRIBUTO_LEYENDA[a] ?? a
}

export function Ec2InstanceExplorer() {
  const [input, setInput] = useState('m7gd.xlarge')

  const parsed = useMemo<TipoInstanciaParseado | null>(() => parsearTipoInstancia(input), [input])
  const familiaMatch = useMemo(
    () => (parsed ? familiasInstancia.find((f) => f.familia === parsed.familia) ?? null : null),
    [parsed]
  )

  return (
    <div className="not-prose space-y-8">
      <section>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tipo de instancia</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="m7gd.xlarge"
            className="w-72 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            spellCheck={false}
            autoCapitalize="off"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-foreground/50">Probá:</span>
          {EJEMPLOS.map((ej) => (
            <button
              key={ej}
              type="button"
              onClick={() => setInput(ej)}
              className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs hover:bg-black/5"
            >
              {ej}
            </button>
          ))}
        </div>
      </section>

      {parsed === null ? (
        <section role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm">
          No se pudo decodificar <span className="font-mono">{input.trim() || '(vacío)'}</span>. El formato
          esperado es <span className="font-mono">familia + generación + (procesador) + (atributos) . tamaño</span>,
          por ejemplo <span className="font-mono">m7gd.xlarge</span>.
        </section>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-semibold">Decodificado</h2>
            <div className="mt-3 overflow-hidden rounded-md border border-border bg-background">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-border/60">
                  <Fila label="Crudo" value={<span className="font-mono">{parsed.raw}</span>} />
                  <Fila
                    label="Familia"
                    value={
                      <span>
                        <span className="font-mono">{parsed.familia}</span>
                        {familiaMatch?.reglaMnemotecnica && (
                          <span className="ml-2 text-xs text-foreground/60">— {familiaMatch.reglaMnemotecnica}</span>
                        )}
                      </span>
                    }
                  />
                  <Fila label="Generación" value={<span className="font-mono">{parsed.generacion}</span>} />
                  <Fila
                    label="Procesador"
                    value={
                      <span>
                        <span className="font-mono">{parsed.procesador ?? '(ninguno)'}</span>{' '}
                        <span className="text-xs text-foreground/60">— {descriptorProcesador(parsed.procesador)}</span>
                      </span>
                    }
                  />
                  <Fila
                    label="Atributos"
                    value={
                      parsed.atributos.length === 0 ? (
                        <span className="text-foreground/50">(ninguno)</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {parsed.atributos.map((a) => (
                            <li key={a}>
                              <span className="font-mono">{a}</span>{' '}
                              <span className="text-xs text-foreground/60">— {descriptorAtributo(a)}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                  />
                  <Fila label="Tamaño" value={<span className="font-mono">{parsed.tamano}</span>} />
                </tbody>
              </table>
            </div>
          </section>

          {familiaMatch && (
            <section className="rounded-md border border-accent/40 bg-accent/10 p-4">
              <p className="text-xs font-medium text-accent">Familia {familiaMatch.familia}</p>
              <p className="mt-1 text-base font-semibold">{familiaMatch.categoria}</p>
              <p className="mt-1 text-sm text-foreground/80">
                <span className="font-medium">Perfil:</span> {familiaMatch.perfil}
              </p>
              <p className="mt-1 text-sm text-foreground/80">
                <span className="font-medium">Casos de uso:</span> {familiaMatch.casosDeUso}
              </p>
              {familiaMatch.ejemplos && (
                <p className="mt-1 text-sm text-foreground/60">
                  <span className="font-medium">Ejemplos:</span> <span className="font-mono">{familiaMatch.ejemplos}</span>
                </p>
              )}
            </section>
          )}
        </>
      )}

      <section>
        <h2 className="text-lg font-semibold">Referencia de familias</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Tabla del material del curso. Útil para decidir qué familia mirar antes de elegir tamaño.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/50">
                <th className="py-2 pr-3 font-medium">Familia</th>
                <th className="py-2 pr-3 font-medium">Categoría</th>
                <th className="py-2 pr-3 font-medium">Perfil</th>
                <th className="py-2 pr-3 font-medium">Casos de uso</th>
                <th className="py-2 font-medium">Ejemplos</th>
              </tr>
            </thead>
            <tbody>
              {familiasInstancia.map((f) => (
                <tr
                  key={f.familia}
                  className={
                    'border-b border-border/60 ' +
                    (parsed?.familia === f.familia ? 'bg-accent/10' : '')
                  }
                >
                  <td className="py-2 pr-3 font-mono font-semibold">{f.familia}</td>
                  <td className="py-2 pr-3 text-foreground/80">{f.categoria}</td>
                  <td className="py-2 pr-3 text-foreground/70">{f.perfil}</td>
                  <td className="py-2 pr-3 text-foreground/70">{f.casosDeUso}</td>
                  <td className="py-2 font-mono text-foreground/70">{f.ejemplos || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Fila({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <th scope="row" className="w-32 bg-black/[0.02] px-3 py-2 text-left align-top text-xs font-medium text-foreground/60">
        {label}
      </th>
      <td className="px-3 py-2">{value}</td>
    </tr>
  )
}
