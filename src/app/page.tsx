import Link from 'next/link'
import { getAllServicios } from '@/lib/content'

export default function Home() {
  const servicios = getAllServicios()

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Curso AWS</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Material de AWS Academy Cloud Architecting, para entender en vez de memorizar.
      </p>

      <ul className="mt-8 space-y-4">
        {servicios.map((servicio) => (
          <li key={servicio.id}>
            <Link href={`/servicios/${servicio.id}`} className="text-lg font-medium text-accent hover:underline">
              {servicio.nombre}
            </Link>
            <p className="text-foreground/70">{servicio.resumenUnaLinea}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
