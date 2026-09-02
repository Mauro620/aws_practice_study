import type { Metadata } from 'next'
import { AWSArchitectureGuide } from '@/components/AWSArchitectureGuide'

export const metadata: Metadata = {
  title: 'Guía de arquitectura AWS | Curso AWS',
  description: 'Guía práctica de VPC, EC2, seguridad, balanceo y despliegue en AWS.',
}

export default function GuiaArquitecturaPage() {
  return <AWSArchitectureGuide />
}
