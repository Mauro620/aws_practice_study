'use client'

import { useMemo, useState } from 'react'
import { type Efecto, type Enunciado, type Politica, evaluarSolicitud } from '@/lib/iam-policy'

const IDENTIDAD_INICIAL: Politica = [
  {
    sid: 'PermisosBeto',
    efecto: 'Allow',
    acciones: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'],
    recursos: ['arn:aws:s3:::bucket-x/*'],
  },
]

const RECURSO_INICIAL: Politica = [
  {
    sid: 'LecturaPublica',
    efecto: 'Allow',
    acciones: ['s3:GetObject', 's3:ListBucket'],
    recursos: ['arn:aws:s3:::bucket-x/*'],
  },
  {
    sid: 'BloqueoEscritura',
    efecto: 'Deny',
    acciones: ['s3:PutObject'],
    recursos: ['arn:aws:s3:::bucket-x/*'],
  },
]

const ACCION_INICIAL = 's3:PutObject'
const RECURSO_SOLICITADO_INICIAL = 'arn:aws:s3:::bucket-x/foto.jpg'

function sigId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

type EnunciadoConId = Enunciado & { id: string }

function conId(politica: Politica): EnunciadoConId[] {
  return politica.map((e) => ({ ...e, id: sigId() }))
}

export function IamPolicyEvaluator() {
  const [identidad, setIdentidad] = useState<EnunciadoConId[]>(() => conId(IDENTIDAD_INICIAL))
  const [tieneRecurso, setTieneRecurso] = useState(true)
  const [recurso, setRecurso] = useState<EnunciadoConId[]>(() => conId(RECURSO_INICIAL))
  const [accion, setAccion] = useState(ACCION_INICIAL)
  const [recursoSolicitado, setRecursoSolicitado] = useState(RECURSO_SOLICITADO_INICIAL)

  const resultado = useMemo(
    () =>
      evaluarSolicitud(
        identidad.map(despojarId),
        tieneRecurso ? recurso.map(despojarId) : null,
        accion,
        recursoSolicitado
      ),
    [identidad, tieneRecurso, recurso, accion, recursoSolicitado]
  )

  function agregarEnunciado(lista: 'identidad' | 'recurso') {
    const nuevo: EnunciadoConId = { id: sigId(), efecto: 'Allow', acciones: ['*'], recursos: ['*'] }
    if (lista === 'identidad') setIdentidad((l) => [...l, nuevo])
    else setRecurso((l) => [...l, nuevo])
  }

  function eliminarEnunciado(lista: 'identidad' | 'recurso', id: string) {
    if (lista === 'identidad') setIdentidad((l) => l.filter((e) => e.id !== id))
    else setRecurso((l) => l.filter((e) => e.id !== id))
  }

  function actualizarEnunciado(lista: 'identidad' | 'recurso', id: string, cambios: Partial<Enunciado>) {
    const actualizar = (l: EnunciadoConId[]) => l.map((e) => (e.id === id ? { ...e, ...cambios } : e))
    if (lista === 'identidad') setIdentidad(actualizar)
    else setRecurso(actualizar)
  }

  function restablecer() {
    setIdentidad(conId(IDENTIDAD_INICIAL))
    setTieneRecurso(true)
    setRecurso(conId(RECURSO_INICIAL))
    setAccion(ACCION_INICIAL)
    setRecursoSolicitado(RECURSO_SOLICITADO_INICIAL)
  }

  return (
    <div className="not-prose space-y-8">
      <ResumenDecisión resultado={resultado} />

      <section>
        <h2 className="text-lg font-semibold">Solicitud a evaluar</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Quién pregunta ya está resuelto (la autenticación); esto simula la autorización: ¿puede esta acción,
          sobre este recurso, seguir adelante?
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo label="Acción (Action)">
            <input
              value={accion}
              onChange={(e) => setAccion(e.target.value)}
              placeholder="s3:PutObject"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
            />
          </Campo>
          <Campo label="Recurso (Resource)">
            <input
              value={recursoSolicitado}
              onChange={(e) => setRecursoSolicitado(e.target.value)}
              placeholder="arn:aws:s3:::bucket-x/foto.jpg"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
            />
          </Campo>
        </div>
      </section>

      <CapaPolítica
        titulo="Política basada en identidad"
        descripción="Adjunta al usuario, grupo o rol. Dice qué puede hacer esta identidad. El elemento Resource es obligatorio; Principal no aplica."
        decisión={resultado.identidad}
        enunciados={identidad}
        onAgregar={() => agregarEnunciado('identidad')}
        onEliminar={(id) => eliminarEnunciado('identidad', id)}
        onActualizar={(id, cambios) => actualizarEnunciado('identidad', id, cambios)}
      />

      <section>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tieneRecurso}
            onChange={(e) => setTieneRecurso(e.target.checked)}
            className="h-5 w-5"
          />
          Adjuntar también una política basada en recursos (ej. bucket policy)
        </label>
      </section>

      {tieneRecurso && (
        <CapaPolítica
          titulo="Política basada en recursos"
          descripción="Adjunta al recurso mismo. Dice quién puede hacer qué sobre él. Se usa típicamente para acceso entre cuentas o buckets compartidos."
          decisión={resultado.recurso}
          enunciados={recurso}
          onAgregar={() => agregarEnunciado('recurso')}
          onEliminar={(id) => eliminarEnunciado('recurso', id)}
          onActualizar={(id, cambios) => actualizarEnunciado('recurso', id, cambios)}
        />
      )}

      <section>
        <button
          type="button"
          onClick={restablecer}
          className="min-h-11 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
        >
          Restablecer todo
        </button>
      </section>
    </div>
  )
}

function despojarId(e: EnunciadoConId): Enunciado {
  const { sid, efecto, acciones, recursos, notRecursos } = e
  return { sid, efecto, acciones, recursos, notRecursos }
}

function ResumenDecisión({ resultado }: { resultado: ReturnType<typeof evaluarSolicitud> }) {
  const ok = resultado.decisiónFinal === 'allow'
  return (
    <div
      role="status"
      className={'rounded-md border p-4 ' + (ok ? 'border-accent/40 bg-accent/10' : 'border-red-300 bg-red-50')}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Resultado final</p>
      <p className="mt-1 text-xl font-semibold">{ok ? '✓ Permitido' : '✗ Denegado'}</p>
      <p className="mt-1 text-sm text-foreground/70">{resultado.razónFinal}</p>
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

function CapaPolítica({
  titulo,
  descripción,
  decisión,
  enunciados,
  onAgregar,
  onEliminar,
  onActualizar,
}: {
  titulo: string
  descripción: string
  decisión: ReturnType<typeof evaluarSolicitud>['identidad']
  enunciados: EnunciadoConId[]
  onAgregar: () => void
  onEliminar: (id: string) => void
  onActualizar: (id: string, cambios: Partial<Enunciado>) => void
}) {
  const ok = decisión.decisión === 'allow'
  const naAplica = decisión.decisión === 'no-aplica'

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <p className="mt-1 text-sm text-foreground/60">{descripción}</p>
        </div>
        <button
          type="button"
          onClick={onAgregar}
          className="min-h-11 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-black/5"
        >
          + Enunciado
        </button>
      </div>

      <div
        className={
          'mt-3 rounded-md border p-3 text-sm ' +
          (naAplica ? 'border-border bg-black/5' : ok ? 'border-accent/30 bg-accent/5' : 'border-red-200 bg-red-50')
        }
      >
        <p className="font-medium">
          {naAplica ? 'No aplica (N/A)' : ok ? 'Allow' : 'Deny'}
          {decisión.enunciadoAplicado?.sid && ` — "${decisión.enunciadoAplicado.sid}"`}
        </p>
        <p className="mt-1 text-foreground/70">{decisión.razón}</p>
      </div>

      <div className="mt-4 space-y-3">
        {enunciados.length === 0 && <p className="text-sm text-foreground/40 italic">(sin enunciados)</p>}
        {enunciados.map((e) => (
          <FilaEnunciado key={e.id} enunciado={e} onEliminar={() => onEliminar(e.id)} onActualizar={(c) => onActualizar(e.id, c)} />
        ))}
      </div>
    </section>
  )
}

function FilaEnunciado({
  enunciado,
  onEliminar,
  onActualizar,
}: {
  enunciado: EnunciadoConId
  onEliminar: () => void
  onActualizar: (cambios: Partial<Enunciado>) => void
}) {
  const usaNotResource = Boolean(enunciado.notRecursos)

  return (
    <div className="rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-start">
        <Campo label="Effect">
          <select
            value={enunciado.efecto}
            onChange={(e) => onActualizar({ efecto: e.target.value as Efecto })}
            className="w-full min-h-11 rounded-md border border-border bg-background px-2 py-1.5 text-sm sm:w-24"
          >
            <option value="Allow">Allow</option>
            <option value="Deny">Deny</option>
          </select>
        </Campo>

        <Campo label="Action (una por línea, admite *)">
          <textarea
            value={enunciado.acciones.join('\n')}
            onChange={(e) => onActualizar({ acciones: e.target.value.split('\n') })}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
          />
        </Campo>

        <Campo label={usaNotResource ? 'NotResource (una por línea)' : 'Resource (una por línea, admite *)'}>
          <textarea
            value={(usaNotResource ? enunciado.notRecursos : enunciado.recursos)?.join('\n') ?? ''}
            onChange={(e) =>
              onActualizar(
                usaNotResource ? { notRecursos: e.target.value.split('\n') } : { recursos: e.target.value.split('\n') }
              )
            }
            rows={2}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-sm"
          />
        </Campo>

        <button
          type="button"
          onClick={onEliminar}
          className="min-h-11 rounded-md px-2 py-0.5 text-xs text-foreground/60 hover:bg-black/5 hover:text-red-700 sm:self-start"
        >
          Eliminar
        </button>
      </div>

      <label className="mt-2 flex min-h-11 items-center gap-2 text-xs text-foreground/60">
        <input
          type="checkbox"
          checked={usaNotResource}
          onChange={(e) =>
            e.target.checked
              ? onActualizar({ notRecursos: enunciado.recursos ?? ['*'], recursos: undefined })
              : onActualizar({ recursos: enunciado.notRecursos ?? ['*'], notRecursos: undefined })
          }
          className="h-5 w-5"
        />
        Usar NotResource (&quot;todo lo que no sea esto&quot;) en vez de Resource
      </label>
    </div>
  )
}
