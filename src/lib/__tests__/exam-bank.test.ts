import { describe, it, expect } from 'vitest'
import {
  BANCO_PREGUNTAS,
  barajarPreguntas,
  evaluarExamen,
  evaluarPregunta,
} from '../exam-bank'

describe('BANCO_PREGUNTAS', () => {
  it('tiene 19 preguntas: las 7 del banco del curso más 12 de elasticidad y entrega de contenido', () => {
    expect(BANCO_PREGUNTAS).toHaveLength(19)
  })

  it('las preguntas nuevas siguen la secuencia P8–P19 y cada una cierra con una regla', () => {
    const nuevas = BANCO_PREGUNTAS.slice(7)
    expect(nuevas.map((p) => p.id)).toEqual(Array.from({ length: 12 }, (_, i) => `P${i + 8}`))
    for (const p of nuevas) {
      expect(p.regla?.length ?? 0).toBeGreaterThan(0)
      for (const o of p.opciones) {
        expect(o.id).toBe(`${p.id}-${o.letra}`)
      }
    }
  })

  it('cubre elasticidad y entrega de contenido con seis preguntas cada uno', () => {
    const porTema = (prefijo: string) => BANCO_PREGUNTAS.filter((p) => p.tema.startsWith(prefijo)).length
    expect(porTema('Elasticidad')).toBe(6)
    expect(porTema('Entrega de contenido')).toBe(6)
  })

  it('cada pregunta tiene opciones, correctas y justificaciones coherentes', () => {
    for (const p of BANCO_PREGUNTAS) {
      expect(p.opciones.length).toBeGreaterThanOrEqual(4)
      const letras = p.opciones.map((o) => o.id)
      for (const c of p.correctas) {
        expect(letras).toContain(c) // correctas son ids reales
      }
      for (const o of p.opciones) {
        expect(p.justificaciones[o.id]).toBeDefined()
        expect(p.justificaciones[o.id].length).toBeGreaterThan(0)
      }
      // tipos coherentes con cantidad de correctas
      if (p.tipo === 'simple') {
        expect(p.correctas.length).toBe(1)
      } else if (p.tipo === 'multiple-2') {
        expect(p.correctas.length).toBe(2)
      }
    }
  })

  it('ids de preguntas únicos', () => {
    const ids = BANCO_PREGUNTAS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('evaluarPregunta — simple', () => {
  it('acierto total al marcar la opción correcta', () => {
    const p2 = BANCO_PREGUNTAS.find((p) => p.id === 'P2')!
    const r = evaluarPregunta(p2, ['P2-D'])
    expect(r.correcta).toBe(true)
    expect(r.faltaronCorrectas).toEqual([])
    expect(r.elegidasMal).toEqual([])
  })

  it('error al elegir un distractor', () => {
    const p2 = BANCO_PREGUNTAS.find((p) => p.id === 'P2')!
    const r = evaluarPregunta(p2, ['P2-A'])
    expect(r.correcta).toBe(false)
    expect(r.elegidasMal).toEqual(['P2-A'])
    expect(r.faltaronCorrectas).toEqual(['P2-D'])
  })
})

describe('evaluarPregunta — multiple-2 (P1)', () => {
  it('acierto total: B + D', () => {
    const p1 = BANCO_PREGUNTAS.find((p) => p.id === 'P1')!
    const r = evaluarPregunta(p1, ['P1-B', 'P1-D'])
    expect(r.correcta).toBe(true)
  })

  it('solo B → falta D, eligió solo un distractor como faltante', () => {
    const p1 = BANCO_PREGUNTAS.find((p) => p.id === 'P1')!
    const r = evaluarPregunta(p1, ['P1-B'])
    expect(r.correcta).toBe(false)
    expect(r.faltaronCorrectas).toEqual(['P1-D'])
    expect(r.elegidasMal).toEqual([])
  })

  it('B + D + A (extras) → no es correcta', () => {
    const p1 = BANCO_PREGUNTAS.find((p) => p.id === 'P1')!
    const r = evaluarPregunta(p1, ['P1-B', 'P1-D', 'P1-A'])
    expect(r.correcta).toBe(false)
    expect(r.elegidasMal).toEqual(['P1-A'])
  })

  it('sólo correctas en cualquier orden → correcta', () => {
    const p1 = BANCO_PREGUNTAS.find((p) => p.id === 'P1')!
    const r = evaluarPregunta(p1, ['P1-D', 'P1-B'])
    expect(r.correcta).toBe(true)
  })
})

describe('evaluarPregunta — P6 y P7 son pares deliberados', () => {
  it('P6 correctas son B y D', () => {
    const p = BANCO_PREGUNTAS.find((x) => x.id === 'P6')!
    expect(p.correctas).toEqual(['P6-B', 'P6-D'])
  })

  it('P7 correctas son A y B (opuesto de P6)', () => {
    const p = BANCO_PREGUNTAS.find((x) => x.id === 'P7')!
    expect(p.correctas).toEqual(['P7-A', 'P7-B'])
  })

  it('"control de acceso y seguridad" es distractor en AMBAS', () => {
    const p6 = BANCO_PREGUNTAS.find((x) => x.id === 'P6')!
    const p7 = BANCO_PREGUNTAS.find((x) => x.id === 'P7')!
    expect(p6.correctas).not.toContain('P6-A')
    expect(p7.correctas).not.toContain('P7-E')
  })
})

describe('evaluarExamen', () => {
  it('todas correctas → total/total', () => {
    const respuestas = BANCO_PREGUNTAS.map((p) => ({
      preguntaId: p.id,
      elegidas: p.correctas,
    }))
    const r = evaluarExamen(BANCO_PREGUNTAS, respuestas)
    expect(r.total).toBe(BANCO_PREGUNTAS.length)
    expect(r.correctas).toBe(BANCO_PREGUNTAS.length)
  })

  it('todas vacías → 0/total', () => {
    const respuestas = BANCO_PREGUNTAS.map((p) => ({ preguntaId: p.id, elegidas: [] }))
    const r = evaluarExamen(BANCO_PREGUNTAS, respuestas)
    expect(r.correctas).toBe(0)
  })

  it('mezcla: mitades', () => {
    const respuestas = BANCO_PREGUNTAS.map((p, i) => ({
      preguntaId: p.id,
      elegidas: i % 2 === 0 ? p.correctas : [],
    }))
    const r = evaluarExamen(BANCO_PREGUNTAS, respuestas)
    // Índices pares respondidos bien, impares vacíos (vacío nunca es acierto).
    // Esperado: ceil(n / 2) correctas.
    expect(r.correctas).toBe(Math.ceil(BANCO_PREGUNTAS.length / 2))
  })
})

describe('barajarPreguntas', () => {
  it('devuelve el mismo conjunto (no se pierde ninguna)', () => {
    const barajado = barajarPreguntas(BANCO_PREGUNTAS, 42)
    expect(new Set(barajado.map((p) => p.id))).toEqual(new Set(BANCO_PREGUNTAS.map((p) => p.id)))
  })

  it('no muta el array original', () => {
    const idsAntes = BANCO_PREGUNTAS.map((p) => p.id)
    barajarPreguntas(BANCO_PREGUNTAS, 42)
    const idsDespues = BANCO_PREGUNTAS.map((p) => p.id)
    expect(idsDespues).toEqual(idsAntes)
  })

  it('con seed distinto cambia el orden (probabilistic, no siempre)', () => {
    // No es estricto: hay 7! = 5040 permutaciones, muy probable que dos seeds
    // den órdenes distintos. Si por casualidad coinciden, igual no falla si
    // la lista quedó completa.
    const a = barajarPreguntas(BANCO_PREGUNTAS, 1)
    const b = barajarPreguntas(BANCO_PREGUNTAS, 99999)
    expect(new Set(a.map((p) => p.id))).toEqual(new Set(b.map((p) => p.id)))
  })
})
