'use client'

import { useMemo, useState } from 'react'
import {
  type Pregunta,
  BANCO_PREGUNTAS,
  barajarPreguntas,
  evaluarPregunta,
} from '@/lib/exam-bank'

type Estado = 'configurando' | 'preguntas' | 'resultados'

const CANTIDADES = [3, 5, 7] as const
const SEED_POR_DIA = (() => {
  // Shuffle repeatable per calendar day so consecutive reloads del mismo día
  // no reordenan el banco entre intentos, pero cada día la práctica cambia.
  const d = new Date()
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
})()

export function ExamEngine() {
  const [cantidad, setCantidad] = useState<typeof CANTIDADES[number]>(7)
  const [seed, setSeed] = useState(SEED_POR_DIA)
  const [estado, setEstado] = useState<Estado>('configurando')
  const [preguntas, setPreguntas] = useState<ResultadoParcial[]>([])
  const [indice, setIndice] = useState(0)
  const [elegidas, setElegidas] = useState<string[]>([])

  const totalCorrectas = useMemo(
    () => preguntas.filter((p) => p.resultado?.correcta).length,
    [preguntas],
  )

  function iniciar() {
    const muestra = barajarPreguntas(BANCO_PREGUNTAS, seed).slice(0, cantidad)
    setPreguntas(muestra.map((p) => ({ pregunta: p, resultado: null })))
    setIndice(0)
    setElegidas([])
    setEstado('preguntas')
  }

  function toggle(opcionId: string, max: number) {
    setElegidas((prev) => {
      if (prev.includes(opcionId)) return prev.filter((x) => x !== opcionId)
      if (prev.length >= max) return prev
      return [...prev, opcionId]
    })
  }

  function confirmar() {
    const actual = preguntas[indice]
    if (!actual) return
    const resultado = evaluarPregunta(actual.pregunta, elegidas)
    setPreguntas((prev) =>
      prev.map((p, i) => (i === indice ? { ...p, resultado } : p)),
    )
  }

  function siguiente() {
    if (indice + 1 >= preguntas.length) {
      setEstado('resultados')
      return
    }
    setIndice(indice + 1)
    setElegidas([])
  }

  function reiniciar() {
    setEstado('configurando')
    setPreguntas([])
    setIndice(0)
    setElegidas([])
  }

  function nuevaSemilla() {
    setSeed(seed + 1)
  }

  if (estado === 'configurando') {
    return (
      <section className="space-y-6">
        <ConfigCantidad value={cantidad} onChange={setCantidad} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={iniciar}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            Iniciar práctica
          </button>
          <button
            type="button"
            onClick={nuevaSemilla}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground/70 hover:bg-black/[0.03]"
            title="Cambia el orden aleatorio de las preguntas"
          >
            Cambiar orden 🔀
          </button>
        </div>
      </section>
    )
  }

  const actual = preguntas[indice]
  if (!actual) return null

  if (estado === 'resultados') {
    const total = preguntas.length
    const correctas = totalCorrectas
    return (
      <section className="space-y-6">
        <header className="rounded-md border border-accent/30 bg-accent/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">Resultado</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">
            {correctas} / {total}
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            {correctas === total
              ? 'Excelente — revisa los detalles por si hay matices del curso.'
              : 'Revisá las justificaciones de cada pregunta antes de volver a intentarlo.'}
          </p>
        </header>

        <ol className="space-y-4">
          {preguntas.map((p, i) => (
            <PreguntaResultado key={p.pregunta.id} numero={i + 1} parcial={p} />
          ))}
        </ol>

        <button
          type="button"
          onClick={reiniciar}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Practicar otra vez
        </button>
      </section>
    )
  }

  const esMultiple = actual.pregunta.tipo === 'multiple-2'
  const cantidadAPedir = esMultiple ? 2 : 1
  const listoParaConfirmar = elegidas.length === cantidadAPedir

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between text-xs text-foreground/60">
        <span>
          Pregunta {indice + 1} de {preguntas.length}
        </span>
        <span className="rounded-full bg-foreground/5 px-2 py-0.5 font-medium">
          {actual.pregunta.tema}
        </span>
      </header>

      <article className="rounded-md border border-border bg-background p-5">
        <p className="text-base">{actual.pregunta.enunciado}</p>
        {esMultiple && (
          <p className="mt-2 text-xs font-medium text-accent">
            Elegí 2 de 5. Marcá con cuidado, después no se puede deshacer.
          </p>
        )}

        <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Opciones de respuesta">
          {actual.pregunta.opciones.map((o) => {
            const elegida = elegidas.includes(o.id)
            return (
              <li key={o.id}>
                <label
                  className={
                    'flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition ' +
                    (elegida
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-white hover:bg-black/[0.02]')
                  }
                >
                  <input
                    type={esMultiple ? 'checkbox' : 'radio'}
                    name="opciones"
                    value={o.id}
                    checked={elegida}
                    onChange={() => toggle(o.id, cantidadAPedir)}
                    disabled={actual.resultado !== null}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="mr-2 font-mono font-medium text-foreground/60">
                      {o.letra}.
                    </span>
                    {o.texto}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>

        {actual.resultado === null ? (
          <div className="mt-5 flex items-center justify-between">
            <span className="text-xs text-foreground/60">
              {elegidas.length}/{cantidadAPedir} elegidas
            </span>
            <button
              type="button"
              onClick={confirmar}
              disabled={!listoParaConfirmar}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:bg-foreground/30"
            >
              Confirmar respuesta
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <FeedbackResultado pregunta={actual.pregunta} resultado={actual.resultado} />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={siguiente}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                {indice + 1 >= preguntas.length ? 'Ver resultado final' : 'Siguiente pregunta →'}
              </button>
            </div>
          </div>
        )}
      </article>
    </section>
  )
}

type ResultadoParcial = {
  pregunta: Pregunta
  resultado: ReturnType<typeof evaluarPregunta> | null
}

function ConfigCantidad({
  value,
  onChange,
}: {
  value: number
  onChange: (n: typeof CANTIDADES[number]) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">¿Cuántas preguntas querés practicar?</legend>
      <div className="flex gap-2">
        {CANTIDADES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={
              'rounded-md border px-4 py-2 text-sm font-medium transition ' +
              (value === c
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-white hover:bg-black/[0.03]')
            }
          >
            {c}
          </button>
        ))}
      </div>
      <p className="text-xs text-foreground/60">
        El banco tiene {BANCO_PREGUNTAS.length} preguntas. Si elegís más que el banco, se usan todas.
      </p>
    </fieldset>
  )
}

function FeedbackResultado({
  pregunta,
  resultado,
}: {
  pregunta: Pregunta
  resultado: ReturnType<typeof evaluarPregunta>
}) {
  return (
    <div
      className={
        'rounded-md p-4 text-sm ' +
        (resultado.correcta
          ? 'border border-emerald-300 bg-emerald-50 text-emerald-900'
          : 'border border-rose-300 bg-rose-50 text-rose-900')
      }
    >
      <p className="font-semibold">
        {resultado.correcta ? '¡Correcta!' : 'No del todo.'}
      </p>
      {pregunta.regla && (
        <p className="mt-2 text-xs font-medium uppercase tracking-wide">Regla del curso</p>
      )}
      {pregunta.regla && <p className="mt-1">{pregunta.regla}</p>}
      <div className="mt-3 space-y-2">
        {pregunta.opciones.map((o) => {
          const veredicto = resultado.porOpcion[o.id]
          const esCorrecta = veredicto === 'acertada'
          const esError = veredicto === 'errada'
          const eraCorrectaPeroNoLaElegiste = veredicto === 'no-elegida-correcta'
          if (!esCorrecta && !esError && !eraCorrectaPeroNoLaElegiste) {
            return null
          }
          return (
            <div
              key={o.id}
              className={
                'rounded-md p-2 text-xs ' +
                (esCorrecta
                  ? 'bg-emerald-100/60'
                  : esError
                    ? 'bg-rose-100/60'
                    : 'bg-amber-100/60')
              }
            >
              <p className="font-medium">
                <span className="font-mono">{o.letra}.</span> {o.texto}
              </p>
              <p className="mt-1 text-foreground/80">{pregunta.justificaciones[o.id]}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PreguntaResultado({
  numero,
  parcial,
}: {
  numero: number
  parcial: ResultadoParcial
}) {
  if (!parcial.resultado) return null
  const r = parcial.resultado
  return (
    <li className="rounded-md border border-border bg-background p-4">
      <p className="text-xs font-medium uppercase text-foreground/50">
        Pregunta {numero} · {parcial.pregunta.tema}
      </p>
      <p className="mt-2 text-sm">{parcial.pregunta.enunciado}</p>
      <p
        className={
          'mt-3 inline-block rounded-full px-2 py-0.5 text-xs font-medium ' +
          (r.correcta
            ? 'bg-emerald-100 text-emerald-800'
            : 'bg-rose-100 text-rose-800')
        }
      >
        {r.correcta ? 'Correcta' : 'Incorrecta'}
      </p>
      <ul className="mt-2 space-y-1 text-xs text-foreground/80">
        {parcial.pregunta.opciones.map((o) => {
          const v = r.porOpcion[o.id]
          if (v === 'no-elegida-incorrecta') return null
          return (
            <li key={o.id}>
              <span className="font-mono">{o.letra}.</span>{' '}
              {v === 'acertada' ? '✓' : v === 'errada' ? '✗' : '·'}{' '}
              {parcial.pregunta.justificaciones[o.id]}
            </li>
          )
        })}
      </ul>
    </li>
  )
}
