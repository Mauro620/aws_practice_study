import { describe, it, expect } from 'vitest'
import {
  type ReglaSg,
  type ReglaNacl,
  type Paquete,
  type Conexion,
  type SecurityGroup,
  evaluarPaquete,
} from '../network-acls'

const proto = (p: string) => p.toUpperCase() as Paquete['protocolo']

describe('evaluarPaquete — Security Group (stateful)', () => {
  it('SG default deny: paquete entrante sin reglas in se bloquea', () => {
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, [], {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 12345,
      puertoDst: 443,
      ipSrc: '1.2.3.4',
      ipDst: '10.0.0.5',
    })
    expect(r.securityGroup.decisión).toBe('deny')
    expect(r.securityGroup.razón).toMatch(/default deny/i)
  })

  it('SG in permite TCP/443 desde 0.0.0.0/0 → allow', () => {
    const sg: { reglasIn: ReglaSg[]; reglasOut: ReglaSg[] } = {
      reglasIn: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
      reglasOut: [],
    }
    const r = evaluarPaquete(sg, [], {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 54321,
      puertoDst: 443,
      ipSrc: '8.8.8.8',
      ipDst: '10.0.0.5',
    })
    expect(r.securityGroup.decisión).toBe('allow')
  })

  it('SG in no matchea por puerto distinto → deny', () => {
    const sg: SecurityGroup = {
      reglasIn: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
      reglasOut: [],
    }
    const r = evaluarPaquete(sg, [], {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 12345,
      puertoDst: 80,
      ipSrc: '1.2.3.4',
      ipDst: '10.0.0.5',
    })
    expect(r.securityGroup.decisión).toBe('deny')
  })

  it('SG out: respuesta stateful de in previamente permitido pasa sin regla out explícita', () => {
    const sg: SecurityGroup = {
      reglasIn: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
      reglasOut: [],
    }
    const conexiones: Conexion[] = [
      { protocolo: 'TCP', ipSrc: '1.2.3.4', puertoSrc: 54321, ipDst: '10.0.0.5', puertoDst: 443, sentidoOriginal: 'in' },
    ]
    const r = evaluarPaquete(
      sg,
      [],
      {
        direccion: 'out',
        protocolo: proto('tcp'),
        puertoSrc: 443,
        puertoDst: 54321,
        ipSrc: '10.0.0.5',
        ipDst: '1.2.3.4',
      },
      conexiones
    )
    expect(r.securityGroup.decisión).toBe('allow')
    expect(r.securityGroup.razón).toMatch(/stateful|respuesta/i)
  })

  it('SG out sin conexión previa y sin regla out → deny', () => {
    const sg: SecurityGroup = {
      reglasIn: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
      reglasOut: [],
    }
    const r = evaluarPaquete(sg, [], {
      direccion: 'out',
      protocolo: proto('tcp'),
      puertoSrc: 443,
      puertoDst: 54321,
      ipSrc: '10.0.0.5',
      ipDst: '1.2.3.4',
    })
    expect(r.securityGroup.decisión).toBe('deny')
  })

  it('SG múltiples reglas in: si alguna matchea, allow (todas se evalúan en conjunto)', () => {
    const sg: SecurityGroup = {
      reglasIn: [
        { id: 'a', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '10.0.0.0/24' },
        { id: 'b', protocolo: 'TCP', puertoInicio: 80, puertoFin: 80, cidr: '0.0.0.0/0' },
      ],
      reglasOut: [],
    }
    const r = evaluarPaquete(sg, [], {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 33333,
      puertoDst: 80,
      ipSrc: '8.8.8.8',
      ipDst: '10.0.0.5',
    })
    expect(r.securityGroup.decisión).toBe('allow')
  })

  it('SG out con regla explícita: matchea el puerto REMOTO (destino), no el puerto propio de origen', () => {
    // La instancia inicia una conexión HTTPS hacia afuera: puertoDst=443 es
    // el puerto del servidor remoto; puertoSrc=51000 es el efímero propio
    // que el SO eligió. La regla out debe matchear contra el destino (443).
    const sg: SecurityGroup = {
      reglasIn: [],
      reglasOut: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
    }
    const r = evaluarPaquete(sg, [], {
      direccion: 'out',
      protocolo: proto('tcp'),
      puertoSrc: 51000,
      puertoDst: 443,
      ipSrc: '10.0.0.5',
      ipDst: '93.184.216.34',
    })
    expect(r.securityGroup.decisión).toBe('allow')
  })

  it('SG out con regla explícita: NO matchea solo porque el puerto de origen coincide', () => {
    const sg: SecurityGroup = {
      reglasIn: [],
      reglasOut: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
    }
    const r = evaluarPaquete(sg, [], {
      direccion: 'out',
      protocolo: proto('tcp'),
      puertoSrc: 443,
      puertoDst: 51000,
      ipSrc: '10.0.0.5',
      ipDst: '1.2.3.4',
    })
    expect(r.securityGroup.decisión).toBe('deny')
  })
})

describe('evaluarPaquete — NACL (stateless, numerada, allow+deny)', () => {
  it('NACL default: si no hay reglas, todo permitido', () => {
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, [], {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 12345,
      puertoDst: 22,
      ipSrc: '1.2.3.4',
      ipDst: '10.0.0.5',
    })
    expect(r.nacl.decisión).toBe('allow')
    expect(r.nacl.razón).toMatch(/default/i)
  })

  it('NACL numerada: regla de menor número gana aunque otra más específica también matchee', () => {
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '10.0.0.0/24' },
      { numero: 200, acción: 'deny', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, nacl, {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 33333,
      puertoDst: 22,
      ipSrc: '10.0.0.10',
      ipDst: '10.0.0.5',
    })
    expect(r.nacl.decisión).toBe('allow')
    expect(r.nacl.reglaAplicada && 'numero' in r.nacl.reglaAplicada ? r.nacl.reglaAplicada.numero : null).toBe(100)
  })

  it('NACL deny explícito: paquete desde CIDR bloqueado', () => {
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'deny', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '1.2.3.0/24' },
      { numero: 200, acción: 'allow', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, nacl, {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 33333,
      puertoDst: 22,
      ipSrc: '1.2.3.4',
      ipDst: '10.0.0.5',
    })
    expect(r.nacl.decisión).toBe('deny')
    expect(r.nacl.reglaAplicada && 'numero' in r.nacl.reglaAplicada ? r.nacl.reglaAplicada.numero : null).toBe(100)
  })

  it('NACL out stateless: respuesta de SSH necesita puertos efímeros 1024-65535', () => {
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '0.0.0.0/0' },
      { numero: 200, acción: 'allow', protocolo: 'TCP', puertoInicio: 1024, puertoFin: 65535, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, nacl, {
      direccion: 'out',
      protocolo: proto('tcp'),
      puertoSrc: 22,
      puertoDst: 50000,
      ipSrc: '10.0.0.5',
      ipDst: '1.2.3.4',
    })
    expect(r.nacl.decisión).toBe('allow')
  })

  it('NACL out: sin regla de puertos efímeros, la respuesta TCP se bloquea', () => {
    // Caso típico: respuesta SSH. La regla "TCP 22" matchea el puerto de
    // SERVICIO, no el destino real de este paquete (el puerto efímero del
    // cliente, 50000) — por eso NO debe matchear, y sin otra regla que cubra
    // 50000, la NACL deniega. Esto es justo el punto pedagógico de la
    // sección 1.10: sin la regla 1024-65535 en outbound, la respuesta muere.
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, nacl, {
      direccion: 'out',
      protocolo: proto('tcp'),
      puertoSrc: 22,
      puertoDst: 50000,
      ipSrc: '10.0.0.5',
      ipDst: '1.2.3.4',
    })
    expect(r.nacl.decisión).toBe('deny')
  })

  it('NACL in: regla efímeros 1024-65535 matchea paquetes con dst efímero (cliente detrás de NAT)', () => {
    // Cuando el destino es un puerto efímero (típico de una conexión iniciada
    // desde dentro hacia afuera, vista desde la subred destino), la regla
    // 1024-65535 matchea.
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 1024, puertoFin: 65535, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] } as SecurityGroup, nacl, {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 443,
      puertoDst: 50000,
      ipSrc: '8.8.8.8',
      ipDst: '10.0.0.5',
    })
    expect(r.nacl.decisión).toBe('allow')
  })

  it('NACL in: regla específica sobre default gana (orden numérico)', () => {
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete({ reglasIn: [], reglasOut: [] }, nacl, {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 44444,
      puertoDst: 443,
      ipSrc: '8.8.8.8',
      ipDst: '10.0.0.5',
    })
    expect(r.nacl.decisión).toBe('allow')
  })
})

describe('evaluarPaquete — ambas capas (SG y NACL deben pasar)', () => {
  it('paquete allowed por SG pero denied por NACL → resultado final deny', () => {
    const sg: SecurityGroup = {
      reglasIn: [{ id: 'a', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '0.0.0.0/0' }],
      reglasOut: [],
    }
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'deny', protocolo: 'TCP', puertoInicio: 22, puertoFin: 22, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete(sg, nacl, {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 33333,
      puertoDst: 22,
      ipSrc: '8.8.8.8',
      ipDst: '10.0.0.5',
    })
    expect(r.securityGroup.decisión).toBe('allow')
    expect(r.nacl.decisión).toBe('deny')
    expect(r.decisiónFinal).toBe('deny')
  })

  it('paquete allowed por ambas → allow', () => {
    const sg: SecurityGroup = {
      reglasIn: [{ id: 'a', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' }],
      reglasOut: [],
    }
    const nacl: ReglaNacl[] = [
      { numero: 100, acción: 'allow', protocolo: 'TCP', puertoInicio: 443, puertoFin: 443, cidr: '0.0.0.0/0' },
    ]
    const r = evaluarPaquete(sg, nacl, {
      direccion: 'in',
      protocolo: proto('tcp'),
      puertoSrc: 33333,
      puertoDst: 443,
      ipSrc: '8.8.8.8',
      ipDst: '10.0.0.5',
    })
    expect(r.decisiónFinal).toBe('allow')
  })
})
