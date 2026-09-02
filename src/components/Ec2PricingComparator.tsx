'use client'

import { useMemo, useState } from 'react'
import {
  type EntradasComparador,
  type ModeloCompra,
  type TipoCarga,
  type ToleranciaInterrupcion,
  TODOS_LOS_MODELOS,
  DESCRIPCIONES,
  compararModelos,
  calcularCostoMensual,
} from '@/lib/ec2-pricing'

const CARGAS: { value: TipoCarga; label: string }[] = [
  { value: 'estable', label: 'Carga estable (web server, app 24/7)' },
  { value: 'impredecible', label: 'Carga impredecible (dev, pruebas)' },
  { value: 'batch-ci', label: 'Batch / CI / render (tolerante a fallos)' },
  { value: 'ml-training', label: 'Entrenamiento ML (tolerante a fallos)' },
  { value: 'regulada', label: 'Carga regulada (BYOL, cumplimiento)' },
]

const TOLERANCIAS: { value: ToleranciaInterrupcion; label: string }[] = [
  { value: 'mission-critical', label: 'Crítica — no puede caerse' },
  { value: 'best-effort', label: 'Best-effort — puede tolerar interrupciones' },
  { value: 'none', label: 'No tolera interrupciones' },
]

export function Ec2PricingComparator() {
  const [precioTexto, setPrecioTexto] = useState('0.10')
  const [horas, setHoras] = useState(730)
  const [tipoCarga, setTipoCarga] = useState<TipoCarga>('estable')
  const [tolerancia, setTolerancia] = useState<ToleranciaInterrupcion>('mission-critical')
  const [descuentoPct, setDescuentoPct] = useState(50) // aplica a SP/RI/Spot

  // Dedicated usa el mismo input como recargo (no descuento)
  const [recargoPct, setRecargoPct] = useState(30)

  const precio = useMemo<number | null>(() => {
    const n = Number(precioTexto.replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) return null
    return n
  }, [precioTexto])

  const entradasEstable: EntradasComparador = useMemo(
    () => ({
      precioOnDemandPorHoraUSD: precio,
      horasPorMes: horas,
      tipoCarga,
      tolerancia,
    }),
    [precio, horas, tipoCarga, tolerancia],
  )

  const resultadosCompromiso = useMemo(
    () =>
      compararModelos(
        TODOS_LOS_MODELOS.filter((m) => m !== 'dedicated-instance' && m !== 'dedicated-host'),
        { ...entradasEstable, descuentoCompromisoPct: descuentoPct },
      ),
    [entradasEstable, descuentoPct],
  )

  const resultadosDedicated = useMemo(
    () =>
      compararModelos(
        TODOS_LOS_MODELOS.filter((m) => m === 'dedicated-instance' || m === 'dedicated-host'),
        { ...entradasEstable, descuentoCompromisoPct: recargoPct },
      ),
    [entradasEstable, recargoPct],
  )

  // Referencia: el más barato aplicable
  const masBarato = useMemo<ModeloCompra | null>(() => {
    let mejor: { modelo: ModeloCompra; costo: number } | null = null
    for (const m of TODOS_LOS_MODELOS) {
      const r = calcularCostoMensual(m, {
        ...entradasEstable,
        descuentoCompromisoPct: m === 'dedicated-instance' || m === 'dedicated-host' ? recargoPct : descuentoPct,
      })
      if (!r.aplicable || r.costoMensualUSD === null) continue
      if (!mejor || r.costoMensualUSD < mejor.costo) {
        mejor = { modelo: m, costo: r.costoMensualUSD }
      }
    }
    return mejor?.modelo ?? null
  }, [entradasEstable, descuentoPct, recargoPct])

  return (
    <div className="not-prose space-y-8">
      <section className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Sobre los precios por hora</p>
        <p className="mt-1">
          El material del curso no lista precios por instancia (cambian por región y por hora). Ingresá el{' '}
          <span className="font-medium">precio On-Demand por hora</span> que veas en la{' '}
          <a
            href="https://aws.amazon.com/ec2/pricing/on-demand/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            consola de precios de EC2
          </a>{' '}
          para tu tipo de instancia y región. El calculador respeta exactamente ese número.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Tu carga</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Define cómo es la carga. Algunas opciones dejan modelos fuera automáticamente (p. ej. Spot no aplica a
          cargas críticas).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo label="Precio On-Demand por hora (USD)">
            <input
              value={precioTexto}
              onChange={(e) => setPrecioTexto(e.target.value)}
              placeholder="0.10"
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              spellCheck={false}
            />
          </Campo>
          <Campo label="Horas por mes (máx. 730)">
            <input
              type="number"
              min={0}
              max={730}
              value={horas}
              onChange={(e) => setHoras(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
            />
          </Campo>
          <Campo label="Tipo de carga">
            <select
              value={tipoCarga}
              onChange={(e) => setTipoCarga(e.target.value as TipoCarga)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {CARGAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tolerancia a interrupciones">
            <select
              value={tolerancia}
              onChange={(e) => setTolerancia(e.target.value as ToleranciaInterrupcion)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {TOLERANCIAS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Modelos con descuento</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Savings Plans, Reserved Instances y Spot son los tres modelos donde pagás menos que On-Demand. Movés la
          barra y ves el efecto.
        </p>
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/60">
              Descuento aplicado: {descuentoPct}%
            </span>
            <input
              type="range"
              min={0}
              max={90}
              value={descuentoPct}
              onChange={(e) => setDescuentoPct(Number(e.target.value))}
              className="w-full max-w-md"
            />
            <span className="mt-1 block text-xs text-foreground/50">
              Savings Plans / RI clipean al 72%. Spot clipea al 90%. Si te pasás del máximo, ves el tope.
            </span>
          </label>
        </div>

        <TarjetasModelos resultados={resultadosCompromiso} esRecargo={false} precioPorHora={precio} />
      </section>

      <section>
        <h2 className="text-lg font-semibold">Modelos con recargo</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Dedicated Instance y Dedicated Host son para cumplimiento normativo y BYOL. El material no da un
          porcentaje exacto de recargo; ingresás el que veas en la consola para tu tipo de host.
        </p>
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/60">
              Recargo estimado: {recargoPct}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={recargoPct}
              onChange={(e) => setRecargoPct(Number(e.target.value))}
              className="w-full max-w-md"
            />
          </label>
        </div>

        <TarjetasModelos resultados={resultadosDedicated} esRecargo={true} precioPorHora={precio} />
      </section>

      {masBarato && (
        <section className="rounded-md border border-accent/40 bg-accent/10 p-4">
          <p className="text-xs font-medium text-accent">Más barato aplicable</p>
          <p className="mt-1 text-xl font-semibold">
            {DESCRIPCIONES[masBarato].nombre}: $
            {resultadosCompromiso[masBarato]?.costoMensualUSD ??
              resultadosDedicated[masBarato]?.costoMensualUSD}{' '}
            /mes
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            Dado tu tipo de carga y tolerancia, este es el modelo aplicable con menor costo mensual estimado.
          </p>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Cuándo usar cada modelo</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Tabla del material del curso (sección 6.5). El descuento máximo de cada modelo es del material —
          cualquier precio por hora tiene que venir de la consola de AWS.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground/50">
                <th className="py-2 pr-3 font-medium">Modelo</th>
                <th className="py-2 pr-3 font-medium">Descuento máx.</th>
                <th className="py-2 pr-3 font-medium">Compromiso</th>
                <th className="py-2 pr-3 font-medium">Cuándo</th>
                <th className="py-2 font-medium">Trampa</th>
              </tr>
            </thead>
            <tbody>
              {TODOS_LOS_MODELOS.map((m) => {
                const d = DESCRIPCIONES[m]
                return (
                  <tr key={m} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{d.nombre}</td>
                    <td className="py-2 pr-3 font-mono">
                      {d.descuentoMaximoVsOnDemandPct > 0 ? `${d.descuentoMaximoVsOnDemandPct}%` : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {d.compromisoPorDefecto === 'none'
                        ? 'Ninguno'
                        : d.compromisoPorDefecto === '1-year'
                          ? '1 o 3 años'
                          : '1 o 3 años'}
                    </td>
                    <td className="py-2 pr-3 text-foreground/70">{d.casosDeUso.join(', ')}</td>
                    <td className="py-2 text-foreground/70">{d.trampa}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function TarjetasModelos({
  resultados,
  esRecargo,
  precioPorHora,
}: {
  resultados: ReturnType<typeof compararModelos>
  esRecargo: boolean
  precioPorHora: number | null
}) {
  const modelos = Object.keys(resultados) as ModeloCompra[]
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modelos.map((m) => {
        const r = resultados[m]
        const d = DESCRIPCIONES[m]
        return (
          <article
            key={m}
            className={
              'rounded-md border p-4 text-sm ' +
              (!r.aplicable
                ? 'border-border/40 bg-black/[0.02] text-foreground/60'
                : esRecargo
                  ? 'border-red-200 bg-red-50'
                  : 'border-accent/30 bg-accent/5')
            }
          >
            <h3 className="font-semibold">{d.nombre}</h3>
            <p className="mt-1 text-xs text-foreground/70">{d.resumen}</p>
            {!r.aplicable ? (
              <p className="mt-3 text-xs italic">{r.noAplicableRazon}</p>
            ) : r.costoMensualUSD === null ? (
              <p className="mt-3 font-mono text-foreground/50">
                — USD/mes (ingresá un precio por hora)
              </p>
            ) : (
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                ${r.costoMensualUSD.toFixed(2)}
                <span className="ml-1 text-xs font-normal text-foreground/60">USD/mes</span>
              </p>
            )}
            {precioPorHora && r.aplicable && r.costoMensualUSD !== null && (
              <p className="mt-1 text-xs text-foreground/60">
                Base On-Demand sin descuento: ${(precioPorHora * Math.min(r.costoMensualUSD > 0 ? 730 : 0)).toFixed(2)}{' '}
                aproximada para un mes de 730 h.
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/60">{label}</span>
      {children}
    </label>
  )
}
