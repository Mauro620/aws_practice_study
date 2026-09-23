/**
 * Pure data + state logic for the reference architecture diagram
 * (/arquitectura-referencia). No React here: the component only renders what
 * these functions return, following the route-tables.ts / network-acls.ts pattern.
 *
 * Two id spaces:
 * - ComponenteId: an AWS concept with its own explanation panel (e.g. 'nat-gateway').
 * - NodoId: a box drawn in the diagram (e.g. 'nat-a', 'nat-b'). Several nodes can
 *   share one component, like the ALB present in both AZ.
 */

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

export type ModoId = 'trafico' | 'seguridad' | 'alta-disponibilidad' | 'costos' | 'ruta-aprendizaje'

export type Modo = {
  id: ModoId
  numero: number
  label: string
  descripcion: string
  disponible: boolean
}

/** Full, ordered mode catalogue. Later phases flip `disponible` and add UI; ids and numbers never change. */
export const MODOS: Modo[] = [
  { id: 'trafico', numero: 1, label: 'Flujo de tráfico', descripcion: 'Seguí una petición paso a paso, desde el usuario hasta los datos y de vuelta.', disponible: true },
  { id: 'seguridad', numero: 2, label: 'Seguridad', descripcion: 'Capas de control de acceso de la arquitectura.', disponible: false },
  { id: 'alta-disponibilidad', numero: 3, label: 'Alta disponibilidad', descripcion: 'Provocá fallas y mirá cómo responde el sistema.', disponible: true },
  { id: 'costos', numero: 4, label: 'Costos', descripcion: 'Estimación de costos por componente.', disponible: false },
  { id: 'ruta-aprendizaje', numero: 5, label: 'Ruta de aprendizaje', descripcion: 'Orden sugerido para estudiar cada pieza.', disponible: false },
]

export function modosDisponibles(): Modo[] {
  return MODOS.filter(({ disponible }) => disponible)
}

// ---------------------------------------------------------------------------
// Components (panel content)
// ---------------------------------------------------------------------------

export type Capa = 'borde' | 'publica' | 'privada' | 'datos' | 'transversal'

export const CAPA_LABEL: Record<Capa, string> = {
  borde: 'Borde global',
  publica: 'Red pública',
  privada: 'Red privada',
  datos: 'Datos',
  transversal: 'Transversal',
}

export type ModoCobro = 'fijo-por-hora' | 'fijo-mensual' | 'por-uso' | 'sin-costo'

export const MODO_COBRO_LABEL: Record<ModoCobro, string> = {
  'fijo-por-hora': 'Fijo por hora',
  'fijo-mensual': 'Fijo mensual',
  'por-uso': 'Por uso',
  'sin-costo': 'Sin costo',
}

export type ComponenteId =
  | 'route53' | 'cloudfront' | 'acm' | 'waf' | 'shield' | 's3'
  | 'internet-gateway' | 'vpc' | 'zona-disponibilidad' | 'subred-publica' | 'subred-privada'
  | 'alb' | 'target-group' | 'nat-gateway' | 'auto-scaling-group' | 'ec2' | 'rol-iam' | 'ebs'
  | 'rds' | 'security-groups' | 'tablas-rutas' | 'cloudwatch'

export type Componente = {
  id: ComponenteId
  nombre: string
  /** 1. Qué es — one line. */
  queEs: string
  /** 2. En qué módulo se estudia. `href` null only if nothing in the app covers it. */
  modulo: { href: string | null; etiqueta: string; nota?: string }
  /** 3. Por qué está aquí. */
  porQue: string
  /** 4. Qué se rompe si lo quitás. */
  siLoQuitas: string
  /** 5. Cómo cobra — qualitative only, no prices. */
  cobro: { modos: ModoCobro[]; detalle: string }
}

export const COMPONENTES: Componente[] = [
  {
    id: 'route53',
    nombre: 'Amazon Route 53',
    queEs: 'El DNS administrado de AWS: traduce cdn.miapp.com a la distribución de CloudFront mediante un registro ALIAS.',
    modulo: { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido · nivel 3, Dominio propio con Route 53' },
    porQue: 'Los usuarios necesitan un nombre propio y estable. Un registro ALIAS apunta el dominio a la distribución sin exponer el nombre asignado por AWS y, a diferencia de un CNAME, también funciona en el apex del dominio.',
    siLoQuitas: 'El dominio propio deja de resolver: solo se podría entrar con el nombre xxxx.cloudfront.net que asigna AWS, y el certificado de ACM emitido para cdn.miapp.com dejaría de tener uso.',
    cobro: { modos: ['fijo-mensual', 'por-uso'], detalle: 'Cargo mensual por cada zona alojada más un cargo por consultas DNS. Las consultas ALIAS hacia una distribución de CloudFront no se cobran.' },
  },
  {
    id: 'cloudfront',
    nombre: 'Amazon CloudFront',
    queEs: 'La CDN de AWS: sirve el sitio desde edge locations cercanas al usuario y reenvía al origen lo que no tiene en caché.',
    modulo: { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido · niveles 2 y 3' },
    porQue: 'Es la única puerta de entrada HTTPS: cachea /static/* en el borde (menos latencia y menos carga en el origen) y reenvía /api/* al ALB. Además oculta el bucket detrás de OAC y concentra en el borde la protección de Shield y WAF.',
    siLoQuitas: 'Cada petición viaja hasta us-east-1: más latencia para usuarios lejanos, todo el tráfico estático cae sobre el origen, el bucket tendría que ser público para servir el sitio y se pierde el punto donde aplicar WAF y el certificado del dominio.',
    cobro: { modos: ['por-uso'], detalle: 'Por datos transferidos hacia los usuarios y por cantidad de peticiones; la tarifa varía según la región del usuario y la price class elegida. Las invalidaciones por encima de la cuota gratuita también se cobran.' },
  },
  {
    id: 'acm',
    nombre: 'AWS Certificate Manager (ACM)',
    queEs: 'Emite y renueva automáticamente el certificado TLS de cdn.miapp.com que CloudFront presenta a los navegadores.',
    modulo: { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido · nivel 3, El certificado con ACM (y nivel 4, us-east-1)' },
    porQue: 'Sin certificado no hay HTTPS con dominio propio. ACM valida la propiedad del dominio con un registro DNS en Route 53 y renueva solo. Para CloudFront, el certificado tiene que estar en us-east-1.',
    siLoQuitas: 'CloudFront no puede presentar un certificado válido para cdn.miapp.com: el navegador muestra un error de certificado, o hay que volver al dominio xxxx.cloudfront.net que trae el certificado de AWS.',
    cobro: { modos: ['sin-costo'], detalle: 'Los certificados públicos que solo se usan dentro de servicios integrados, como CloudFront o el ALB, no tienen costo.' },
  },
  {
    id: 'waf',
    nombre: 'AWS WAF',
    queEs: 'Firewall de aplicaciones web: filtra peticiones HTTP(S) con reglas de capa 7 antes de que lleguen al origen.',
    modulo: { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido · nivel 3, La seguridad que ya viene incluida' },
    porQue: 'Security Groups y NACL filtran por IP y puerto; no entienden HTTP. WAF bloquea patrones como inyección SQL, limita la tasa de peticiones por IP y filtra por reputación, y al estar asociado a CloudFront corta el ataque en el borde.',
    siLoQuitas: 'Las peticiones maliciosas de capa 7 (inyección SQL, scraping, fuerza bruta contra un login en /api/*) llegan hasta el ALB y las instancias; solo las detendría el código de la aplicación, y se pagaría el cómputo de atenderlas.',
    cobro: { modos: ['fijo-mensual', 'por-uso'], detalle: 'Cargo mensual por cada web ACL y por cada regla, más un cargo por cantidad de peticiones evaluadas.' },
  },
  {
    id: 'shield',
    nombre: 'AWS Shield Standard',
    queEs: 'Protección contra DDoS de capas 3 y 4, activa automáticamente y sin configuración en CloudFront y Route 53.',
    modulo: { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido · nivel 3, La seguridad que ya viene incluida' },
    porQue: 'Absorbe ataques volumétricos y de protocolo (inundaciones SYN, reflexión UDP) en la red de AWS. Es parte del motivo para poner CloudFront adelante: el ataque choca contra muchas edge locations y no contra tu VPC.',
    siLoQuitas: 'Shield Standard no se puede desactivar. Lo que sí se pierde si sacás CloudFront del frente es la absorción en el borde: el tráfico del ataque llega concentrado al ALB de una sola región.',
    cobro: { modos: ['sin-costo'], detalle: 'Shield Standard está incluido sin costo. Shield Advanced, que no forma parte de esta arquitectura, es una suscripción paga.' },
  },
  {
    id: 's3',
    nombre: 'Bucket S3 privado (con OAC)',
    queEs: 'Bucket privado que guarda los archivos de /static/* (HTML, CSS, JS, imágenes), con versionado y reglas de ciclo de vida.',
    modulo: { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido · nivel 2 (OAC) y nivel 3, El bucket con versionado y ciclo de vida' },
    porQue: 'Almacenamiento durable y barato para archivos que no necesitan servidor. Con OAC solo esta distribución de CloudFront puede leerlo; el versionado protege contra sobrescrituras y borrados accidentales, y el ciclo de vida expira o mueve versiones viejas para contener el costo.',
    siLoQuitas: 'Los estáticos tendrían que servirse desde las EC2, gastando CPU y ancho de banda en algo que no requiere cómputo. Y sin OAC, el bucket tendría que ser público: cualquiera podría pedir los objetos directo a S3, saltándose CloudFront y WAF.',
    cobro: { modos: ['por-uso'], detalle: 'Por GB almacenado al mes (según la clase de almacenamiento), por peticiones y por transferencia. Con versionado, cada versión conservada ocupa espacio facturable. La transferencia de S3 hacia CloudFront no se cobra.' },
  },
  {
    id: 'internet-gateway',
    nombre: 'Internet Gateway',
    queEs: 'Componente de la VPC que conecta sus subredes públicas con Internet, en ambos sentidos.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC' },
    porQue: 'Por acá entran las peticiones /api/* que CloudFront reenvía al ALB, y por acá salen, a través de los NAT Gateway, las conexiones que inician las instancias privadas. Una subred es pública justamente porque su tabla de rutas tiene 0.0.0.0/0 hacia el IGW.',
    siLoQuitas: 'La VPC queda aislada: CloudFront no alcanza al ALB y /api/* responde con error, y los NAT Gateway pierden su salida. El contenido estático seguiría funcionando, porque CloudFront y S3 no pasan por la VPC.',
    cobro: { modos: ['sin-costo'], detalle: 'El IGW no tiene cargo propio; se paga la transferencia de datos de salida y las direcciones IPv4 públicas asociadas a recursos.' },
  },
  {
    id: 'vpc',
    nombre: 'Amazon VPC',
    queEs: 'La red privada y aislada de la región, con el bloque 10.0.0.0/16, donde viven ALB, NAT, instancias y base de datos.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC' },
    porQue: 'Define el perímetro: qué es público, qué es privado y cómo se enruta. Un /16 deja espacio para agregar subredes más adelante (por ejemplo, una capa de datos separada) sin rediseñar.',
    siLoQuitas: 'No hay dónde lanzar el ALB, las EC2 ni RDS: todos necesitan subredes de una VPC. Sin un diseño propio se usaría la VPC por defecto, cuyas subredes son todas públicas.',
    cobro: { modos: ['sin-costo'], detalle: 'La VPC en sí no se cobra; sí cobran componentes dentro de ella, como NAT Gateway, IP públicas, endpoints y la transferencia entre AZ.' },
  },
  {
    id: 'zona-disponibilidad',
    nombre: 'Zona de disponibilidad (AZ)',
    queEs: 'Uno o más centros de datos aislados dentro de la región; esta arquitectura usa us-east-1a y us-east-1b.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC' },
    porQue: 'Repetir el mismo patrón en dos AZ elimina el punto único de fallo físico: si una zona cae, la otra sigue sirviendo, porque el ALB, el ASG y RDS Multi-AZ saben usar la sobreviviente.',
    siLoQuitas: 'Con una sola AZ, un corte de energía o de red en esa zona tumba todo el sistema a la vez. Además, el ALB exige subredes en al menos dos AZ.',
    cobro: { modos: ['sin-costo'], detalle: 'Usar varias AZ no se cobra por sí mismo, pero la transferencia de datos entre AZ sí tiene cargo (por ejemplo, una instancia que sale por el NAT de la otra zona).' },
  },
  {
    id: 'subred-publica',
    nombre: 'Subredes públicas',
    queEs: 'Las subredes 10.0.1.0/24 (us-east-1a) y 10.0.2.0/24 (us-east-1b), cuya tabla de rutas envía 0.0.0.0/0 al Internet Gateway.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC' },
    porQue: 'Alojan solo lo que tiene que ser alcanzable desde Internet o salir directo a él: los nodos del ALB y los NAT Gateway. Nada de la aplicación ni de los datos vive acá.',
    siLoQuitas: 'El ALB no tendría dónde recibir el tráfico de CloudFront y los NAT Gateway no podrían existir, porque necesitan una subred con ruta al IGW: la aplicación quedaría inalcanzable y sin salida.',
    cobro: { modos: ['sin-costo'], detalle: 'Las subredes no tienen costo; se paga lo que se lanza dentro de ellas.' },
  },
  {
    id: 'subred-privada',
    nombre: 'Subredes privadas',
    queEs: 'Las subredes 10.0.11.0/24 (us-east-1a) y 10.0.12.0/24 (us-east-1b), sin ruta al IGW: su 0.0.0.0/0 apunta al NAT Gateway de su misma AZ.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC' },
    porQue: 'Las instancias y la base de datos no son alcanzables desde Internet ni aunque un Security Group quede mal configurado: solo reciben lo que el ALB les reenvía y salen por el NAT.',
    siLoQuitas: 'Habría que poner las EC2 y RDS en subredes públicas: con IP pública quedan expuestas a escaneos directos y la única defensa pasa a ser el Security Group.',
    cobro: { modos: ['sin-costo'], detalle: 'Las subredes no tienen costo; se paga lo que se lanza dentro de ellas.' },
  },
  {
    id: 'alb',
    nombre: 'Application Load Balancer (ALB)',
    queEs: 'Un único balanceador de capa 7 con nodos en las dos subredes públicas; es el origen de /api/* para CloudFront.',
    modulo: { href: '/guia-arquitectura#alb-target-groups', etiqueta: 'Guía de arquitectura · 05 ALB y Target Groups (y M6 Elasticidad)' },
    porQue: 'Da un punto estable delante de instancias que el ASG crea y destruye, reparte la carga entre las dos AZ y solo envía tráfico a destinos que pasan el health check.',
    siLoQuitas: 'CloudFront tendría que apuntar a una instancia concreta: sin reparto de carga, sin retirar instancias rotas y con una dirección que cambia cada vez que el ASG reemplaza una máquina. Además, las EC2 tendrían que estar en una subred pública.',
    cobro: { modos: ['fijo-por-hora', 'por-uso'], detalle: 'Cargo por cada hora (o fracción) que el balanceador existe, más un cargo por capacidad consumida (LCU) según conexiones, peticiones y bytes procesados.' },
  },
  {
    id: 'target-group',
    nombre: 'Target Group',
    queEs: 'Grupo de destinos (las instancias EC2) al que el ALB reenvía, con su health check, por ejemplo HTTP:80 en /health.',
    modulo: { href: '/guia-arquitectura#alb-target-groups', etiqueta: 'Guía de arquitectura · 05 ALB y Target Groups (y M6 Elasticidad, nivel 3)' },
    porQue: 'Separa quién recibe tráfico de cómo se reparte: el ASG registra y desregistra instancias acá automáticamente y el health check decide cuáles están listas para recibir usuarios.',
    siLoQuitas: 'El listener del ALB no tiene a quién reenviar las peticiones. Y sin un health check que diga la verdad, el ALB seguiría enviando usuarios a instancias que responden pero no pueden trabajar.',
    cobro: { modos: ['sin-costo'], detalle: 'No tiene cargo propio: su uso está incluido en el costo del ALB.' },
  },
  {
    id: 'nat-gateway',
    nombre: 'NAT Gateway',
    queEs: 'Servicio administrado que deja a las instancias privadas iniciar conexiones hacia Internet sin aceptar conexiones entrantes; hay uno por AZ.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC · nivel 4' },
    porQue: 'Las EC2 necesitan descargar parches (dnf update) y paquetes, y llamar a APIs externas, sin ser alcanzables desde afuera. Tener uno por AZ evita que la caída de una zona corte la salida de la otra y evita tráfico entre AZ.',
    siLoQuitas: 'Sin el NAT Gateway, las instancias privadas no pueden descargar actualizaciones ni llamar a APIs externas, aunque siguen atendiendo las peticiones que llegan desde el ALB. Con uno solo compartido, su AZ se vuelve punto único de fallo para la salida de toda la VPC.',
    cobro: { modos: ['fijo-por-hora', 'por-uso'], detalle: 'Cargo por cada hora que existe más un cargo por GB procesado. Con uno por AZ, el costo fijo se duplica: suele ser uno de los rubros más caros de esta arquitectura.' },
  },
  {
    id: 'auto-scaling-group',
    nombre: 'Auto Scaling Group (ASG)',
    queEs: 'Grupo que mantiene entre un mínimo y un máximo de instancias EC2, repartidas en las dos subredes privadas, a partir de un Launch Template.',
    modulo: { href: '/servicios/elasticidad', etiqueta: 'M6 Elasticidad · nivel 3, El ASG sobre dos AZ' },
    porQue: 'Reemplaza solo las instancias que fallan (con verificación de salud ELB) y ajusta la capacidad según una métrica de CloudWatch, por ejemplo CPU promedio al 60 %. Reparte las instancias entre AZ.',
    siLoQuitas: 'Una instancia caída queda caída hasta que alguien la reemplace a mano, y un pico de carga satura las que hay. Si cae una AZ, nadie lanza capacidad en la otra.',
    cobro: { modos: ['sin-costo'], detalle: 'Auto Scaling no se cobra; se pagan las instancias EC2 y las alarmas de CloudWatch que usa.' },
  },
  {
    id: 'ec2',
    nombre: 'Instancias Amazon EC2',
    queEs: 'Servidores virtuales que ejecutan la aplicación de /api/*, al menos uno por AZ, dentro de las subredes privadas.',
    modulo: { href: '/servicios/ec2', etiqueta: 'M4 Amazon EC2 (y M6 Elasticidad)' },
    porQue: 'Es la capa de cómputo de la lógica dinámica. En subred privada, sin IP pública y creadas por el ASG desde una AMI, son reemplazables: ganado, no mascotas.',
    siLoQuitas: 'Nadie procesa /api/*: el ALB no tiene destinos registrados y responde con error. El contenido estático servido por CloudFront y S3 seguiría funcionando.',
    cobro: { modos: ['fijo-por-hora'], detalle: 'On-Demand se cobra por tiempo encendida según el tipo de instancia (por segundo en Linux, con un mínimo de 60 segundos). Savings Plans o Spot cambian la tarifa, no el modelo.' },
  },
  {
    id: 'rol-iam',
    nombre: 'Rol IAM de la instancia',
    queEs: 'Rol que cada instancia asume mediante su perfil de instancia para obtener credenciales temporales de AWS.',
    modulo: { href: '/servicios/iam', etiqueta: 'M5 Protección del acceso (IAM) · nivel 2, El caso mínimo de un rol' },
    porQue: 'La aplicación puede llamar a servicios de AWS, por ejemplo leer de S3 o publicar métricas en CloudWatch, sin guardar access keys en el disco ni en el código: las credenciales rotan solas. El Launch Template lo asigna a cada instancia que lanza el ASG.',
    siLoQuitas: 'Las llamadas de la aplicación a AWS fallan por falta de credenciales o con AccessDenied, o alguien termina copiando access keys de larga duración en la AMI, que es justo el error que el rol evita.',
    cobro: { modos: ['sin-costo'], detalle: 'IAM no tiene costo.' },
  },
  {
    id: 'ebs',
    nombre: 'Volúmenes Amazon EBS',
    queEs: 'Disco de bloques persistente conectado a cada instancia como volumen raíz (y, si hace falta, como disco adicional).',
    modulo: { href: '/servicios/ec2', etiqueta: 'M4 Amazon EC2 (y Guía de arquitectura · 04 EBS y snapshots)' },
    porQue: 'Guarda el sistema operativo y la aplicación. En esta arquitectura se trata como descartable: el estado importante vive en RDS o S3, porque el ASG termina instancias y, por defecto, el volumen raíz se borra con ellas.',
    siLoQuitas: 'Una instancia basada en EBS no arranca sin volumen raíz. Y cualquier dato de usuario guardado solo en EBS se pierde cuando el ASG termina la instancia.',
    cobro: { modos: ['por-uso'], detalle: 'Por GB aprovisionado al mes (no por GB ocupado), aunque la instancia esté detenida; algunos tipos cobran además IOPS o rendimiento, y los snapshots se cobran por GB almacenado.' },
  },
  {
    id: 'rds',
    nombre: 'Amazon RDS Multi-AZ',
    queEs: 'Base de datos relacional administrada: una instancia primaria en us-east-1a y una standby sincrónica en us-east-1b.',
    modulo: {
      href: '/servicios/ec2',
      etiqueta: 'M4 Amazon EC2 · nivel 3, La arquitectura de alta disponibilidad estándar',
      nota: 'RDS no tiene un módulo dedicado en esta app todavía. El nivel 3 de EC2 lo ubica en la arquitectura de alta disponibilidad, y el nivel 4 de Elasticidad explica por qué el estado va en RDS y no en la instancia.',
    },
    porQue: 'Saca el estado de las instancias (se pueden destruir sin perder datos) y delega backups, parches y failover en AWS. En el despliegue Multi-AZ con una standby, la réplica sincrónica de la otra AZ se promueve si la primaria falla; esa standby no atiende lecturas.',
    siLoQuitas: 'Los datos quedarían en las EC2 o sus volúmenes EBS: se pierden cuando el ASG termina una instancia y no se comparten entre instancias. Sin Multi-AZ, la caída de us-east-1a deja la aplicación sin base de datos hasta restaurar un backup.',
    cobro: { modos: ['fijo-por-hora', 'por-uso'], detalle: 'Por hora de instancia de base de datos (Multi-AZ paga también la standby), más almacenamiento por GB al mes y backups por encima del tamaño de la base.' },
  },
  {
    id: 'security-groups',
    nombre: 'Security Groups',
    queEs: 'Firewalls stateful a nivel de interfaz: sg-alb, sg-app y sg-db, encadenados haciendo referencia uno al otro.',
    modulo: { href: '/guia-arquitectura#security-groups', etiqueta: 'Guía de arquitectura · 03 Security Groups (y M3 Amazon VPC)' },
    porQue: 'Cada capa acepta solo a la anterior: el ALB recibe HTTPS (idealmente solo desde la prefix list administrada de CloudFront), las EC2 solo desde el SG del ALB y RDS solo el puerto del motor desde el SG de las EC2. Referenciar SG en vez de IP sigue funcionando cuando el ASG cambia las instancias.',
    siLoQuitas: 'Sin reglas específicas se cae en uno de dos extremos: nada se conecta (un SG sin reglas de entrada bloquea todo) o se abre 0.0.0.0/0 para que funcione, y la base de datos queda alcanzable desde cualquier recurso con ruta hacia ella.',
    cobro: { modos: ['sin-costo'], detalle: 'Los Security Groups no tienen costo.' },
  },
  {
    id: 'tablas-rutas',
    nombre: 'Tablas de rutas',
    queEs: 'Reglas que deciden a dónde va el tráfico que sale de cada subred; si varias coinciden, gana el prefijo más largo.',
    modulo: { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC (y su simulador de tablas de rutas)' },
    porQue: 'Son las que hacen pública o privada a una subred: la pública tiene 0.0.0.0/0 hacia el IGW y cada privada tiene 0.0.0.0/0 hacia el NAT de su misma AZ. La ruta local 10.0.0.0/16 permite que todo se comunique dentro de la VPC.',
    siLoQuitas: 'Las subredes quedan con la tabla principal, que en esta VPC solo tiene la ruta local: el ALB deja de ser alcanzable desde Internet y las instancias pierden la salida por NAT.',
    cobro: { modos: ['sin-costo'], detalle: 'Las tablas de rutas no tienen costo.' },
  },
  {
    id: 'cloudwatch',
    nombre: 'Amazon CloudWatch',
    queEs: 'Servicio de métricas, logs y alarmas: recibe la CPU de las EC2 y las métricas del ALB, y dispara el escalado.',
    modulo: { href: '/servicios/elasticidad', etiqueta: 'M6 Elasticidad · nivel 3, CloudWatch: lo que mide y lo que no' },
    porQue: 'La política de target tracking del ASG crea alarmas de CloudWatch sobre la CPU promedio del grupo; sin métricas no hay escalado automático ni visibilidad de errores 5xx o de latencia.',
    siLoQuitas: 'El ASG podría mantener un número fijo de instancias (y seguir reemplazando las que fallan el health check), pero no escalaría con la carga, y nadie se enteraría de un aumento de errores hasta que lo reporten los usuarios.',
    cobro: { modos: ['por-uso'], detalle: 'Las métricas básicas de EC2 (cada 5 minutos) no se cobran; sí se cobran el monitoreo detallado, las métricas personalizadas, las alarmas y los logs ingeridos y almacenados.' },
  },
]

const COMPONENTES_POR_ID = new Map(COMPONENTES.map((componente) => [componente.id, componente]))

export function getComponente(id: ComponenteId): Componente {
  return COMPONENTES_POR_ID.get(id)!
}

// ---------------------------------------------------------------------------
// Diagram nodes
// ---------------------------------------------------------------------------

export type NodoId =
  | 'route53' | 'cloudfront' | 'acm' | 'waf' | 'shield' | 's3' | 'cloudwatch'
  | 'internet-gateway' | 'vpc' | 'az-a' | 'az-b'
  | 'subred-publica-a' | 'subred-publica-b' | 'subred-privada-a' | 'subred-privada-b'
  | 'alb-a' | 'alb-b' | 'nat-a' | 'nat-b' | 'target-group' | 'asg'
  | 'ec2-a' | 'ec2-b' | 'rol-a' | 'rol-b' | 'ebs-a' | 'ebs-b'
  | 'rds-primaria' | 'rds-standby' | 'security-groups' | 'tablas-rutas'

export type Nodo = {
  id: NodoId
  componente: ComponenteId
  label: string
  /** Short technical detail shown under the label (CIDR, AZ, config). */
  detalle: string
  capa: Capa
}

export const NODOS: Nodo[] = [
  { id: 'route53', componente: 'route53', label: 'Route 53', detalle: 'cdn.miapp.com → ALIAS', capa: 'borde' },
  { id: 'cloudfront', componente: 'cloudfront', label: 'CloudFront', detalle: '/static/* y /api/*', capa: 'borde' },
  { id: 'acm', componente: 'acm', label: 'ACM', detalle: 'certificado TLS', capa: 'borde' },
  { id: 'waf', componente: 'waf', label: 'WAF', detalle: 'reglas capa 7', capa: 'borde' },
  { id: 'shield', componente: 'shield', label: 'Shield Standard', detalle: 'DDoS capas 3 y 4', capa: 'borde' },
  { id: 's3', componente: 's3', label: 'Bucket S3', detalle: 'privado · OAC · versionado', capa: 'borde' },
  { id: 'internet-gateway', componente: 'internet-gateway', label: 'Internet Gateway', detalle: 'entrada y salida de la VPC', capa: 'publica' },
  { id: 'subred-publica-a', componente: 'subred-publica', label: 'Subred pública', detalle: '10.0.1.0/24', capa: 'publica' },
  { id: 'alb-a', componente: 'alb', label: 'ALB', detalle: 'nodo en us-east-1a', capa: 'publica' },
  { id: 'nat-a', componente: 'nat-gateway', label: 'NAT Gateway', detalle: 'us-east-1a', capa: 'publica' },
  { id: 'subred-publica-b', componente: 'subred-publica', label: 'Subred pública', detalle: '10.0.2.0/24', capa: 'publica' },
  { id: 'alb-b', componente: 'alb', label: 'ALB', detalle: 'nodo en us-east-1b', capa: 'publica' },
  { id: 'nat-b', componente: 'nat-gateway', label: 'NAT Gateway', detalle: 'us-east-1b', capa: 'publica' },
  { id: 'target-group', componente: 'target-group', label: 'Target Group', detalle: 'HTTP:80 · /health', capa: 'privada' },
  { id: 'asg', componente: 'auto-scaling-group', label: 'Auto Scaling Group', detalle: 'mín 2 · máx 6 · dos AZ', capa: 'privada' },
  { id: 'subred-privada-a', componente: 'subred-privada', label: 'Subred privada', detalle: '10.0.11.0/24', capa: 'privada' },
  { id: 'ec2-a', componente: 'ec2', label: 'EC2', detalle: 'us-east-1a', capa: 'privada' },
  { id: 'rol-a', componente: 'rol-iam', label: 'Rol IAM', detalle: 'perfil de instancia', capa: 'privada' },
  { id: 'subred-privada-b', componente: 'subred-privada', label: 'Subred privada', detalle: '10.0.12.0/24', capa: 'privada' },
  { id: 'ec2-b', componente: 'ec2', label: 'EC2', detalle: 'us-east-1b', capa: 'privada' },
  { id: 'rol-b', componente: 'rol-iam', label: 'Rol IAM', detalle: 'perfil de instancia', capa: 'privada' },
  { id: 'ebs-a', componente: 'ebs', label: 'EBS', detalle: 'volumen raíz · us-east-1a', capa: 'datos' },
  { id: 'ebs-b', componente: 'ebs', label: 'EBS', detalle: 'volumen raíz · us-east-1b', capa: 'datos' },
  { id: 'rds-primaria', componente: 'rds', label: 'RDS primaria', detalle: 'us-east-1a', capa: 'datos' },
  { id: 'rds-standby', componente: 'rds', label: 'RDS standby', detalle: 'us-east-1b', capa: 'datos' },
  { id: 'vpc', componente: 'vpc', label: 'VPC', detalle: '10.0.0.0/16', capa: 'transversal' },
  { id: 'az-a', componente: 'zona-disponibilidad', label: 'AZ', detalle: 'us-east-1a', capa: 'transversal' },
  { id: 'az-b', componente: 'zona-disponibilidad', label: 'AZ', detalle: 'us-east-1b', capa: 'transversal' },
  { id: 'security-groups', componente: 'security-groups', label: 'Security Groups', detalle: 'sg-alb → sg-app → sg-db', capa: 'transversal' },
  { id: 'tablas-rutas', componente: 'tablas-rutas', label: 'Tablas de rutas', detalle: 'pública → IGW · privada → NAT', capa: 'transversal' },
  { id: 'cloudwatch', componente: 'cloudwatch', label: 'CloudWatch', detalle: 'métricas y alarmas', capa: 'transversal' },
]

const NODOS_POR_ID = new Map(NODOS.map((nodo) => [nodo.id, nodo]))

export function getNodo(id: NodoId): Nodo {
  return NODOS_POR_ID.get(id)!
}

export type CapaApilada = {
  capa: Capa
  titulo: string
  descripcion: string
  grupos: { titulo?: string; nodos: NodoId[] }[]
}

/** Narrow-screen layout: one card per layer, edge → public → private → data, then cross-cutting pieces. */
export const CAPAS_APILADAS: CapaApilada[] = [
  {
    capa: 'borde', titulo: 'Borde global', descripcion: 'Fuera de la VPC: DNS, CDN, certificado, filtros y el bucket de estáticos.',
    grupos: [{ nodos: ['route53', 'cloudfront', 'acm', 'waf', 'shield', 's3'] }],
  },
  {
    capa: 'publica', titulo: 'Red pública', descripcion: 'Subredes con ruta al Internet Gateway. Solo el ALB y los NAT Gateway.',
    grupos: [
      { nodos: ['internet-gateway'] },
      { titulo: 'us-east-1a', nodos: ['subred-publica-a', 'alb-a', 'nat-a'] },
      { titulo: 'us-east-1b', nodos: ['subred-publica-b', 'alb-b', 'nat-b'] },
    ],
  },
  {
    capa: 'privada', titulo: 'Red privada', descripcion: 'Sin ruta al IGW. Las instancias salen por el NAT de su AZ.',
    grupos: [
      { nodos: ['target-group', 'asg'] },
      { titulo: 'us-east-1a', nodos: ['subred-privada-a', 'ec2-a', 'rol-a'] },
      { titulo: 'us-east-1b', nodos: ['subred-privada-b', 'ec2-b', 'rol-b'] },
    ],
  },
  {
    capa: 'datos', titulo: 'Datos', descripcion: 'Donde vive el estado: base de datos y discos de las instancias.',
    grupos: [
      { titulo: 'us-east-1a', nodos: ['rds-primaria', 'ebs-a'] },
      { titulo: 'us-east-1b', nodos: ['rds-standby', 'ebs-b'] },
    ],
  },
  {
    capa: 'transversal', titulo: 'Transversal', descripcion: 'Piezas que abarcan varias capas: la red, sus zonas, el control de acceso y la observabilidad.',
    grupos: [{ nodos: ['vpc', 'az-a', 'az-b', 'security-groups', 'tablas-rutas', 'cloudwatch'] }],
  },
]

// ---------------------------------------------------------------------------
// Modo 1 · Flujo de tráfico
// ---------------------------------------------------------------------------

export type ActorId = NodoId | 'usuario'

export type PasoTrafico = {
  actor: ActorId
  /** Other nodes taking part in the step (highlighted less strongly). */
  involucrados?: NodoId[]
  accion: string
  decision: string
}

export type RutaTraficoId = 'estatico-hit' | 'estatico-miss' | 'dinamico'

export type RutaTrafico = { id: RutaTraficoId; label: string; descripcion: string; pasos: PasoTrafico[] }

const PASOS_BORDE = (recurso: string): PasoTrafico[] => [
  { actor: 'usuario', accion: `El navegador pide https://cdn.miapp.com${recurso}.`, decision: 'Antes de conectarse necesita la dirección del nombre cdn.miapp.com.' },
  { actor: 'route53', accion: 'Responde la consulta DNS del registro ALIAS.', decision: 'Resuelve el ALIAS hacia la distribución de CloudFront, que responde con direcciones de una edge location cercana al usuario.' },
  { actor: 'cloudfront', involucrados: ['acm', 'shield'], accion: 'La edge location acepta la conexión HTTPS presentando el certificado de ACM.', decision: 'Si la petición llegó por HTTP, la redirige a HTTPS. Shield Standard ya filtra ataques de capas 3 y 4 en este punto.' },
  { actor: 'waf', accion: 'Evalúa la petición contra las reglas de la web ACL.', decision: 'Permitir: no coincide con patrones de inyección ni supera el límite de tasa. Si coincidiera, CloudFront respondería 403 sin tocar el origen.' },
]

export const RUTAS_TRAFICO: Record<RutaTraficoId, RutaTrafico> = {
  'estatico-hit': {
    id: 'estatico-hit',
    label: 'Estático · cache hit',
    descripcion: 'Un archivo de /static/* que la edge location ya tiene en caché.',
    pasos: [
      ...PASOS_BORDE('/static/app.css'),
      { actor: 'cloudfront', accion: 'Compara la ruta con los comportamientos de caché.', decision: '/static/* coincide con el comportamiento estático y el objeto está en caché con el TTL vigente: cache hit, no hace falta ir al origen.' },
      { actor: 'usuario', involucrados: ['cloudfront'], accion: 'Recibe el archivo directamente desde la edge location.', decision: 'Latencia mínima: ni S3 ni la VPC participaron en esta petición.' },
    ],
  },
  'estatico-miss': {
    id: 'estatico-miss',
    label: 'Estático · cache miss',
    descripcion: 'Un archivo de /static/* que la edge location todavía no tiene: baja hasta S3.',
    pasos: [
      ...PASOS_BORDE('/static/app.css'),
      { actor: 'cloudfront', accion: 'Compara la ruta con los comportamientos de caché.', decision: '/static/* coincide, pero el objeto no está en caché o su TTL venció: cache miss, hay que pedirlo al origen S3.' },
      { actor: 's3', involucrados: ['cloudfront'], accion: 'Recibe una petición firmada por CloudFront.', decision: 'La bucket policy solo autoriza a esta distribución mediante OAC: la firma es válida y devuelve el objeto. Una petición directa al bucket recibiría 403.' },
      { actor: 'cloudfront', accion: 'Guarda el objeto en la caché de la edge location.', decision: 'Lo conserva según el TTL del comportamiento: las próximas peticiones de usuarios cercanos serán cache hit.' },
      { actor: 'usuario', involucrados: ['cloudfront'], accion: 'Recibe el archivo.', decision: 'Esta primera petición tardó más que un hit porque viajó hasta el bucket en us-east-1.' },
    ],
  },
  dinamico: {
    id: 'dinamico',
    label: 'Dinámico · /api/*',
    descripcion: 'Una llamada a la API: atraviesa la VPC hasta la base de datos y vuelve.',
    pasos: [
      ...PASOS_BORDE('/api/pedidos'),
      { actor: 'cloudfront', accion: 'Compara la ruta con los comportamientos de caché.', decision: '/api/* coincide con el comportamiento dinámico: no cachea y reenvía la petición al origen ALB por HTTPS.' },
      { actor: 'internet-gateway', accion: 'La petición entra a la VPC 10.0.0.0/16.', decision: 'La ruta 0.0.0.0/0 hacia el IGW de las subredes públicas permite que los nodos del ALB reciban tráfico de Internet y respondan.' },
      { actor: 'alb-a', involucrados: ['alb-b', 'security-groups'], accion: 'Un nodo del ALB recibe la petición en su listener HTTPS:443.', decision: 'El SG del ALB la admite (idealmente solo desde la prefix list de CloudFront) y la regla del listener la envía al Target Group de la aplicación.' },
      { actor: 'target-group', accion: 'Elige un destino registrado.', decision: 'Solo considera instancias que pasan el health check en /health; elige una sana, en este caso la de us-east-1a.' },
      { actor: 'ec2-a', involucrados: ['security-groups', 'rol-a', 'ebs-a'], accion: 'La instancia de la subred privada 10.0.11.0/24 procesa la petición.', decision: 'Su SG solo acepta tráfico desde el SG del ALB. Si necesita llamar a otro servicio de AWS, usa las credenciales temporales de su rol IAM.' },
      { actor: 'rds-primaria', involucrados: ['security-groups', 'rds-standby'], accion: 'Ejecuta la consulta en la base de datos primaria.', decision: 'El SG de RDS solo acepta el puerto del motor desde el SG de las instancias. Las escrituras se replican en forma sincrónica a la standby de us-east-1b.' },
      { actor: 'ec2-a', accion: 'Arma la respuesta y la devuelve al ALB.', decision: 'Los Security Groups son stateful: la respuesta a una conexión permitida sale sin necesitar una regla adicional.' },
      { actor: 'usuario', involucrados: ['alb-a', 'cloudfront'], accion: 'La respuesta vuelve por el ALB y CloudFront hasta el navegador.', decision: 'CloudFront no la guarda en caché, porque el comportamiento /api/* no cachea: cada llamada vuelve a atravesar la VPC.' },
    ],
  },
}

export type EstadoTrafico = { ruta: RutaTraficoId; indice: number }

export function crearEstadoTrafico(ruta: RutaTraficoId = 'estatico-hit'): EstadoTrafico {
  return { ruta, indice: 0 }
}

export function siguientePaso(estado: EstadoTrafico): EstadoTrafico {
  const ultimo = RUTAS_TRAFICO[estado.ruta].pasos.length - 1
  return { ...estado, indice: Math.min(estado.indice + 1, ultimo) }
}

export function pasoAnterior(estado: EstadoTrafico): EstadoTrafico {
  return { ...estado, indice: Math.max(estado.indice - 1, 0) }
}

export function cambiarRuta(_estado: EstadoTrafico, ruta: RutaTraficoId): EstadoTrafico {
  return crearEstadoTrafico(ruta)
}

export function pasoActual(estado: EstadoTrafico): PasoTrafico {
  return RUTAS_TRAFICO[estado.ruta].pasos[estado.indice]
}

export type ResaltadoTrafico = {
  /** Actor + involved nodes of the current step. */
  activos: ActorId[]
  /** Actors of earlier steps that are not active now. */
  recorridos: ActorId[]
  /** Actor of the previous step, to draw the hop into the current one. */
  anterior: ActorId | null
}

export function resaltadoTrafico(estado: EstadoTrafico): ResaltadoTrafico {
  const pasos = RUTAS_TRAFICO[estado.ruta].pasos
  const paso = pasos[estado.indice]
  const activos: ActorId[] = [paso.actor, ...(paso.involucrados ?? [])]
  const recorridos = [...new Set(pasos.slice(0, estado.indice).map(({ actor }) => actor))].filter((actor) => !activos.includes(actor))
  return { activos, recorridos, anterior: estado.indice > 0 ? pasos[estado.indice - 1].actor : null }
}

// ---------------------------------------------------------------------------
// Modo 3 · Alta disponibilidad
// ---------------------------------------------------------------------------

export type EstadoNodo = 'ok' | 'caido' | 'degradado' | 'recuperando'

export const ESTADO_NODO_LABEL: Record<EstadoNodo, string> = {
  ok: 'funcionando',
  caido: 'caído',
  degradado: 'degradado',
  recuperando: 'recuperándose',
}

export type FallaId = 'instancia' | 'zona' | 'nat'

export type FaseFalla = {
  titulo: string
  descripcion: string
  /** Nodes not listed are 'ok'. */
  estados: Partial<Record<NodoId, EstadoNodo>>
}

export type Falla = {
  id: FallaId
  label: string
  resumen: string
  fases: FaseFalla[]
  sigueFuncionando: string[]
  seDegrada: string[]
  recuperacion: string
}

const ZONA_A_CAIDA: Partial<Record<NodoId, EstadoNodo>> = {
  'az-a': 'caido', 'subred-publica-a': 'caido', 'subred-privada-a': 'caido', 'alb-a': 'caido', 'nat-a': 'caido',
  'ec2-a': 'caido', 'rol-a': 'caido', 'ebs-a': 'caido', 'rds-primaria': 'caido',
}

export const FALLAS: Record<FallaId, Falla> = {
  instancia: {
    id: 'instancia',
    label: 'Cae una instancia EC2',
    resumen: 'La instancia de us-east-1a deja de responder: proceso colgado, falla de hardware o status check fallido.',
    fases: [
      { titulo: 'La instancia deja de responder', descripcion: 'La EC2 de us-east-1a ya no contesta. Hasta que el health check lo detecte, el ALB todavía puede enviarle peticiones, que fallan.', estados: { 'ec2-a': 'caido', 'target-group': 'degradado' } },
      { titulo: 'Fallan los health checks', descripcion: 'El Target Group consulta /health en cada intervalo (30 segundos es un valor típico). Tras varios fallos seguidos, el umbral de no sano, marca la instancia como unhealthy.', estados: { 'ec2-a': 'caido', 'target-group': 'degradado' } },
      { titulo: 'El Target Group la saca de rotación', descripcion: 'El ALB deja de enviarle tráfico: todas las peticiones van a la instancia de us-east-1b, que absorbe la carga sola.', estados: { 'ec2-a': 'caido', 'ec2-b': 'degradado' } },
      { titulo: 'El ASG la reemplaza', descripcion: 'Con verificación de salud ELB, el Auto Scaling Group la considera no sana, la termina y lanza una nueva desde el Launch Template para volver a la capacidad deseada y mantener equilibradas las AZ.', estados: { 'ec2-a': 'recuperando', 'ec2-b': 'degradado', asg: 'recuperando' } },
      { titulo: 'La nueva instancia entra en rotación', descripcion: 'Cuando termina el grace period y pasa los health checks, el Target Group la marca healthy y el ALB vuelve a repartir entre las dos AZ.', estados: {} },
    ],
    sigueFuncionando: [
      'Todas las peticiones, atendidas por la instancia de us-east-1b.',
      'El contenido estático (CloudFront y S3) y la base de datos no se enteran de la falla.',
    ],
    seDegrada: [
      'Capacidad a la mitad hasta el reemplazo: la instancia sobreviviente puede saturarse si la carga es alta.',
      'Las peticiones que estaban en curso en la instancia caída fallan, y algunas más hasta que el health check la retira.',
    ],
    recuperacion: 'Detección en un par de minutos (intervalo por umbral de no sano del health check) y reemplazo en varios minutos más, según lo que tarde en arrancar la AMI y el grace period (por verificar en cada caso).',
  },
  zona: {
    id: 'zona',
    label: 'Cae una AZ completa',
    resumen: 'us-east-1a queda inaccesible: todo lo que vive en esa zona deja de responder a la vez.',
    fases: [
      { titulo: 'us-east-1a deja de responder', descripcion: 'Caen a la vez el nodo del ALB, el NAT Gateway, la instancia EC2 y la base RDS primaria de esa zona. Mientras la primaria no se reemplace, la aplicación no puede consultar datos.', estados: { ...ZONA_A_CAIDA, 'target-group': 'degradado', 'ec2-b': 'degradado' } },
      { titulo: 'El ALB deja de enviar tráfico a esa zona', descripcion: 'Los health checks de los destinos de us-east-1a fallan y el nodo del ALB en esa zona deja de recibir tráfico: el mismo ALB sigue atendiendo por su nodo de us-east-1b.', estados: { ...ZONA_A_CAIDA, 'ec2-b': 'degradado' } },
      { titulo: 'RDS promueve la standby', descripcion: 'RDS Multi-AZ detecta la falla de la primaria, promueve la standby de us-east-1b a primaria y actualiza el DNS del endpoint. La aplicación sigue usando el mismo endpoint y se reconecta; durante el failover las consultas fallan.', estados: { ...ZONA_A_CAIDA, 'rds-standby': 'recuperando', 'ec2-b': 'degradado' } },
      { titulo: 'El ASG lanza instancias en us-east-1b', descripcion: 'Para volver a la capacidad deseada, el Auto Scaling Group lanza los reemplazos en la única subred privada que sigue disponible: 10.0.12.0/24, en us-east-1b.', estados: { ...ZONA_A_CAIDA, 'ec2-b': 'recuperando', asg: 'recuperando' } },
      { titulo: 'Servicio restablecido en una sola AZ', descripcion: 'us-east-1b atiende todo el tráfico con la capacidad deseada. La arquitectura sigue funcionando, pero ya no tolera otra falla de zona hasta que us-east-1a vuelva y RDS y el ASG se reequilibren.', estados: { ...ZONA_A_CAIDA } },
    ],
    sigueFuncionando: [
      'El contenido estático: CloudFront y S3 no dependen de las AZ de la VPC.',
      'Las peticiones dinámicas, atendidas por el nodo del ALB y las instancias de us-east-1b.',
      'Los datos confirmados: la standby recibía una copia sincrónica de cada escritura.',
    ],
    seDegrada: [
      'Durante el failover de RDS las consultas fallan y las conexiones abiertas se cortan.',
      'Capacidad reducida hasta que el ASG completa los reemplazos en us-east-1b.',
      'Se pierde la redundancia: una segunda falla ya no tiene dónde apoyarse.',
    ],
    recuperacion: 'El ALB deja de usar la zona en cuestión de segundos a un par de minutos; el failover de RDS Multi-AZ suele tardar uno o dos minutos; los reemplazos del ASG, varios minutos más (tiempos por verificar).',
  },
  nat: {
    id: 'nat',
    label: 'Cae el NAT Gateway de una AZ',
    resumen: 'El NAT Gateway de us-east-1a deja de reenviar tráfico.',
    fases: [
      { titulo: 'El NAT Gateway de us-east-1a falla', descripcion: 'La tabla de rutas de la subred privada 10.0.11.0/24 sigue enviando 0.0.0.0/0 a ese NAT, que ya no reenvía tráfico.', estados: { 'nat-a': 'caido', 'tablas-rutas': 'degradado' } },
      { titulo: 'Las instancias de us-east-1a pierden la salida', descripcion: 'No pueden descargar actualizaciones (dnf update), paquetes ni llamar a APIs externas. Las peticiones que llegan desde el ALB siguen funcionando: el tráfico de entrada no pasa por el NAT.', estados: { 'nat-a': 'caido', 'tablas-rutas': 'degradado', 'ec2-a': 'degradado' } },
      { titulo: 'Nadie corrige la ruta automáticamente', descripcion: 'Ni el ASG ni el ALB lo detectan: el health check sigue pasando, salvo que /health verifique una dependencia externa. Hay que recrear el NAT o apuntar temporalmente la ruta de la subred privada al NAT de us-east-1b, aceptando cargos entre AZ.', estados: { 'nat-a': 'caido', 'tablas-rutas': 'degradado', 'ec2-a': 'degradado' } },
    ],
    sigueFuncionando: [
      'Todas las peticiones entrantes, en las dos AZ: el ALB y los health checks no usan el NAT.',
      'La salida a Internet de las instancias de us-east-1b, que usan su propio NAT Gateway.',
      'La base de datos, CloudFront y S3.',
    ],
    seDegrada: [
      'Las instancias de us-east-1a se quedan sin salida a Internet: fallan actualizaciones, descargas y llamadas a APIs externas.',
      'Si la aplicación llama a una API externa en cada petición, las que atiende us-east-1a fallan aunque el balanceador las considere sanas.',
    ],
    recuperacion: 'No hay recuperación automática: depende de que alguien lo detecte (por ejemplo, con una alarma de CloudWatch) y corrija la ruta o el NAT; con un procedimiento preparado, unos minutos (por verificar). El NAT Gateway es redundante dentro de su AZ, así que esta falla aislada es poco común.',
  },
}

export type EstadoFallas = { falla: FallaId | null; fase: number }

export function crearEstadoFallas(): EstadoFallas {
  return { falla: null, fase: 0 }
}

export function inyectarFalla(_estado: EstadoFallas, falla: FallaId): EstadoFallas {
  return { falla, fase: 0 }
}

export function avanzarFase(estado: EstadoFallas): EstadoFallas {
  if (!estado.falla) return estado
  return { ...estado, fase: Math.min(estado.fase + 1, FALLAS[estado.falla].fases.length - 1) }
}

export function retrocederFase(estado: EstadoFallas): EstadoFallas {
  return { ...estado, fase: Math.max(estado.fase - 1, 0) }
}

export function restablecer(): EstadoFallas {
  return crearEstadoFallas()
}

export function faseActual(estado: EstadoFallas): FaseFalla | null {
  return estado.falla ? FALLAS[estado.falla].fases[estado.fase] : null
}

export function estadoNodos(estado: EstadoFallas): Record<NodoId, EstadoNodo> {
  const base = Object.fromEntries(NODOS.map(({ id }) => [id, 'ok'])) as Record<NodoId, EstadoNodo>
  const fase = faseActual(estado)
  return fase ? { ...base, ...fase.estados } : base
}
