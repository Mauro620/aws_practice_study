import { describe, expect, it } from 'vitest'
import {
  CidrError,
  bitsOf,
  broadcastAddress,
  formatIp,
  networkAddress,
  parseCidr,
  reservedAddresses,
  splitIntoSubnets,
  subnetsNeededPrefix,
  totalAddresses,
  usableAddresses,
} from '../cidr'

describe('parseCidr', () => {
  it('parses a well-formed block', () => {
    const cidr = parseCidr('10.0.0.0/16')
    expect(cidr.octets).toEqual([10, 0, 0, 0])
    expect(cidr.prefix).toBe(16)
  })

  it('rejects a non-CIDR string', () => {
    expect(() => parseCidr('no es un cidr')).toThrow(CidrError)
  })

  it('rejects an octet out of range', () => {
    expect(() => parseCidr('10.0.0.256/16')).toThrow(CidrError)
  })

  it('rejects a prefix above 32', () => {
    expect(() => parseCidr('10.0.0.0/33')).toThrow(CidrError)
  })

  it('rejects a malformed prefix', () => {
    expect(() => parseCidr('10.0.0.0/-1')).toThrow(CidrError)
    expect(() => parseCidr('10.0.0.0')).toThrow(CidrError)
  })
})

describe('totalAddresses / usableAddresses', () => {
  it('computes total addresses per prefix', () => {
    expect(totalAddresses(16)).toBe(65536)
    expect(totalAddresses(24)).toBe(256)
    expect(totalAddresses(28)).toBe(16)
  })

  it('subtracts the 5 AWS-reserved addresses per subnet', () => {
    expect(usableAddresses(24)).toBe(251)
    expect(usableAddresses(16)).toBe(65531)
    expect(usableAddresses(28)).toBe(11)
  })

  it('never goes negative for degenerate prefixes', () => {
    expect(usableAddresses(32)).toBe(0)
  })
})

describe('networkAddress / broadcastAddress', () => {
  it('finds the network and broadcast addresses of a block', () => {
    const cidr = parseCidr('10.0.1.5/24')
    expect(formatIp(networkAddress(cidr))).toBe('10.0.1.0')
    expect(formatIp(broadcastAddress(cidr))).toBe('10.0.1.255')
  })
})

describe('reservedAddresses', () => {
  it('matches the 5 AWS-reserved rows documented in the VPC content', () => {
    const cidr = parseCidr('10.0.1.0/24')
    expect(reservedAddresses(cidr)).toEqual([
      { ip: '10.0.1.0', uso: 'Dirección de red' },
      { ip: '10.0.1.1', uso: 'Router de la VPC' },
      { ip: '10.0.1.2', uso: 'Servidor DNS de AWS' },
      { ip: '10.0.1.3', uso: 'Reservada para uso futuro' },
      { ip: '10.0.1.255', uso: 'Broadcast (reservada; AWS no soporta broadcast)' },
    ])
  })
})

describe('subnetsNeededPrefix', () => {
  it('computes the prefix needed to fit N subnets', () => {
    expect(subnetsNeededPrefix(16, 4)).toBe(18)
    expect(subnetsNeededPrefix(16, 5)).toBe(19)
    expect(subnetsNeededPrefix(16, 1)).toBe(16)
  })

  it('rejects a non-positive subnet count', () => {
    expect(() => subnetsNeededPrefix(16, 0)).toThrow(CidrError)
  })
})

describe('splitIntoSubnets', () => {
  it('splits a /16 into four /18 subnets with correct ranges', () => {
    const parent = parseCidr('10.0.0.0/16')
    const subnets = splitIntoSubnets(parent, 18)

    expect(subnets).toHaveLength(4)
    expect(subnets.map((s) => s.cidr)).toEqual([
      '10.0.0.0/18',
      '10.0.64.0/18',
      '10.0.128.0/18',
      '10.0.192.0/18',
    ])
    expect(subnets[0]).toMatchObject({
      network: '10.0.0.0',
      firstUsable: '10.0.0.4',
      lastUsable: '10.0.63.254',
      broadcast: '10.0.63.255',
      total: 16384,
      usable: 16379,
    })
  })

  it('rejects a target prefix that is not more specific than the parent', () => {
    const parent = parseCidr('10.0.0.0/24')
    expect(() => splitIntoSubnets(parent, 24)).toThrow(CidrError)
    expect(() => splitIntoSubnets(parent, 20)).toThrow(CidrError)
  })
})

describe('bitsOf', () => {
  it('renders a 32-bit binary string, host bits zeroed at the network address', () => {
    const cidr = parseCidr('255.0.0.1/8')
    expect(bitsOf(networkAddress(cidr))).toBe('1'.repeat(8) + '0'.repeat(24))
    expect(bitsOf(networkAddress(cidr))).toHaveLength(32)
  })
})
