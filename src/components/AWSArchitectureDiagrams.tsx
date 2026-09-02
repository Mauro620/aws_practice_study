'use client'

import { useState } from 'react'

type DiagramMode = 'traffic' | 'security' | 'deployment'

type DiagramItem = {
  id: string
  label: string
  meta: string
  what: string
  why: string
  context: string
  path: string[]
}

const modes: { id: DiagramMode; label: string; description: string }[] = [
  { id: 'traffic', label: 'Flujo de tráfico', description: 'Cómo viaja una petición desde Internet hasta los datos.' },
  { id: 'security', label: 'Capas de seguridad', description: 'Qué Security Group permite cada salto y cómo vuelve la respuesta.' },
  { id: 'deployment', label: 'Despliegue', description: 'La secuencia práctica para publicar una página en EC2.' },
]

const trafficItems: DiagramItem[] = [
  { id: 'internet', label: 'Internet', meta: 'origen público', what: 'El navegador inicia una petición HTTP o HTTPS hacia el DNS público del Application Load Balancer.', why: 'El usuario conoce una entrada estable, mientras las instancias pueden cambiar detrás del balanceador.', context: 'Puertos: TCP/80 y TCP/443. La entrada pública termina en el ALB, no directamente en las EC2.', path: ['internet', 'gateway', 'alb', 'target-group', 'ec2', 'data'] },
  { id: 'gateway', label: 'Internet Gateway', meta: 'borde de la VPC', what: 'Conecta la VPC con Internet y permite que la tabla de rutas pública alcance el ALB.', why: 'Una subred solo es pública cuando tiene una ruta al IGW y sus recursos tienen direccionamiento público.', context: 'Ruta típica: 0.0.0.0/0 → igw. El IGW no reemplaza a un Security Group.', path: ['internet', 'gateway', 'alb', 'target-group', 'ec2', 'data'] },
  { id: 'alb', label: 'ALB', meta: 'subred pública', what: 'Recibe la petición y la reenvía al destino saludable que corresponde en el Target Group.', why: 'Separa la entrada pública de la capa de aplicación y ofrece un DNS estable, health checks y balanceo.', context: 'Listener: 80/443. El SG del ALB acepta tráfico web desde Internet.', path: ['internet', 'gateway', 'alb', 'target-group', 'ec2', 'data'] },
  { id: 'target-group', label: 'Target Group', meta: 'destinos registrados', what: 'Mantiene las EC2 registradas y retira del balanceo las que fallan el health check.', why: 'La aplicación recibe tráfico solo cuando está lista, evitando enviar usuarios a instancias unhealthy.', context: 'Ejemplo: protocolo HTTP, puerto 80, health check en /.', path: ['internet', 'gateway', 'alb', 'target-group', 'ec2', 'data'] },
  { id: 'ec2', label: 'EC2', meta: 'subred privada', what: 'Procesa la solicitud en una instancia ubicada en una subred privada.', why: 'La instancia no necesita una IP pública para servir tráfico web cuando el ALB es la entrada.', context: 'El SG de aplicación permite 80/443 solo desde el SG del ALB. La salida puede usar NAT Gateway.', path: ['internet', 'gateway', 'alb', 'target-group', 'ec2', 'data'] },
  { id: 'data', label: 'Capa de datos', meta: 'privada y protegida', what: 'La aplicación consulta EBS, RDS u otro servicio interno y devuelve el resultado hacia el navegador.', why: 'Los datos quedan fuera del camino público y se controla el acceso desde la capa de aplicación.', context: 'Puertos según motor: 3306, 5432 o 27017. Nunca se publica la base de datos directamente.', path: ['internet', 'gateway', 'alb', 'target-group', 'ec2', 'data'] },
]

const securityItems: DiagramItem[] = [
  { id: 'web-sg', label: 'SG del ALB', meta: 'entrada web', what: 'Permite conexiones entrantes desde Internet hacia el balanceador.', why: 'El borde público debe concentrar la exposición y ser el único punto que recibe tráfico web global.', context: 'Inbound: TCP/80 y TCP/443 desde 0.0.0.0/0. No agregues SSH aquí.', path: ['web-sg', 'app-sg', 'db-sg'] },
  { id: 'app-sg', label: 'SG de aplicación', meta: 'solo desde ALB', what: 'Acepta el tráfico reenviado por el ALB y bloquea conexiones web directas desde Internet.', why: 'Una referencia a otro SG expresa la intención de arquitectura mejor que una lista cambiante de IPs.', context: 'Inbound: TCP/80 o 443 desde SG del ALB. SSH/22 solo desde tu IP, VPN o Session Manager.', path: ['web-sg', 'app-sg', 'db-sg'] },
  { id: 'db-sg', label: 'SG de base de datos', meta: 'solo desde app', what: 'Permite el puerto del motor únicamente a las instancias de aplicación autorizadas.', why: 'La base de datos es una capa privada y no debe aceptar conexiones arbitrarias de Internet.', context: 'Inbound: 3306, 5432 o 27017 desde SG de aplicación. 0.0.0.0/0 aquí es una mala configuración.', path: ['web-sg', 'app-sg', 'db-sg'] },
]

const deploymentItems: DiagramItem[] = [
  { id: 'network', label: 'VPC + subredes', meta: 'paso 1', what: 'Creas la VPC, las subredes públicas y privadas, las rutas y el Security Group base.', why: 'La red define dónde puede vivir cada recurso antes de lanzar servidores.', context: 'Patrón recomendado: dos AZ, ALB/NAT en públicas y EC2 en privadas.', path: ['network', 'instance', 'ssh', 'install', 'publish'] },
  { id: 'instance', label: 'EC2 + key pair', meta: 'paso 2', what: 'Lanzas Amazon Linux 2023 con el tipo de instancia y el key pair adecuados.', why: 'La imagen determina las herramientas disponibles y la llave inicial permite administrar el laboratorio.', context: 'Guarda el .pem fuera del repositorio y aplica chmod 400 credenciales.pem.', path: ['network', 'instance', 'ssh', 'install', 'publish'] },
  { id: 'ssh', label: 'SSH', meta: 'paso 3', what: 'Abres una sesión administrativa usando la llave privada y la IP o DNS accesible.', why: 'Separar el acceso de administración del tráfico de usuarios hace visible y controlable el riesgo.', context: 'Comando: ssh -i credenciales.pem ec2-user@<IP_ELASTICA>. Restringe TCP/22 a tu origen.', path: ['network', 'instance', 'ssh', 'install', 'publish'] },
  { id: 'install', label: 'dnf + Apache', meta: 'paso 4', what: 'Actualizas Amazon Linux, instalas httpd, inicias el servicio y lo habilitas al reiniciar.', why: 'Instalación, arranque y persistencia son comprobaciones distintas y ayudan a localizar fallas.', context: 'Comandos: dnf update -y, dnf install httpd, systemctl start httpd, systemctl enable httpd.', path: ['network', 'instance', 'ssh', 'install', 'publish'] },
  { id: 'publish', label: 'Document Root + navegador', meta: 'paso 5', what: 'Copias el contenido a /var/www/html/ y validas la respuesta por el puerto 80.', why: 'El recorrido completo confirma conectividad, reglas del SG, servicio y contenido publicado.', context: 'Ruta: /var/www/html/. Validación: navegador o curl. No guardes secretos en el Document Root.', path: ['network', 'instance', 'ssh', 'install', 'publish'] },
]

const itemSets: Record<DiagramMode, DiagramItem[]> = { traffic: trafficItems, security: securityItems, deployment: deploymentItems }

function Arrow({ returnPath = false }: { returnPath?: boolean }) {
  return <span aria-hidden="true" className={`flex items-center justify-center text-accent ${returnPath ? 'rotate-180' : ''}`}><svg viewBox="0 0 24 16" className="h-4 w-6"><path d="M1 8h20m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg></span>
}

function DiagramNode({ item, selected, onSelect }: { item: DiagramItem; selected: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`${item.label}, ${item.meta}${selected ? ', seleccionado' : ''}`} className={`group min-h-16 w-full rounded-md border px-3 py-3 text-left transition-[border-color,background-color,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9900] ${selected ? 'border-accent bg-accent/10 ring-2 ring-accent/20' : 'border-border bg-background hover:-translate-y-0.5 hover:border-accent/60'}`}>
     <span className="flex items-center gap-2"><span className={`size-2 shrink-0 rounded-full ${selected ? 'bg-[#ff9900]' : 'border border-accent/70'}`} aria-hidden="true" /><span className="text-sm font-semibold">{item.label}</span></span>
    <span className="mt-1 block pl-4 text-xs text-foreground/60">{item.meta}</span>
  </button>
}

function DetailPanel({ item }: { item: DiagramItem }) {
  return <section aria-live="polite" className="rounded-md border border-accent/35 bg-accent/[0.06] p-5" aria-label={`Detalle de ${item.label}`}>
    <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">Elemento seleccionado</p><span className="font-mono text-xs text-foreground/50">{item.meta}</span></div>
    <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em]">{item.label}</h3>
    <div className="mt-5 grid gap-5 sm:grid-cols-3">
      <div><h4 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Qué ocurre</h4><p className="mt-2 text-sm leading-6 text-foreground/75">{item.what}</p></div>
      <div><h4 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Por qué</h4><p className="mt-2 text-sm leading-6 text-foreground/75">{item.why}</p></div>
      <div><h4 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Puertos, comandos y consideraciones</h4><p className="mt-2 text-sm leading-6 text-foreground/75">{item.context}</p></div>
    </div>
  </section>
}

export function AWSArchitectureDiagrams() {
  const [mode, setMode] = useState<DiagramMode>('traffic')
  const [selectedId, setSelectedId] = useState('internet')
  const items = itemSets[mode]
  const selected = items.find((item) => item.id === selectedId) ?? items[0]
  const selectMode = (nextMode: DiagramMode) => { setMode(nextMode); setSelectedId(itemSets[nextMode][0].id) }

  return <section className="not-prose rounded-md border border-border bg-background" aria-labelledby="interactive-diagrams-title">
    <div className="border-b border-border p-5 sm:p-6"><p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Mapa interactivo</p><h2 id="interactive-diagrams-title" className="mt-2 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">Observa el flujo, no solo los nombres</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-foreground/70">Elige una vista y luego selecciona un nodo o paso. La ruta activa se marca con texto, borde y estado, y el panel explica la decisión detrás de cada salto.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Vistas del mapa interactivo">{modes.map((option) => <button key={option.id} type="button" role="tab" aria-selected={mode === option.id} onClick={() => selectMode(option.id)} className={`min-h-14 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9900] ${mode === option.id ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60'}`}><span className="block text-sm font-semibold">{option.label}{mode === option.id && <span className="ml-2 font-mono text-[10px] text-accent uppercase">Seleccionada</span>}</span><span className="mt-1 block text-xs leading-5 text-foreground/60">{option.description}</span></button>)}</div>
    </div>
    <div className="space-y-5 p-5 sm:p-6">
      {mode === 'traffic' && <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">{items.map((item, index) => <div key={item.id} className="contents"><div className="min-w-0 flex-1"><DiagramNode item={item} selected={selected.id === item.id} onSelect={() => setSelectedId(item.id)} /></div>{index < items.length - 1 && <Arrow />}</div>)}</div>}
      {mode === 'security' && <div className="space-y-3"><div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">{items.map((item, index) => <div key={item.id} className="contents"><div className="min-w-0 flex-1"><DiagramNode item={item} selected={selected.id === item.id} onSelect={() => setSelectedId(item.id)} /></div>{index < items.length - 1 && <Arrow />}</div>)}</div><div className="flex items-center justify-center gap-2 border-t border-dashed border-accent/50 pt-3 text-xs text-accent"><Arrow returnPath /> <span>Respuesta permitida automáticamente, porque el SG es stateful</span> <Arrow /></div><p className="text-sm leading-6 text-foreground/70"><strong className="font-semibold text-foreground">Regla crítica:</strong> 0.0.0.0/0 pertenece solo a los puntos de entrada web públicos, no a SSH ni a puertos de base de datos.</p></div>}
      {mode === 'deployment' && <ol className="grid gap-3 md:grid-cols-5">{items.map((item, index) => <li key={item.id} className="flex items-stretch gap-2 md:block"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm ${selected.id === item.id ? 'border-accent bg-accent text-background' : 'border-border text-accent'}`} aria-hidden="true">{index + 1}</span><div className="flex min-w-0 flex-1 items-center md:mt-2"><DiagramNode item={item} selected={selected.id === item.id} onSelect={() => setSelectedId(item.id)} /></div></li>)}</ol>}
      <DetailPanel item={selected} />
    </div>
  </section>
}
