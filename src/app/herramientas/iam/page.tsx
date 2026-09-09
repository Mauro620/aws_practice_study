import { IamPolicyEvaluator } from '@/components/IamPolicyEvaluator'

export const metadata = {
  title: 'Evaluador de políticas IAM — Curso AWS',
}

export default function IamPolicyToolPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramienta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Evaluador de políticas IAM</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Editá una política de identidad y, opcionalmente, una política de recurso, y mirá cómo AWS decide: deny
        implícita por defecto, un Allow explícito la permite, un Deny explícito en cualquiera de las dos siempre
        gana.
      </p>

      <div className="mt-8">
        <IamPolicyEvaluator />
      </div>
    </article>
  )
}
