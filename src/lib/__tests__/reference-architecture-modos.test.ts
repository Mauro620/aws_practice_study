import { describe, expect, it } from 'vitest'
import {
  ARISTAS,
  AVISO_ESTIMACION,
  COMPONENTES,
  CONTROLES_SEGURIDAD,
  MODULOS_RUTA,
  MODULO_DE_COMPONENTE,
  NODOS,
  OBJETIVOS_SEGURIDAD,
  PARTIDAS_COSTO,
  SORPRESAS_COSTO,
  VARIANTES,
  activarTodosControles,
  alternarControl,
  aristasDeVariante,
  capasApiladasDe,
  categoriaCobro,
  coberturaSeguridad,
  crearEstadoRuta,
  crearEstadoSeguridad,
  desactivarTodosControles,
  diferenciaVariantes,
  estimarCosto,
  etiquetaTrafico,
  fijarAvance,
  getComponente,
  idArista,
  marcarProgreso,
  nodosDeVariante,
  pendientesPorModulo,
  progresoComponentes,
  resumenProgreso,
  varianteEfectiva,
  type ComponenteId,
  type ControlId,
  type NodoId,
  type VarianteId,
} from '../reference-architecture'

const ARISTA_IDS = new Set(ARISTAS.map(idArista))
const NODO_IDS = new Set(NODOS.map(({ id }) => id))
const idsDe = (variante: VarianteId) => nodosDeVariante(variante).map(({ id }) => id)
const dentro = (hijo: { x: number; y: number; w: number; h: number }, padre: { x: number; y: number; w: number; h: number }) =>
  hijo.x >= padre.x && hijo.y >= padre.y && hijo.x + hijo.w <= padre.x + padre.w && hijo.y + hijo.h <= padre.y + padre.h

describe('ARISTAS', () => {
  it('connects only existing nodes (or the user) and has unique ids', () => {
    expect(ARISTA_IDS.size).toBe(ARISTAS.length)
    for (const { de, a } of ARISTAS) {
      expect(de === 'usuario' || NODO_IDS.has(de), de).toBe(true)
      expect(NODO_IDS.has(a), a).toBe(true)
    }
  })

  it('draws the HTTPS leg from the user straight to CloudFront, not only the DNS lookup', () => {
    expect(ARISTA_IDS.has('usuario->cloudfront')).toBe(true)
    expect(ARISTA_IDS.has('usuario->route53')).toBe(true)
  })
})

describe('Variantes · Mínima / Intermedia / Completa', () => {
  it('orders the three variants from simplest to complete', () => {
    expect(VARIANTES.map(({ id }) => id)).toEqual(['minima', 'intermedia', 'completa'])
  })

  it('Completa is exactly the main diagram', () => {
    expect(idsDe('completa')).toEqual(NODOS.map(({ id }) => id))
    expect(nodosDeVariante('completa')).toEqual(NODOS)
    expect(aristasDeVariante('completa').map(idArista)).not.toContain('usuario->internet-gateway')
  })

  it('Mínima is one EC2 with a public IP in a public subnet: no HA, no CDN, no private layer', () => {
    const ids = idsDe('minima')
    expect(ids).toEqual(expect.arrayContaining(['vpc', 'internet-gateway', 'az-a', 'subred-publica-a', 'ec2-a', 'ebs-a', 'security-groups']))
    for (const ausente of ['az-b', 'alb-a', 'alb-b', 'nat-a', 'auto-scaling-group', 'subred-privada-a', 'rds-primaria', 'cloudfront', 'route53', 's3', 'ec2-b'] as NodoId[]) {
      expect(ids, ausente).not.toContain(ausente)
    }
    const ec2 = nodosDeVariante('minima').find(({ id }) => id === 'ec2-a')!
    expect(ec2.capa).toBe('publica')
    expect(ec2.detalle).toMatch(/IP pública/)
    expect(dentro(ec2, nodosDeVariante('minima').find(({ id }) => id === 'subred-publica-a')!)).toBe(true)
  })

  it('Intermedia has ALB, two AZ, ASG, private subnets and NAT, but no CDN nor own certificate', () => {
    const ids = idsDe('intermedia')
    expect(ids).toEqual(expect.arrayContaining(['alb-a', 'alb-b', 'az-a', 'az-b', 'auto-scaling-group', 'subred-privada-a', 'subred-privada-b', 'nat-a', 'nat-b']))
    for (const ausente of ['cloudfront', 'acm', 'waf', 'shield', 's3', 'route53'] as NodoId[]) expect(ids, ausente).not.toContain(ausente)
  })

  it('only keeps edges whose ends exist in the variant and adds the direct entry when there is no CDN', () => {
    for (const variante of ['minima', 'intermedia', 'completa'] as VarianteId[]) {
      const ids = new Set<string>(idsDe(variante))
      for (const { de, a } of aristasDeVariante(variante)) {
        expect(de === 'usuario' || ids.has(de), `${variante} ${de}`).toBe(true)
        expect(ids.has(a), `${variante} ${a}`).toBe(true)
      }
    }
    expect(aristasDeVariante('minima').map(idArista)).toEqual(expect.arrayContaining(['usuario->internet-gateway', 'internet-gateway->ec2-a']))
    expect(aristasDeVariante('intermedia').map(idArista)).toContain('usuario->internet-gateway')
    expect(aristasDeVariante('intermedia').map(idArista)).not.toContain('internet-gateway->ec2-a')
  })

  it('each variant grows on the previous one', () => {
    expect(idsDe('intermedia').length).toBeGreaterThan(idsDe('minima').length)
    expect(idsDe('completa').length).toBeGreaterThan(idsDe('intermedia').length)
    const diff = diferenciaVariantes('intermedia', 'completa')
    expect([...diff.agregados].sort()).toEqual(['acm', 'cloudfront', 'route53', 's3', 'shield', 'waf'])
    expect(diff.quitados).toEqual([])
    expect(diferenciaVariantes('minima', 'completa').agregados).toEqual(expect.arrayContaining(['alb', 'nat-gateway', 'auto-scaling-group', 'rds', 'cloudfront']))
  })

  it('lists what each variant gains and what costs more against the previous one, and what it still lacks', () => {
    const [minima, intermedia, completa] = VARIANTES
    expect(minima.frenteAnterior).toBeNull()
    for (const variante of [intermedia, completa]) {
      expect(variante.frenteAnterior!.gana.length, variante.id).toBeGreaterThan(1)
      expect(variante.frenteAnterior!.cuestaMas.length, variante.id).toBeGreaterThan(1)
    }
    for (const variante of VARIANTES) expect(variante.leFalta.length, variante.id).toBeGreaterThan(0)
    expect(intermedia.frenteAnterior!.cuestaMas.join(' ')).toMatch(/NAT/)
    expect(JSON.stringify(VARIANTES)).not.toMatch(/\*|\$|USD/)
  })

  it('restacks the narrow-screen layers for a variant, dropping empty groups and layers', () => {
    const completa = capasApiladasDe('completa')
    expect(completa.map(({ capa }) => capa)).toEqual(['borde', 'publica', 'privada', 'datos', 'transversal'])
    const minima = capasApiladasDe('minima')
    expect(minima.map(({ capa }) => capa)).toEqual(['publica', 'datos', 'transversal'])
    const apilados = minima.flatMap(({ grupos }) => grupos.flatMap(({ nodos }) => nodos))
    expect([...apilados].sort()).toEqual([...idsDe('minima')].sort())
    const publica = minima.find(({ capa }) => capa === 'publica')!
    expect(publica.grupos.flatMap(({ nodos }) => nodos)).toContain('ec2-a')
    for (const { grupos } of minima) for (const grupo of grupos) expect(grupo.nodos.length, grupo.titulo).toBeGreaterThan(0)
  })

  it('modes 1 and 3 always walk the Completa variant', () => {
    expect(varianteEfectiva('trafico', 'minima')).toBe('completa')
    expect(varianteEfectiva('alta-disponibilidad', 'intermedia')).toBe('completa')
    expect(varianteEfectiva('seguridad', 'minima')).toBe('minima')
    expect(varianteEfectiva('costos', 'intermedia')).toBe('intermedia')
    expect(varianteEfectiva('ruta-aprendizaje', 'minima')).toBe('minima')
  })
})

describe('Modo 2 · Seguridad por capas', () => {
  const TODOS: ControlId[] = ['tls', 'waf-shield', 'security-groups', 'nacl', 'iam', 'oac', 'cifrado-reposo']
  const solo = (id: ControlId) => ({ activos: [id] })

  it('declares the seven security layers in order', () => {
    expect(CONTROLES_SEGURIDAD.map(({ id }) => id)).toEqual(TODOS)
  })

  it('every layer states where it acts, what it protects against and what it does not cover', () => {
    for (const control of CONTROLES_SEGURIDAD) {
      expect(control.alcance.length, control.id).toBeGreaterThan(15)
      expect(control.protegeContra.length, control.id).toBeGreaterThan(0)
      expect(control.noCubre.length, control.id).toBeGreaterThan(1)
      for (const id of control.nodos) expect(NODO_IDS.has(id), `${control.id} ${id}`).toBe(true)
      for (const id of control.aristas) expect(ARISTA_IDS.has(id), `${control.id} ${id}`).toBe(true)
    }
    expect(JSON.stringify(CONTROLES_SEGURIDAD)).not.toMatch(/\*/)
  })

  it('places each control where the course teaches it', () => {
    const control = (id: ControlId) => CONTROLES_SEGURIDAD.find((c) => c.id === id)!
    expect(control('tls').aristas).toEqual(expect.arrayContaining(['usuario->cloudfront', 'cloudfront->s3', 'cloudfront->internet-gateway']))
    expect(control('waf-shield').nodos).toEqual(expect.arrayContaining(['cloudfront', 'waf', 'shield']))
    expect(control('nacl').nodos).toEqual(expect.arrayContaining(['subred-publica-a', 'subred-publica-b', 'subred-privada-a', 'subred-privada-b']))
    expect(control('security-groups').nodos).toEqual(expect.arrayContaining(['alb-a', 'ec2-a', 'rds-primaria']))
    expect(control('security-groups').nodos).not.toContain('nat-a')
    expect(control('oac').aristas).toEqual(['cloudfront->s3'])
    expect(control('cifrado-reposo').nodos).toEqual(expect.arrayContaining(['s3', 'ebs-a', 'ebs-b', 'rds-primaria', 'rds-standby']))
    expect(control('iam').nodos).toEqual(expect.arrayContaining(['rol-iam', 'ec2-a']))
    expect(control('nacl').noCubre.join(' ')).toMatch(/por defecto permite todo/)
  })

  it('starts with one layer active and toggles layers on and off', () => {
    let estado = crearEstadoSeguridad()
    expect(estado.activos).toEqual(['security-groups'])
    estado = alternarControl(estado, 'tls')
    expect(estado.activos).toEqual(['tls', 'security-groups'])
    estado = alternarControl(estado, 'security-groups')
    expect(estado.activos).toEqual(['tls'])
    expect(activarTodosControles().activos).toEqual(TODOS)
    expect(desactivarTodosControles().activos).toEqual([])
  })

  it('no single layer covers every protected component', () => {
    for (const id of TODOS) {
      expect(coberturaSeguridad(solo(id), 'completa').sinCobertura.length, id).toBeGreaterThan(0)
    }
  })

  it('with every layer active nothing is left uncovered, but some components depend on a single layer', () => {
    const cobertura = coberturaSeguridad(activarTodosControles(), 'completa')
    expect(cobertura.sinCobertura).toEqual([])
    expect(cobertura.unaSolaCapa).toEqual(expect.arrayContaining(['nat-a', 'nat-b', 'ebs-a', 'ebs-b', 'route53']))
    expect(cobertura.porNodo['nat-a']).toEqual(['nacl'])
  })

  it('with only Security Groups active, the edge, S3, NAT and disks are exposed', () => {
    const cobertura = coberturaSeguridad(solo('security-groups'), 'completa')
    expect(cobertura.sinCobertura).toEqual(expect.arrayContaining(['cloudfront', 's3', 'nat-a', 'ebs-a', 'route53']))
    expect(cobertura.sinCobertura).not.toContain('ec2-a')
    expect(cobertura.porNodo['ec2-a']).toEqual(['security-groups'])
    expect(cobertura.porArista['target-group->ec2-a']).toEqual(['security-groups'])
  })

  it('with nothing active every protected component in the variant is uncovered', () => {
    const cobertura = coberturaSeguridad(desactivarTodosControles(), 'completa')
    expect([...cobertura.sinCobertura].sort()).toEqual([...OBJETIVOS_SEGURIDAD].sort())
  })

  it('only counts components present in the variant: TLS has nowhere to act in Mínima', () => {
    const cobertura = coberturaSeguridad(solo('tls'), 'minima')
    expect(Object.values(cobertura.porNodo).flat()).toEqual([])
    expect(cobertura.sinCobertura).toEqual(expect.arrayContaining(['ec2-a', 'ebs-a']))
    expect(cobertura.sinCobertura).not.toContain('cloudfront')
    const sg = coberturaSeguridad(solo('security-groups'), 'minima')
    expect(sg.porArista['internet-gateway->ec2-a']).toEqual(['security-groups'])
  })
})

describe('Modo 4 · Costos', () => {
  it('derives a charge category for every component from its existing cobro data', () => {
    expect(categoriaCobro('nat-gateway')).toBe('fijo-y-uso')
    expect(categoriaCobro('alb')).toBe('fijo-y-uso')
    expect(categoriaCobro('rds')).toBe('fijo-y-uso')
    expect(categoriaCobro('ec2')).toBe('fijo-por-hora')
    expect(categoriaCobro('cloudfront')).toBe('por-uso')
    expect(categoriaCobro('vpc')).toBe('sin-costo')
    for (const { id, cobro } of COMPONENTES) {
      const categoria = categoriaCobro(id)
      if (categoria === 'fijo-y-uso') expect(cobro.modos, id).toEqual(['fijo-por-hora', 'por-uso'])
      else expect(cobro.modos, id).toEqual([categoria])
    }
  })

  it('labels the estimate as illustrative relative units, never as AWS prices', () => {
    expect(AVISO_ESTIMACION).toMatch(/ilustrativa/i)
    expect(AVISO_ESTIMACION).toMatch(/no son precios reales de AWS/)
    expect(AVISO_ESTIMACION).toMatch(/calculadora de precios de AWS/)
    expect(JSON.stringify([PARTIDAS_COSTO, SORPRESAS_COSTO, AVISO_ESTIMACION])).not.toMatch(/\$|USD|US\$|\*/)
  })

  it('references only existing nodes and edges', () => {
    for (const partida of PARTIDAS_COSTO) for (const id of partida.nodos) expect(NODO_IDS.has(id), `${partida.id} ${id}`).toBe(true)
    for (const sorpresa of SORPRESAS_COSTO) {
      for (const id of sorpresa.nodos) expect(NODO_IDS.has(id), sorpresa.id).toBe(true)
      for (const id of sorpresa.aristas) expect(ARISTA_IDS.has(id), sorpresa.id).toBe(true)
    }
  })

  it('flags the two surprise charges: NAT per hour with zero traffic and cross-AZ transfer', () => {
    expect(SORPRESAS_COSTO.map(({ id }) => id)).toEqual(['nat-por-hora', 'entre-az'])
    const [nat, entreAz] = SORPRESAS_COSTO
    expect(nat.nodos).toEqual(['nat-a', 'nat-b'])
    expect(nat.descripcion).toMatch(/aunque no haya tráfico/)
    expect(entreAz.aristas).toContain('ec2-b->rds-primaria')
  })

  it('with zero traffic only fixed charges remain, and the NAT Gateways are among them', () => {
    const noche = estimarCosto('completa', 0)
    expect(noche.variable).toBe(0)
    expect(noche.total).toBeCloseTo(noche.fijo)
    const nat = noche.partidas.find(({ id }) => id === 'nat')!
    expect(nat.unidades).toBeGreaterThan(0)
    expect(noche.natEnReposo).toBeCloseTo(nat.unidades)
    expect(noche.partidas.find(({ id }) => id === 'entre-az')!.unidades).toBe(0)
  })

  it('never lowers the estimate when traffic grows, and clamps traffic to 0..100', () => {
    for (const variante of ['minima', 'intermedia', 'completa'] as VarianteId[]) {
      let anterior = -1
      for (let trafico = 0; trafico <= 100; trafico += 10) {
        const { total } = estimarCosto(variante, trafico)
        expect(total, `${variante} ${trafico}`).toBeGreaterThanOrEqual(anterior)
        anterior = total
      }
      expect(estimarCosto(variante, 500)).toEqual(estimarCosto(variante, 100))
      expect(estimarCosto(variante, -5)).toEqual(estimarCosto(variante, 0))
    }
  })

  it('orders fixed cost Mínima < Intermedia < Completa; Mínima has no NAT, no cross-AZ and does not scale', () => {
    const [minima, intermedia, completa] = (['minima', 'intermedia', 'completa'] as VarianteId[]).map((v) => estimarCosto(v, 0))
    expect(minima.fijo).toBeLessThan(intermedia.fijo)
    expect(intermedia.fijo).toBeLessThan(completa.fijo)
    expect(minima.partidas.map(({ id }) => id)).not.toContain('nat')
    expect(minima.partidas.map(({ id }) => id)).not.toContain('entre-az')
    expect(minima.natEnReposo).toBe(0)
    expect(minima.escala).toBe(false)
    expect(intermedia.escala).toBe(true)
  })

  it('the ASG scales less behind CloudFront because static content never reaches the origin', () => {
    const escalado = (v: VarianteId) => estimarCosto(v, 100).partidas.find(({ id }) => id === 'asg')!.unidades
    expect(escalado('completa')).toBeLessThan(escalado('intermedia'))
    expect(estimarCosto('intermedia', 100).partidas.find(({ id }) => id === 'entre-az')!.unidades).toBeGreaterThan(0)
  })

  it('describes traffic levels in words for the slider', () => {
    expect(etiquetaTrafico(0)).toMatch(/sin tráfico/i)
    expect(etiquetaTrafico(20)).toMatch(/bajo/i)
    expect(etiquetaTrafico(50)).toMatch(/medio/i)
    expect(etiquetaTrafico(90)).toMatch(/alto/i)
  })
})

describe('Modo 5 · Ruta de aprendizaje', () => {
  const componentesDe = (modulo: string) => COMPONENTES.filter(({ id }) => MODULO_DE_COMPONENTE[id] === modulo).map(({ id }) => id)

  it('follows the course module order M3 to M7', () => {
    expect(MODULOS_RUTA.map(({ id }) => id)).toEqual(['vpc', 'ec2', 'iam', 'elasticidad', 'cloudfront'])
    expect(MODULOS_RUTA.map(({ href }) => href)).toEqual(['/servicios/vpc', '/servicios/ec2', '/servicios/iam', '/servicios/elasticidad', '/servicios/cloudfront'])
  })

  it('assigns every component to one module, consistent with the module it links to', () => {
    const modulos = new Set(MODULOS_RUTA.map(({ id }) => id))
    for (const { id, modulo } of COMPONENTES) {
      expect(modulos.has(MODULO_DE_COMPONENTE[id]), id).toBe(true)
      if (modulo.href?.startsWith('/servicios/')) expect(`/servicios/${MODULO_DE_COMPONENTE[id]}`, id).toBe(modulo.href)
    }
    expect(MODULO_DE_COMPONENTE.alb).toBe('elasticidad')
    expect(MODULO_DE_COMPONENTE['security-groups']).toBe('vpc')
  })

  it('derives progress from how far the student got: earlier modules mastered, current in progress, later unseen', () => {
    let estado = crearEstadoRuta()
    expect(estado).toEqual({ avance: 0, ajustes: {} })
    let progreso = progresoComponentes(estado)
    for (const id of componentesDe('vpc')) expect(progreso[id], id).toBe('en-curso')
    for (const id of componentesDe('ec2')) expect(progreso[id], id).toBe('no-visto')

    estado = fijarAvance(estado, 2)
    progreso = progresoComponentes(estado)
    for (const id of [...componentesDe('vpc'), ...componentesDe('ec2')]) expect(progreso[id], id).toBe('dominado')
    for (const id of componentesDe('iam')) expect(progreso[id], id).toBe('en-curso')
    for (const id of componentesDe('cloudfront')) expect(progreso[id], id).toBe('no-visto')

    progreso = progresoComponentes(fijarAvance(estado, MODULOS_RUTA.length))
    expect(Object.values(progreso).every((valor) => valor === 'dominado')).toBe(true)
    expect(fijarAvance(estado, 99).avance).toBe(MODULOS_RUTA.length)
    expect(fijarAvance(estado, -1).avance).toBe(0)
  })

  it('lets the student adjust a single component, and a new starting point clears the adjustments', () => {
    let estado = marcarProgreso(crearEstadoRuta(), 'cloudfront', 'dominado')
    expect(progresoComponentes(estado).cloudfront).toBe('dominado')
    expect(progresoComponentes(estado).s3).toBe('no-visto')
    estado = fijarAvance(estado, 1)
    expect(estado.ajustes).toEqual({})
    expect(progresoComponentes(estado).cloudfront).toBe('no-visto')
  })

  it('counts each state and lists unseen components by module with a link to study them', () => {
    const estado = fijarAvance(crearEstadoRuta(), 3)
    const resumen = resumenProgreso(estado)
    expect(resumen.dominado + resumen['en-curso'] + resumen['no-visto']).toBe(COMPONENTES.length)
    const pendientes = pendientesPorModulo(estado)
    expect(pendientes.map(({ modulo }) => modulo.id)).toEqual(['cloudfront'])
    for (const grupo of pendientes) {
      for (const id of grupo.componentes) {
        expect(progresoComponentes(estado)[id]).toBe('no-visto')
        expect(getComponente(id as ComponenteId).modulo.href).toBeTruthy()
      }
    }
    expect(pendientesPorModulo(fijarAvance(estado, MODULOS_RUTA.length))).toEqual([])
  })
})
