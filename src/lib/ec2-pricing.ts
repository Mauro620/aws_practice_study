/**
 * EC2 pricing-model comparator for the AWS study app.
 *
 * Modeled on 02-ec2-elastic-compute-cloud.md section 6.5:
 *   On-Demand, Savings Plans, Reserved Instances, Spot, Dedicated
 *   Instance, Dedicated Host, Capacity Reservation.
 *
 * IMPORTANT: This module is NOT a price catalog. The source material
 * does not list per-instance USD prices (those change constantly and
 * vary by region), so we never invent a unit price. The caller must
 * supply one — the UI is responsible for marking it as "por verificar
 * en la consola" so the user knows to confirm against the AWS pricing
 * page before relying on the numbers.
 *
 * Discount percentages (max 72% Savings Plan/RI, max 90% Spot) ARE
 * taken verbatim from the source — they describe the upper bound AWS
 * publishes for the model itself, not per-instance numbers.
 */

export type ModeloCompra =
  | 'on-demand'
  | 'savings-plan'
  | 'reserved-instance'
  | 'spot'
  | 'dedicated-instance'
  | 'dedicated-host'
  | 'capacity-reservation'

export type Compromiso = 'none' | '1-year' | '3-year'

export type ToleranciaInterrupcion = 'none' | 'best-effort' | 'mission-critical'

export type TipoCarga = 'estable' | 'impredecible' | 'batch-ci' | 'ml-training' | 'regulada'

export type ResultadoModelo = {
  modelo: ModeloCompra
  /** Monthly cost in USD, computed from user-supplied unit price + inputs. */
  costoMensualUSD: number | null
  /** Max discount vs. On-Demand, as percent (0..100). From source 6.5. */
  descuentoMaximoVsOnDemandPct: number
  /** Whether the input configuration is allowed under this model. */
  aplicable: boolean
  /** Why it's not applicable, when aplicable=false. */
  noAplicableRazon?: string
  /** Human-readable commitment, from source. */
  compromiso: Compromiso
}

export type EntradasComparador = {
  /** User-supplied On-Demand unit price per hour, USD. Must be > 0 to compute. */
  precioOnDemandPorHoraUSD: number | null
  /** Hours running per month (1..730). */
  horasPorMes: number
  /** What does the workload look like — drives applicability. */
  tipoCarga: TipoCarga
  /** Can the workload survive being interrupted with 2-minute notice? */
  tolerancia: ToleranciaInterrupcion
  /** Required only for some models; ignored by others. */
  compromiso?: Compromiso
  /** Discount percentage the user is actually getting under a commitment plan. */
  descuentoCompromisoPct?: number
}

export const DESCUENTOS_MAXIMOS: Record<ModeloCompra, number> = {
  'on-demand': 0,
  'savings-plan': 72,
  'reserved-instance': 72,
  spot: 90,
  'dedicated-instance': 0, // recargo, no descuento — modelamos como 0
  'dedicated-host': 0,
  'capacity-reservation': 0,
}

export const COMPROMISO_POR_MODELO: Record<ModeloCompra, Compromiso> = {
  'on-demand': 'none',
  'savings-plan': '3-year', // puede ser 1 o 3, pero existe siempre
  'reserved-instance': '3-year',
  spot: 'none',
  'dedicated-instance': 'none',
  'dedicated-host': 'none',
  'capacity-reservation': 'none',
}

export type DescripcionModelo = {
  modelo: ModeloCompra
  nombre: string
  compromisoPorDefecto: Compromiso
  descuentoMaximoVsOnDemandPct: number
  resumen: string
  casosDeUso: string[]
  trampa: string
}

export const DESCRIPCIONES: Record<ModeloCompra, DescripcionModelo> = {
  'on-demand': {
    modelo: 'on-demand',
    nombre: 'On-Demand',
    compromisoPorDefecto: 'none',
    descuentoMaximoVsOnDemandPct: 0,
    resumen: 'Pago por hora o por segundo (Linux) sin compromiso.',
    casosDeUso: ['Cargas impredecibles', 'Desarrollo y pruebas', 'Primer despliegue'],
    trampa: 'Es la base de comparación — todo lo demás descuenta respecto a ella.',
  },
  'savings-plan': {
    modelo: 'savings-plan',
    nombre: 'Savings Plans',
    compromisoPorDefecto: '1-year',
    descuentoMaximoVsOnDemandPct: 72,
    resumen: 'Compromiso de gasto por hora a 1 o 3 años. Aplica entre familias y regiones.',
    casosDeUso: ['Cargas estables', 'Más flexible que Reserved Instances'],
    trampa: 'Si dejás de usarlas, igual seguís pagando el compromiso.',
  },
  'reserved-instance': {
    modelo: 'reserved-instance',
    nombre: 'Reserved Instances',
    compromisoPorDefecto: '1-year',
    descuentoMaximoVsOnDemandPct: 72,
    resumen: 'Compromiso de un tipo específico por 1 o 3 años.',
    casosDeUso: ['Cargas totalmente predecibles'],
    trampa: 'Mucho menos flexible que Savings Plans. En general Savings Plans la reemplazan.',
  },
  spot: {
    modelo: 'spot',
    nombre: 'Spot Instances',
    compromisoPorDefecto: 'none',
    descuentoMaximoVsOnDemandPct: 90,
    resumen: 'Capacidad sobrante con hasta 90% de descuento. AWS puede reclamarla con 2 minutos de aviso.',
    casosDeUso: ['Batch', 'CI/CD', 'Renderizado', 'Cargas tolerantes a fallos'],
    trampa: 'Si la carga NO tolera interrupciones, Spot no es opción — la instancia se va.',
  },
  'dedicated-instance': {
    modelo: 'dedicated-instance',
    nombre: 'Dedicated Instance',
    compromisoPorDefecto: 'none',
    descuentoMaximoVsOnDemandPct: 0,
    resumen: 'Recargo por hardware físico no compartido con otros clientes.',
    casosDeUso: ['Cumplimiento normativo'],
    trampa: 'Sigue siendo una instancia virtual sobre un host dedicado — no ves sockets.',
  },
  'dedicated-host': {
    modelo: 'dedicated-host',
    nombre: 'Dedicated Host',
    compromisoPorDefecto: 'none',
    descuentoMaximoVsOnDemandPct: 0,
    resumen: 'Servidor físico completo. Recargo alto, pero ves sockets y podés traer tus licencias.',
    casosDeUso: ['BYOL', 'Licencias por core', 'macOS'],
    trampa: 'Lo caro del catálogo. Solo tiene sentido si necesitás BYOL o cumplimiento por socket.',
  },
  'capacity-reservation': {
    modelo: 'capacity-reservation',
    nombre: 'Capacity Reservation',
    compromisoPorDefecto: 'none',
    descuentoMaximoVsOnDemandPct: 0,
    resumen: 'Reserva capacidad en una AZ específica. No da descuento; garantiza disponibilidad en picos.',
    casosDeUso: ['Eventos puntuales', 'Picos predecibles'],
    trampa: 'Pagás la reserva esté la instancia encendida o no — es asegurar el asiento, no comprarlo barato.',
  },
}

export function calcularCostoMensual(modelo: ModeloCompra, e: EntradasComparador): ResultadoModelo {
  const compromiso = e.compromiso ?? COMPROMISO_POR_MODELO[modelo]

  // Applicability first: if a model can't be used, no cost and no point computing.
  const razon = razonNoAplicable(modelo, e.tipoCarga, e.tolerancia, compromiso)
  if (razon) {
    return {
      modelo,
      costoMensualUSD: null,
      descuentoMaximoVsOnDemandPct: DESCUENTOS_MAXIMOS[modelo],
      aplicable: false,
      noAplicableRazon: razon,
      compromiso,
    }
  }

  // No unit price → can't compute a USD figure. We return null, not invented numbers.
  if (e.precioOnDemandPorHoraUSD === null || e.precioOnDemandPorHoraUSD <= 0) {
    return {
      modelo,
      costoMensualUSD: null,
      descuentoMaximoVsOnDemandPct: DESCUENTOS_MAXIMOS[modelo],
      aplicable: true,
      compromiso,
    }
  }

  const horas = clampHoras(e.horasPorMes)
  const baseMensual = e.precioOnDemandPorHoraUSD * horas

  let costo = baseMensual
  if (modelo === 'savings-plan' || modelo === 'reserved-instance') {
    const pct = clampDescuento(e.descuentoCompromisoPct, DESCUENTOS_MAXIMOS[modelo])
    costo = baseMensual * (1 - pct / 100)
  } else if (modelo === 'spot') {
    // Spot: same upper bound 90% off as the source says.
    const pct = clampDescuento(e.descuentoCompromisoPct, DESCUENTOS_MAXIMOS.spot)
    costo = baseMensual * (1 - pct / 100)
  } else if (modelo === 'dedicated-instance' || modelo === 'dedicated-host') {
    // Recargo — el material no da porcentaje exacto. Pedimos al usuario el
    // multiplicador (1.x) y si no, dejamos On-Demand como "no recargado".
    const pct = e.descuentoCompromisoPct ?? 0
    // descuentoCompromisoPct se reinterpreta como recargo: si pct = 30, costo = base * 1.30
    costo = baseMensual * (1 + pct / 100)
  }
  // capacity-reservation: sin descuento, igual a On-Demand.

  return {
    modelo,
    costoMensualUSD: round2(costo),
    descuentoMaximoVsOnDemandPct: DESCUENTOS_MAXIMOS[modelo],
    aplicable: true,
    compromiso,
  }
}

export function compararModelos(modelos: ModeloCompra[], e: EntradasComparador): Record<ModeloCompra, ResultadoModelo> {
  const out = {} as Record<ModeloCompra, ResultadoModelo>
  for (const m of modelos) {
    out[m] = calcularCostoMensual(m, e)
  }
  return out
}

export const TODOS_LOS_MODELOS: ModeloCompra[] = [
  'on-demand',
  'savings-plan',
  'reserved-instance',
  'spot',
  'dedicated-instance',
  'dedicated-host',
  'capacity-reservation',
]

// ────────────────────────────────────────────────────────────────────────
// Heuristics: applicability rules from section 6.5
// ────────────────────────────────────────────────────────────────────────

function razonNoAplicable(
  modelo: ModeloCompra,
  carga: TipoCarga,
  tolerancia: ToleranciaInterrupcion,
  compromiso: Compromiso
): string | null {
  // Spot is only viable if the workload can be interrupted with 2-minute notice
  if (modelo === 'spot') {
    if (tolerancia === 'mission-critical') {
      return 'Spot no aplica: la instancia puede ser reclamada por AWS con 2 minutos de aviso'
    }
    if (tolerancia === 'none') {
      return 'Spot no aplica: marcada como no tolerante a interrupciones'
    }
  }

  // Savings Plans / Reserved Instances presuppose carga estable
  if (modelo === 'savings-plan' || modelo === 'reserved-instance') {
    if (carga === 'impredecible') {
      return 'No aplica a cargas impredecibles: exige compromiso de 1 o 3 años'
    }
    if (compromiso === 'none' && (modelo === 'savings-plan' || modelo === 'reserved-instance')) {
      return 'Este modelo exige un compromiso de 1 o 3 años'
    }
  }

  return null
}

function clampHoras(h: number): number {
  if (!Number.isFinite(h)) return 730
  if (h < 0) return 0
  if (h > 730) return 730
  return h
}

function clampDescuento(p: number | undefined, max: number): number {
  if (p === undefined || !Number.isFinite(p)) return 0
  if (p < 0) return 0
  if (p > max) return max
  return p
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
