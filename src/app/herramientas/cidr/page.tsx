import { CidrCalculator } from '@/components/CidrCalculator'

export const metadata = {
  title: 'Calculadora de CIDR — Curso AWS',
}

export default function CidrToolPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramienta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Calculadora de CIDR y subredes</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Escribí un bloque CIDR y dividilo en subredes para ver rangos exactos, direcciones reservadas por AWS y
        la frontera entre red y host bit a bit.
      </p>

      <div className="mt-8">
        <CidrCalculator />
      </div>
    </article>
  )
}
