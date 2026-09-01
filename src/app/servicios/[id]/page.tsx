import { notFound } from 'next/navigation'
import { ServicioView } from '@/components/ServicioView'
import { getAllServicios, getServicio } from '@/lib/content'

export function generateStaticParams() {
  return getAllServicios().map((servicio) => ({ id: servicio.id }))
}

export default async function ServicioPage({ params }: PageProps<'/servicios/[id]'>) {
  const { id } = await params

  let servicio
  try {
    servicio = getServicio(id)
  } catch {
    notFound()
  }

  return <ServicioView servicio={servicio} />
}
