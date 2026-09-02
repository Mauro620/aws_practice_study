/**
 * Security Group + NACL packet evaluator for the AWS study app.
 *
 * Modeled on 01-vpc-amazon-virtual-private-cloud.md section 1.10:
 *   SG: stateful, allow-only, all rules evaluated together, default deny in
 *   NACL: stateless, allow+deny, evaluated in numeric order (lowest wins),
 *         default allow when no rules defined.
 *
 * Ports: integer port, range [puertoInicio, puertoFin], or 0 to mean ALL.
 * Protocols: TCP | UDP | ICMP | ALL.
 * Stateful tracking: the evaluator accepts an optional list of "previously
 * established connections"; an outbound packet that matches the inverse of a
 * prior inbound (same proto + swapped src/dst + swapped src/dst ports) is
 * automatically allowed at the SG layer, since SG remembers the flow.
 * NACL does NOT use this tracking — stateless means stateless, hence the
 * ephemeral-port requirement for return traffic on NACL out.
 */

import { parseCidr, ipToInt, type ParsedCidr } from './cidr'

export type Protocolo = 'TCP' | 'UDP' | 'ICMP' | 'ALL'

export type ReglaSg = {
  id: string
  protocolo: Protocolo
  puertoInicio: number
  puertoFin: number
  cidr: string
}

export type ReglaNacl = {
  numero: number
  acción: 'allow' | 'deny'
  protocolo: Protocolo
  puertoInicio: number
  puertoFin: number
  cidr: string
}

export type Paquete = {
  direccion: 'in' | 'out'
  protocolo: Protocolo
  puertoSrc: number
  puertoDst: number
  ipSrc: string
  ipDst: string
}

export type Conexion = {
  protocolo: Protocolo
  ipSrc: string
  puertoSrc: number
  ipDst: string
  puertoDst: number
  sentidoOriginal: 'in' | 'out'
}

export type DecisiónCapa = {
  decisión: 'allow' | 'deny'
  razón: string
  reglaAplicada?: ReglaSg | ReglaNacl
}

export type ResultadoEvaluación = {
  securityGroup: DecisiónCapa
  nacl: DecisiónCapa
  decisiónFinal: 'allow' | 'deny'
}

export type SecurityGroup = {
  reglasIn: ReglaSg[]
  reglasOut: ReglaSg[]
}

function parsearCidrSeguro(cidr: string): ParsedCidr | null {
  try {
    return parseCidr(cidr)
  } catch {
    return null
  }
}

function ipInt(ip: string): number | null {
  const partes = ip.trim().split('.')
  if (partes.length !== 4) return null
  const octs = partes.map(Number)
  if (octs.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  return ipToInt(octs as [number, number, number, number])
}

function cidrIncluye(cidr: ParsedCidr, ipIntVal: number): boolean {
  const mask = cidr.prefix === 0 ? 0 : (0xffffffff << (32 - cidr.prefix)) >>> 0
  return ((cidr.base ^ ipIntVal) & mask) >>> 0 === 0
}

function protocoloAplica(protoRegla: Protocolo, protoPaquete: Protocolo): boolean {
  return protoRegla === 'ALL' || protoRegla === protoPaquete
}

function puertoAplica(regla: { puertoInicio: number; puertoFin: number }, puerto: number): boolean {
  // 0 in both means "ALL ports"
  if (regla.puertoInicio === 0 && regla.puertoFin === 0) return true
  return puerto >= regla.puertoInicio && puerto <= regla.puertoFin
}

function reglaSgMatchea(regla: ReglaSg, paquete: Paquete): boolean {
  if (!protocoloAplica(regla.protocolo, paquete.protocolo)) return false
  const puertoRelevante = paquete.direccion === 'in' ? paquete.puertoDst : paquete.puertoSrc
  if (!puertoAplica(regla, puertoRelevante)) return false
  const ipRelevante = paquete.direccion === 'in' ? paquete.ipSrc : paquete.ipDst
  const cidr = parsearCidrSeguro(regla.cidr)
  const ip = ipInt(ipRelevante)
  if (!cidr || ip === null) return false
  return cidrIncluye(cidr, ip)
}

function reglaNaclMatchea(regla: ReglaNacl, paquete: Paquete): boolean {
  if (!protocoloAplica(regla.protocolo, paquete.protocolo)) return false
  // NACL rules target the "server side" port of the flow:
  //   in  -> destination port is the service (e.g. 22, 443)
  //   out -> source port is the service (e.g. 22, 443)
  // Source-port side is governed by a separate rule (ephemeral range).
  const puertoServidor = paquete.direccion === 'in' ? paquete.puertoDst : paquete.puertoSrc
  if (!puertoAplica(regla, puertoServidor)) return false
  // The CIDR is the remote side (the side initiating the request).
  const ipRemota = paquete.direccion === 'in' ? paquete.ipSrc : paquete.ipDst
  const cidr = parsearCidrSeguro(regla.cidr)
  const ip = ipInt(ipRemota)
  if (!cidr || ip === null) return false
  return cidrIncluye(cidr, ip)
}

function evaluarSg(sg: SecurityGroup, paquete: Paquete, conexiones: Conexion[]): DecisiónCapa {
  const reglasRelevantes = paquete.direccion === 'in' ? sg.reglasIn : sg.reglasOut

  for (const regla of reglasRelevantes) {
    if (reglaSgMatchea(regla, paquete)) {
      return {
        decisión: 'allow',
        razón: `Regla ${regla.id} permite este ${paquete.direccion === 'in' ? 'ingreso' : 'egreso'} (${regla.protocolo} ${regla.puertoInicio}${regla.puertoFin !== regla.puertoInicio ? '-' + regla.puertoFin : ''} desde ${regla.cidr})`,
        reglaAplicada: regla,
      }
    }
  }

  // Stateful shortcut: outbound that matches the inverse of a prior inbound
  if (paquete.direccion === 'out') {
    for (const c of conexiones) {
      if (
        c.sentidoOriginal === 'in' &&
        c.protocolo === paquete.protocolo &&
        c.ipSrc === paquete.ipDst &&
        c.ipDst === paquete.ipSrc &&
        c.puertoSrc === paquete.puertoDst &&
        c.puertoDst === paquete.puertoSrc
      ) {
        return {
          decisión: 'allow',
          razón: 'SG stateful: respuesta de una conexión in previamente permitida, pasa sin chequear reglas out explícitas',
        }
      }
    }
  }

  // Stateful shortcut: inbound response
  if (paquete.direccion === 'in') {
    for (const c of conexiones) {
      if (
        c.sentidoOriginal === 'out' &&
        c.protocolo === paquete.protocolo &&
        c.ipSrc === paquete.ipDst &&
        c.ipDst === paquete.ipSrc &&
        c.puertoSrc === paquete.puertoDst &&
        c.puertoDst === paquete.puertoSrc
      ) {
        return {
          decisión: 'allow',
          razón: 'SG stateful: respuesta de una conexión out previamente permitida',
        }
      }
    }
  }

  return {
    decisión: 'deny',
    razón:
      paquete.direccion === 'in'
        ? 'SG default deny: ninguna regla in matchea el paquete'
        : 'SG default deny out: sin regla out que matchee y no es respuesta de una conexión in previa',
  }
}

function evaluarNacl(nacl: ReglaNacl[], paquete: Paquete): DecisiónCapa {
  if (nacl.length === 0) {
    return {
      decisión: 'allow',
      razón: 'NACL default: sin reglas, todo permitido (la NACL por defecto de AWS permite todo)',
    }
  }

  const ordenadas = [...nacl].sort((a, b) => a.numero - b.numero)
  for (const regla of ordenadas) {
    if (reglaNaclMatchea(regla, paquete)) {
      return {
        decisión: regla.acción === 'allow' ? 'allow' : 'deny',
        razón: `NACL regla #${regla.numero} (${regla.acción.toUpperCase()}) matchea primero`,
        reglaAplicada: regla,
      }
    }
  }

  return {
    decisión: 'deny',
    razón: 'NACL: ninguna regla matchea (NACL default action es deny si hay reglas cargadas)',
  }
}

export function evaluarPaquete(
  sg: SecurityGroup,
  nacl: ReglaNacl[],
  paquete: Paquete,
  conexiones: Conexion[] = []
): ResultadoEvaluación {
  const sgResult = evaluarSg(sg, paquete, conexiones)
  const naclResult = evaluarNacl(nacl, paquete)
  const decisiónFinal: 'allow' | 'deny' =
    sgResult.decisión === 'allow' && naclResult.decisión === 'allow' ? 'allow' : 'deny'

  return { securityGroup: sgResult, nacl: naclResult, decisiónFinal }
}
