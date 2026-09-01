/**
 * Pure validation logic for the AWS study app's visual VPC builder.
 * Public/private classification follows content/servicios/vpc/nivel-3.mdx:
 * it depends exclusively on where the subnet's 0.0.0.0/0 route points, never
 * on how the subnet "looks". The other checks come from the same source's
 * condition table (nivel-2.mdx: an Internet Gateway must exist and be
 * attached; a route to a NAT Gateway needs one actually placed) and
 * nivel-4.mdx (NAT Gateway must live in a public subnet).
 */

export const AZS_DISPONIBLES = ['us-east-1a', 'us-east-1b'] as const

export type RutaSubred = 'igw' | 'nat' | 'ninguna'

export type Subred = {
  id: string
  nombre: string
  az: string
  ruta: RutaSubred
}

export type NatGateway = { subnetId: string | null }

export type Instancia = { id: string; nombre: string; subnetId: string | null }

export type EstadoVpc = {
  igwAdjunto: boolean
  subredes: Subred[]
  natGateway: NatGateway
  instancias: Instancia[]
}

export type TipoSubred = 'publica' | 'privada'

export function clasificarSubred(subred: Subred): { tipo: TipoSubred; motivo: string } {
  switch (subred.ruta) {
    case 'igw':
      return { tipo: 'publica', motivo: 'La ruta 0.0.0.0/0 de esta subred apunta al Internet Gateway.' }
    case 'nat':
      return {
        tipo: 'privada',
        motivo: 'La ruta 0.0.0.0/0 de esta subred apunta a un NAT Gateway: sale a Internet, pero nadie entra desde afuera.',
      }
    case 'ninguna':
    default:
      return { tipo: 'privada', motivo: 'Esta subred no tiene ruta a 0.0.0.0/0, así que es privada, no pública.' }
  }
}

export type Severidad = 'error' | 'aviso'
export type Hallazgo = { severidad: Severidad; mensaje: string; subredId?: string }

export function evaluarVpc(estado: EstadoVpc): Hallazgo[] {
  const hallazgos: Hallazgo[] = []

  for (const subred of estado.subredes) {
    if (subred.ruta === 'igw' && !estado.igwAdjunto) {
      hallazgos.push({
        severidad: 'error',
        subredId: subred.id,
        mensaje: `"${subred.nombre}" apunta a un Internet Gateway, pero todavía no hay ninguno adjunto a la VPC.`,
      })
    }
    if (subred.ruta === 'nat' && !estado.natGateway.subnetId) {
      hallazgos.push({
        severidad: 'error',
        subredId: subred.id,
        mensaje: `"${subred.nombre}" apunta a un NAT Gateway, pero todavía no colocaste ninguno.`,
      })
    }
  }

  if (estado.natGateway.subnetId) {
    const subredDelNat = estado.subredes.find((s) => s.id === estado.natGateway.subnetId)
    if (subredDelNat && clasificarSubred(subredDelNat).tipo === 'privada') {
      hallazgos.push({
        severidad: 'error',
        subredId: subredDelNat.id,
        mensaje: `El NAT Gateway está en "${subredDelNat.nombre}", una subred privada; debe ir en una subred pública.`,
      })
    }
  }

  const azsUsadas = new Set(estado.subredes.map((s) => s.az))
  if (azsUsadas.size === 1) {
    hallazgos.push({ severidad: 'aviso', mensaje: 'Solo tenés una AZ: sin alta disponibilidad.' })
  }

  return hallazgos
}
