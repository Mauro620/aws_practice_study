/**
 * Pure CIDR/subnet math for the AWS study app's calculator tool.
 * AWS reserves 5 addresses per subnet (network, VPC router, DNS, future use,
 * broadcast) — see content/servicios/vpc/nivel-4.mdx, which this module must
 * stay consistent with rather than re-deriving the rule independently.
 */

export class CidrError extends Error {}

export const AWS_RESERVED_PER_SUBNET = 5
export const AWS_MIN_VPC_PREFIX = 16 // largest block AWS allows for a VPC/subnet
export const AWS_MAX_VPC_PREFIX = 28 // smallest block AWS allows for a VPC/subnet

export type ParsedCidr = {
  octets: [number, number, number, number]
  prefix: number
  base: number
}

const CIDR_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/

export function ipToInt(octets: [number, number, number, number]): number {
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
}

export function formatIp(int: number): string {
  return [24, 16, 8, 0].map((shift) => (int >>> shift) & 0xff).join('.')
}

export function parseCidr(input: string): ParsedCidr {
  const match = CIDR_PATTERN.exec(input.trim())
  if (!match) {
    throw new CidrError('Formato inválido. Usá el formato IP/prefijo, por ejemplo 10.0.0.0/16.')
  }

  const octets = match.slice(1, 5).map(Number) as [number, number, number, number]
  if (octets.some((o) => o > 255)) {
    throw new CidrError('Cada octeto debe estar entre 0 y 255.')
  }

  const prefix = Number(match[5])
  if (prefix > 32) {
    throw new CidrError('El prefijo debe ser un número entre 0 y 32.')
  }

  return { octets, prefix, base: ipToInt(octets) }
}

function maskFor(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
}

export function networkAddress(cidr: ParsedCidr): number {
  return (cidr.base & maskFor(cidr.prefix)) >>> 0
}

export function broadcastAddress(cidr: ParsedCidr): number {
  const mask = maskFor(cidr.prefix)
  return (networkAddress(cidr) | (~mask >>> 0)) >>> 0
}

export function totalAddresses(prefix: number): number {
  return 2 ** (32 - prefix)
}

export function usableAddresses(prefix: number): number {
  return Math.max(0, totalAddresses(prefix) - AWS_RESERVED_PER_SUBNET)
}

export function reservedAddresses(cidr: ParsedCidr): { ip: string; uso: string }[] {
  const network = networkAddress(cidr)
  const broadcast = broadcastAddress(cidr)

  return [
    { ip: formatIp(network), uso: 'Dirección de red' },
    { ip: formatIp(network + 1), uso: 'Router de la VPC' },
    { ip: formatIp(network + 2), uso: 'Servidor DNS de AWS' },
    { ip: formatIp(network + 3), uso: 'Reservada para uso futuro' },
    { ip: formatIp(broadcast), uso: 'Broadcast (reservada; AWS no soporta broadcast)' },
  ]
}

export function subnetsNeededPrefix(parentPrefix: number, subnetCount: number): number {
  if (subnetCount <= 0) {
    throw new CidrError('Ingresá una cantidad de subredes mayor a 0.')
  }
  const bits = Math.ceil(Math.log2(subnetCount))
  return parentPrefix + bits
}

export type Subnet = {
  cidr: string
  network: string
  firstUsable: string
  lastUsable: string
  broadcast: string
  prefix: number
  total: number
  usable: number
}

export function splitIntoSubnets(parent: ParsedCidr, targetPrefix: number): Subnet[] {
  if (targetPrefix <= parent.prefix) {
    throw new CidrError('El prefijo de la subred debe ser mayor que el de la VPC (una subred no puede ser más grande que su VPC).')
  }
  if (targetPrefix > 32) {
    throw new CidrError('El prefijo debe ser un número entre 0 y 32.')
  }

  const subnetSize = totalAddresses(targetPrefix)
  const count = 2 ** (targetPrefix - parent.prefix)
  const parentNetwork = networkAddress(parent)

  return Array.from({ length: count }, (_, i) => {
    const network = parentNetwork + i * subnetSize
    const broadcast = network + subnetSize - 1

    return {
      cidr: `${formatIp(network)}/${targetPrefix}`,
      network: formatIp(network),
      firstUsable: formatIp(network + 4),
      lastUsable: formatIp(broadcast - 1),
      broadcast: formatIp(broadcast),
      prefix: targetPrefix,
      total: subnetSize,
      usable: usableAddresses(targetPrefix),
    }
  })
}

export function bitsOf(int: number): string {
  return int.toString(2).padStart(32, '0')
}
