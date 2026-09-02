import { ExamEngine } from '@/components/ExamEngine'

export const metadata = {
  title: 'Motor de práctica tipo examen — Curso AWS',
  description:
    'Banco de preguntas tipo examen basadas en Well-Architected, ELB, costos, S3+CloudFront, presigned URLs, elección de región y AZ. Cada opción muestra por qué es correcta o por qué es distractor.',
}

export default function PaginaMotorPractica() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramientas interactivas</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Motor de práctica tipo examen</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Preguntas extraídas del material del curso. Tres tipos de respuesta: simple, opción 2 de 5,
        y preguntas trampa donde el distractor es plausible. Cada respuesta incorrecta tiene su
        propia justificación — no solo te decimos cuál era la correcta, te explicamos por qué las
        otras parecían razonables y no lo eran.
      </p>
      <div className="prose prose-slate mt-8 max-w-none">
        <ExamEngine />
      </div>
    </main>
  )
}
