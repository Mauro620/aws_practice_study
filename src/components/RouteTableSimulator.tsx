'use client'

import { useMemo, useState } from 'react'
import { type Ruta, type ResultadoEvaluacion, evaluarPaquete } from '@/lib/route-tables'

const RUTAS_INICIALES: Ruta[] = [
  { id: 'rt-local', destino: '10.0.0.0/16', target: 'local', descripcion: 'Tráfico dentro de la VPC' },
  { id: 'rt-subred-app', destino: '10.0.1.0/24', target: 'eni-app', descripcion: 'Subred de aplicación' },
  { id: 'rt-subred-db', destino: '10.0.2.0/24', target: 'eni-db', descripcion: 'Subred de base de datos' },
  { id: 'rt-vpc-peer', destino: '172.16.0.0/12', target: 'pcx-1', descripcion: 'VPC peered' },
  { id: 'rt-default', destino: '0.0.0.0/0', target: 'igw-1', descripcion: 'Internet Gateway (default)' },
]

function siguienteId(tabla: Ruta[]): string {
  const n = tabla.length + 1
  return `rt-${n}-${Date.now().toString(36)}`
}

function formatPrefijo(p: number): string {
  return `/${p}`
}

export function RouteTableSimulator() {
  const [tabla, setTabla] = useState<Ruta[]>(RUTAS_INICIALES)
  const [destinoIp, setDestinoIp] = useState('10.0.1.42')

  const resultado: ResultadoEvaluacion = useMemo(() => evaluarPaquete(tabla, destinoIp), [tabla, destinoIp])

  const ipValida = useMemo(() => {
    const partes = destinoIp.trim().split('.')
    if (partes.length !== 4) return false
    return partes.every((p) => {
      const n = Number(p)
      return Number.isInteger(n) && n >= 0 && n <= 255 && p.length > 0
    })
  }, [destinoIp])

  function actualizar(id: string, campo: keyof Omit<Ruta, 'id'>, valor: string) {
    setTabla((prev) => prev.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)))
  }

  function agregarRuta() {
    setTabla((prev) => [...prev, { id: siguienteId(prev), destino: '0.0.0.0/0', target: 'igw-?', descripcion: '' }])
  }

  function eliminarRuta(id: string) {
    setTabla((prev) => prev.filter((r) => r.id !== id))
  }

  function restablecer() {
    setTabla(RUTAS_INICIALES)
    setDestinoIp('10.0.1.42')
  }

  return (
    <div className="not-prose space-y-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Tabla de rutas</h2>
            <p className="text-sm text-foreground/60">
              Evaluada de arriba hacia abajo: gana el prefijo más largo. Editá una fila para ver cómo cambia el
              resultado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={agregarRuta}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
            >
              Agregar ruta
            </button>
            <button
              type="button"
              onClick={restablecer}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
            >
              Restablecer
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[46rem] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/50">
                <th className="py-2 pr-3 font-medium">Destino (CIDR)</th>
                <th className="py-2 pr-3 font-medium">Target</th>
                <th className="py-2 pr-3 font-medium">Descripción</th>
                <th className="py-2 font-medium" aria-label="Acciones"></th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((ruta, idx) => {
                const esGanadora = resultado.ganadora?.id === ruta.id
                const esCandidata = resultado.candidatas.some((c) => c.ruta.id === ruta.id)
                return (
                  <tr
                    key={ruta.id}
                    className={
                      'border-b border-border/60 ' +
                      (esGanadora ? 'bg-accent/15' : esCandidata ? 'bg-accent/5' : '')
                    }
                  >
                    <td className="py-1.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-right text-xs text-foreground/40">{idx + 1}</span>
                        <input
                          value={ruta.destino}
                          onChange={(e) => actualizar(ruta.id, 'destino', e.target.value)}
                          placeholder="10.0.0.0/16"
                          className="w-40 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm outline-none focus:border-accent"
                          aria-label={`Destino de la ruta ${idx + 1}`}
                        />
                      </div>
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        value={ruta.target}
                        onChange={(e) => actualizar(ruta.id, 'target', e.target.value)}
                        className="w-32 rounded-md border border-border bg-background px-2 py-1 font-mono text-sm outline-none focus:border-accent"
                        aria-label={`Target de la ruta ${idx + 1}`}
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <input
                        value={ruta.descripcion}
                        onChange={(e) => actualizar(ruta.id, 'descripcion', e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm outline-none focus:border-accent"
                        aria-label={`Descripción de la ruta ${idx + 1}`}
                      />
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => eliminarRuta(ruta.id)}
                        className="rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-black/5 hover:text-red-700"
                        aria-label={`Eliminar ruta ${idx + 1}`}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">IP destino del paquete</span>
          <input
            value={destinoIp}
            onChange={(e) => setDestinoIp(e.target.value)}
            placeholder="10.0.1.42"
            className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            aria-invalid={!ipValida}
          />
        </label>

        {!ipValida && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            La IP destino no es un IPv4 válido.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Resultado</h2>

        {ipValida && resultado.ganadora && (
          <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 p-4">
            <p className="text-sm text-foreground/70">Gana esta ruta (prefijo más largo):</p>
            <p className="mt-1 font-mono text-base">
              {resultado.ganadora.destino} → {resultado.ganadora.target}
            </p>
            {resultado.ganadora.descripcion && (
              <p className="mt-1 text-sm text-foreground/70">{resultado.ganadora.descripcion}</p>
            )}
          </div>
        )}

        {ipValida && !resultado.ganadora && (
          <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-4">
            <p className="text-sm">
              Ninguna ruta matchea. Sin <code className="font-mono">0.0.0.0/0</code>, AWS descarta el paquete
              (blackhole).
            </p>
          </div>
        )}

        {ipValida && resultado.candidatas.length > 1 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-foreground/70">Por qué ganó esa y no las otras</h3>
            <ol className="mt-2 space-y-1.5 text-sm">
              {resultado.candidatas.map((c) => (
                <li
                  key={c.ruta.id}
                  className={
                    'flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 ' +
                    (c.ruta.id === resultado.ganadora?.id
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-border/60 bg-background')
                  }
                >
                  <span className="font-mono">
                    {c.ruta.destino} → {c.ruta.target}
                  </span>
                  <span className="text-xs text-foreground/60">
                    prefijo {formatPrefijo(c.prefijo)}
                    {c.ruta.id === resultado.ganadora?.id ? ' · más específica' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <FlujoPaquete ganador={resultado.ganadora} ipValida={ipValida} destinoIp={destinoIp} />
      </section>
    </div>
  )
}

function FlujoPaquete({ ganador, ipValida, destinoIp }: { ganador: Ruta | null; ipValida: boolean; destinoIp: string }) {
  if (!ipValida) {
    return (
      <p className="mt-4 text-sm text-foreground/60">Ingresá una IP destino válida para ver el diagrama.</p>
    )
  }

  return (
    <div className="mt-6 rounded-md border border-border bg-background p-4">
      <p className="text-sm font-medium text-foreground/70">Diagrama del flujo</p>
      <svg viewBox="0 0 600 140" className="mt-2 w-full" role="img" aria-label="Diagrama del flujo del paquete">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#8a5a2b" />
          </marker>
        </defs>

        <rect x="10" y="50" width="110" height="40" rx="6" fill="#fff" stroke="#8a5a2b" strokeWidth="1.5" />
        <text x="65" y="68" textAnchor="middle" fontSize="12" fill="#1c1a17">Instancia</text>
        <text x="65" y="82" textAnchor="middle" fontSize="10" fill="#1c1a17" opacity="0.6">origen</text>

        <rect x="200" y="50" width="200" height="40" rx="6" fill="#fff" stroke="#8a5a2b" strokeWidth="1.5" />
        <text x="300" y="68" textAnchor="middle" fontSize="12" fill="#1c1a17">Tabla de rutas</text>
        <text x="300" y="82" textAnchor="middle" fontSize="10" fill="#1c1a17" opacity="0.6">longest prefix match</text>

        <rect x="480" y="20" width="110" height="40" rx="6" fill="#fff" stroke="#8a5a2b" strokeWidth="1.5" />
        <text x="535" y="38" textAnchor="middle" fontSize="12" fill="#1c1a17">{ganador?.target ?? '—'}</text>
        <text x="535" y="52" textAnchor="middle" fontSize="10" fill="#1c1a17" opacity="0.6">{ganador?.descripcion || 'target'}</text>

        <rect x="480" y="80" width="110" height="40" rx="6" fill="#fff" stroke="#bbb" strokeWidth="1" strokeDasharray="4 3" />
        <text x="535" y="98" textAnchor="middle" fontSize="12" fill="#999">blackhole</text>
        <text x="535" y="112" textAnchor="middle" fontSize="10" fill="#999">descartado</text>

        <line x1="120" y1="70" x2="195" y2="70" stroke="#8a5a2b" strokeWidth="1.5" markerEnd="url(#arrow)" />

        {ganador ? (
          <>
            <line
              x1="400"
              y1="65"
              x2="475"
              y2="42"
              stroke="#8a5a2b"
              strokeWidth="1.5"
              markerEnd="url(#arrow)"
            />
            <text x="437" y="48" textAnchor="middle" fontSize="10" fill="#1c1a17" opacity="0.7">
              match → {destinoIp}
            </text>
          </>
        ) : (
          <>
            <line
              x1="400"
              y1="75"
              x2="475"
              y2="100"
              stroke="#999"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd="url(#arrow)"
            />
            <text x="437" y="95" textAnchor="middle" fontSize="10" fill="#999">sin match</text>
          </>
        )}
      </svg>
    </div>
  )
}
