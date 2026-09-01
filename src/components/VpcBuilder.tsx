'use client'

import { useId, useState } from 'react'
import {
  AZS_DISPONIBLES,
  clasificarSubred,
  evaluarVpc,
  type EstadoVpc,
  type Instancia,
  type RutaSubred,
  type Subred,
} from '@/lib/vpc-builder'

const RUTA_LABEL: Record<RutaSubred, string> = {
  igw: '0.0.0.0/0 → Internet Gateway',
  nat: '0.0.0.0/0 → NAT Gateway',
  ninguna: 'Sin ruta a 0.0.0.0/0',
}

let contadorId = 0
function nuevoId(prefijo: string): string {
  contadorId += 1
  return `${prefijo}-${contadorId}`
}

function estadoInicial(): EstadoVpc {
  const pub = { id: nuevoId('subred'), nombre: 'Subred pública A', az: AZS_DISPONIBLES[0], ruta: 'igw' as const }
  const priv = { id: nuevoId('subred'), nombre: 'Subred privada A', az: AZS_DISPONIBLES[0], ruta: 'nat' as const }
  return {
    igwAdjunto: true,
    subredes: [pub, priv],
    natGateway: { subnetId: pub.id },
    instancias: [],
  }
}

function AgregarSubredForm({ onAgregar }: { onAgregar: (s: Subred) => void }) {
  const [nombre, setNombre] = useState('')
  const az = useId()
  const [azValor, setAzValor] = useState<string>(AZS_DISPONIBLES[0])
  const [ruta, setRuta] = useState<RutaSubred>('ninguna')

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-md border border-border p-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!nombre.trim()) return
        onAgregar({ id: nuevoId('subred'), nombre: nombre.trim(), az: azValor, ruta })
        setNombre('')
        setRuta('ninguna')
      }}
    >
      <label className="block text-sm">
        <span className="mb-1 block text-foreground/60">Nombre</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Subred pública B"
          className="w-44 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-accent"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-foreground/60">AZ</span>
        <select
          id={az}
          value={azValor}
          onChange={(e) => setAzValor(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-accent"
        >
          {AZS_DISPONIBLES.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-foreground/60">Ruta 0.0.0.0/0</span>
        <select
          value={ruta}
          onChange={(e) => setRuta(e.target.value as RutaSubred)}
          className="rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-accent"
        >
          <option value="ninguna">Ninguna</option>
          <option value="igw">Internet Gateway</option>
          <option value="nat">NAT Gateway</option>
        </select>
      </label>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Agregar subred
      </button>
    </form>
  )
}

function SubredRow({
  subred,
  onCambiar,
  onEliminar,
}: {
  subred: Subred
  onCambiar: (patch: Partial<Subred>) => void
  onEliminar: () => void
}) {
  const { tipo, motivo } = clasificarSubred(subred)

  return (
    <li className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{subred.nombre}</span>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
            (tipo === 'publica' ? 'bg-accent/15 text-accent' : 'bg-slate-200 text-slate-700')
          }
        >
          {tipo === 'publica' ? 'Pública' : 'Privada'}
        </span>
      </div>
      <p className="mt-1 text-sm text-foreground/60">{motivo}</p>
      <div className="mt-3 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="text-foreground/60">AZ</span>
          <select
            value={subred.az}
            onChange={(e) => onCambiar({ az: e.target.value })}
            className="rounded-md border border-border bg-background px-2 py-1 outline-none focus:border-accent"
          >
            {AZS_DISPONIBLES.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-foreground/60">Ruta</span>
          <select
            value={subred.ruta}
            onChange={(e) => onCambiar({ ruta: e.target.value as RutaSubred })}
            className="rounded-md border border-border bg-background px-2 py-1 outline-none focus:border-accent"
          >
            <option value="ninguna">{RUTA_LABEL.ninguna}</option>
            <option value="igw">{RUTA_LABEL.igw}</option>
            <option value="nat">{RUTA_LABEL.nat}</option>
          </select>
        </label>
        <button type="button" onClick={onEliminar} className="text-foreground/50 hover:text-red-700">
          Eliminar
        </button>
      </div>
    </li>
  )
}

const INK = '#1c1a17'
const ACCENT = '#8a5a2b'
const PUBLIC_FILL = '#f3ead9'
const PRIVATE_FILL = '#eef1ec'
const LINE = '#c9c2b4'

const COL_W = 240
const COL_GAP = 24
const SUBNET_H = 92
const SUBNET_GAP = 14
const TOP_PAD = 96

function Diagrama({ estado }: { estado: EstadoVpc }) {
  const azsUsadas = AZS_DISPONIBLES.filter((az) => estado.subredes.some((s) => s.az === az))
  const columnas = azsUsadas.length > 0 ? azsUsadas : [AZS_DISPONIBLES[0]]

  const porAz = columnas.map((az) => estado.subredes.filter((s) => s.az === az))
  const maxSubredesPorAz = Math.max(1, ...porAz.map((lista) => lista.length))

  const vpcW = columnas.length * COL_W + (columnas.length - 1) * COL_GAP + 40
  const vpcH = TOP_PAD + maxSubredesPorAz * (SUBNET_H + SUBNET_GAP) + 20
  const totalH = vpcH + 70

  return (
    <svg viewBox={`0 0 ${vpcW + 40} ${totalH}`} role="img" aria-label="Diagrama de la VPC" className="h-auto w-full">
      <text x={20} y={20} fontSize={11} fontWeight={600} fill={INK}>
        {estado.igwAdjunto ? 'Internet Gateway · adjuntado' : 'Internet Gateway · no adjuntado'}
      </text>
      {estado.igwAdjunto && <line x1={20} y1={28} x2={20} y2={56} stroke={LINE} strokeWidth={1.25} />}

      <rect x={20} y={56} width={vpcW} height={vpcH} rx={8} fill="none" stroke={INK} strokeWidth={1.25} />
      <text x={30} y={76} fontSize={11} fontWeight={600} fill={INK}>
        VPC
      </text>

      {columnas.map((az, colIndex) => {
        const x = 40 + colIndex * (COL_W + COL_GAP)
        const subredes = porAz[colIndex]

        return (
          <g key={az}>
            <rect
              x={x}
              y={88}
              width={COL_W}
              height={vpcH - 48}
              rx={6}
              fill="none"
              stroke={LINE}
              strokeWidth={1.25}
              strokeDasharray="4 3"
            />
            <text x={x + 10} y={104} fontSize={10.5} fontWeight={600} fill={INK}>
              AZ {az}
            </text>

            {subredes.map((subred, i) => {
              const { tipo } = clasificarSubred(subred)
              const y = 116 + i * (SUBNET_H + SUBNET_GAP)
              const nat = estado.natGateway.subnetId === subred.id
              const instancias = estado.instancias.filter((inst) => inst.subnetId === subred.id)

              return (
                <g key={subred.id}>
                  <rect
                    x={x + 10}
                    y={y}
                    width={COL_W - 20}
                    height={SUBNET_H}
                    rx={5}
                    fill={tipo === 'publica' ? PUBLIC_FILL : PRIVATE_FILL}
                    stroke={INK}
                    strokeWidth={1}
                  />
                  <text x={x + 20} y={y + 17} fontSize={10.5} fontWeight={600} fill={INK}>
                    {subred.nombre}
                  </text>
                  {nat && (
                    <rect
                      x={x + 20}
                      y={y + 26}
                      width={94}
                      height={22}
                      rx={4}
                      fill="white"
                      stroke={ACCENT}
                      strokeWidth={1}
                    />
                  )}
                  {nat && (
                    <text x={x + 67} y={y + 40.5} fontSize={9} fill={INK} textAnchor="middle">
                      NAT Gateway
                    </text>
                  )}
                  {instancias.map((inst, instIndex) => (
                    <g key={inst.id}>
                      <rect
                        x={x + 20 + instIndex * 60}
                        y={y + 54}
                        width={54}
                        height={22}
                        rx={4}
                        fill="white"
                        stroke={ACCENT}
                        strokeWidth={1}
                      />
                      <text x={x + 47 + instIndex * 60} y={y + 68.5} fontSize={8.5} fill={INK} textAnchor="middle">
                        {inst.nombre}
                      </text>
                    </g>
                  ))}
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

export function VpcBuilder() {
  const [estado, setEstado] = useState<EstadoVpc>(estadoInicial)
  const hallazgos = evaluarVpc(estado)

  function agregarSubred(subred: Subred) {
    setEstado((prev) => ({ ...prev, subredes: [...prev.subredes, subred] }))
  }

  function cambiarSubred(id: string, patch: Partial<Subred>) {
    setEstado((prev) => ({
      ...prev,
      subredes: prev.subredes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }

  function eliminarSubred(id: string) {
    setEstado((prev) => ({
      ...prev,
      subredes: prev.subredes.filter((s) => s.id !== id),
      natGateway: prev.natGateway.subnetId === id ? { subnetId: null } : prev.natGateway,
      instancias: prev.instancias.map((inst) => (inst.subnetId === id ? { ...inst, subnetId: null } : inst)),
    }))
  }

  function moverNat(subnetId: string | null) {
    setEstado((prev) => ({ ...prev, natGateway: { subnetId } }))
  }

  function agregarInstancia(subnetId: string | null) {
    const instancia: Instancia = { id: nuevoId('instancia'), nombre: `EC2 ${estado.instancias.length + 1}`, subnetId }
    setEstado((prev) => ({ ...prev, instancias: [...prev.instancias, instancia] }))
  }

  function eliminarInstancia(id: string) {
    setEstado((prev) => ({ ...prev, instancias: prev.instancias.filter((i) => i.id !== id) }))
  }

  return (
    <div className="not-prose space-y-8">
      <Diagrama estado={estado} />

      <div>
        <h3 className="text-lg font-semibold">Hallazgos</h3>
        {hallazgos.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">
            Sin problemas detectados en las reglas que cubre esta herramienta.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {hallazgos.map((h, i) => (
              <li
                key={i}
                role={h.severidad === 'error' ? 'alert' : undefined}
                className={
                  'rounded-md border px-3 py-2 text-sm ' +
                  (h.severidad === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-accent/30 bg-accent/10 text-foreground/80')
                }
              >
                {h.mensaje}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={estado.igwAdjunto}
            onChange={(e) => setEstado((prev) => ({ ...prev, igwAdjunto: e.target.checked }))}
          />
          Internet Gateway adjuntado a la VPC
        </label>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Subredes</h3>
        <ul className="mt-3 space-y-3">
          {estado.subredes.map((subred) => (
            <SubredRow
              key={subred.id}
              subred={subred}
              onCambiar={(patch) => cambiarSubred(subred.id, patch)}
              onEliminar={() => eliminarSubred(subred.id)}
            />
          ))}
        </ul>
        <div className="mt-3">
          <AgregarSubredForm onAgregar={agregarSubred} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">NAT Gateway</h3>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <span className="text-foreground/60">Ubicado en</span>
          <select
            value={estado.natGateway.subnetId ?? ''}
            onChange={(e) => moverNat(e.target.value || null)}
            className="rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-accent"
          >
            <option value="">Sin colocar</option>
            {estado.subredes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Instancias EC2</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {estado.instancias.map((inst) => (
            <li key={inst.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{inst.nombre}</span>
              <select
                value={inst.subnetId ?? ''}
                onChange={(e) =>
                  setEstado((prev) => ({
                    ...prev,
                    instancias: prev.instancias.map((i) =>
                      i.id === inst.id ? { ...i, subnetId: e.target.value || null } : i,
                    ),
                  }))
                }
                className="rounded-md border border-border bg-background px-2 py-1 outline-none focus:border-accent"
              >
                <option value="">Sin colocar</option>
                {estado.subredes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => eliminarInstancia(inst.id)} className="text-foreground/50 hover:text-red-700">
                Eliminar
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => agregarInstancia(estado.subredes[0]?.id ?? null)}
          className="mt-3 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Agregar instancia EC2
        </button>
      </div>
    </div>
  )
}
