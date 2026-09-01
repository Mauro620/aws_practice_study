import { describe, expect, it } from 'vitest'
import { clasificarSubred, evaluarVpc, type EstadoVpc, type Subred } from '../vpc-builder'

function subred(overrides: Partial<Subred> = {}): Subred {
  return { id: 's1', nombre: 'Subred 1', az: 'us-east-1a', ruta: 'ninguna', ...overrides }
}

function estadoBase(overrides: Partial<EstadoVpc> = {}): EstadoVpc {
  return { igwAdjunto: true, subredes: [], natGateway: { subnetId: null }, instancias: [], ...overrides }
}

describe('clasificarSubred', () => {
  it('is pública when the route points at the Internet Gateway', () => {
    expect(clasificarSubred(subred({ ruta: 'igw' })).tipo).toBe('publica')
  })

  it('is privada when the route points at a NAT Gateway', () => {
    expect(clasificarSubred(subred({ ruta: 'nat' })).tipo).toBe('privada')
  })

  it('is privada, with a specific reason, when there is no default route at all', () => {
    const { tipo, motivo } = clasificarSubred(subred({ ruta: 'ninguna' }))
    expect(tipo).toBe('privada')
    expect(motivo).toMatch(/no tiene ruta a 0\.0\.0\.0\/0/)
  })
})

describe('evaluarVpc', () => {
  it('flags a NAT Gateway placed in a private subnet', () => {
    const privada = subred({ id: 'priv', ruta: 'ninguna' })
    const estado = estadoBase({ subredes: [privada], natGateway: { subnetId: 'priv' } })

    const hallazgos = evaluarVpc(estado)

    expect(hallazgos).toContainEqual(
      expect.objectContaining({ severidad: 'error', mensaje: expect.stringMatching(/NAT Gateway.*subred privada/i) }),
    )
  })

  it('does not flag a NAT Gateway placed in a public subnet', () => {
    const publica = subred({ id: 'pub', ruta: 'igw' })
    const estado = estadoBase({ subredes: [publica], natGateway: { subnetId: 'pub' } })

    const hallazgos = evaluarVpc(estado)

    expect(hallazgos.some((h) => /NAT Gateway/.test(h.mensaje))).toBe(false)
  })

  it('warns when every subnet is in the same AZ', () => {
    const estado = estadoBase({
      subredes: [subred({ id: 'a', az: 'us-east-1a' }), subred({ id: 'b', az: 'us-east-1a' })],
    })

    const hallazgos = evaluarVpc(estado)

    expect(hallazgos).toContainEqual(
      expect.objectContaining({ severidad: 'aviso', mensaje: expect.stringMatching(/una AZ.*alta disponibilidad/i) }),
    )
  })

  it('does not warn about high availability when subnets span multiple AZs', () => {
    const estado = estadoBase({
      subredes: [subred({ id: 'a', az: 'us-east-1a' }), subred({ id: 'b', az: 'us-east-1b' })],
    })

    const hallazgos = evaluarVpc(estado)

    expect(hallazgos.some((h) => /alta disponibilidad/i.test(h.mensaje))).toBe(false)
  })

  it('flags a subnet routed to the Internet Gateway when none is attached to the VPC', () => {
    const estado = estadoBase({ igwAdjunto: false, subredes: [subred({ ruta: 'igw' })] })

    const hallazgos = evaluarVpc(estado)

    expect(hallazgos).toContainEqual(
      expect.objectContaining({ severidad: 'error', mensaje: expect.stringMatching(/Internet Gateway/) }),
    )
  })

  it('flags a subnet routed to a NAT Gateway that was never placed', () => {
    const estado = estadoBase({ subredes: [subred({ ruta: 'nat' })], natGateway: { subnetId: null } })

    const hallazgos = evaluarVpc(estado)

    expect(hallazgos).toContainEqual(
      expect.objectContaining({ severidad: 'error', mensaje: expect.stringMatching(/NAT Gateway.*no colocaste/i) }),
    )
  })

  it('returns no findings for a well-formed 2-AZ setup', () => {
    const estado = estadoBase({
      subredes: [
        subred({ id: 'pub-a', az: 'us-east-1a', ruta: 'igw' }),
        subred({ id: 'priv-a', az: 'us-east-1a', ruta: 'nat' }),
        subred({ id: 'pub-b', az: 'us-east-1b', ruta: 'igw' }),
        subred({ id: 'priv-b', az: 'us-east-1b', ruta: 'nat' }),
      ],
      natGateway: { subnetId: 'pub-a' },
    })

    expect(evaluarVpc(estado)).toEqual([])
  })
})
