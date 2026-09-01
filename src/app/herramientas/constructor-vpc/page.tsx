import { VpcBuilder } from '@/components/VpcBuilder'

export const metadata = {
  title: 'Constructor visual de VPC — Curso AWS',
}

export default function ConstructorVpcPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramienta</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Constructor visual de VPC</h1>
      <p className="mt-3 text-lg text-foreground/70">
        Armá subredes, ubicá el NAT Gateway y agregá instancias EC2. La herramienta valida en tiempo real y te
        explica qué está mal — y por qué — en cada paso.
      </p>

      <div className="mt-8">
        <VpcBuilder />
      </div>
    </article>
  )
}
