import { describe, it, expect } from 'vitest'
import {
  type TipoInstanciaParseado,
  parsearTipoInstancia,
  familiasInstancia,
} from '../ec2-instances'

describe('parsearTipoInstancia', () => {
  it('decodifica m7gd.xlarge en familia/generación/procesador/atributos/tamaño', () => {
    const r = parsearTipoInstancia('m7gd.xlarge')
    expect(r).not.toBeNull()
    expect(r).toEqual<TipoInstanciaParseado>({
      familia: 'M',
      generacion: 7,
      procesador: 'g',
      atributos: ['d'],
      tamano: 'xlarge',
      raw: 'm7gd.xlarge',
    })
  })

  it('decodifica t3.micro sin procesador explícito (default Intel)', () => {
    const r = parsearTipoInstancia('t3.micro')
    expect(r).not.toBeNull()
    expect(r!.familia).toBe('T')
    expect(r!.generacion).toBe(3)
    expect(r!.procesador).toBeNull()
    expect(r!.atributos).toEqual([])
    expect(r!.tamano).toBe('micro')
  })

  it('decodifica c6in.4xlarge con múltiples atributos (i=n, n=red mejorada)', () => {
    const r = parsearTipoInstancia('c6in.4xlarge')
    expect(r).not.toBeNull()
    expect(r!.familia).toBe('C')
    expect(r!.generacion).toBe(6)
    expect(r!.procesador).toBe('i')
    expect(r!.atributos).toEqual(['n'])
    expect(r!.tamano).toBe('4xlarge')
  })

  it('decodifica r6i.2xlarge (procesador i explícito, sin atributos)', () => {
    const r = parsearTipoInstancia('r6i.2xlarge')
    expect(r).not.toBeNull()
    expect(r!.familia).toBe('R')
    expect(r!.generacion).toBe(6)
    expect(r!.procesador).toBe('i')
    expect(r!.atributos).toEqual([])
    expect(r!.tamano).toBe('2xlarge')
  })

  it('decodifica m5zn.12xlarge con z (alta frecuencia) y n (red mejorada)', () => {
    const r = parsearTipoInstancia('m5zn.12xlarge')
    expect(r).not.toBeNull()
    expect(r!.familia).toBe('M')
    expect(r!.generacion).toBe(5)
    expect(r!.procesador).toBeNull() // z y n son atributos, no procesador
    expect(r!.atributos).toEqual(['z', 'n'])
    expect(r!.tamano).toBe('12xlarge')
  })

  it('decodifica m5.metal (tamaño metal)', () => {
    const r = parsearTipoInstancia('m5.metal')
    expect(r).not.toBeNull()
    expect(r!.tamano).toBe('metal')
  })

  it('decodifica t3.nano (tamaño más chico de la progresión, section 2.1)', () => {
    const r = parsearTipoInstancia('t3.nano')
    expect(r).not.toBeNull()
    expect(r!.tamano).toBe('nano')
  })

  it('decodifica familias multi-letra (inf, trn) sin truncarlas a un solo carácter', () => {
    const inf = parsearTipoInstancia('inf1.xlarge')
    expect(inf).not.toBeNull()
    expect(inf!.familia).toBe('INF')
    expect(inf!.generacion).toBe(1)

    const trn = parsearTipoInstancia('trn1.2xlarge')
    expect(trn).not.toBeNull()
    expect(trn!.familia).toBe('TRN')
  })

  it('rechaza 48xlarge: no está en la progresión de tamaños del material', () => {
    expect(parsearTipoInstancia('m6i.48xlarge')).toBeNull()
  })

  it('devuelve null cuando el formato no encaja', () => {
    expect(parsearTipoInstancia('m7gd')).toBeNull() // sin tamaño
    expect(parsearTipoInstancia('m7gd.')).toBeNull()
    expect(parsearTipoInstancia('')).toBeNull()
    expect(parsearTipoInstancia('zz99.invalid')).toBeNull() // familia inválida
    expect(parsearTipoInstancia('m7.tamanoinventado')).toBeNull() // tamaño desconocido
  })

  it('tolera mayúsculas', () => {
    const r = parsearTipoInstancia('M7GD.XLARGE')
    expect(r).not.toBeNull()
    expect(r!.familia).toBe('M')
    expect(r!.procesador).toBe('g')
    expect(r!.atributos).toEqual(['d'])
    expect(r!.tamano).toBe('xlarge')
  })

  it('trim de espacios', () => {
    const r = parsearTipoInstancia('  t3.micro  ')
    expect(r).not.toBeNull()
    expect(r!.familia).toBe('T')
    expect(r!.tamano).toBe('micro')
  })
})

describe('familiasInstancia', () => {
  it('incluye las 12 familias del curso (T/M/C/R/X/I/D/H/P/G/INF/TRN), con su categoría y perfil', () => {
    const ids = familiasInstancia.map((f) => f.familia)
    expect(ids).toEqual(['T', 'M', 'C', 'R', 'X', 'I', 'D', 'H', 'P', 'G', 'INF', 'TRN'])
  })

  it('el mnemotécnico GPU va con la letra G, no con P (así lo dice section 2.2)', () => {
    const g = familiasInstancia.find((f) => f.familia === 'G')
    const p = familiasInstancia.find((f) => f.familia === 'P')
    expect(g?.reglaMnemotecnica).toBe('GPU')
    expect(p?.reglaMnemotecnica).toBeUndefined()
  })

  it('cada familia tiene ejemplos y casos de uso como strings no vacíos', () => {
    for (const f of familiasInstancia) {
      expect(f.categoria.length).toBeGreaterThan(0)
      expect(f.perfil.length).toBeGreaterThan(0)
      expect(f.casosDeUso.length).toBeGreaterThan(0)
    }
  })
})
