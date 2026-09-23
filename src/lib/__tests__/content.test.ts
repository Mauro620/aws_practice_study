import { describe, expect, it } from 'vitest'
import { getAllServicios, getServicio } from '../content'

describe('getServicio', () => {
  it('loads the vpc service with metadata and ordered levels', () => {
    const servicio = getServicio('vpc')

    expect(servicio.id).toBe('vpc')
    expect(servicio.categoria).toBe('Red')
    expect(servicio.modulo).toBe(3)
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

describe('módulos de elasticidad y entrega de contenido', () => {
  it.each([
    ['elasticidad', 6, ['vpc', 'ec2']],
    ['cloudfront', 7, ['vpc', 'ec2', 'iam']],
  ])('%s carga los cuatro niveles, su número de módulo y sus prerrequisitos', (id, modulo, prerequisitos) => {
    const servicio = getServicio(id)

    expect(servicio.modulo).toBe(modulo)
    expect(servicio.prerequisitos).toEqual(prerequisitos)
    expect(servicio.niveles.map((n) => n.numero)).toEqual([1, 2, 3, 4])
    expect(servicio.erroresFrecuentes.length).toBeGreaterThan(0)
    expect(servicio.glosario.length).toBeGreaterThan(0)
    for (const nivel of servicio.niveles) {
      expect(nivel.titulo.length).toBeGreaterThan(0)
      expect(nivel.contenido.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('mapa de dependencias entre módulos', () => {
  it('ordena la secuencia pedagógica Bienvenida → Well-Architected → VPC → EC2 → IAM → Elasticidad → Entrega de contenido', () => {
    const modulo = (id: string) => getServicio(id).modulo
    expect([
      modulo('bienvenida'),
      modulo('well-architected'),
      modulo('vpc'),
      modulo('ec2'),
      modulo('iam'),
      modulo('elasticidad'),
      modulo('cloudfront'),
    ]).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('todo prerrequisito apunta a un módulo existente', () => {
    const servicios = getAllServicios()
    const ids = new Set(servicios.map((s) => s.id))
    for (const servicio of servicios) {
      for (const prerequisito of servicio.prerequisitos) {
        expect(ids.has(prerequisito), `${servicio.id} → ${prerequisito}`).toBe(true)
      }
    }
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
