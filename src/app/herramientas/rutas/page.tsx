import { RouteTableSimulator } from '@/components/RouteTableSimulator'

export const metadata = {
  title: 'Simulador de tablas de rutas — Curso AWS',
}

export default function RutasToolPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramienta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Simulador de tablas de rutas</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Editá la tabla, escribí una IP destino y mirá qué ruta gana por <em>longest prefix match</em> y por qué.
        Útil para entender por qué una ruta más específica tiene prioridad sobre la default.
      </p>

      <div className="mt-8">
        <RouteTableSimulator />
      </div>
    </article>
  )
}
