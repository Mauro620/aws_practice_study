import { SgNaclVerifier } from '@/components/SgNaclVerifier'

export const metadata = {
  title: 'Verificador SG vs NACL — Curso AWS',
}

export default function SgNaclToolPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramienta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Verificador Security Group vs NACL</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Definí un paquete, editá las reglas de SG y NACL, y mirá capa por capa si pasa o se bloquea. Sirve para
        entender por qué un Security Group es <em>stateful</em> y una NACL no.
      </p>

      <div className="mt-8">
        <SgNaclVerifier />
      </div>
    </article>
  )
}
