'use client'

import { useMemo, useState } from 'react'
import {
  type Conexion,
  type Paquete,
  type Protocolo,
  type ReglaNacl,
  type ReglaSg,
  type SecurityGroup,
  evaluarPaquete,
} from '@/lib/network-acls'

const SG_INICIAL: SecurityGroup = {
  reglasIn: [{ id: 'sg-http', protocolo: 'TCP', puertoInicio: 80, puertoFin: 80, cidr: '0.0.0.0/0' }],
  reglasOut: [],
}

const NACL_INICIAL: ReglaNacl[] = [
  { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 80, puertoFin: 80, cidr: '0.0.0.0/0' },
]

const PAQUETE_INICIAL: Paquete = {
  direccion: 'in',
  protocolo: 'TCP',
  ipSrc: '8.8.8.8',
  ipDst: '10.0.0.5',
  puertoSrc: 44444,
  puertoDst: 80,
}

const CONEXIONES_INICIAL: Conexion[] = []

const PROTOCOLOS: Protocolo[] = ['TCP', 'UDP', 'ICMP', 'ALL']

function sigId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function labelProto(p: Protocolo): string {
  if (p === 'ALL') return 'Todo'
  return p
}

export function SgNaclVerifier() {
  const [sg, setSg] = useState<SecurityGroup>(SG_INICIAL)
  const [nacl, setNacl] = useState<ReglaNacl[]>(NACL_INICIAL)
  const [paquete, setPaquete] = useState<Paquete>(PAQUETE_INICIAL)
  const [conexiones, setConexiones] = useState<Conexion[]>(CONEXIONES_INICIAL)

  const resultado = useMemo(() => evaluarPaquete(sg, nacl, paquete, conexiones), [sg, nacl, paquete, conexiones])

  function actualizarPaquete<K extends keyof Paquete>(campo: K, valor: Paquete[K]) {
    setPaquete((p) => ({ ...p, [campo]: valor }))
  }

  function agregarReglaSg(dir: 'in' | 'out') {
    const nueva: ReglaSg = { id: sigId(), protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }
    setSg((s) => ({ ...s, [dir === 'in' ? 'reglasIn' : 'reglasOut']: [...s[dir === 'in' ? 'reglasIn' : 'reglasOut'], nueva] }))
  }

  function eliminarReglaSg(id: string) {
    setSg((s) => ({
      reglasIn: s.reglasIn.filter((r) => r.id !== id),
      reglasOut: s.reglasOut.filter((r) => r.id !== id),
    }))
  }

  function actualizarReglaSg(id: string, campo: keyof Omit<ReglaSg, 'id'>, valor: string | number) {
    setSg((s) => ({
      reglasIn: s.reglasIn.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
      reglasOut: s.reglasOut.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)),
    }))
  }

  function agregarReglaNacl() {
    const sigNumero = nacl.length === 0 ? 100 : Math.max(...nacl.map((r) => r.numero)) + 100
    setNacl((n) => [...n, { numero: sigNumero, acción: 'allow', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }])
  }

  function eliminarReglaNacl(numero: number) {
    setNacl((n) => n.filter((r) => r.numero !== numero))
  }

  function actualizarReglaNacl(numero: number, campo: keyof Omit<ReglaNacl, 'numero'>, valor: string | number) {
    setNacl((n) => n.map((r) => (r.numero === numero ? { ...r, [campo]: valor } : r)))
  }

  function agregarConexion() {
    setConexiones((cs) => [
      ...cs,
      {
        protocolo: paquete.protocolo,
        ipSrc: paquete.ipSrc,
        puertoSrc: paquete.puertoSrc,
        ipDst: paquete.ipDst,
        puertoDst: paquete.puertoDst,
        sentidoOriginal: paquete.direccion,
      },
    ])
  }

  function limpiarConexiones() {
    setConexiones([])
  }

  function restablecer() {
    setSg(SG_INICIAL)
    setNacl(NACL_INICIAL)
    setPaquete(PAQUETE_INICIAL)
    setConexiones([])
  }

  return (
    <div className="not-prose space-y-8">
      <ResumenDecisión resultado={resultado} />

      <section>
        <h2 className="text-lg font-semibold">Paquete de prueba</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Definí el paquete a evaluar. Después mirá qué dice cada capa.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Campo label="Dirección">
            <select
              value={paquete.direccion}
              onChange={(e) => actualizarPaquete('direccion', e.target.value as Paquete['direccion'])}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="in">Entrante (in)</option>
              <option value="out">Saliente (out)</option>
            </select>
          </Campo>
          <Campo label="Protocolo">
            <select
              value={paquete.protocolo}
              onChange={(e) => actualizarPaquete('protocolo', e.target.value as Protocolo)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            >
              {PROTOCOLOS.map((p) => (
                <option key={p} value={p}>{labelProto(p)}</option>
              ))}
            </select>
          </Campo>
          <Campo label="IP origen">
            <input
              value={paquete.ipSrc}
              onChange={(e) => actualizarPaquete('ipSrc', e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
            />
          </Campo>
          <Campo label="IP destino">
            <input
              value={paquete.ipDst}
              onChange={(e) => actualizarPaquete('ipDst', e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
            />
          </Campo>
          <Campo label="Puerto origen">
            <input
              type="number"
              value={paquete.puertoSrc}
              onChange={(e) => actualizarPaquete('puertoSrc', Number(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
            />
          </Campo>
          <Campo label="Puerto destino">
            <input
              type="number"
              value={paquete.puertoDst}
              onChange={(e) => actualizarPaquete('puertoDst', Number(e.target.value))}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
            />
          </Campo>
        </div>
      </section>

      <CapaSg
        sg={sg}
        resultado={resultado}
        conexiones={conexiones}
        direccionActual={paquete.direccion}
        onAgregarRegla={agregarReglaSg}
        onEliminarRegla={eliminarReglaSg}
        onActualizarRegla={actualizarReglaSg}
        onAgregarConexion={agregarConexion}
        onLimpiarConexiones={limpiarConexiones}
      />

      <CapaNacl
        nacl={nacl}
        resultado={resultado}
        onAgregarRegla={agregarReglaNacl}
        onEliminarRegla={eliminarReglaNacl}
        onActualizarRegla={actualizarReglaNacl}
      />

      <section>
        <button
          type="button"
          onClick={restablecer}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
        >
          Restablecer todo
        </button>
      </section>
    </div>
  )
}

function ResumenDecisión({ resultado }: { resultado: ReturnType<typeof evaluarPaquete> }) {
  const ok = resultado.decisiónFinal === 'allow'
  return (
    <div
      role="status"
      className={
        'rounded-md border p-4 ' +
        (ok ? 'border-accent/40 bg-accent/10' : 'border-red-300 bg-red-50')
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Resultado final</p>
      <p className="mt-1 text-xl font-semibold">
        {ok ? '✓ Permitido' : '✗ Bloqueado'}
      </p>
      <p className="mt-1 text-sm text-foreground/70">
        El paquete tiene que pasar <span className="font-medium">ambas capas</span> (SG <span className="font-medium">y</span> NACL).
        SG: {resultado.securityGroup.decisión === 'allow' ? 'allow' : 'deny'}.
        NACL: {resultado.nacl.decisión === 'allow' ? 'allow' : 'deny'}.
      </p>
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

type CapaProps = {
  sg: SecurityGroup
  resultado: ReturnType<typeof evaluarPaquete>
  conexiones: Conexion[]
  direccionActual: Paquete['direccion']
  onAgregarRegla: (dir: 'in' | 'out') => void
  onEliminarRegla: (id: string) => void
  onActualizarRegla: (id: string, campo: keyof Omit<ReglaSg, 'id'>, valor: string | number) => void
  onAgregarConexion: () => void
  onLimpiarConexiones: () => void
}

function CapaSg({
  sg,
  resultado,
  conexiones,
  direccionActual,
  onAgregarRegla,
  onEliminarRegla,
  onActualizarRegla,
  onAgregarConexion,
  onLimpiarConexiones,
}: CapaProps) {
  const ok = resultado.securityGroup.decisión === 'allow'
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Security Group (stateful)</h2>
          <p className="mt-1 text-sm text-foreground/60">
            En AWS real, el SG por defecto deniega todo entrante y permite todo saliente. Este simulador arranca
            sin reglas out: agregá una regla out explícita o registrá la conexión de abajo para ver el atajo
            stateful en acción.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAgregarRegla('in')}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
          >
            + Regla in
          </button>
          <button
            type="button"
            onClick={() => onAgregarRegla('out')}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
          >
            + Regla out
          </button>
        </div>
      </div>

      <DecisiónCapa
        ok={ok}
        razón={resultado.securityGroup.razón}
        reglaLabel={
          resultado.securityGroup.reglaAplicada && 'id' in resultado.securityGroup.reglaAplicada
            ? `Regla ${resultado.securityGroup.reglaAplicada.id}`
            : null
        }
      />

      <SubTabla
        titulo="Reglas in"
        reglas={sg.reglasIn}
        onEliminar={onEliminarRegla}
        onActualizar={onActualizarRegla}
        permitirOut={false}
      />
      <SubTabla
        titulo="Reglas out"
        reglas={sg.reglasOut}
        onEliminar={onEliminarRegla}
        onActualizar={onActualizarRegla}
        permitirOut={false}
      />

      <div className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground/70">
            Conexiones previas ({conexiones.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAgregarConexion}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-xs hover:bg-black/5"
            >
              Registrar paquete actual como conexión previa ({direccionActual})
            </button>
            <button
              type="button"
              onClick={onLimpiarConexiones}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-xs hover:bg-black/5"
            >
              Limpiar
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-foreground/50">
          El tracking de conexiones es lo que hace al SG <em>stateful</em>. Sin entradas acá, una respuesta out
          sin regla out explícita será denied.
        </p>
        {conexiones.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs">
            {conexiones.map((c, i) => (
              <li key={i} className="font-mono">
                [{c.sentidoOriginal}] {c.protocolo} {c.ipSrc}:{c.puertoSrc} → {c.ipDst}:{c.puertoDst}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function SubTabla({
  titulo,
  reglas,
  onEliminar,
  onActualizar,
}: {
  titulo: string
  reglas: ReglaSg[]
  onEliminar: (id: string) => void
  onActualizar: (id: string, campo: keyof Omit<ReglaSg, 'id'>, valor: string | number) => void
  permitirOut: boolean
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <h3 className="text-sm font-medium text-foreground/70">{titulo}</h3>
       <table className="mt-2 min-w-[34rem] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-foreground/50">
            <th className="py-1 pr-2 font-medium">Proto</th>
            <th className="py-1 pr-2 font-medium">Puerto</th>
            <th className="py-1 pr-2 font-medium">CIDR</th>
            <th className="py-1 font-medium" aria-label="Acciones"></th>
          </tr>
        </thead>
        <tbody>
          {reglas.length === 0 && (
            <tr>
              <td colSpan={4} className="py-2 text-foreground/40 italic">
                (sin reglas)
              </td>
            </tr>
          )}
          {reglas.map((r) => (
            <tr key={r.id} className="border-b border-border/60">
              <td className="py-1 pr-2">
                <select
                  value={r.protocolo}
                  onChange={(e) => onActualizar(r.id, 'protocolo', e.target.value)}
                  className="rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                >
                  {PROTOCOLOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <div className="flex items-center gap-1 font-mono text-sm">
                  <input
                    type="number"
                    value={r.puertoInicio}
                    onChange={(e) => onActualizar(r.id, 'puertoInicio', Number(e.target.value))}
                    className="w-16 rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                  />
                  <span>–</span>
                  <input
                    type="number"
                    value={r.puertoFin}
                    onChange={(e) => onActualizar(r.id, 'puertoFin', Number(e.target.value))}
                    className="w-16 rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                  />
                </div>
              </td>
              <td className="py-1 pr-2">
                <input
                  value={r.cidr}
                  onChange={(e) => onActualizar(r.id, 'cidr', e.target.value)}
                  className="w-36 rounded-md border border-border bg-background px-1 py-0.5 font-mono text-sm"
                />
              </td>
              <td className="py-1 text-right">
                <button
                  type="button"
                  onClick={() => onEliminar(r.id)}
                  className="rounded-md px-2 py-0.5 text-xs text-foreground/60 hover:bg-black/5 hover:text-red-700"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DecisiónCapa({ ok, razón, reglaLabel }: { ok: boolean; razón: string; reglaLabel: string | null }) {
  return (
    <div
      className={
        'mt-3 rounded-md border p-3 text-sm ' +
        (ok ? 'border-accent/30 bg-accent/5' : 'border-red-200 bg-red-50')
      }
    >
      <p className="font-medium">{ok ? 'Permitido' : 'Denegado'}{reglaLabel && ` — ${reglaLabel}`}</p>
      <p className="mt-1 text-foreground/70">{razón}</p>
    </div>
  )
}

function CapaNacl({
  nacl,
  resultado,
  onAgregarRegla,
  onEliminarRegla,
  onActualizarRegla,
}: {
  nacl: ReglaNacl[]
  resultado: ReturnType<typeof evaluarPaquete>
  onAgregarRegla: () => void
  onEliminarRegla: (numero: number) => void
  onActualizarRegla: (numero: number, campo: keyof Omit<ReglaNacl, 'numero'>, valor: string | number) => void
}) {
  const ok = resultado.nacl.decisión === 'allow'
  const reglasOrdenadas = useMemo(() => [...nacl].sort((a, b) => a.numero - b.numero), [nacl])
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Network ACL (stateless, numerada)</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Se evalúan en orden numérico: gana la primera que matchea. Stateless: in y out se evalúan por
            separado, por eso la respuesta TCP pasa por la regla de puertos efímeros 1024–65535.
          </p>
        </div>
        <button
          type="button"
          onClick={onAgregarRegla}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
        >
          + Regla NACL
        </button>
      </div>

      <DecisiónCapa
        ok={ok}
        razón={resultado.nacl.razón}
        reglaLabel={
          resultado.nacl.reglaAplicada && 'numero' in resultado.nacl.reglaAplicada
            ? `Regla #${resultado.nacl.reglaAplicada.numero}`
            : null
        }
      />

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[42rem] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-foreground/50">
              <th className="py-1 pr-2 font-medium">#</th>
              <th className="py-1 pr-2 font-medium">Acción</th>
              <th className="py-1 pr-2 font-medium">Proto</th>
              <th className="py-1 pr-2 font-medium">Puerto</th>
              <th className="py-1 pr-2 font-medium">CIDR</th>
              <th className="py-1 font-medium" aria-label="Acciones"></th>
            </tr>
          </thead>
          <tbody>
            {reglasOrdenadas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-2 text-foreground/40 italic">
                  (sin reglas — NACL default permite todo)
                </td>
              </tr>
            )}
            {reglasOrdenadas.map((r) => (
              <tr
                key={r.numero}
                className={
                  'border-b border-border/60 ' +
                  (resultado.nacl.reglaAplicada && 'numero' in resultado.nacl.reglaAplicada && resultado.nacl.reglaAplicada.numero === r.numero
                    ? 'bg-accent/10'
                    : '')
                }
              >
                <td className="py-1 pr-2 font-mono">{r.numero}</td>
                <td className="py-1 pr-2">
                  <select
                    value={r.acción}
                    onChange={(e) => onActualizarRegla(r.numero, 'acción', e.target.value)}
                    className="rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                  >
                    <option value="allow">ALLOW</option>
                    <option value="deny">DENY</option>
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <select
                    value={r.protocolo}
                    onChange={(e) => onActualizarRegla(r.numero, 'protocolo', e.target.value)}
                    className="rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                  >
                    {PROTOCOLOS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <div className="flex items-center gap-1 font-mono text-sm">
                    <input
                      type="number"
                      value={r.puertoInicio}
                      onChange={(e) => onActualizarRegla(r.numero, 'puertoInicio', Number(e.target.value))}
                      className="w-16 rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                    />
                    <span>–</span>
                    <input
                      type="number"
                      value={r.puertoFin}
                      onChange={(e) => onActualizarRegla(r.numero, 'puertoFin', Number(e.target.value))}
                      className="w-16 rounded-md border border-border bg-background px-1 py-0.5 text-sm"
                    />
                  </div>
                </td>
                <td className="py-1 pr-2">
                  <input
                    value={r.cidr}
                    onChange={(e) => onActualizarRegla(r.numero, 'cidr', e.target.value)}
                    className="w-36 rounded-md border border-border bg-background px-1 py-0.5 font-mono text-sm"
                  />
                </td>
                <td className="py-1 text-right">
                  <button
                    type="button"
                    onClick={() => onEliminarRegla(r.numero)}
                    className="rounded-md px-2 py-0.5 text-xs text-foreground/60 hover:bg-black/5 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
