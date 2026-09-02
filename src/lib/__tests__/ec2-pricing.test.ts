import { describe, it, expect } from 'vitest'
import {
  type EntradasComparador,
  type ModeloCompra,
  TODOS_LOS_MODELOS,
  DESCUENTOS_MAXIMOS,
  DESCRIPCIONES,
  calcularCostoMensual,
  compararModelos,
} from '../ec2-pricing'

const cargaEstable: EntradasComparador = {
  precioOnDemandPorHoraUSD: 0.1,
  horasPorMes: 730,
  tipoCarga: 'estable',
  tolerancia: 'mission-critical',
}

describe('calcularCostoMensual — On-Demand', () => {
  it('costo = precio * horas', () => {
    const r = calcularCostoMensual('on-demand', { ...cargaEstable, horasPorMes: 100 })
    expect(r.costoMensualUSD).toBe(0.1 * 100)
    expect(r.aplicable).toBe(true)
    expect(r.descuentoMaximoVsOnDemandPct).toBe(0)
  })

  it('730 horas * 0.10 USD/h = 73 USD', () => {
    const r = calcularCostoMensual('on-demand', cargaEstable)
    expect(r.costoMensualUSD).toBe(73)
  })
})

describe('calcularCostoMensual — Savings Plans / Reserved', () => {
  it('SP con 50% descuento → mitad del costo', () => {
    const r = calcularCostoMensual('savings-plan', { ...cargaEstable, descuentoCompromisoPct: 50 })
    expect(r.costoMensualUSD).toBe(36.5)
    expect(r.aplicable).toBe(true)
  })

  it('SP clipea al descuento máximo (72%)', () => {
    const r = calcularCostoMensual('savings-plan', { ...cargaEstable, descuentoCompromisoPct: 95 })
    expect(r.costoMensualUSD).toBeCloseTo(73 * 0.28, 2)
  })

  it('RI = SP en matemática, distinta en flexibilidad (mismo cálculo)', () => {
    const sp = calcularCostoMensual('savings-plan', { ...cargaEstable, descuentoCompromisoPct: 60 })
    const ri = calcularCostoMensual('reserved-instance', { ...cargaEstable, descuentoCompromisoPct: 60 })
    expect(sp.costoMensualUSD).toBe(ri.costoMensualUSD)
  })

  it('no aplica a carga impredecible', () => {
    const r = calcularCostoMensual('savings-plan', { ...cargaEstable, tipoCarga: 'impredecible' })
    expect(r.aplicable).toBe(false)
    expect(r.noAplicableRazon).toMatch(/impredecible/i)
    expect(r.costoMensualUSD).toBeNull()
  })
})

describe('calcularCuestoMensual — Spot', () => {
  it('Spot con 80% descuento → 20% del costo', () => {
    const r = calcularCostoMensual('spot', {
      ...cargaEstable,
      tipoCarga: 'batch-ci',
      tolerancia: 'best-effort',
      descuentoCompromisoPct: 80,
    })
    expect(r.costoMensualUSD).toBeCloseTo(73 * 0.20, 2)
  })

  it('Spot no aplica si la carga es crítica', () => {
    const r = calcularCostoMensual('spot', cargaEstable)
    expect(r.aplicable).toBe(false)
    expect(r.noAplicableRazon).toMatch(/2 minutos/i)
  })

  it('Spot clip al 90% (descuento máximo del modelo)', () => {
    const r = calcularCostoMensual('spot', {
      ...cargaEstable,
      tipoCarga: 'batch-ci',
      tolerancia: 'best-effort',
      descuentoCompromisoPct: 99,
    })
    expect(r.costoMensualUSD).toBeCloseTo(73 * 0.10, 2) // 90% descuento max
  })

  it('Spot no aplica si tolerancia = none', () => {
    const r = calcularCostoMensual('spot', {
      ...cargaEstable,
      tipoCarga: 'batch-ci',
      tolerancia: 'none',
    })
    expect(r.aplicable).toBe(false)
  })
})

describe('calcularCostoMensual — Dedicated', () => {
  it('Dedicated Instance con recargo 30% → base * 1.30', () => {
    const r = calcularCostoMensual('dedicated-instance', { ...cargaEstable, descuentoCompromisoPct: 30 })
    expect(r.costoMensualUSD).toBeCloseTo(73 * 1.30, 2)
  })

  it('Dedicated Host con recargo 100% → duplica', () => {
    const r = calcularCostoMensual('dedicated-host', { ...cargaEstable, descuentoCompromisoPct: 100 })
    expect(r.costoMensualUSD).toBe(146)
  })
})

describe('calcularCostoMensual — Capacity Reservation', () => {
  it('Capacity Reservation sin descuento = On-Demand', () => {
    const cr = calcularCostoMensual('capacity-reservation', cargaEstable)
    const od = calcularCostoMensual('on-demand', cargaEstable)
    expect(cr.costoMensualUSD).toBe(od.costoMensualUSD)
  })

  it('Capacity Reservation aplica siempre (no exige compromiso)', () => {
    const r = calcularCostoMensual('capacity-reservation', { ...cargaEstable, tipoCarga: 'impredecible' })
    expect(r.aplicable).toBe(true)
  })
})

describe('calcularCostoMensual — entradas faltantes', () => {
  it('precio null → no inventa números: costoMensualUSD = null pero aplicable=true', () => {
    const r = calcularCostoMensual('on-demand', { ...cargaEstable, precioOnDemandPorHoraUSD: null })
    expect(r.costoMensualUSD).toBeNull()
    expect(r.aplicable).toBe(true)
  })

  it('horas > 730 se clipean (mescap de 31 días)', () => {
    const r = calcularCostoMensual('on-demand', { ...cargaEstable, horasPorMes: 1000 })
    expect(r.costoMensualUSD).toBe(73) // 730 * 0.10
  })

  it('horas negativas → 0', () => {
    const r = calcularCostoMensual('on-demand', { ...cargaEstable, horasPorMes: -10 })
    expect(r.costoMensualUSD).toBe(0)
  })
})

describe('descuentos maximos', () => {
  it('SP/RI = 72%, Spot = 90%, resto = 0 (recargo, no descuento)', () => {
    expect(DESCUENTOS_MAXIMOS['savings-plan']).toBe(72)
    expect(DESCUENTOS_MAXIMOS['reserved-instance']).toBe(72)
    expect(DESCUENTOS_MAXIMOS.spot).toBe(90)
    expect(DESCUENTOS_MAXIMOS['on-demand']).toBe(0)
    expect(DESCUENTOS_MAXIMOS['dedicated-instance']).toBe(0)
    expect(DESCUENTOS_MAXIMOS['dedicated-host']).toBe(0)
    expect(DESCUENTOS_MAXIMOS['capacity-reservation']).toBe(0)
  })

  it('Todos los modelos del source tienen descripción', () => {
    for (const m of TODOS_LOS_MODELOS) {
      expect(DESCRIPCIONES[m]).toBeDefined()
      expect(DESCRIPCIONES[m].nombre.length).toBeGreaterThan(0)
    }
  })
})

describe('compararModelos', () => {
  it('devuelve un resultado por modelo pedido', () => {
    const out = compararModelos(['on-demand', 'savings-plan', 'spot'], cargaEstable)
    expect(out['on-demand']).toBeDefined()
    expect(out['savings-plan']).toBeDefined()
    expect(out.spot).toBeDefined()
    // Spot no es aplicable a carga crítica
    expect(out.spot.aplicable).toBe(false)
  })
})

describe('Spot + descuento al 90% exacto', () => {
  it('costo = base * 0.10', () => {
    const r = calcularCostoMensual('spot', {
      ...cargaEstable,
      tipoCarga: 'batch-ci',
      tolerancia: 'best-effort',
      descuentoCompromisoPct: 90,
    })
    expect(r.costoMensualUSD).toBeCloseTo(7.3, 1)
  })
})
