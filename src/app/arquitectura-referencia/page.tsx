import type { Metadata } from 'next'
import { ReferenceArchitectureDiagram } from '@/components/ReferenceArchitectureDiagram'

export const metadata: Metadata = {
  title: 'Arquitectura de referencia | Curso AWS',
  description: 'Diagrama interactivo que une VPC, EC2, IAM, Auto Scaling, CloudFront y S3 en una sola arquitectura de alta disponibilidad.',
}

export default function ArquitecturaReferenciaPage() {
  return (
    <div className="mx-auto max-w-[110rem] px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Guía transversal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Arquitectura de referencia</h1>
        <p className="mt-4 text-base leading-8 text-foreground/70">
          Cada módulo estudia una pieza por separado. Aquí están todas juntas: el borde con Route 53 y CloudFront, la VPC
          con dos zonas de disponibilidad y la capa de datos. Seguí una petición paso a paso, inyectá una falla, mirá qué
          protege cada capa de seguridad y qué cobra cada pieza, y compará una versión mínima con la completa.
        </p>
      </header>
      <ReferenceArchitectureDiagram />
    </div>
  )
}
