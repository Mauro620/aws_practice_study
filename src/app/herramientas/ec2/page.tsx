import { Ec2InstanceExplorer } from '@/components/Ec2InstanceExplorer'

export const metadata = {
  title: 'Explorador de tipos de instancia EC2 — Curso AWS',
}

export default function Ec2ToolPage() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramienta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Explorador de tipos de instancia EC2</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Pegá cualquier nombre de instancia (ej. <span className="font-mono">m7gd.xlarge</span>) y mirá qué dice
        cada letra: familia, generación, procesador, atributos y tamaño. Debajo, la tabla de familias del
        material del curso.
      </p>

      <div className="mt-8">
        <Ec2InstanceExplorer />
      </div>
    </article>
  )
}
