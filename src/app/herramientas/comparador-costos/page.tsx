import { Ec2PricingComparator } from '@/components/Ec2PricingComparator'

export const metadata = {
  title: 'Comparador de costos EC2 — on-demand vs. savings plans vs. spot',
  description:
    'Comparador interactivo de los modelos de compra de EC2: On-Demand, Savings Plans, Reserved Instances, Spot, Dedicated y Capacity Reservation. Ingresás el precio On-Demand por hora de la consola de AWS y el calculador te muestra el costo mensual estimado por modelo.',
}

export default function PaginaComparadorCostos() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm font-medium text-accent">Herramientas interactivas</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Comparador de costos EC2</h1>
      <p className="mt-3 text-lg text-foreground/70">
        On-Demand, Savings Plans, Reserved Instances, Spot, Dedicated Instance y Dedicated Host frente a frente.
        Ingresá el precio On-Demand por hora que veas en la consola de AWS y movés los sliders para ver el
        impacto de los descuentos y recargos.
      </p>
      <div className="prose prose-slate mt-8 max-w-none">
        <Ec2PricingComparator />
      </div>
    </main>
  )
}
