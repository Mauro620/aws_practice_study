/**
 * Pure route-table evaluation for the AWS study app's longest-prefix-match
 * simulator. Builds on cidr.ts for CIDR parsing and IP<->int conversion.
 *
 * Model: a route table is an ordered list of routes; for a given destination
 * IP, the most specific (longest prefix) route wins. On equal prefix lengths,
 * the first route in the table wins (matches AWS route-table precedence —
 * user-defined routes win over propagated, but for a single table the rule is
 * order of entry). Routes whose `destino` is not a valid CIDR are silently
 * ignored, so a malformed row in the UI never crashes the evaluator.
 */

import { parseCidr, ipToInt, type ParsedCidr } from './cidr'

export type Ruta = {
  id: string
  destino: string
  target: string
  descripcion: string
}

export type Candidata = {
  ruta: Ruta
  prefijo: number
}

export type ResultadoEvaluacion = {
  ganadora: Ruta | null
  candidatas: Candidata[]
}

function parsearSeguro(destino: string): ParsedCidr | null {
  try {
    return parseCidr(destino)
  } catch {
    return null
  }
}

function ipMatchea(cidr: ParsedCidr, ipInt: number): boolean {
  const mask = cidr.prefix === 0 ? 0 : (0xffffffff << (32 - cidr.prefix)) >>> 0
  return ((cidr.base ^ ipInt) & mask) >>> 0 === 0
}

export function seleccionarRutaGanadora(tabla: Ruta[], destinoIp: string): Ruta | null {
  let ipInt: number
  try {
    ipInt = ipToInt(parseCidr(`${destinoIp}/32`).octets)
  } catch {
    return null
  }

  let ganadora: Ruta | null = null
  let ganadorPrefijo = -1

  for (const ruta of tabla) {
    const cidr = parsearSeguro(ruta.destino)
    if (!cidr || !ipMatchea(cidr, ipInt)) continue

    if (cidr.prefix > ganadorPrefijo) {
      ganadora = ruta
      ganadorPrefijo = cidr.prefix
    }
  }

  return ganadora
}

export function evaluarPaquete(tabla: Ruta[], destinoIp: string): ResultadoEvaluacion {
  let ipInt: number
  try {
    ipInt = ipToInt(parseCidr(`${destinoIp}/32`).octets)
  } catch {
    return { ganadora: null, candidatas: [] }
  }

  const candidatas: Candidata[] = []
  for (const ruta of tabla) {
    const cidr = parsearSeguro(ruta.destino)
    if (!cidr || !ipMatchea(cidr, ipInt)) continue
    candidatas.push({ ruta, prefijo: cidr.prefix })
  }

  candidatas.sort((a, b) => b.prefijo - a.prefijo)
  const ganadora = candidatas[0]?.ruta ?? null

  return { ganadora, candidatas }
}
