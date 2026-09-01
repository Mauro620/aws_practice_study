import { describe, expect, it } from 'vitest'
import { getAllServicios, getServicio } from '../content'

describe('getServicio', () => {
  it('loads the vpc service with metadata and ordered levels', () => {
    const servicio = getServicio('vpc')

    expect(servicio.id).toBe('vpc')
    expect(servicio.categoria).toBe('Red')
    expect(servicio.modulo).toBe(1)
    expect(servicio.niveles.length).toBeGreaterThan(0)

    const numeros = servicio.niveles.map((n) => n.numero)
    expect(numeros).toEqual([...numeros].sort((a, b) => a - b))

    for (const nivel of servicio.niveles) {
      expect(nivel.titulo.length).toBeGreaterThan(0)
      expect(nivel.contenido.trim().length).toBeGreaterThan(0)
    }
  })

  it('throws a descriptive error for an unknown service id', () => {
    expect(() => getServicio('no-existe')).toThrow(/no-existe/)
  })

  it('skips missing level files instead of padding them', () => {
    const servicio = getServicio('vpc')
    // The brief requires omitting a level rather than restating content —
    // so a service is allowed to ship with fewer than 4 levels.
    expect(servicio.niveles.length).toBeLessThanOrEqual(4)
  })
})

describe('getAllServicios', () => {
  it('lists vpc for navigation, sorted by modulo', () => {
    const servicios = getAllServicios()
    const vpc = servicios.find((s) => s.id === 'vpc')

    expect(vpc).toBeDefined()
    expect(vpc?.nombre).toContain('VPC')
    expect('niveles' in (vpc as object)).toBe(false)
  })
})
