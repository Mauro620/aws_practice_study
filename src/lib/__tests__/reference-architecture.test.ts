import { describe, expect, it } from 'vitest'
import {
  CAPAS_APILADAS,
  COMPONENTES,
  FALLAS,
  MODOS,
  NODOS,
  RUTAS_TRAFICO,
  type ComponenteId,
  type FallaId,
  type NodoId,
  avanzarFase,
  cambiarRuta,
  crearEstadoFallas,
  crearEstadoTrafico,
  estadoNodos,
  getComponente,
  inyectarFalla,
  modosDisponibles,
  pasoAnterior,
  resaltadoTrafico,
  restablecer,
  retrocederFase,
  siguientePaso,
} from '../reference-architecture'

const REQUIRED_COMPONENTS: ComponenteId[] = [
  'route53', 'cloudfront', 'acm', 'waf', 'shield', 's3', 'internet-gateway', 'vpc', 'zona-disponibilidad',
  'subred-publica', 'subred-privada', 'alb', 'target-group', 'nat-gateway', 'auto-scaling-group', 'ec2',
  'rol-iam', 'ebs', 'rds', 'security-groups', 'tablas-rutas', 'cloudwatch',
]

const GUIDE_SECTION_IDS = [
  'vpc-subnets', 'ec2-keys', 'security-groups', 'ebs-snapshots', 'alb-target-groups',
  'auto-scaling-groups', 'access', 'server-deployment', 'cloudfront-s3', 'commands',
]

const MODULE_ROUTES = ['vpc', 'ec2', 'iam', 'elasticidad', 'cloudfront', 'well-architected', 'bienvenida'].map((id) => `/servicios/${id}`)

describe('MODOS', () => {
  it('declares the five mode ids in teaching order so later phases extend without renumbering', () => {
    expect(MODOS.map(({ id }) => id)).toEqual(['trafico', 'seguridad', 'alta-disponibilidad', 'costos', 'ruta-aprendizaje'])
    expect(MODOS.map(({ numero }) => numero)).toEqual([1, 2, 3, 4, 5])
  })

  it('exposes all five modes now that seguridad, costos and ruta-aprendizaje are implemented', () => {
    expect(modosDisponibles().map(({ id, numero }) => [id, numero])).toEqual([
      ['trafico', 1], ['seguridad', 2], ['alta-disponibilidad', 3], ['costos', 4], ['ruta-aprendizaje', 5],
    ])
  })
})

describe('COMPONENTES', () => {
  it('covers every component of the reference architecture exactly once', () => {
    const ids = COMPONENTES.map(({ id }) => id)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual([...REQUIRED_COMPONENTS].sort())
  })

  it('has real content for the five panel fields of every component', () => {
    for (const componente of COMPONENTES) {
      expect(componente.queEs.length, componente.id).toBeGreaterThan(20)
      expect(componente.porQue.length, componente.id).toBeGreaterThan(40)
      expect(componente.siLoQuitas.length, componente.id).toBeGreaterThan(40)
      expect(componente.cobro.modos.length, componente.id).toBeGreaterThan(0)
      expect(componente.cobro.detalle.length, componente.id).toBeGreaterThan(15)
      expect(componente.modulo.etiqueta.length, componente.id).toBeGreaterThan(3)
    }
  })

  it('never uses markdown emphasis in plain-text content', () => {
    for (const componente of COMPONENTES) {
      expect(JSON.stringify(componente), componente.id).not.toMatch(/\*/)
    }
  })

  it('links every component to a route that exists in the app', () => {
    for (const { id, modulo } of COMPONENTES) {
      if (!modulo.href) continue
      const [path, hash] = modulo.href.split('#')
      if (path === '/guia-arquitectura') expect(GUIDE_SECTION_IDS, id).toContain(hash)
      else expect(MODULE_ROUTES, id).toContain(path)
    }
  })

  it('maps each component to the module where it is taught', () => {
    const href = (id: ComponenteId) => getComponente(id).modulo.href
    for (const id of ['vpc', 'zona-disponibilidad', 'subred-publica', 'subred-privada', 'internet-gateway', 'nat-gateway', 'tablas-rutas'] as const) {
      expect(href(id), id).toBe('/servicios/vpc')
    }
    for (const id of ['cloudfront', 'acm', 's3', 'waf', 'shield', 'route53'] as const) expect(href(id), id).toBe('/servicios/cloudfront')
    expect(href('ec2')).toBe('/servicios/ec2')
    expect(href('ebs')).toBe('/servicios/ec2')
    expect(href('auto-scaling-group')).toBe('/servicios/elasticidad')
    expect(href('cloudwatch')).toBe('/servicios/elasticidad')
    expect(href('rol-iam')).toBe('/servicios/iam')
    expect(href('alb')).toBe('/guia-arquitectura#alb-target-groups')
    expect(href('target-group')).toBe('/guia-arquitectura#alb-target-groups')
    expect(href('security-groups')).toBe('/guia-arquitectura#security-groups')
  })

  it('states plainly that RDS has no dedicated module instead of inventing one', () => {
    const rds = getComponente('rds')
    expect(rds.modulo.nota).toMatch(/no tiene un módulo dedicado/i)
    expect(rds.modulo.href).toBe('/servicios/ec2')
  })

  it('categorizes how each component charges without inventing prices', () => {
    const modos = (id: ComponenteId) => getComponente(id).cobro.modos
    expect(modos('nat-gateway')).toEqual(['fijo-por-hora', 'por-uso'])
    expect(modos('alb')).toEqual(['fijo-por-hora', 'por-uso'])
    expect(modos('route53')).toContain('por-uso')
    expect(modos('cloudfront')).toEqual(['por-uso'])
    for (const id of ['vpc', 'internet-gateway', 'shield', 'security-groups', 'tablas-rutas', 'rol-iam', 'subred-publica', 'subred-privada', 'zona-disponibilidad', 'target-group', 'auto-scaling-group'] as const) {
      expect(modos(id), id).toEqual(['sin-costo'])
    }
    for (const componente of COMPONENTES) expect(componente.cobro.detalle, componente.id).not.toMatch(/\$|USD|US\$/)
  })
})

describe('NODOS', () => {
  it('maps every diagram node to an existing component and every component to at least one node', () => {
    const componentIds = new Set(COMPONENTES.map(({ id }) => id))
    for (const nodo of NODOS) expect(componentIds.has(nodo.componente), nodo.id).toBe(true)
    for (const id of componentIds) expect(NODOS.some(({ componente }) => componente === id), id).toBe(true)
  })

  it('uses the exact CIDR blocks and AZ names taught in the VPC module', () => {
    const sub = (id: NodoId) => NODOS.find((nodo) => nodo.id === id)!.detalle
    expect(sub('vpc')).toBe('10.0.0.0/16')
    expect(sub('subred-publica-a')).toBe('10.0.1.0/24')
    expect(sub('subred-publica-b')).toBe('10.0.2.0/24')
    expect(sub('subred-privada-a')).toBe('10.0.11.0/24')
    expect(sub('subred-privada-b')).toBe('10.0.12.0/24')
    expect(sub('az-a')).toBe('us-east-1a')
    expect(sub('az-b')).toBe('us-east-1b')
  })

  it('represents the ALB as one load balancer present in both AZ', () => {
    const albNodes = NODOS.filter(({ componente }) => componente === 'alb')
    expect(albNodes.map(({ id }) => id)).toEqual(['alb-a', 'alb-b'])
  })

  it('stacks layers from edge to public network to private network to data on narrow screens', () => {
    expect(CAPAS_APILADAS.map(({ capa }) => capa)).toEqual(['borde', 'publica', 'privada', 'datos', 'transversal'])
    const stacked = CAPAS_APILADAS.flatMap(({ grupos }) => grupos.flatMap(({ nodos }) => nodos))
    expect(new Set(stacked).size).toBe(stacked.length)
    expect([...stacked].sort()).toEqual(NODOS.map(({ id }) => id).sort())
  })

  it('colors each node with the layer it is stacked in', () => {
    for (const { capa, grupos } of CAPAS_APILADAS) {
      for (const id of grupos.flatMap(({ nodos }) => nodos)) {
        expect(NODOS.find((nodo) => nodo.id === id)!.capa, id).toBe(capa)
      }
    }
  })
})

describe('Modo 1 · Flujo de tráfico', () => {
  const actores = (ruta: keyof typeof RUTAS_TRAFICO) => RUTAS_TRAFICO[ruta].pasos.map(({ actor }) => actor)

  it('serves a static cache hit from the edge without touching S3', () => {
    const pasos = actores('estatico-hit')
    expect(pasos[0]).toBe('usuario')
    expect(pasos.at(-1)).toBe('usuario')
    expect(pasos.indexOf('route53')).toBeLessThan(pasos.indexOf('cloudfront'))
    expect(pasos).not.toContain('s3')
    expect(pasos).not.toContain('alb-a')
  })

  it('goes down to S3 through OAC on a static cache miss', () => {
    const ruta = RUTAS_TRAFICO['estatico-miss'].pasos
    const s3 = ruta.findIndex(({ actor }) => actor === 's3')
    expect(s3).toBeGreaterThan(ruta.findIndex(({ actor }) => actor === 'cloudfront'))
    expect(ruta[s3].decision).toMatch(/OAC/)
  })

  it('crosses Route 53, CloudFront, ALB, Target Group, EC2 and RDS in order for a dynamic request', () => {
    const pasos = actores('dinamico')
    const order = ['route53', 'cloudfront', 'alb-a', 'target-group', 'ec2-a', 'rds-primaria'].map((id) => pasos.indexOf(id as NodoId))
    expect(order.every((index) => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(pasos.at(-1)).toBe('usuario')
  })

  it('gives every step an acting component and what it decides', () => {
    for (const { pasos } of Object.values(RUTAS_TRAFICO)) {
      for (const paso of pasos) {
        expect(paso.accion.length).toBeGreaterThan(10)
        expect(paso.decision.length).toBeGreaterThan(10)
      }
    }
  })

  it('advances and goes back manually, clamped to the route bounds', () => {
    let estado = crearEstadoTrafico('estatico-hit')
    expect(estado.indice).toBe(0)
    estado = pasoAnterior(estado)
    expect(estado.indice).toBe(0)
    const total = RUTAS_TRAFICO['estatico-hit'].pasos.length
    for (let i = 0; i < total + 3; i++) estado = siguientePaso(estado)
    expect(estado.indice).toBe(total - 1)
    estado = pasoAnterior(estado)
    expect(estado.indice).toBe(total - 2)
  })

  it('restarts from the first step when the route changes', () => {
    const estado = cambiarRuta(siguientePaso(siguientePaso(crearEstadoTrafico('estatico-hit'))), 'dinamico')
    expect(estado).toEqual({ ruta: 'dinamico', indice: 0 })
  })

  it('highlights the acting node, its helpers and the nodes already crossed', () => {
    let estado = crearEstadoTrafico('dinamico')
    while (RUTAS_TRAFICO.dinamico.pasos[estado.indice].actor !== 'alb-a') estado = siguientePaso(estado)
    const resaltado = resaltadoTrafico(estado)
    expect(resaltado.activos).toContain('alb-a')
    expect(resaltado.recorridos).toEqual(expect.arrayContaining(['route53', 'cloudfront']))
    expect(resaltado.recorridos).not.toContain('alb-a')
    expect(resaltado.anterior).toBe('internet-gateway')
  })
})

describe('Modo 3 · Alta disponibilidad', () => {
  const finalDe = (falla: FallaId) => {
    let estado = inyectarFalla(crearEstadoFallas(), falla)
    for (let i = 0; i < 10; i++) estado = avanzarFase(estado)
    return estado
  }

  it('starts with every node healthy and no active fault', () => {
    const estado = crearEstadoFallas()
    expect(estado.falla).toBeNull()
    expect(Object.values(estadoNodos(estado)).every((valor) => valor === 'ok')).toBe(true)
  })

  it('injecting a fault starts at its first phase; phases are clamped', () => {
    let estado = inyectarFalla(crearEstadoFallas(), 'instancia')
    expect(estado).toEqual({ falla: 'instancia', fase: 0 })
    estado = retrocederFase(estado)
    expect(estado.fase).toBe(0)
    expect(finalDe('instancia').fase).toBe(FALLAS.instancia.fases.length - 1)
    expect(restablecer()).toEqual({ falla: null, fase: 0 })
  })

  it('instance failure: health check fails, target group drops it, ASG replaces it', () => {
    const textos = FALLAS.instancia.fases.map(({ titulo, descripcion }) => `${titulo} ${descripcion}`).join(' ')
    expect(textos).toMatch(/health check/i)
    expect(textos).toMatch(/Target Group/)
    expect(textos).toMatch(/ASG|Auto Scaling/)
    const inicio = estadoNodos(inyectarFalla(crearEstadoFallas(), 'instancia'))
    expect(inicio['ec2-a']).toBe('caido')
    expect(inicio['ec2-b']).toBe('ok')
    expect(estadoNodos(finalDe('instancia'))['ec2-a']).toBe('ok')
  })

  it('AZ failure: the ALB stops routing to the zone, RDS promotes the standby, ASG launches in the surviving AZ', () => {
    const inicio = estadoNodos(inyectarFalla(crearEstadoFallas(), 'zona'))
    for (const id of ['az-a', 'subred-publica-a', 'subred-privada-a', 'alb-a', 'nat-a', 'ec2-a', 'rds-primaria'] as NodoId[]) {
      expect(inicio[id], id).toBe('caido')
    }
    const final = estadoNodos(finalDe('zona'))
    expect(final['alb-a']).toBe('caido')
    expect(final['alb-b']).toBe('ok')
    expect(final['rds-standby']).toBe('ok')
    expect(final['ec2-b']).toBe('ok')
    const textos = FALLAS.zona.fases.map(({ descripcion }) => descripcion).join(' ')
    expect(textos).toMatch(/promueve/i)
    expect(textos).toMatch(/us-east-1b/)
  })

  it('NAT failure: instances lose outbound internet but keep serving inbound requests', () => {
    for (let fase = 0; fase < FALLAS.nat.fases.length; fase++) {
      const nodos = estadoNodos({ falla: 'nat', fase })
      expect(nodos['nat-a']).toBe('caido')
      expect(nodos['alb-a']).toBe('ok')
      expect(nodos['target-group']).toBe('ok')
      expect(nodos['nat-b']).toBe('ok')
    }
    expect(estadoNodos({ falla: 'nat', fase: 1 })['ec2-a']).toBe('degradado')
    expect(FALLAS.nat.seDegrada.join(' ')).toMatch(/salida/i)
    expect(FALLAS.nat.sigueFuncionando.join(' ')).toMatch(/entrantes/i)
  })

  it('every fault states what keeps working, what degrades and a qualitative recovery time', () => {
    for (const falla of Object.values(FALLAS)) {
      expect(falla.sigueFuncionando.length).toBeGreaterThan(0)
      expect(falla.seDegrada.length).toBeGreaterThan(0)
      expect(falla.recuperacion.length).toBeGreaterThan(10)
      expect(falla.recuperacion).not.toMatch(/\d+\s?(ms|segundos exactos)/)
      expect(falla.fases.length).toBeGreaterThanOrEqual(3)
    }
  })
})
