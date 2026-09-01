import { describe, it, expect } from 'vitest'
import {
  type Ruta,
  type ResultadoEvaluacion,
  seleccionarRutaGanadora,
  evaluarPaquete,
} from '../route-tables'

describe('seleccionarRutaGanadora', () => {
  const tabla: Ruta[] = [
    { id: 'local', destino: '10.0.0.0/16', target: 'local', descripcion: 'Red privada' },
    { id: 'subred-a', destino: '10.0.1.0/24', target: 'eni-1', descripcion: 'Subred A' },
    { id: 'default', destino: '0.0.0.0/0', target: 'igw-1', descripcion: 'Internet' },
  ]

  it('elige la ruta con prefijo más largo (longest prefix match)', () => {
    expect(seleccionarRutaGanadora(tabla, '10.0.1.42')).toBe(tabla[1])
  })

  it('elige la ruta local cuando hay match pero ninguna específica', () => {
    expect(seleccionarRutaGanadora(tabla, '10.0.5.10')).toBe(tabla[0])
  })

  it('elige la default route cuando no hay match más específico', () => {
    expect(seleccionarRutaGanadora(tabla, '8.8.8.8')).toBe(tabla[2])
  })

  it('prefijos iguales: desempata por orden de inserción (primera gana)', () => {
    const tablaEmpatada: Ruta[] = [
      { id: 'a', destino: '10.0.0.0/8', target: 'a', descripcion: '' },
      { id: 'b', destino: '10.0.0.0/8', target: 'b', descripcion: '' },
    ]
    expect(seleccionarRutaGanadora(tablaEmpatada, '10.5.6.7')).toBe(tablaEmpatada[0])
  })

  it('ignora entradas con destino inválido (defensivo)', () => {
    const tablaRota: Ruta[] = [
      { id: 'ok', destino: '0.0.0.0/0', target: 'igw', descripcion: '' },
      { id: 'rota', destino: 'no-es-cidr', target: '?', descripcion: '' },
    ]
    expect(seleccionarRutaGanadora(tablaRota, '1.2.3.4')).toBe(tablaRota[0])
  })

  it('devuelve null cuando ninguna ruta aplica (incluye tabla vacía)', () => {
    expect(seleccionarRutaGanadora([], '1.2.3.4')).toBeNull()
    const ganadora = seleccionarRutaGanadora(tabla, '1.2.3.4')
    expect(ganadora).not.toBeNull()
    expect(ganadora!.id).not.toBe('local')
  })
})

describe('evaluarPaquete', () => {
  const tabla: Ruta[] = [
    { id: 'local', destino: '10.0.0.0/16', target: 'local', descripcion: 'Red privada' },
    { id: 'subred-a', destino: '10.0.1.0/24', target: 'eni-1', descripcion: 'Subred A' },
    { id: 'default', destino: '0.0.0.0/0', target: 'igw-1', descripcion: 'Internet' },
  ]

  it('estructura del resultado con ruta ganadora', () => {
    const r: ResultadoEvaluacion = evaluarPaquete(tabla, '10.0.1.42')
    expect(r.ganadora).not.toBeNull()
    expect(r.ganadora!.id).toBe('subred-a')
    expect(r.candidatas).toHaveLength(3)
    expect(r.candidatas.map((c) => c.ruta.id).sort()).toEqual(['default', 'local', 'subred-a'])
  })

  it('resultado sin ganadora cuando tabla vacía', () => {
    const r = evaluarPaquete([], '1.2.3.4')
    expect(r.ganadora).toBeNull()
    expect(r.candidatas).toEqual([])
  })

  it('candidatas se ordenan por especificidad descendente', () => {
    const r = evaluarPaquete(tabla, '10.0.1.42')
    expect(r.candidatas[0].ruta.id).toBe('subred-a')
    expect(r.candidatas[1].ruta.id).toBe('local')
    expect(r.candidatas[2].ruta.id).toBe('default')
  })

  it('candidatas incluyen el prefijo de cada entrada que matchea', () => {
    const r = evaluarPaquete(tabla, '10.0.1.42')
    const local = r.candidatas.find((c) => c.ruta.id === 'local')
    expect(local?.prefijo).toBe(16)
  })
})
