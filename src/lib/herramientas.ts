/**
 * Registry of interactive tools, grouped by the course module they belong
 * to. Used by ServicioView to render a "Herramientas relacionadas" section
 * per module instead of a standing "Laboratorios" group in the left nav.
 */

export type Herramienta = {
  href: string
  label: string
  descripcion: string
}

export const HERRAMIENTAS_POR_SERVICIO: Record<string, Herramienta[]> = {
  vpc: [
    {
      href: '/herramientas/cidr',
      label: 'Calculadora de CIDR',
      descripcion: 'Calculá subredes y direcciones utilizables a partir de un bloque CIDR.',
    },
    {
      href: '/herramientas/constructor-vpc',
      label: 'Constructor visual de VPC',
      descripcion: 'Armá visualmente subredes, tablas de rutas y gateways de una VPC.',
    },
    {
      href: '/herramientas/rutas',
      label: 'Simulador de tablas de rutas',
      descripcion: 'Probá qué ruta gana por longest-prefix-match para un destino dado.',
    },
    {
      href: '/herramientas/sg-nacl',
      label: 'Verificador SG vs NACL',
      descripcion: 'Evaluá paquete por paquete si un Security Group y una NACL lo dejan pasar.',
    },
  ],
  ec2: [
    {
      href: '/herramientas/ec2',
      label: 'Explorador de tipos de instancia EC2',
      descripcion: 'Compará familias y tamaños de instancia según tu carga de trabajo.',
    },
    {
      href: '/herramientas/comparador-costos',
      label: 'Comparador de costos EC2',
      descripcion: 'Compará el costo On-Demand, Spot y Savings Plans de una instancia.',
    },
  ],
  iam: [
    {
      href: '/herramientas/iam',
      label: 'Evaluador de políticas IAM',
      descripcion: 'Editá una política de identidad y de recurso y mirá cómo decide Allow/Deny.',
    },
  ],
}

/** Tools that cut across modules instead of belonging to one — shown in the transversal nav. */
export const HERRAMIENTAS_TRANSVERSALES: Herramienta[] = [
  {
    href: '/herramientas/motor-practica',
    label: 'Motor de práctica tipo examen',
    descripcion: 'Banco de preguntas estilo examen, con justificación por cada opción.',
  },
]
