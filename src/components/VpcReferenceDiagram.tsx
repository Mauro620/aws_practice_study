const INK = '#1c1a17'
const ACCENT = '#8a5a2b'
const PUBLIC_FILL = '#f3ead9'
const PRIVATE_FILL = '#eef1ec'
const LINE = '#c9c2b4'

function Box({
  x,
  y,
  w,
  h,
  label,
  fill,
  dashed,
}: {
  x: number
  y: number
  w: number
  h: number
  label: string
  fill?: string
  dashed?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={fill ?? 'none'}
        stroke={INK}
        strokeWidth={1.25}
        strokeDasharray={dashed ? '4 3' : undefined}
      />
      <text x={x + 10} y={y + 18} fontSize={11} fontWeight={600} fill={INK}>
        {label}
      </text>
    </g>
  )
}

function Node({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={104} height={30} rx={5} fill="white" stroke={ACCENT} strokeWidth={1.25} />
      <text x={x + 52} y={y + 19} fontSize={10.5} fill={INK} textAnchor="middle">
        {label}
      </text>
    </g>
  )
}

/** Static reference architecture for VPC's "caso realista" level — matches the 2-AZ,
 * public/private pattern described in the source notes (section 1.12). Interactive
 * version (drag-and-drop, live validation) is Fase 3's VPC builder, not this. */
export function VpcReferenceDiagram() {
  return (
    <figure className="not-prose my-6">
      <svg viewBox="0 0 640 400" role="img" aria-labelledby="vpc-diagram-title" className="w-full h-auto">
        <title id="vpc-diagram-title">
          Arquitectura de referencia: VPC con 2 Zonas de Disponibilidad, subredes públicas y privadas
        </title>

        <Node x={268} y={8} label="Internet" />
        <line x1={320} y1={38} x2={320} y2={58} stroke={LINE} strokeWidth={1.25} />

        <Box x={20} y={58} w={600} h={330} label="VPC · 10.0.0.0/16 (región)" />

        <Node x={268} y={72} label="Internet Gateway" />
        <line x1={320} y1={102} x2={320} y2={116} stroke={LINE} strokeWidth={1.25} />

        {/* AZ 1 */}
        <Box x={40} y={116} w={270} h={252} label="AZ us-east-1a" dashed />
        <Box x={56} y={140} w={238} h={90} label="Subred pública · 10.0.0.0/20" fill={PUBLIC_FILL} />
        <Node x={70} y={162} label="ALB" />
        <Node x={182} y={162} label="NAT Gateway" />
        <Box x={56} y={244} w={238} h={108} label="Subred privada · 10.0.16.0/20" fill={PRIVATE_FILL} />
        <Node x={70} y={266} label="EC2 App" />
        <Node x={182} y={266} label="RDS primaria" />

        {/* AZ 2 */}
        <Box x={330} y={116} w={270} h={252} label="AZ us-east-1b" dashed />
        <Box x={346} y={140} w={238} h={90} label="Subred pública · 10.0.128.0/20" fill={PUBLIC_FILL} />
        <Node x={360} y={162} label="ALB" />
        <Node x={472} y={162} label="NAT Gateway" />
        <Box x={346} y={244} w={238} h={108} label="Subred privada · 10.0.144.0/20" fill={PRIVATE_FILL} />
        <Node x={360} y={266} label="EC2 App" />
        <Node x={472} y={266} label="RDS en espera" />

        <line x1={234} y1={281} x2={472} y2={281} stroke={ACCENT} strokeWidth={1.25} strokeDasharray="3 3" />
        <text x={353} y={274} fontSize={9.5} fill={ACCENT} textAnchor="middle">
          replicación
        </text>
      </svg>
      <figcaption className="mt-2 text-sm text-foreground/60">
        Cada AZ repite el mismo patrón: subred pública con el balanceador y el NAT Gateway, subred privada con los
        servidores de aplicación y la base de datos.
      </figcaption>
    </figure>
  )
}
