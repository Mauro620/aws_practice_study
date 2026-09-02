'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AWSArchitectureDiagrams } from './AWSArchitectureDiagrams'

type GuideSection = {
  id: string
  number: string
  title: string
  eyebrow: string
  summary: string
  how: string[]
  why: string
  useCases: string[]
  considerations: string[]
  deepDive?: { title: string; content: string }
}

const sections: GuideSection[] = [
  {
    id: 'vpc-subnets', number: '01', title: 'Diseñar la VPC y sus subredes', eyebrow: 'Red fundacional',
    summary: 'Una VPC es el perímetro lógico de tu arquitectura: define dónde viven los recursos y cómo se conectan.',
    how: ['En la consola, ve a VPC Dashboard > Create VPC. Selecciona “VPC and more” para crear visualmente las subredes y tablas de enrutamiento al mismo tiempo.', 'Parte de un CIDR amplio, por ejemplo 10.0.0.0/16. Distribuye subredes públicas y privadas en al menos dos Zonas de Disponibilidad (AZs).', 'Asocia una tabla de rutas pública al Internet Gateway. Las subredes privadas salen por NAT Gateway solo cuando lo necesitan.'],
    why: 'Separar la entrada pública de los servicios internos reduce la superficie de ataque y deja una topología preparada para alta disponibilidad.',
    useCases: ['ALB y NAT Gateway en subredes públicas.', 'EC2 de aplicación, bases de datos y servicios internos en subredes privadas.', 'Dos AZ para tolerar la pérdida de una zona completa.'],
    considerations: ['Una subred pública no es “pública” por su nombre: necesita ruta al IGW y recursos con IP pública.', 'Planifica el CIDR antes de crear recursos; ampliarlo después puede ser costoso.', 'Un NAT Gateway por AZ mejora la resiliencia, pero incrementa el costo.', 'Patrón recomendado: dos AZ, una subred pública y una privada por AZ.'],
  },
  {
    id: 'ec2-keys', number: '02', title: 'Levantar EC2 y administrar llaves', eyebrow: 'Computación',
    summary: 'EC2 proporciona servidores virtuales configurables. La elección de imagen, tipo de instancia y credenciales define el punto de partida.',
    how: ['En la consola, ve a EC2 > Launch instances. Usa Amazon Linux 2023 cuando quieras una imagen optimizada para AWS y el gestor dnf.', 'Elige el tipo de instancia según CPU, memoria, red y patrón de carga, no solo por precio (por ejemplo, t2.micro o t3.micro para empezar).', 'En Key pair (login), crea o selecciona un key pair por región y guarda el archivo .pem en un lugar seguro fuera del repositorio de código.'],
    why: 'Una configuración explícita evita servidores sobredimensionados y mantiene el acceso administrativo separado del tráfico de la aplicación.',
    useCases: ['Servidor web estático para una práctica inicial.', 'Backend dentro de una subred privada detrás de un ALB.', 'Instancias reemplazables creadas desde una AMI o un Launch Template.'],
    considerations: ['Una llave privada perdida no se puede descargar de nuevo desde AWS.', 'Usa IAM, Systems Manager Session Manager o un bastion host antes de exponer SSH públicamente.', 'Etiqueta las instancias (Tags) por ambiente, servicio y responsable.'],
  },
  {
    id: 'security-groups', number: '03', title: 'Controlar el tráfico con Security Groups', eyebrow: 'Profundización',
    summary: 'El Security Group es un firewall stateful asociado a la interfaz de red de la instancia.',
    how: ['En la creación de la EC2, o en EC2 > Security Groups, define reglas inbound mínimas para los puertos que realmente atiende el servicio.', 'Permite HTTP en TCP/80 y HTTPS en TCP/443 para recursos públicos. Restringe SSH/TCP/22 estrictamente a tu IP pública o VPN.', 'Para bases de datos, referencia el Security Group del backend, no 0.0.0.0/0.'],
    why: 'La denegación por defecto y las referencias entre grupos hacen que la intención de acceso sea visible y auditable.',
    useCases: ['SG del ALB: recibe 80/443 desde internet.', 'SG de aplicación: recibe tráfico únicamente desde el SG del ALB.', 'SG de base de datos: recibe 3306, 5432 o 27017 solo desde el SG de aplicación.'],
    considerations: ['Es stateful: si permites una conexión de entrada, el tráfico de respuesta queda permitido automáticamente.', 'Las reglas se suman; asociar varios grupos a una instancia puede abrir más acceso del esperado.'],
    deepDive: { title: 'La regla 0.0.0.0/0: cuándo usarla y cuándo rompe el estándar', content: '0.0.0.0/0 significa cualquier IP de internet. Solo debe usarse para puertos web (80 y 443) en recursos públicos como un ALB o un servidor web frontend que deba ser visible globalmente. Abrir SSH o puertos de bases de datos globalmente garantiza escaneos y ataques automatizados en cuestión de minutos. Las excepciones temporales, como un webhook sin rangos IP publicados o un diagnóstico de cinco minutos, deben cerrarse inmediatamente.' },
  },
  {
    id: 'ebs-snapshots', number: '04', title: 'Persistir datos con EBS y snapshots', eyebrow: 'Almacenamiento',
    summary: 'EBS es el disco de red de una EC2. Los snapshots capturan un punto de recuperación almacenado por AWS.',
    how: ['Al lanzar la instancia, en Configure storage, decide si el volumen Root debe eliminarse con la instancia mediante Delete on termination.', 'Para bases de datos, añade un New Volume separado, con un ciclo de vida independiente del volumen raíz.', 'Ve a EC2 > Snapshots para crear y programar respaldos. Cifra volúmenes y snapshots con KMS cuando el dato lo requiera.'],
    why: 'La instancia puede ser reemplazable sin que el dato lo sea. Los snapshots permiten recuperar, clonar o crear AMIs.',
    useCases: ['Recuperación ante borrado accidental o fallo de volumen.', 'Crear una AMI para repetir un servidor configurado.', 'Migrar datos a un volumen de mayor tamaño o rendimiento.'],
    considerations: ['Un snapshot es una copia incremental, no un reemplazo de una estrategia de backup completa.', 'Los snapshots son regionales y tienen costo de almacenamiento.'],
  },
  {
    id: 'alb-target-groups', number: '05', title: 'Distribuir tráfico con ALB y Target Groups', eyebrow: 'Profundización',
    summary: 'El ALB es la entrada estable; el Target Group conoce qué instancias están listas para recibir tráfico.',
    how: ['Ve a EC2 > Target Groups. Crea uno tipo Instances, define el puerto (por ejemplo, 80), la ruta del Health Check (por ejemplo, /) y registra las EC2 deseadas.', 'Ve a EC2 > Load Balancers > Create y selecciona Application Load Balancer. Ubícalo en las subredes públicas.', 'En Listeners and routing, reenvía el tráfico del puerto 80 hacia el Target Group recién creado.'],
    why: 'El usuario conoce un DNS estable y el balanceador retira automáticamente los destinos unhealthy.',
    useCases: ['Balanceo HTTP/HTTPS entre varias EC2.', 'Terminación TLS en el ALB antes de llegar a la aplicación.', 'Despliegues graduales mediante grupos de destino separados.'],
    considerations: ['El SG de las instancias debe aceptar tráfico desde el SG del ALB.', 'El round robin es una distribución, no una garantía de igualdad bajo conexiones persistentes.'],
    deepDive: { title: 'La decisión del health check que suele romper la arquitectura', content: 'Un Target Group no es solo una lista. Su health check define la condición mínima para enviar tráfico. Si apunta a un endpoint que responde 200 solo cuando la base de datos está disponible, una desconexión de BD hará que el balanceador marque la EC2 como insana y corte todo el tráfico de usuarios. El endpoint debe representar la salud que realmente quieres retirar del balanceo.' },
  },
  {
    id: 'access', number: '06', title: 'Resolver acceso con Elastic IP y SSH', eyebrow: 'Operación segura',
    summary: 'Una IP pública dinámica cambia al detener la máquina. Elastic IP aporta una dirección estática.',
    how: ['Ve a EC2 > Elastic IPs > Allocate. Selecciona la dirección, abre Actions > Associate Elastic IP address y vincúlala a tu EC2 o interfaz de red.', 'Conecta usando el usuario de la AMI, la llave privada y la IP estática.', 'Tras una práctica, libera la IP si no está asociada para evitar cargos innecesarios.'],
    why: 'Scripts y accesos manuales no se rompen al reiniciar la instancia. En producción suele ser mejor usar DNS frente a una IP.',
    useCases: ['Acceso temporal a un servidor de laboratorio.', 'Endpoint fijo para una integración que todavía no usa DNS.', 'Migración controlada de una instancia a otra interfaz.'],
    considerations: ['Elastic IP no cifra SSH ni reemplaza un firewall.', 'La llave debe tener permisos restrictivos en tu equipo.', 'Una Elastic IP pública sin asociación puede generar cargos; libera las que ya no uses.'],
  },
  {
    id: 'server-deployment', number: '07', title: 'Configurar el servidor y desplegar', eyebrow: 'Entrega',
    summary: 'El flujo de laboratorio instala Apache, lo deja persistente y publica el contenido en su Document Root.',
    how: ['Actualiza el sistema antes de instalar servicios.', 'Instala Apache, inicia el servicio y habilítalo para el próximo reinicio.', 'Copia el artefacto final a /var/www/html/ y valida desde el navegador o con curl.'],
    why: 'Separar instalación, arranque y despliegue hace visible qué parte falló. El comando enable es el que conserva el servicio después de reiniciar.',
    useCases: ['Aprender el ciclo completo de una página estática.', 'Validar conectividad entre SG, puerto 80 y Apache.', 'Sustituir edición manual por git clone, scp o un pipeline CI/CD.'],
    considerations: ['nano index.html es útil para aprender, pero no es reproducible.', 'No guardes secretos en el Document Root (/var/www/html/).'],
  },
]

const commands = [
  { label: 'Acceso inicial', code: 'ssh -i credenciales.pem ec2-user@<IP_ELASTICA>' },
  { label: 'Preparar Amazon Linux', code: 'sudo su\ndnf update -y\ndnf install httpd' },
  { label: 'Dejar Apache disponible', code: 'systemctl start httpd\nsystemctl enable httpd\nsystemctl status httpd' },
  { label: 'Publicar el contenido', code: 'cd /var/www/html/\nnano index.html' },
]

const tocSections = [...sections, { id: 'commands', number: '08', title: 'Comandos, en el orden correcto' }]

function Icon({ name }: { name: 'copy' | 'check' | 'arrow' | 'network' | 'deep-dive' }) {
  if (name === 'check') return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4"><path d="m4 10 4 4 8-8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
  if (name === 'arrow') return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4"><path d="m4 10h11m-4-4 4 4-4 4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
  if (name === 'network') return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5"><circle cx="10" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="4" cy="16" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="16" cy="16" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M9 6 5 14m6-8 4 8M6 16h8" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
  if (name === 'deep-dive') return <svg aria-hidden="true" viewBox="0 0 20 20" className="mr-2 inline size-4"><path d="M4 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4"><rect x="6" y="6" width="10" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M13 6V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
}

export function CodeSnippet({ label, code }: { label: string; code: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copyCode() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code)
      else {
        const textarea = document.createElement('textarea')
        textarea.value = code
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        if (!document.execCommand('copy')) throw new Error('Copy failed')
        textarea.remove()
      }
      setStatus('copied')
    } catch { setStatus('failed') }
  }

  return <div className="overflow-hidden rounded-md border border-border bg-[#17191c] text-[#e6edf3]">
    <div className="flex min-h-11 items-center justify-between gap-3 border-b border-white/10 px-4">
      <div className="flex items-center gap-2 text-xs font-medium text-white/70"><span className="size-2 rounded-full bg-[#ff9900]" />{label}<span className="font-mono text-white/40">bash</span></div>
      <button type="button" onClick={copyCode} className="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9900]" aria-label={`Copiar comando de ${label}`}><Icon name={status === 'copied' ? 'check' : 'copy'} /><span>{status === 'copied' ? 'Copiado' : status === 'failed' ? 'No disponible' : 'Copiar'}</span></button>
    </div>
    <pre className="overflow-x-auto p-4 text-sm leading-7"><code>{code}</code></pre>
    <div className="sr-only" aria-live="polite">{status === 'copied' ? 'Comando copiado al portapapeles.' : status === 'failed' ? 'No se pudo acceder al portapapeles. Selecciona y copia el comando manualmente.' : ''}</div>
  </div>
}

function DetailBlock({ title, children }: { title: string; children: ReactNode }) {
  return <div><h3 className="mb-2 text-xs font-semibold tracking-[0.14em] text-accent uppercase">{title}</h3><div className="text-sm leading-7 text-foreground/75">{children}</div></div>
}

export function AWSArchitectureGuide() {
  const [activeId, setActiveId] = useState(sections[0].id)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActiveId(visible.target.id)
    }, { rootMargin: '-12% 0px -68% 0px', threshold: [0, 0.25, 0.6] })
    tocSections.forEach(({ id }) => { const element = document.getElementById(id); if (element) observer.observe(element) })
    return () => observer.disconnect()
  }, [])

  return <div className="min-h-screen bg-background text-foreground selection:bg-[#ff9900]/20">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-12 lg:py-14">
      <header className="border-b border-border pb-10 lg:pb-14"><div className="max-w-3xl">
        <div className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.16em] text-accent uppercase"><Icon name="network" />AWS / arquitectura base</div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">De una VPC vacía a un despliegue verificable.</h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-foreground/70 sm:text-lg">Una guía práctica para conectar red, cómputo, seguridad y entrega. Primero entiende el recorrido; después profundiza en las decisiones que hacen que la arquitectura sea resistente.</p>
        <div className="mt-7 flex flex-wrap gap-2 text-xs text-foreground/65"><span className="rounded-md border border-border px-3 py-1.5">8 etapas</span><span className="rounded-md border border-border px-3 py-1.5">Amazon Linux 2023</span><span className="rounded-md border border-border px-3 py-1.5">Laboratorio + producción</span></div>
      </div></header>

      <div className="grid gap-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <aside className="lg:sticky lg:top-8 lg:h-fit lg:self-start" aria-label="Contenido de la guía"><div className="pb-2 lg:pb-0"><nav className="flex flex-col gap-1 lg:block" aria-label="Secciones de la guía">
          {tocSections.map((section) => <a key={section.id} href={`#${section.id}`} aria-current={activeId === section.id ? 'location' : undefined} className={`group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9900] lg:mb-1 ${activeId === section.id ? 'bg-[#ff9900]/10 text-accent' : 'text-foreground/55 hover:bg-foreground/5 hover:text-foreground'}`}><span className="font-mono text-[10px] opacity-60">{section.number}</span><span>{section.title}</span></a>)}
        </nav></div><p className="mt-5 hidden border-t border-border pt-4 text-xs leading-5 text-foreground/55 lg:block">Navega por las etapas. El resaltado sigue tu posición automáticamente.</p></aside>

        <main id="contenido" className="min-w-0">
           <div className="mb-10 rounded-md border border-[#ff9900]/30 bg-[#ff9900]/[0.08] p-5 sm:p-6"><p className="text-sm font-semibold text-accent">Mapa mental</p><p className="mt-2 max-w-3xl text-sm leading-7 text-foreground/75">Internet llega al <strong className="font-medium text-foreground">ALB</strong>, el ALB deriva a un <strong className="font-medium text-foreground">Target Group</strong>, y este alcanza instancias en subredes privadas. Los <strong className="font-medium text-foreground">Security Groups</strong> permiten solo el flujo necesario.</p></div>
           <div className="mb-10"><AWSArchitectureDiagrams /></div>
          {sections.map((section, index) => <section key={section.id} id={section.id} className="scroll-mt-8 border-b border-border py-10 first:pt-0 lg:py-14">
            <div className="mb-8 flex items-start gap-4"><span className="font-mono text-sm text-accent">{section.number}</span><div><p className="text-xs font-semibold tracking-[0.16em] text-foreground/55 uppercase">{section.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{section.title}</h2><p className="mt-4 max-w-2xl text-base leading-8 text-foreground/70">{section.summary}</p></div></div>
            <div className="grid gap-8 md:grid-cols-2"><DetailBlock title="Cómo hacerlo en consola"><ul className="space-y-2">{section.how.map((item) => <li key={item} className="flex gap-3"><Icon name="arrow" /><span>{item}</span></li>)}</ul></DetailBlock><DetailBlock title="Por qué importa"><p>{section.why}</p></DetailBlock><DetailBlock title="Casos de uso"><ul className="space-y-2">{section.useCases.map((item) => <li key={item} className="flex gap-3"><span className="mt-3 size-1.5 shrink-0 rounded-full bg-[#ff9900]" /><span>{item}</span></li>)}</ul></DetailBlock><DetailBlock title="Consideraciones"><ul className="space-y-2">{section.considerations.map((item) => <li key={item} className="flex gap-3"><span className="font-mono text-accent">›</span><span>{item}</span></li>)}</ul></DetailBlock></div>
            {section.deepDive && <details className="mt-9 rounded-md border border-[#ff9900]/35 bg-[#ff9900]/[0.07] p-5 open:bg-[#ff9900]/[0.1]"><summary className="min-h-11 cursor-pointer list-none rounded-md text-sm font-medium text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9900]"><Icon name="deep-dive" />{section.deepDive.title}</summary><p className="mt-4 border-t border-[#ff9900]/20 pt-4 text-sm leading-7 text-foreground/75">{section.deepDive.content}</p></details>}
            {index === 0 && <div className="mt-10 rounded-md border border-border bg-foreground/[0.03] p-4 text-xs leading-6 text-foreground/65">Patrón recomendado: dos AZ, una subred pública y una privada por AZ. La redundancia no elimina fallas, pero evita que una sola AZ sea un punto único de caída.</div>}
          </section>)}
          <section id="commands" className="scroll-mt-8 py-10 lg:py-14"><p className="text-xs font-semibold tracking-[0.16em] text-accent uppercase">Runbook de laboratorio</p><h2 className="mt-2 text-2xl font-semibold sm:text-3xl">Comandos, en el orden correcto</h2><p className="mt-4 max-w-2xl text-base leading-8 text-foreground/70">Cada bloque se puede copiar de forma independiente. En producción, reemplaza la edición manual por un artefacto versionado y un pipeline reproducible.</p><div className="mt-8 grid gap-4">{commands.map((command) => <CodeSnippet key={command.label} {...command} />)}</div></section>
        </main>
      </div>
    </div>
  </div>
}
