'use client'

import { useMemo, useState } from 'react'
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
  AWS_MIN_VPC_PREFIX,
  AWS_MAX_VPC_PREFIX,
} from '@/lib/cidr'

function Bits({ value, prefix }: { value: number; prefix: number }) {
  const bits = bitsOf(value)
  const groups = [bits.slice(0, 8), bits.slice(8, 16), bits.slice(16, 24), bits.slice(24, 32)]

  return (
    <div className="flex flex-wrap gap-1 font-mono text-sm">
      {groups.map((group, groupIndex) => (
        <span key={groupIndex} className="flex overflow-hidden rounded border border-border">
          {group.split('').map((bit, bitIndex) => {
            const globalIndex = groupIndex * 8 + bitIndex
            return (
              <span
                key={bitIndex}
                className={
                  'px-1 ' + (globalIndex < prefix ? 'bg-accent/20 text-accent' : 'text-foreground/60')
                }
              >
                {bit}
              </span>
            )
          })}
        </span>
      ))}
    </div>
  )
}

export function CidrCalculator({ cidrPorDefecto = '10.0.0.0/16' }: { cidrPorDefecto?: string }) {
  const [input, setInput] = useState(cidrPorDefecto)
  const [subnetCountInput, setSubnetCountInput] = useState('4')
  const [showBinary, setShowBinary] = useState(false)

  const parsed = useMemo(() => {
    try {
      return { cidr: parseCidr(input), error: null as string | null }
    } catch (e) {
      return { cidr: null, error: e instanceof CidrError ? e.message : 'CIDR inválido.' }
    }
  }, [input])

  const subnetCount = Number(subnetCountInput)
  const subnetPlan = useMemo(() => {
    if (!parsed.cidr || !Number.isInteger(subnetCount) || subnetCount <= 0) return null
    try {
      const targetPrefix = subnetsNeededPrefix(parsed.cidr.prefix, subnetCount)
      return { targetPrefix, subnets: splitIntoSubnets(parsed.cidr, targetPrefix), error: null as string | null }
    } catch (e) {
      return { targetPrefix: null, subnets: null, error: e instanceof CidrError ? e.message : 'No se pudo dividir.' }
    }
  }, [parsed.cidr, subnetCount])

  const cidr = parsed.cidr

  return (
    <div className="not-prose space-y-8">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Bloque CIDR</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="10.0.0.0/16"
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            aria-invalid={parsed.error != null}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cantidad de subredes</span>
          <input
            type="number"
            min={1}
            value={subnetCountInput}
            onChange={(e) => setSubnetCountInput(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent sm:w-32"
          />
        </label>
      </div>

      {parsed.error && (
        <p role="alert" className="text-sm text-red-700">
          {parsed.error}
        </p>
      )}

      {cidr && (
        <>
          {(cidr.prefix < AWS_MIN_VPC_PREFIX || cidr.prefix > AWS_MAX_VPC_PREFIX) && (
            <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground/80">
              AWS solo permite bloques de VPC/subred entre /{AWS_MIN_VPC_PREFIX} y /{AWS_MAX_VPC_PREFIX}. El
              cálculo de abajo es correcto igual, pero este tamaño no existiría como recurso real en AWS.
            </p>
          )}

          <div>
            <h3 className="text-lg font-semibold">{input}</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-foreground/50">Dirección de red</dt>
                <dd className="font-mono">{formatIp(networkAddress(cidr))}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Broadcast</dt>
                <dd className="font-mono">{formatIp(broadcastAddress(cidr))}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Direcciones totales</dt>
                <dd className="font-mono">{totalAddresses(cidr.prefix).toLocaleString('es')}</dd>
              </div>
              <div>
                <dt className="text-foreground/50">Utilizables (menos 5 de AWS)</dt>
                <dd className="font-mono">{usableAddresses(cidr.prefix).toLocaleString('es')}</dd>
              </div>
            </dl>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showBinary} onChange={(e) => setShowBinary(e.target.checked)} />
              Mostrar vista binaria (frontera red/host)
            </label>
            {showBinary && (
              <div className="mt-3">
                <Bits value={networkAddress(cidr)} prefix={cidr.prefix} />
                <p className="mt-1 text-xs text-foreground/50">
                  Los primeros {cidr.prefix} bits (resaltados) identifican la red; el resto identifica el host
                  dentro de ella.
                </p>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-semibold">Las 5 direcciones que reserva AWS</h4>
            <table className="mt-2 min-w-[30rem] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-foreground/50">
                  <th className="py-1 pr-4 font-medium">Dirección</th>
                  <th className="py-1 font-medium">Uso</th>
                </tr>
              </thead>
              <tbody>
                {reservedAddresses(cidr).map((row) => (
                  <tr key={row.ip} className="border-b border-border/60">
                    <td className="py-1 pr-4 font-mono">{row.ip}</td>
                    <td className="py-1 text-foreground/70">{row.uso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subnetPlan?.error && (
            <p role="alert" className="text-sm text-red-700">
              {subnetPlan.error}
            </p>
          )}

          {subnetPlan?.subnets && (
            <div>
              <h4 className="font-semibold">
                {subnetPlan.subnets.length} subredes /{subnetPlan.targetPrefix}
              </h4>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[42rem] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-foreground/50">
                      <th className="py-1 pr-4 font-medium">CIDR</th>
                      <th className="py-1 pr-4 font-medium">Primera utilizable</th>
                      <th className="py-1 pr-4 font-medium">Última utilizable</th>
                      <th className="py-1 pr-4 font-medium">Broadcast</th>
                      <th className="py-1 font-medium">Utilizables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subnetPlan.subnets.map((subnet) => (
                      <tr key={subnet.cidr} className="border-b border-border/60">
                        <td className="py-1 pr-4 font-mono">{subnet.cidr}</td>
                        <td className="py-1 pr-4 font-mono">{subnet.firstUsable}</td>
                        <td className="py-1 pr-4 font-mono">{subnet.lastUsable}</td>
                        <td className="py-1 pr-4 font-mono">{subnet.broadcast}</td>
                        <td className="py-1 font-mono">{subnet.usable.toLocaleString('es')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
