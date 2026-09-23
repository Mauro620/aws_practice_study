/**
 * Pure data and state logic for the reference architecture diagram
 * (/arquitectura-referencia). It ties together what the VPC, EC2, IAM,
 * Elasticidad and CloudFront modules teach in isolation. All text is plain
 * text (rendered as React children), with qualitative charge categories only.
 */

export type ComponenteId =
  | 'route53' | 'cloudfront' | 'acm' | 'waf' | 'shield' | 's3'
  | 'internet-gateway' | 'vpc' | 'zona-disponibilidad' | 'subred-publica' | 'subred-privada'
  | 'alb' | 'target-group' | 'nat-gateway' | 'auto-scaling-group' | 'ec2'
  | 'rol-iam' | 'ebs' | 'rds' | 'security-groups' | 'tablas-rutas' | 'cloudwatch'

export type NodoId =
  | 'route53' | 'cloudfront' | 'acm' | 'waf' | 'shield' | 's3'
  | 'internet-gateway' | 'vpc' | 'az-a' | 'az-b'
  | 'subred-publica-a' | 'subred-publica-b' | 'subred-privada-a' | 'subred-privada-b'
  | 'alb-a' | 'alb-b' | 'target-group' | 'nat-a' | 'nat-b' | 'auto-scaling-group'
  | 'ec2-a' | 'ec2-b' | 'ebs-a' | 'ebs-b' | 'rds-primaria' | 'rds-standby'
  | 'rol-iam' | 'security-groups' | 'tablas-rutas' | 'cloudwatch'

export type Capa = 'borde' | 'publica' | 'privada' | 'datos' | 'transversal'
export type ModoCobro = 'fijo-por-hora' | 'por-uso' | 'sin-costo'
export type ModoId = 'trafico' | 'seguridad' | 'alta-disponibilidad' | 'costos' | 'ruta-aprendizaje'
export type RutaId = 'estatico-hit' | 'estatico-miss' | 'dinamico'
export type FallaId = 'instancia' | 'zona' | 'nat'
export type Salud = 'ok' | 'caido' | 'degradado'
/** 'usuario' is the requester outside AWS: it acts in traffic routes but is not a component. */
export type Actor = NodoId | 'usuario'

export type Componente = {
  id: ComponenteId
  nombre: string
  queEs: string
  porQue: string
  siLoQuitas: string
  cobro: { modos: ModoCobro[]; detalle: string }
  modulo: { href?: string; etiqueta: string; nota?: string }
}

export type Nodo = {
  id: NodoId
  componente: ComponenteId
  etiqueta: string
  detalle?: string
  capa: Capa
  /** Containers (VPC, AZ, subnets, ASG) are drawn as boxes around other nodes. */
  contenedor?: boolean
  x: number
  y: number
  w: number
  h: number
}

const M_VPC = { href: '/servicios/vpc', etiqueta: 'M3 Amazon VPC' }
const M_EC2 = { href: '/servicios/ec2', etiqueta: 'M4 Amazon EC2' }
const M_IAM = { href: '/servicios/iam', etiqueta: 'M5 Protección del acceso (AWS IAM)' }
const M_ELASTICIDAD = { href: '/servicios/elasticidad', etiqueta: 'M6 Elasticidad' }
const M_CLOUDFRONT = { href: '/servicios/cloudfront', etiqueta: 'M7 Entrega de contenido (CloudFront, HTTPS y S3)' }

export const COMPONENTES: Componente[] = [
  {
    id: 'route53', nombre: 'Route 53',
    queEs: 'El servicio de DNS de AWS. Traduce cafeteria.com a la dirección de la distribución de CloudFront mediante un registro ALIAS.',
    porQue: 'El usuario recuerda un nombre, no una dirección. El registro ALIAS funciona en el dominio raíz, algo que un CNAME no puede hacer, y apunta directo a la distribución.',
    siLoQuitas: 'Nadie llega al sitio por su nombre. Con un DNS de terceros tendrías que usar un CNAME, que no sirve en el dominio raíz cafeteria.com.',
    cobro: { modos: ['por-uso'], detalle: 'Cuota mensual por zona alojada más un cargo por consultas DNS. Las consultas ALIAS hacia recursos de AWS no se cobran.' },
    modulo: M_CLOUDFRONT,
  },
  {
    id: 'cloudfront', nombre: 'CloudFront',
    queEs: 'La CDN de AWS: una distribución que cachea contenido en edge locations cercanas al usuario y decide, por patrón de ruta, a qué origen va cada petición.',
    porQue: 'Cada cache hit es una petición que no llega ni a S3 ni al ALB: menos latencia para el usuario y menos carga en el origen, así que el ASG necesita escalar mucho menos.',
    siLoQuitas: 'Todo el tráfico, estático y dinámico, pega directo contra el origen. El bucket tendría que ser público para servir archivos y el ALB absorbería también las peticiones de imágenes y CSS.',
    cobro: { modos: ['por-uso'], detalle: 'Por datos transferidos hacia Internet y por número de peticiones. Las invalidaciones tienen un cupo mensual gratuito; la Price Class limita desde qué edge locations se sirve.' },
    modulo: M_CLOUDFRONT,
  },
  {
    id: 'acm', nombre: 'ACM',
    queEs: 'AWS Certificate Manager emite y renueva los certificados TLS que permiten servir cafeteria.com por HTTPS.',
    porQue: 'La distribución necesita un certificado que cubra el dominio propio. ACM lo renueva solo, lo que elimina el clásico sitio caído por certificado vencido. Para CloudFront se solicita en us-east-1.',
    siLoQuitas: 'Solo podrías usar HTTPS con el dominio d1a2b3.cloudfront.net o gestionar certificados a mano, con el riesgo de que venzan sin que nadie lo note.',
    cobro: { modos: ['sin-costo'], detalle: 'Gratuito para certificados públicos usados con servicios integrados como CloudFront y el ALB (los certificados exportables tienen costo, por verificar).' },
    modulo: M_CLOUDFRONT,
  },
  {
    id: 'waf', nombre: 'AWS WAF',
    queEs: 'Un firewall de aplicaciones web que se asocia a la distribución y filtra peticiones con reglas de capa 7.',
    porQue: 'Bloquea en el borde patrones como inyección SQL, excesos de tasa desde una misma IP o IPs de mala reputación, antes de que la petición llegue a la VPC.',
    siLoQuitas: 'Las peticiones maliciosas bien formadas llegan hasta la aplicación. Shield Standard no las detiene porque protege capas 3 y 4, no el contenido de la petición HTTP.',
    cobro: { modos: ['por-uso'], detalle: 'Cargo mensual por cada web ACL y por cada regla, más un cargo por volumen de peticiones inspeccionadas.' },
    modulo: M_CLOUDFRONT,
  },
  {
    id: 'shield', nombre: 'Shield Standard',
    queEs: 'La protección contra DDoS de capas 3 y 4 que AWS activa automáticamente en CloudFront y Route 53.',
    porQue: 'Absorbe ataques volumétricos de red en el borde. Sumado a que la CDN reparte la carga entre muchas edge locations y oculta el origen, el ALB nunca ve ese tráfico.',
    siLoQuitas: 'No se puede quitar: viene incluido. Lo que pierde la arquitectura si esquivás CloudFront es justamente esa capa de absorción en el borde.',
    cobro: { modos: ['sin-costo'], detalle: 'Shield Standard no tiene costo. Shield Advanced es una suscripción aparte que este curso no usa.' },
    modulo: M_CLOUDFRONT,
  },
  {
    id: 's3', nombre: 'Bucket S3',
    queEs: 'El almacenamiento de objetos donde viven los archivos estáticos del sitio (HTML, CSS, JS, imágenes). Es el origen de CloudFront para el contenido estático.',
    porQue: 'El bucket queda privado con Block Public Access activado; solo CloudFront puede leerlo mediante OAC. El versionado permite recuperar lo que alguien borra por error.',
    siLoQuitas: 'CloudFront no tiene de dónde sacar los estáticos en un cache miss; tendrías que servirlos desde las EC2, que también escalarían por imágenes y CSS.',
    cobro: { modos: ['por-uso'], detalle: 'Por GB almacenado al mes según la clase de almacenamiento, por peticiones y por transferencia. Con versionado, cada versión se factura por separado.' },
    modulo: M_CLOUDFRONT,
  },
  {
    id: 'internet-gateway', nombre: 'Internet Gateway',
    queEs: 'La puerta de la VPC hacia Internet, en ambos sentidos. Solo puede haber uno por VPC.',
    porQue: 'Permite que las peticiones de CloudFront lleguen al ALB. Una subred es pública solo si su tabla de rutas tiene 0.0.0.0/0 apuntando al Internet Gateway.',
    siLoQuitas: 'La VPC queda aislada: el ALB deja de ser alcanzable desde Internet y el NAT Gateway pierde su salida, así que las instancias privadas tampoco pueden salir.',
    cobro: { modos: ['sin-costo'], detalle: 'El Internet Gateway no tiene cargo propio; se paga la transferencia de datos de los recursos que lo usan.' },
    modulo: M_VPC,
  },
  {
    id: 'vpc', nombre: 'VPC',
    queEs: 'La red privada virtual de la arquitectura, con el bloque 10.0.0.0/16 en la región us-east-1. Define dónde vive cada recurso y cómo se conecta.',
    porQue: 'Separa la entrada pública de los servicios internos: el ALB y el NAT quedan en subredes públicas; la aplicación y la base de datos, en privadas y fuera del alcance directo de Internet.',
    siLoQuitas: 'No hay dónde lanzar las EC2, el ALB ni RDS: todo lo que está dentro del recuadro depende de la VPC. Ampliar el CIDR después de crear recursos es costoso, por eso se planifica antes.',
    cobro: { modos: ['sin-costo'], detalle: 'La VPC no tiene cargo propio; lo que cuesta es lo que ponés adentro, como el NAT Gateway y el balanceador.' },
    modulo: M_VPC,
  },
  {
    id: 'zona-disponibilidad', nombre: 'Zona de disponibilidad',
    queEs: 'Uno o más centros de datos aislados dentro de la región. La arquitectura usa dos: us-east-1a y us-east-1b.',
    porQue: 'Repetir el mismo patrón en dos AZ evita que una sola zona sea un punto único de caída: si us-east-1a falla, us-east-1b sigue atendiendo.',
    siLoQuitas: 'Con una sola AZ, cualquier falla de esa zona tumba toda la aplicación y la base de datos a la vez. Es un prototipo, no una arquitectura de producción.',
    cobro: { modos: ['sin-costo'], detalle: 'Usar varias AZ no tiene cargo propio, pero el tráfico entre AZ distintas sí se cobra.' },
    modulo: M_VPC,
  },
  {
    id: 'subred-publica', nombre: 'Subred pública',
    queEs: 'Una subred cuya tabla de rutas envía 0.0.0.0/0 al Internet Gateway. Aquí están 10.0.1.0/24 en us-east-1a y 10.0.2.0/24 en us-east-1b.',
    porQue: 'Aloja lo único que debe recibir o dar salida a Internet: los nodos del ALB y los NAT Gateway. Concentra la exposición en pocos recursos controlados.',
    siLoQuitas: 'El ALB público y el NAT Gateway no tienen dónde vivir: sin subredes públicas, Internet no llega al balanceador y las privadas pierden su salida.',
    cobro: { modos: ['sin-costo'], detalle: 'Las subredes no tienen cargo propio; se pagan los recursos que se lanzan en ellas.' },
    modulo: M_VPC,
  },
  {
    id: 'subred-privada', nombre: 'Subred privada',
    queEs: 'Una subred sin ruta al Internet Gateway: 10.0.11.0/24 en us-east-1a y 10.0.12.0/24 en us-east-1b. Solo sale a Internet a través del NAT Gateway.',
    porQue: 'Las EC2 de aplicación y la base de datos no necesitan IP pública: reciben tráfico solo desde el ALB y no se pueden alcanzar directamente desde Internet.',
    siLoQuitas: 'Tendrías que poner la aplicación y la base de datos en subredes públicas, expuestas a escaneos, y la seguridad dependería solo de que ninguna regla de Security Group se abra de más.',
    cobro: { modos: ['sin-costo'], detalle: 'Las subredes no tienen cargo propio; se pagan los recursos que se lanzan en ellas.' },
    modulo: M_VPC,
  },
  {
    id: 'alb', nombre: 'Application Load Balancer',
    queEs: 'El balanceador de capa 7 que recibe las peticiones dinámicas y las reparte entre las instancias sanas. Es un solo ALB con un nodo en cada AZ.',
    porQue: 'Ofrece un DNS estable mientras las instancias cambian detrás, termina TLS y solo envía tráfico a los destinos que pasan el health check del Target Group.',
    siLoQuitas: 'Las EC2 necesitarían IP pública y cada instancia nueva cambiaría la dirección de entrada. Una instancia caída seguiría recibiendo usuarios, y el ASG no tendría a quién registrar sus instancias.',
    cobro: { modos: ['fijo-por-hora', 'por-uso'], detalle: 'Un cargo por cada hora que el balanceador existe, más un cargo por capacidad consumida (unidades de capacidad del balanceador).' },
    modulo: { href: '/guia-arquitectura#alb-target-groups', etiqueta: 'Guía de arquitectura · 05 ALB y Target Groups', nota: 'También aparece en M6 Elasticidad, junto al Auto Scaling Group.' },
  },
  {
    id: 'target-group', nombre: 'Target Group',
    queEs: 'La lista de destinos registrados (las EC2) a los que el ALB reenvía tráfico, junto con el health check que decide cuáles están listos.',
    porQue: 'El ASG registra y retira instancias aquí automáticamente, y el health check saca del balanceo a las que fallan, para no enviar usuarios a una instancia que no responde.',
    siLoQuitas: 'El listener del ALB no tiene a dónde reenviar las peticiones. Sin health check, una instancia con Apache caído seguiría recibiendo su parte del tráfico.',
    cobro: { modos: ['sin-costo'], detalle: 'El Target Group no tiene cargo propio: forma parte del balanceador.' },
    modulo: { href: '/guia-arquitectura#alb-target-groups', etiqueta: 'Guía de arquitectura · 05 ALB y Target Groups', nota: 'También aparece en M6 Elasticidad, junto al Auto Scaling Group.' },
  },
  {
    id: 'nat-gateway', nombre: 'NAT Gateway',
    queEs: 'El servicio que permite a las instancias de subredes privadas iniciar conexiones hacia Internet sin aceptar conexiones entrantes. Hay uno por AZ, en la subred pública.',
    porQue: 'Las EC2 privadas necesitan salir para instalar actualizaciones con dnf o llamar a APIs externas. Uno por AZ evita que un solo NAT sea punto único de falla y evita tráfico entre zonas.',
    siLoQuitas: 'Las instancias privadas siguen atendiendo peticiones entrantes por el ALB, pero no pueden descargar paquetes ni llamar a servicios externos.',
    cobro: { modos: ['fijo-por-hora', 'por-uso'], detalle: 'Costo por hora más costo por GB procesado. Suele ser uno de los rubros más caros de una VPC mal diseñada.' },
    modulo: M_VPC,
  },
  {
    id: 'auto-scaling-group', nombre: 'Auto Scaling Group',
    queEs: 'El grupo que decide cuántas instancias debe haber, entre un mínimo y un máximo, y las crea o termina a partir de un Launch Template.',
    porQue: 'Reemplaza instancias caídas sin intervención y crece o decrece con la carga. Sobre dos AZ, si una zona falla lanza los reemplazos en la otra.',
    siLoQuitas: 'Una instancia caída queda caída hasta que alguien la reemplace a mano, y la capacidad no sigue a la demanda: pagás capacidad ociosa o te quedás corto en el pico.',
    cobro: { modos: ['sin-costo'], detalle: 'El Auto Scaling Group no tiene cargo propio; se pagan las EC2 que lanza y las alarmas de CloudWatch que usa.' },
    modulo: M_ELASTICIDAD,
  },
  {
    id: 'ec2', nombre: 'Instancia EC2',
    queEs: 'El servidor virtual que ejecuta la aplicación. Vive en una subred privada y lo lanza el Auto Scaling Group desde un Launch Template.',
    porQue: 'Procesa las peticiones dinámicas que no se pueden cachear. Al ser reemplazable, no debe guardar estado local: la sesión o los datos viven fuera de la instancia.',
    siLoQuitas: 'Las rutas dinámicas, como la API de pedidos, no tienen quién las procese: el ALB responde con error porque el Target Group no tiene destinos sanos.',
    cobro: { modos: ['fijo-por-hora'], detalle: 'Por tiempo encendida según el tipo de instancia (On-Demand). Savings Plans y Spot bajan la tarifa a cambio de compromiso o de posibles interrupciones.' },
    modulo: M_EC2,
  },
  {
    id: 'rol-iam', nombre: 'Rol de IAM',
    queEs: 'Una identidad con permisos que la instancia asume mediante un perfil de instancia. AWS le entrega credenciales temporales que rotan solas.',
    porQue: 'La aplicación puede llamar a otros servicios de AWS sin guardar Access Keys en el servidor. Cada instancia que lanza el ASG lleva el mismo rol desde el Launch Template.',
    siLoQuitas: 'La tentación es copiar claves de acceso en la instancia; al crear una AMI desde ella, todas las instancias nuevas heredan esas claves. Es el error más grave del módulo de EC2.',
    cobro: { modos: ['sin-costo'], detalle: 'IAM no tiene costo: roles, políticas y perfiles de instancia son gratuitos.' },
    modulo: M_IAM,
  },
  {
    id: 'ebs', nombre: 'Volumen EBS',
    queEs: 'El disco de red de cada instancia EC2. Vive en la misma AZ que la instancia y se respalda con snapshots.',
    porQue: 'Es donde está el sistema operativo y la aplicación. Con Delete on termination el volumen raíz se destruye junto con la instancia, algo aceptable si la instancia es reemplazable.',
    siLoQuitas: 'La instancia no tiene disco donde arrancar. Si guardás datos importantes en un volumen que se borra al terminar la instancia, el ASG los destruye al reemplazarla.',
    cobro: { modos: ['por-uso'], detalle: 'Por GB aprovisionado al mes, aunque la instancia esté detenida. Los snapshots se cobran por el almacenamiento que ocupan.' },
    modulo: M_EC2,
  },
  {
    id: 'rds', nombre: 'RDS Multi-AZ',
    queEs: 'La base de datos relacional administrada, desplegada como primaria en us-east-1a y standby sincrónica en us-east-1b.',
    porQue: 'Los pedidos tienen que sobrevivir a la instancia que los procesó. Con Multi-AZ, si la primaria o su zona fallan, RDS promueve la standby y la aplicación sigue usando el mismo endpoint.',
    siLoQuitas: 'Los datos quedarían en el disco de instancias que el ASG termina y reemplaza. Sin la standby, la caída de us-east-1a deja la aplicación sin base de datos.',
    cobro: { modos: ['fijo-por-hora', 'por-uso'], detalle: 'Por hora de instancia de base de datos (la standby de Multi-AZ también se paga), más almacenamiento y respaldos.' },
    modulo: { href: '/servicios/ec2', etiqueta: 'M4 Amazon EC2 · Caso realista', nota: 'RDS no tiene un módulo dedicado en este curso: aparece como la capa de datos de la arquitectura de alta disponibilidad del caso realista de EC2.' },
  },
  {
    id: 'security-groups', nombre: 'Security Groups',
    queEs: 'Firewalls stateful asociados a la interfaz de red de cada recurso: uno para el ALB, uno para la aplicación y uno para la base de datos.',
    porQue: 'Encadenan el acceso: el SG del ALB acepta 80 y 443 desde Internet, el de aplicación solo desde el SG del ALB y el de datos solo el puerto del motor desde el SG de aplicación.',
    siLoQuitas: 'No se pueden quitar: todo recurso tiene al menos uno. El riesgo real es abrirlos de más, por ejemplo 0.0.0.0/0 en SSH o en el puerto de la base de datos.',
    cobro: { modos: ['sin-costo'], detalle: 'Los Security Groups no tienen costo.' },
    modulo: { href: '/guia-arquitectura#security-groups', etiqueta: 'Guía de arquitectura · 03 Security Groups' },
  },
  {
    id: 'tablas-rutas', nombre: 'Tablas de rutas',
    queEs: 'Las reglas que deciden a dónde va el tráfico que sale de cada subred. Toda tabla incluye una ruta local para que las subredes de la VPC se comuniquen entre sí.',
    porQue: 'Son las que hacen pública o privada a una subred: 0.0.0.0/0 hacia el Internet Gateway en las públicas y hacia el NAT Gateway de la misma AZ en las privadas.',
    siLoQuitas: 'Sin la ruta al Internet Gateway, la subred pública deja de serlo aunque el IGW esté adjunto; sin la ruta al NAT, las instancias privadas pierden la salida a Internet.',
    cobro: { modos: ['sin-costo'], detalle: 'Las tablas de rutas no tienen costo.' },
    modulo: M_VPC,
  },
  {
    id: 'cloudwatch', nombre: 'CloudWatch',
    queEs: 'El servicio de métricas y alarmas de AWS. Mide, por ejemplo, el CPUUtilization promedio del grupo de instancias.',
    porQue: 'La política de target tracking del ASG crea alarmas de CloudWatch y escala para mantener la métrica cerca del objetivo, por ejemplo 60% de CPU.',
    siLoQuitas: 'El ASG no se entera de que la carga subió o bajó: solo mantiene la capacidad deseada fija. Ojo: la RAM y el disco no se miden por defecto, requieren el CloudWatch Agent.',
    cobro: { modos: ['por-uso'], detalle: 'Las métricas básicas de EC2 no tienen costo; las métricas personalizadas, las alarmas y los logs se cobran por uso.' },
    modulo: M_ELASTICIDAD,
  },
]

const COMPONENTES_POR_ID = new Map(COMPONENTES.map((componente) => [componente.id, componente]))

export function getComponente(id: ComponenteId): Componente {
  const componente = COMPONENTES_POR_ID.get(id)
  if (!componente) throw new Error(`Componente desconocido: ${id}`)
  return componente
}

/** Diagram coordinates share one 960 × 1000 space; containers are listed before their children. */
export const DIAGRAMA = { x: 0, y: 0, w: 960, h: 1000 }

export const NODOS: Nodo[] = [
  // Borde (fuera de la VPC)
  { id: 'route53', componente: 'route53', etiqueta: 'Route 53', detalle: 'ALIAS', capa: 'borde', x: 400, y: 84, w: 160, h: 64 },
  { id: 'cloudfront', componente: 'cloudfront', etiqueta: 'CloudFront', detalle: 'edge locations', capa: 'borde', x: 400, y: 168, w: 160, h: 64 },
  { id: 'acm', componente: 'acm', etiqueta: 'ACM', detalle: 'us-east-1', capa: 'borde', x: 590, y: 168, w: 100, h: 64 },
  { id: 'waf', componente: 'waf', etiqueta: 'WAF', detalle: 'capa 7', capa: 'borde', x: 705, y: 168, w: 100, h: 64 },
  { id: 'shield', componente: 'shield', etiqueta: 'Shield', detalle: 'Standard', capa: 'borde', x: 820, y: 168, w: 120, h: 64 },
  { id: 's3', componente: 's3', etiqueta: 'Bucket S3', detalle: 'privado · OAC', capa: 'datos', x: 60, y: 168, w: 180, h: 64 },

  // Contenedores de red
  { id: 'vpc', componente: 'vpc', etiqueta: 'VPC', detalle: '10.0.0.0/16', capa: 'transversal', contenedor: true, x: 20, y: 272, w: 920, h: 620 },
  { id: 'internet-gateway', componente: 'internet-gateway', etiqueta: 'Internet Gateway', capa: 'publica', x: 390, y: 250, w: 180, h: 48 },
  { id: 'az-a', componente: 'zona-disponibilidad', etiqueta: 'AZ', detalle: 'us-east-1a', capa: 'transversal', contenedor: true, x: 36, y: 316, w: 436, h: 560 },
  { id: 'az-b', componente: 'zona-disponibilidad', etiqueta: 'AZ', detalle: 'us-east-1b', capa: 'transversal', contenedor: true, x: 488, y: 316, w: 436, h: 560 },
  { id: 'subred-publica-a', componente: 'subred-publica', etiqueta: 'Subred pública', detalle: '10.0.1.0/24', capa: 'publica', contenedor: true, x: 52, y: 352, w: 404, h: 116 },
  { id: 'subred-publica-b', componente: 'subred-publica', etiqueta: 'Subred pública', detalle: '10.0.2.0/24', capa: 'publica', contenedor: true, x: 504, y: 352, w: 404, h: 116 },
  { id: 'subred-privada-a', componente: 'subred-privada', etiqueta: 'Subred privada', detalle: '10.0.11.0/24', capa: 'privada', contenedor: true, x: 52, y: 552, w: 404, h: 308 },
  { id: 'subred-privada-b', componente: 'subred-privada', etiqueta: 'Subred privada', detalle: '10.0.12.0/24', capa: 'privada', contenedor: true, x: 504, y: 552, w: 404, h: 308 },
  { id: 'auto-scaling-group', componente: 'auto-scaling-group', etiqueta: 'Auto Scaling Group', detalle: 'mín · deseada · máx', capa: 'privada', contenedor: true, x: 68, y: 588, w: 824, h: 116 },

  // Subredes públicas
  { id: 'alb-a', componente: 'alb', etiqueta: 'ALB', detalle: 'nodo en 1a', capa: 'publica', x: 72, y: 388, w: 170, h: 64 },
  { id: 'nat-a', componente: 'nat-gateway', etiqueta: 'NAT Gateway', detalle: 'salida de 1a', capa: 'publica', x: 266, y: 388, w: 170, h: 64 },
  { id: 'alb-b', componente: 'alb', etiqueta: 'ALB', detalle: 'nodo en 1b', capa: 'publica', x: 524, y: 388, w: 170, h: 64 },
  { id: 'nat-b', componente: 'nat-gateway', etiqueta: 'NAT Gateway', detalle: 'salida de 1b', capa: 'publica', x: 718, y: 388, w: 170, h: 64 },

  // Entre las capas pública y privada: el Target Group es del ALB, no de una AZ
  { id: 'target-group', componente: 'target-group', etiqueta: 'Target Group', detalle: 'health check', capa: 'privada', x: 390, y: 480, w: 180, h: 60 },

  // Subredes privadas
  { id: 'ec2-a', componente: 'ec2', etiqueta: 'EC2', detalle: 'aplicación', capa: 'privada', x: 88, y: 624, w: 170, h: 64 },
  { id: 'ebs-a', componente: 'ebs', etiqueta: 'EBS', detalle: 'disco de 1a', capa: 'datos', x: 272, y: 624, w: 160, h: 64 },
  { id: 'ec2-b', componente: 'ec2', etiqueta: 'EC2', detalle: 'aplicación', capa: 'privada', x: 528, y: 624, w: 170, h: 64 },
  { id: 'ebs-b', componente: 'ebs', etiqueta: 'EBS', detalle: 'disco de 1b', capa: 'datos', x: 712, y: 624, w: 160, h: 64 },
  { id: 'rds-primaria', componente: 'rds', etiqueta: 'RDS primaria', detalle: 'Multi-AZ', capa: 'datos', x: 88, y: 760, w: 200, h: 64 },
  { id: 'rds-standby', componente: 'rds', etiqueta: 'RDS standby', detalle: 'Multi-AZ', capa: 'datos', x: 540, y: 760, w: 200, h: 64 },

  // Transversales
  { id: 'tablas-rutas', componente: 'tablas-rutas', etiqueta: 'Tablas de rutas', capa: 'transversal', x: 20, y: 920, w: 215, h: 64 },
  { id: 'security-groups', componente: 'security-groups', etiqueta: 'Security Groups', capa: 'transversal', x: 255, y: 920, w: 215, h: 64 },
  { id: 'rol-iam', componente: 'rol-iam', etiqueta: 'Rol de IAM', detalle: 'perfil de instancia', capa: 'transversal', x: 490, y: 920, w: 215, h: 64 },
  { id: 'cloudwatch', componente: 'cloudwatch', etiqueta: 'CloudWatch', detalle: 'métricas y alarmas', capa: 'transversal', x: 725, y: 920, w: 215, h: 64 },
]

export type CapaApilada = { capa: Capa; titulo: string; descripcion: string; grupos: { titulo: string; nodos: NodoId[] }[] }

/** Narrow-screen order: edge → public network → private network → data → cross-cutting. */
export const CAPAS_APILADAS: CapaApilada[] = [
  {
    capa: 'borde', titulo: 'Borde', descripcion: 'Fuera de la VPC, cerca del usuario.',
    grupos: [
      { titulo: 'DNS y entrega', nodos: ['route53', 'cloudfront'] },
      { titulo: 'Protección y HTTPS', nodos: ['acm', 'waf', 'shield'] },
    ],
  },
  {
    capa: 'publica', titulo: 'Red pública', descripcion: 'Lo único que recibe o da salida a Internet.',
    grupos: [
      { titulo: 'Entrada a la VPC', nodos: ['internet-gateway'] },
      { titulo: 'us-east-1a', nodos: ['subred-publica-a', 'alb-a', 'nat-a'] },
      { titulo: 'us-east-1b', nodos: ['subred-publica-b', 'alb-b', 'nat-b'] },
    ],
  },
  {
    capa: 'privada', titulo: 'Red privada', descripcion: 'La aplicación, sin IP pública.',
    grupos: [
      { titulo: 'Balanceo y escalado', nodos: ['target-group', 'auto-scaling-group'] },
      { titulo: 'us-east-1a', nodos: ['subred-privada-a', 'ec2-a'] },
      { titulo: 'us-east-1b', nodos: ['subred-privada-b', 'ec2-b'] },
    ],
  },
  {
    capa: 'datos', titulo: 'Datos', descripcion: 'Donde persiste lo que no puede perderse.',
    grupos: [
      { titulo: 'Base de datos', nodos: ['rds-primaria', 'rds-standby'] },
      { titulo: 'Discos de las instancias', nodos: ['ebs-a', 'ebs-b'] },
      { titulo: 'Objetos estáticos', nodos: ['s3'] },
    ],
  },
  {
    capa: 'transversal', titulo: 'Transversal', descripcion: 'Envuelve o gobierna a todas las capas.',
    grupos: [
      { titulo: 'Red', nodos: ['vpc', 'az-a', 'az-b', 'tablas-rutas'] },
      { titulo: 'Seguridad e identidad', nodos: ['security-groups', 'rol-iam'] },
      { titulo: 'Observación', nodos: ['cloudwatch'] },
    ],
  },
]

const NODOS_POR_ID = new Map(NODOS.map((nodo) => [nodo.id, nodo]))

export function getNodo(id: NodoId): Nodo {
  const nodo = NODOS_POR_ID.get(id)
  if (!nodo) throw new Error(`Nodo desconocido: ${id}`)
  return nodo
}

// ─── Modos ─────────────────────────────────────────────────────────────────

export type Modo = { id: ModoId; numero: number; titulo: string; descripcion: string; disponible: boolean }

export const MODOS: Modo[] = [
  { id: 'trafico', numero: 1, titulo: 'Flujo de tráfico', descripcion: 'Seguí una petición paso a paso, del usuario a los datos y de vuelta.', disponible: true },
  { id: 'seguridad', numero: 2, titulo: 'Seguridad', descripcion: 'Qué protege cada capa y qué deja sin cubrir.', disponible: true },
  { id: 'alta-disponibilidad', numero: 3, titulo: 'Alta disponibilidad', descripcion: 'Inyectá una falla y mirá qué sigue funcionando.', disponible: true },
  { id: 'costos', numero: 4, titulo: 'Costos', descripcion: 'Qué cobra por hora, qué por uso y qué es gratis.', disponible: true },
  { id: 'ruta-aprendizaje', numero: 5, titulo: 'Ruta de aprendizaje', descripcion: 'Qué ya dominás y qué módulo sigue.', disponible: true },
]

export function modosDisponibles(): Modo[] {
  return MODOS.filter(({ disponible }) => disponible)
}

// ─── Aristas ─────────────────────────────────────────────────────────────────

export type VarianteId = 'minima' | 'intermedia' | 'completa'

export type Arista = {
  de: Actor
  a: NodoId
  punteada?: boolean
  /** Drawn as a curve around the nodes in between (the HTTPS leg skips Route 53). */
  curva?: boolean
  /** Only exists in these variants; otherwise it exists wherever both ends exist. */
  variantes?: VarianteId[]
}

export const ARISTAS: Arista[] = [
  { de: 'usuario', a: 'route53' },
  { de: 'usuario', a: 'cloudfront', curva: true },
  { de: 'route53', a: 'cloudfront' },
  { de: 'cloudfront', a: 's3' },
  { de: 'cloudfront', a: 'acm', punteada: true },
  { de: 'acm', a: 'waf', punteada: true },
  { de: 'waf', a: 'shield', punteada: true },
  { de: 'cloudfront', a: 'internet-gateway' },
  { de: 'usuario', a: 'internet-gateway', variantes: ['minima', 'intermedia'] },
  { de: 'internet-gateway', a: 'ec2-a', variantes: ['minima'] },
  { de: 'internet-gateway', a: 'alb-a' },
  { de: 'internet-gateway', a: 'alb-b' },
  { de: 'alb-a', a: 'target-group' },
  { de: 'alb-b', a: 'target-group' },
  { de: 'target-group', a: 'ec2-a' },
  { de: 'target-group', a: 'ec2-b' },
  { de: 'ec2-a', a: 'ebs-a' },
  { de: 'ec2-b', a: 'ebs-b' },
  { de: 'ec2-a', a: 'nat-a', punteada: true },
  { de: 'ec2-b', a: 'nat-b', punteada: true },
  { de: 'ec2-a', a: 'rds-primaria' },
  { de: 'ec2-b', a: 'rds-primaria' },
  { de: 'rds-primaria', a: 'rds-standby', punteada: true },
]

export function idArista({ de, a }: Pick<Arista, 'de' | 'a'>): string {
  return `${de}->${a}`
}

// ─── Variantes · Mínima / Intermedia / Completa ──────────────────────────────

/** A node moved to another place of the diagram in a simpler variant (Mínima puts the EC2 in the public subnet). */
type Reubicacion = { x: number; y: number; capa: Capa; detalle: string; grupo: string }

export type Variante = {
  id: VarianteId
  titulo: string
  descripcion: string
  nodos: NodoId[]
  reubicados: Partial<Record<NodoId, Reubicacion>>
  /** Against the previous (simpler) variant; null for Mínima. */
  frenteAnterior: { gana: string[]; cuestaMas: string[] } | null
  leFalta: string[]
}

const SIN_BORDE = new Set<NodoId>(['route53', 'cloudfront', 'acm', 'waf', 'shield', 's3'])

export const VARIANTES: Variante[] = [
  {
    id: 'minima', titulo: 'Mínima',
    descripcion: 'Una sola EC2 con IP pública en una subred pública. Sin alta disponibilidad, sin CDN y sin capa privada.',
    nodos: ['vpc', 'internet-gateway', 'az-a', 'subred-publica-a', 'ec2-a', 'ebs-a', 'tablas-rutas', 'security-groups', 'rol-iam'],
    reubicados: {
      'ec2-a': { x: 72, y: 388, capa: 'publica', detalle: 'IP pública', grupo: 'us-east-1a' },
      'ebs-a': { x: 266, y: 388, capa: 'datos', detalle: 'disco de 1a', grupo: 'Discos de las instancias' },
    },
    frenteAnterior: null,
    leFalta: [
      'Si la instancia o la zona us-east-1a fallan, el sitio se cae: no hay otra instancia ni otra AZ.',
      'La instancia está expuesta directamente a Internet y su Security Group es la barrera principal: la NACL por defecto permite todo.',
      'No escala: con más tráfico la única instancia se satura en lugar de sumar capacidad.',
      'Sin dominio propio ni certificado: se entra por la IP pública, que cambia en cada stop/start salvo que se use una Elastic IP.',
      'Los datos viven en el disco EBS de esa única instancia.',
    ],
  },
  {
    id: 'intermedia', titulo: 'Intermedia',
    descripcion: 'ALB, dos AZ, Auto Scaling Group, subredes privadas, NAT Gateway y RDS Multi-AZ. Sin CDN ni certificado propio.',
    nodos: NODOS.map(({ id }) => id).filter((id) => !SIN_BORDE.has(id)),
    reubicados: {},
    frenteAnterior: {
      gana: [
        'Alta disponibilidad: un nodo del ALB en cada AZ y un Auto Scaling Group que reemplaza las instancias caídas.',
        'La aplicación y la base de datos pasan a subredes privadas, sin IP pública: solo el ALB recibe tráfico de Internet.',
        'Las instancias privadas siguen saliendo a Internet por un NAT Gateway en cada AZ.',
        'Escala con la carga gracias al ASG y a las alarmas de CloudWatch.',
        'Los datos pasan a RDS Multi-AZ y sobreviven a la instancia que los procesó.',
      ],
      cuestaMas: [
        'Dos NAT Gateway que cobran por hora aunque no haya tráfico, más cada GB procesado.',
        'El ALB cobra por cada hora que existe más la capacidad consumida.',
        'Al menos dos EC2 encendidas y una standby de RDS que también se paga.',
        'Tráfico entre AZ, por ejemplo de la EC2 de us-east-1b a la RDS primaria de us-east-1a.',
      ],
    },
    leFalta: [
      'Todo el tráfico, también imágenes y CSS, llega hasta el ALB y las EC2: no hay caché en el borde.',
      'Sin dominio propio ni certificado de ACM: se entra por el nombre DNS del ALB y el sitio no se sirve por HTTPS.',
      'Sin WAF: las peticiones maliciosas bien formadas llegan hasta la aplicación.',
    ],
  },
  {
    id: 'completa', titulo: 'Completa',
    descripcion: 'Todo el diagrama: la Intermedia más Route 53, CloudFront, ACM, WAF, Shield y un bucket S3 privado con OAC.',
    nodos: NODOS.map(({ id }) => id),
    reubicados: {},
    frenteAnterior: {
      gana: [
        'CloudFront cachea lo estático en el borde: menos latencia y menos carga en el origen, así que el ASG escala mucho menos.',
        'Dominio propio con Route 53 y HTTPS en los dos tramos con certificados de ACM.',
        'WAF y Shield Standard filtran en el borde antes de que el tráfico llegue a la VPC.',
        'Los estáticos viven en un bucket S3 privado que solo CloudFront puede leer mediante OAC.',
      ],
      cuestaMas: [
        'CloudFront cobra por datos transferidos hacia Internet y por número de peticiones.',
        'WAF cobra por cada web ACL, por cada regla y por las peticiones inspeccionadas.',
        'S3 cobra almacenamiento, peticiones y cada versión guardada.',
        'Route 53 cobra la zona alojada y las consultas; las consultas ALIAS hacia recursos de AWS no se cobran.',
      ],
    },
    leFalta: [
      'Sigue en una sola región: una falla regional la deja fuera de servicio. La recuperación entre regiones queda fuera de este diagrama.',
    ],
  },
]

const VARIANTES_POR_ID = new Map(VARIANTES.map((variante) => [variante.id, variante]))

export function getVariante(id: VarianteId): Variante {
  const variante = VARIANTES_POR_ID.get(id)
  if (!variante) throw new Error(`Variante desconocida: ${id}`)
  return variante
}

/** Nodes of a variant in NODOS order, with the relocations of simpler variants applied. */
export function nodosDeVariante(id: VarianteId): Nodo[] {
  const variante = getVariante(id)
  const presentes = new Set(variante.nodos)
  return NODOS.filter((nodo) => presentes.has(nodo.id)).map((nodo) => {
    const reubicado = variante.reubicados[nodo.id]
    if (!reubicado) return nodo
    return { ...nodo, x: reubicado.x, y: reubicado.y, capa: reubicado.capa, detalle: reubicado.detalle }
  })
}

export function aristasDeVariante(id: VarianteId): Arista[] {
  const presentes = new Set<Actor>([...getVariante(id).nodos, 'usuario'])
  return ARISTAS.filter((arista) => (!arista.variantes || arista.variantes.includes(id)) && presentes.has(arista.de) && presentes.has(arista.a))
}

export function capasApiladasDe(id: VarianteId): CapaApilada[] {
  const variante = getVariante(id)
  const presentes = new Set(variante.nodos)
  const reubicados = Object.entries(variante.reubicados) as [NodoId, Reubicacion][]
  return CAPAS_APILADAS.map((capa) => {
    // Relocated nodes leave their original group and join their destination group.
    const grupos = capa.grupos.map((grupo) => ({
      titulo: grupo.titulo,
      nodos: grupo.nodos.filter((nodo) => presentes.has(nodo) && !variante.reubicados[nodo]),
    }))
    for (const [nodo, destino] of reubicados) {
      if (destino.capa !== capa.capa || !presentes.has(nodo)) continue
      const grupo = grupos.find(({ titulo }) => titulo === destino.grupo)
      if (grupo) grupo.nodos.push(nodo)
      else grupos.push({ titulo: destino.grupo, nodos: [nodo] })
    }
    return { ...capa, grupos: grupos.filter(({ nodos }) => nodos.length > 0) }
  }).filter(({ grupos }) => grupos.length > 0)
}

function componentesDeVariante(id: VarianteId): Set<ComponenteId> {
  return new Set(nodosDeVariante(id).map(({ componente }) => componente))
}

/** Components a variant adds or drops against another, in COMPONENTES order. */
export function diferenciaVariantes(desde: VarianteId, hasta: VarianteId): { agregados: ComponenteId[]; quitados: ComponenteId[] } {
  const antes = componentesDeVariante(desde)
  const despues = componentesDeVariante(hasta)
  return {
    agregados: COMPONENTES.map(({ id }) => id).filter((id) => despues.has(id) && !antes.has(id)),
    quitados: COMPONENTES.map(({ id }) => id).filter((id) => antes.has(id) && !despues.has(id)),
  }
}

/** Traffic (1) and high availability (3) are written step by step for the complete architecture. */
export function varianteEfectiva(modo: ModoId, variante: VarianteId): VarianteId {
  return modo === 'trafico' || modo === 'alta-disponibilidad' ? 'completa' : variante
}

// ─── Modo 1 · Flujo de tráfico ───────────────────────────────────────────────

export type PasoTrafico = { actor: Actor; accion: string; decision: string; apoyos?: NodoId[] }
export type RutaTrafico = { titulo: string; descripcion: string; pasos: PasoTrafico[] }

const PASO_DNS: PasoTrafico = {
  actor: 'route53',
  accion: 'Resuelve cafeteria.com con el registro ALIAS que apunta a la distribución de CloudFront.',
  decision: 'Devuelve direcciones de la red de CloudFront, así la conexión termina en una edge location cercana al usuario.',
}

export const RUTAS_TRAFICO: Record<RutaId, RutaTrafico> = {
  'estatico-hit': {
    titulo: 'Estático · cache hit',
    descripcion: 'El navegador pide /css/estilos.v7.css y la edge location ya lo tiene.',
    pasos: [
      { actor: 'usuario', accion: 'El navegador pide https://cafeteria.com/css/estilos.v7.css.', decision: 'Antes de conectarse necesita resolver el nombre a una dirección.' },
      PASO_DNS,
      { actor: 'cloudfront', apoyos: ['acm', 'shield', 'waf'], accion: 'La edge location recibe la petición HTTPS con el certificado de ACM; WAF y Shield la filtran.', decision: 'El patrón /css/* va al origen S3 y el objeto está en caché con su TTL vigente: cache hit.' },
      { actor: 'usuario', accion: 'Recibe el archivo directamente desde la edge location.', decision: 'La petición no tocó S3 ni la VPC: menos latencia y ninguna carga en el origen.' },
    ],
  },
  'estatico-miss': {
    titulo: 'Estático · cache miss',
    descripcion: 'La primera petición de /img/logo.v2.png en esa edge location.',
    pasos: [
      { actor: 'usuario', accion: 'El navegador pide https://cafeteria.com/img/logo.v2.png.', decision: 'Antes de conectarse necesita resolver el nombre a una dirección.' },
      PASO_DNS,
      { actor: 'cloudfront', apoyos: ['acm', 'shield', 'waf'], accion: 'La edge location recibe la petición HTTPS y la filtra con WAF y Shield.', decision: 'El patrón /img/* va al origen S3, pero el objeto no está en caché o su TTL venció: cache miss.' },
      { actor: 's3', accion: 'CloudFront pide el objeto al bucket privado con una petición firmada.', decision: 'La política del bucket solo acepta peticiones firmadas por OAC de esta distribución; el bucket sigue sin acceso público.' },
      { actor: 'cloudfront', accion: 'Guarda una copia en la edge location y la devuelve al usuario.', decision: 'Con la política CachingOptimized, las próximas peticiones de ese archivo en esa edge serán cache hit.' },
      { actor: 'usuario', accion: 'Recibe la imagen, un poco más tarde que en un cache hit.', decision: 'Solo el primer usuario de esa edge pagó el viaje hasta S3.' },
    ],
  },
  dinamico: {
    titulo: 'Dinámico · /api/',
    descripcion: 'El navegador pide /api/pedidos, una respuesta distinta para cada usuario.',
    pasos: [
      { actor: 'usuario', accion: 'El navegador pide https://cafeteria.com/api/pedidos.', decision: 'Antes de conectarse necesita resolver el nombre a una dirección.' },
      PASO_DNS,
      { actor: 'cloudfront', apoyos: ['acm', 'shield', 'waf'], accion: 'La edge location recibe la petición HTTPS y la filtra con WAF y Shield.', decision: 'El patrón /api/* va al origen ALB con CachingDisabled y HTTPS only: esta respuesta no se cachea.' },
      { actor: 'internet-gateway', apoyos: ['tablas-rutas'], accion: 'La petición entra a la VPC por el Internet Gateway.', decision: 'Las subredes públicas tienen 0.0.0.0/0 hacia el IGW, por eso el ALB es alcanzable desde Internet.' },
      { actor: 'alb-a', apoyos: ['alb-b', 'security-groups'], accion: 'Un nodo del ALB recibe la petición en su listener HTTPS; su Security Group admite 443.', decision: 'La regla del listener reenvía la petición al Target Group.' },
      { actor: 'target-group', accion: 'Elige un destino entre las instancias registradas.', decision: 'Solo considera las que pasan el health check; esta vez elige la EC2 de us-east-1a.' },
      { actor: 'ec2-a', apoyos: ['security-groups', 'rol-iam', 'ebs-a'], accion: 'La aplicación procesa la petición en la subred privada.', decision: 'Su SG solo acepta tráfico desde el SG del ALB; si llama a otro servicio de AWS, usa las credenciales temporales del rol.' },
      { actor: 'rds-primaria', apoyos: ['security-groups'], accion: 'La aplicación consulta los pedidos en la base de datos primaria.', decision: 'El SG de datos solo admite el puerto del motor desde el SG de aplicación; la standby replica pero no atiende.' },
      { actor: 'cloudfront', apoyos: ['alb-a'], accion: 'La respuesta vuelve por el ALB hasta la edge location.', decision: 'Con CachingDisabled no guarda copia: cada petición a /api/* llega al origen.' },
      { actor: 'usuario', accion: 'Recibe sus pedidos.', decision: 'Cada petición dinámica recorrió todas las capas; por eso conviene que lo estático nunca llegue hasta aquí.' },
    ],
  },
}

export type EstadoTrafico = { ruta: RutaId; indice: number }

export function crearEstadoTrafico(ruta: RutaId): EstadoTrafico {
  return { ruta, indice: 0 }
}

export function siguientePaso(estado: EstadoTrafico): EstadoTrafico {
  return { ...estado, indice: Math.min(estado.indice + 1, RUTAS_TRAFICO[estado.ruta].pasos.length - 1) }
}

export function pasoAnterior(estado: EstadoTrafico): EstadoTrafico {
  return { ...estado, indice: Math.max(estado.indice - 1, 0) }
}

export function cambiarRuta(_estado: EstadoTrafico, ruta: RutaId): EstadoTrafico {
  return crearEstadoTrafico(ruta)
}

export type ResaltadoTrafico = {
  /** Acting node (or the user) plus the helpers that take part in the current step. */
  activos: Actor[]
  /** Nodes crossed in earlier steps that are not active now. */
  recorridos: NodoId[]
  /** Actor of the previous step, or null on the first step. */
  anterior: Actor | null
}

export function resaltadoTrafico(estado: EstadoTrafico): ResaltadoTrafico {
  const pasos = RUTAS_TRAFICO[estado.ruta].pasos
  const actual = pasos[estado.indice]
  const activos: Actor[] = [actual.actor, ...(actual.apoyos ?? [])]
  const recorridos = new Set<NodoId>()
  for (const paso of pasos.slice(0, estado.indice)) {
    for (const actor of [paso.actor, ...(paso.apoyos ?? [])]) {
      if (actor !== 'usuario' && !activos.includes(actor)) recorridos.add(actor)
    }
  }
  return { activos, recorridos: [...recorridos], anterior: estado.indice > 0 ? pasos[estado.indice - 1].actor : null }
}

// ─── Modo 3 · Alta disponibilidad ────────────────────────────────────────────

export type FaseFalla = { titulo: string; descripcion: string; nodos: Partial<Record<NodoId, Exclude<Salud, 'ok'>>> }
export type Falla = {
  titulo: string
  resumen: string
  fases: FaseFalla[]
  sigueFuncionando: string[]
  seDegrada: string[]
  recuperacion: string
}

const ZONA_A_CAIDA = {
  'az-a': 'caido', 'subred-publica-a': 'caido', 'subred-privada-a': 'caido', 'alb-a': 'caido',
  'nat-a': 'caido', 'ec2-a': 'caido', 'ebs-a': 'caido', 'rds-primaria': 'caido',
} as const

export const FALLAS: Record<FallaId, Falla> = {
  instancia: {
    titulo: 'Cae una instancia',
    resumen: 'Apache deja de responder en la EC2 de us-east-1a.',
    fases: [
      { titulo: 'La instancia deja de responder', descripcion: 'La aplicación de la EC2 en us-east-1a se cae, aunque la máquina puede seguir encendida.', nodos: { 'ec2-a': 'caido', 'target-group': 'degradado' } },
      { titulo: 'Falla el health check', descripcion: 'Tras varios health checks fallidos seguidos, el Target Group marca el destino como unhealthy y el ALB envía todo el tráfico a la EC2 de us-east-1b.', nodos: { 'ec2-a': 'caido', 'target-group': 'degradado', 'ec2-b': 'degradado' } },
      { titulo: 'El ASG la reemplaza', descripcion: 'Con health checks de tipo ELB, el Auto Scaling Group ve la instancia unhealthy, la termina y lanza otra desde el Launch Template. La nueva arranca dentro de su grace period.', nodos: { 'ec2-a': 'degradado', 'target-group': 'degradado', 'ec2-b': 'degradado' } },
      { titulo: 'Vuelve al balanceo', descripcion: 'La instancia nueva pasa el health check, el ASG la registra en el Target Group y el ALB vuelve a repartir entre las dos AZ.', nodos: {} },
    ],
    sigueFuncionando: ['El sitio sigue respondiendo: el ALB envía las peticiones a la instancia sana de us-east-1b.', 'El contenido estático no se entera: lo sirve CloudFront desde S3.', 'La base de datos no se ve afectada.'],
    seDegrada: ['Mientras dura el reemplazo hay la mitad de capacidad; con carga alta, la instancia restante responde más lento.', 'Las sesiones guardadas en memoria de la instancia caída se pierden.'],
    recuperacion: 'Del orden de minutos: depende de cuántos health checks fallidos se exijan, de cuánto tarde en arrancar la instancia nueva y del grace period (tiempos exactos por verificar en cada caso). Sin health check de tipo ELB, el ASG nunca la reemplaza.',
  },
  zona: {
    titulo: 'Cae una zona',
    resumen: 'Toda la zona us-east-1a queda fuera de servicio.',
    fases: [
      { titulo: 'Se pierde us-east-1a', descripcion: 'Caen a la vez el nodo del ALB, el NAT Gateway, la EC2 y la base de datos primaria de esa zona. La aplicación de us-east-1b se queda sin base de datos.', nodos: { ...ZONA_A_CAIDA, 'target-group': 'degradado', 'ec2-b': 'degradado', 'rds-standby': 'degradado' } },
      { titulo: 'El ALB deja de enrutar a la zona', descripcion: 'Los health checks de la EC2 de us-east-1a fallan y el ALB envía todo el tráfico a su nodo y sus destinos en us-east-1b.', nodos: { ...ZONA_A_CAIDA, 'target-group': 'degradado', 'ec2-b': 'degradado', 'rds-standby': 'degradado' } },
      { titulo: 'RDS promueve la standby', descripcion: 'RDS Multi-AZ detecta la falla y promueve la standby de us-east-1b a primaria. El endpoint de la base de datos pasa a apuntar a ella, así que la aplicación no cambia su configuración.', nodos: { ...ZONA_A_CAIDA, 'target-group': 'degradado', 'ec2-b': 'degradado' } },
      { titulo: 'El ASG lanza en la zona sobreviviente', descripcion: 'El Auto Scaling Group ve menos instancias que la capacidad deseada y lanza los reemplazos en us-east-1b, la única zona disponible de las que tiene configuradas.', nodos: { ...ZONA_A_CAIDA } },
    ],
    sigueFuncionando: ['CloudFront, Route 53 y S3 no dependen de la zona: el contenido estático sigue servido.', 'El ALB sigue respondiendo con su nodo de us-east-1b.', 'Los datos no se pierden: la standby tenía una réplica sincrónica.'],
    seDegrada: ['Durante el failover de RDS las peticiones dinámicas fallan o esperan.', 'Hasta que el ASG repone capacidad, una sola zona atiende todo el tráfico.', 'La arquitectura queda sin redundancia de zona hasta que us-east-1a vuelva.'],
    recuperacion: 'El failover de RDS Multi-AZ suele completarse en un par de minutos (por verificar en la documentación vigente); reponer la capacidad con el ASG agrega varios minutos más. La redundancia completa vuelve solo cuando se recupera la zona.',
  },
  nat: {
    titulo: 'Cae un NAT Gateway',
    resumen: 'El NAT Gateway de us-east-1a deja de funcionar.',
    fases: [
      { titulo: 'Falla el NAT de us-east-1a', descripcion: 'La ruta 0.0.0.0/0 de la subred privada de us-east-1a apunta a un NAT que ya no responde.', nodos: { 'nat-a': 'caido' } },
      { titulo: 'Las instancias privadas pierden la salida', descripcion: 'La EC2 de us-east-1a no puede iniciar conexiones hacia Internet: dnf update, descargas de paquetes y llamadas a APIs externas fallan.', nodos: { 'nat-a': 'caido', 'ec2-a': 'degradado', 'subred-privada-a': 'degradado', 'tablas-rutas': 'degradado' } },
      { titulo: 'Las peticiones entrantes siguen', descripcion: 'Las peticiones de usuarios entran por el ALB y la respuesta vuelve por el mismo camino, sin pasar por el NAT. La EC2 sigue sana en el Target Group.', nodos: { 'nat-a': 'caido', 'ec2-a': 'degradado', 'subred-privada-a': 'degradado', 'tablas-rutas': 'degradado' } },
      { titulo: 'Se redirige la salida', descripcion: 'Alguien cambia la ruta 0.0.0.0/0 de la subred privada de us-east-1a hacia el NAT de us-east-1b, pagando tráfico entre zonas, o crea un NAT nuevo y actualiza la ruta.', nodos: { 'nat-a': 'caido' } },
    ],
    sigueFuncionando: ['Las peticiones entrantes desde el ALB se atienden normalmente.', 'Las instancias de us-east-1b salen por su propio NAT Gateway.', 'La base de datos y el contenido estático no se ven afectados.'],
    seDegrada: ['Las EC2 de us-east-1a pierden la salida a Internet: actualizaciones, descargas y APIs externas.', 'Una instancia nueva que necesite descargar paquetes en su User Data puede no llegar a estar sana.'],
    recuperacion: 'No es automática: la tabla de rutas no cambia de NAT por sí sola, así que depende de cuánto se tarde en detectar la falla y corregir la ruta. Un NAT por AZ limita el impacto a una sola zona.',
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

export function estadoNodos(estado: EstadoFallas): Record<NodoId, Salud> {
  const salud = Object.fromEntries(NODOS.map(({ id }) => [id, 'ok'])) as Record<NodoId, Salud>
  if (!estado.falla) return salud
  const fases = FALLAS[estado.falla].fases
  const fase = fases[Math.min(Math.max(estado.fase, 0), fases.length - 1)]
  return { ...salud, ...fase.nodos }
}

// ─── Modo 2 · Seguridad por capas ────────────────────────────────────────────

export type ControlId = 'tls' | 'waf-shield' | 'security-groups' | 'nacl' | 'iam' | 'oac' | 'cifrado-reposo'

export type ControlSeguridad = {
  id: ControlId
  titulo: string
  /** Where the control acts, in words. */
  alcance: string
  /** Nodes it acts on (including the component that implements it). */
  nodos: NodoId[]
  /** Network legs it protects. */
  aristas: string[]
  protegeContra: string[]
  /** The pedagogical point: what stays exposed if this were the only layer. */
  noCubre: string[]
  herramienta?: { href: string; etiqueta: string }
}

const VERIFICADOR_SG_NACL = { href: '/herramientas/sg-nacl', etiqueta: 'Verificador SG vs NACL' }

export const CONTROLES_SEGURIDAD: ControlSeguridad[] = [
  {
    id: 'tls', titulo: 'TLS (HTTPS)',
    alcance: 'Cada tramo de red por separado: usuario a CloudFront, CloudFront al ALB y CloudFront a S3, con certificados de ACM.',
    nodos: ['cloudfront', 'acm', 'alb-a', 'alb-b', 's3'],
    aristas: ['usuario->cloudfront', 'cloudfront->internet-gateway', 'internet-gateway->alb-a', 'internet-gateway->alb-b', 'cloudfront->s3'],
    protegeContra: [
      'Que alguien en el camino lea o modifique la petición: da confidencialidad, integridad y autenticidad del servidor.',
      'Con Redirect HTTP to HTTPS hacia el usuario y HTTPS only hacia el ALB, ningún tramo por Internet viaja en claro.',
    ],
    noCubre: [
      'Cada tramo se cifra por separado: cifrar solo el primero deja el segundo en claro.',
      'El ALB termina TLS: el tramo del ALB a las EC2 dentro de la VPC no queda cifrado por esta capa, salvo que también se configure HTTPS hacia los destinos.',
      'No filtra nada: una inyección SQL llega igual de bien cifrada.',
      'No protege los datos guardados en discos, bases o buckets: eso es el cifrado en reposo.',
    ],
  },
  {
    id: 'waf-shield', titulo: 'WAF y Shield',
    alcance: 'En el borde, sobre la distribución de CloudFront. Shield Standard también protege Route 53.',
    nodos: ['route53', 'cloudfront', 'waf', 'shield'],
    aristas: ['usuario->cloudfront'],
    protegeContra: [
      'WAF bloquea patrones de capa 7 como inyección SQL, excesos de tasa desde una misma IP o IPs de mala reputación.',
      'Shield Standard absorbe ataques DDoS volumétricos de capas 3 y 4 antes de que lleguen a la VPC.',
    ],
    noCubre: [
      'Solo filtra lo que pasa por CloudFront: con el SG del ALB abierto a 80 y 443 desde Internet, quien conozca el DNS del ALB lo alcanza directo y esquiva WAF (restringir el ALB para que solo acepte a CloudFront es posible, por verificar el mecanismo vigente).',
      'Una petición maliciosa que no coincide con ninguna regla llega a la aplicación: WAF solo bloquea lo que sus reglas describen.',
      'No controla el tráfico interno de la VPC ni las llamadas a la API de AWS.',
    ],
  },
  {
    id: 'security-groups', titulo: 'Security Groups',
    alcance: 'Por interfaz de red de cada recurso: uno para el ALB, uno para la aplicación y uno para la base de datos.',
    nodos: ['security-groups', 'alb-a', 'alb-b', 'ec2-a', 'ec2-b', 'rds-primaria', 'rds-standby'],
    aristas: ['internet-gateway->alb-a', 'internet-gateway->alb-b', 'internet-gateway->ec2-a', 'target-group->ec2-a', 'target-group->ec2-b', 'ec2-a->rds-primaria', 'ec2-b->rds-primaria'],
    protegeContra: [
      'Encadenan el acceso: Internet solo llega al ALB por 80 y 443, la aplicación solo acepta al SG del ALB y la base solo el puerto del motor desde el SG de aplicación.',
      'Son stateful: la respuesta a una conexión permitida sale sin regla adicional.',
    ],
    noCubre: [
      'Solo tienen reglas allow: no pueden denegar una IP puntual; para eso está la NACL.',
      'No inspeccionan el contenido: una inyección SQL por el puerto 443 permitido pasa.',
      'No aplican fuera de la VPC: CloudFront y S3 quedan fuera de su alcance.',
      'El NAT Gateway no usa Security Groups: su subred solo la filtra la NACL.',
    ],
    herramienta: VERIFICADOR_SG_NACL,
  },
  {
    id: 'nacl', titulo: 'Network ACL',
    alcance: 'Por subred: filtra lo que entra y sale de cada una de las subredes públicas y privadas.',
    nodos: ['subred-publica-a', 'subred-publica-b', 'subred-privada-a', 'subred-privada-b', 'alb-a', 'alb-b', 'nat-a', 'nat-b', 'ec2-a', 'ec2-b', 'rds-primaria', 'rds-standby'],
    aristas: ['internet-gateway->alb-a', 'internet-gateway->alb-b', 'internet-gateway->ec2-a', 'target-group->ec2-a', 'target-group->ec2-b', 'ec2-a->nat-a', 'ec2-b->nat-b', 'ec2-b->rds-primaria'],
    protegeContra: [
      'Admite reglas allow y deny evaluadas por orden numérico, gana la primera coincidencia: sirve para bloquear un rango de IPs en toda la subred.',
      'Es una segunda barrera si un Security Group se abre de más.',
    ],
    noCubre: [
      'La NACL por defecto permite todo el tráfico: si no la configurás, esta capa existe pero no filtra nada.',
      'Es stateless: no recuerda conexiones, así que hay que permitir también la salida por los puertos efímeros (1024–65535) para las respuestas.',
      'No ve el tráfico entre recursos de la misma subred, como la EC2 y la RDS primaria de us-east-1a.',
      'No inspecciona contenido ni aplica a CloudFront o S3, que están fuera de la VPC.',
    ],
    herramienta: VERIFICADOR_SG_NACL,
  },
  {
    id: 'iam', titulo: 'IAM',
    alcance: 'Sobre cada llamada a la API de AWS: el rol que asume cada instancia y la política del bucket.',
    nodos: ['rol-iam', 'ec2-a', 'ec2-b', 's3'],
    aristas: [],
    protegeContra: [
      'Decide quién puede llamar a qué API de AWS: la aplicación usa las credenciales temporales del rol, sin Access Keys guardadas en el servidor.',
      'La política del bucket, basada en recursos, solo acepta peticiones de la distribución de CloudFront.',
    ],
    noCubre: [
      'No filtra tráfico de red: una petición HTTP al ALB no es una llamada a la API de AWS; eso lo controlan los Security Groups y las NACL.',
      'No autentica a los usuarios finales de la aplicación.',
      'Si la aplicación tiene un fallo, quien lo explote actúa con los permisos del rol: por eso el rol lleva solo los permisos mínimos.',
    ],
  },
  {
    id: 'oac', titulo: 'OAC',
    alcance: 'Entre CloudFront y el bucket S3: el único camino de lectura del bucket.',
    nodos: ['cloudfront', 's3'],
    aristas: ['cloudfront->s3'],
    protegeContra: [
      'CloudFront firma sus peticiones y el bucket privado solo acepta las de esta distribución.',
      'Junto con Block Public Access, nadie se salta la CDN para leer el bucket directo.',
    ],
    noCubre: [
      'En esta arquitectura solo protege el origen S3: el ALB, el otro origen de la distribución, no lo usa.',
      'No evita que alguien con permisos de IAM sobre el bucket borre o sobrescriba objetos; el versionado ayuda a recuperarlos.',
      'No cifra los objetos guardados.',
    ],
  },
  {
    id: 'cifrado-reposo', titulo: 'Cifrado en reposo',
    alcance: 'En los datos guardados: objetos de S3, volúmenes EBS y sus snapshots, y la base de datos de RDS, con claves de KMS.',
    nodos: ['s3', 'ebs-a', 'ebs-b', 'rds-primaria', 'rds-standby'],
    aristas: [],
    protegeContra: [
      'Si alguien obtiene el disco, un snapshot o una copia del almacenamiento, sin la clave no puede leer los datos.',
    ],
    noCubre: [
      'Quien tiene acceso legítimo lee los datos ya descifrados: una inyección SQL que pasa por la aplicación devuelve datos en claro.',
      'No protege los datos en tránsito: eso es TLS.',
      'En EBS conviene activarlo al crear el volumen: cifrar uno existente exige snapshot, copia cifrada y volumen nuevo.',
      'Qué viene cifrado por defecto en cada servicio cambia con el tiempo (por verificar en la documentación vigente).',
    ],
  },
]

/** Components that hold data or receive traffic: the ones a layer has to cover. */
export const OBJETIVOS_SEGURIDAD: NodoId[] = [
  'route53', 'cloudfront', 's3', 'alb-a', 'alb-b', 'nat-a', 'nat-b', 'ec2-a', 'ec2-b', 'ebs-a', 'ebs-b', 'rds-primaria', 'rds-standby',
]

export type EstadoSeguridad = { activos: ControlId[] }

const ORDEN_CONTROLES = CONTROLES_SEGURIDAD.map(({ id }) => id)
const enOrden = (ids: Iterable<ControlId>) => ORDEN_CONTROLES.filter((id) => new Set(ids).has(id))

export function crearEstadoSeguridad(): EstadoSeguridad {
  return { activos: ['security-groups'] }
}

export function alternarControl(estado: EstadoSeguridad, id: ControlId): EstadoSeguridad {
  const activos = new Set(estado.activos)
  if (activos.has(id)) activos.delete(id)
  else activos.add(id)
  return { activos: enOrden(activos) }
}

export function activarTodosControles(): EstadoSeguridad {
  return { activos: [...ORDEN_CONTROLES] }
}

export function desactivarTodosControles(): EstadoSeguridad {
  return { activos: [] }
}

export type CoberturaSeguridad = {
  /** Active controls acting on each node present in the variant (only nodes with at least one). */
  porNodo: Partial<Record<NodoId, ControlId[]>>
  porArista: Record<string, ControlId[]>
  /** Protected components of the variant with zero active layers. */
  sinCobertura: NodoId[]
  /** Protected components that depend on exactly one active layer. */
  unaSolaCapa: NodoId[]
}

export function coberturaSeguridad(estado: EstadoSeguridad, variante: VarianteId): CoberturaSeguridad {
  const nodos = new Set(getVariante(variante).nodos)
  const aristas = new Set(aristasDeVariante(variante).map(idArista))
  const porNodo: Partial<Record<NodoId, ControlId[]>> = {}
  const porArista: Record<string, ControlId[]> = {}
  for (const control of CONTROLES_SEGURIDAD) {
    if (!estado.activos.includes(control.id)) continue
    for (const id of control.nodos) if (nodos.has(id)) (porNodo[id] ??= []).push(control.id)
    for (const id of control.aristas) if (aristas.has(id)) (porArista[id] ??= []).push(control.id)
  }
  const objetivos = OBJETIVOS_SEGURIDAD.filter((id) => nodos.has(id))
  return {
    porNodo,
    porArista,
    sinCobertura: objetivos.filter((id) => !porNodo[id]),
    unaSolaCapa: objetivos.filter((id) => porNodo[id]?.length === 1),
  }
}

// ─── Modo 4 · Costos ─────────────────────────────────────────────────────────

export type CategoriaCobro = 'fijo-por-hora' | 'fijo-y-uso' | 'por-uso' | 'sin-costo'

/** Rendering category over the existing cobro.modos: hourly plus usage is its own category. */
export function categoriaCobro(id: ComponenteId): CategoriaCobro {
  const modos = getComponente(id).cobro.modos
  if (modos.includes('fijo-por-hora')) return modos.includes('por-uso') ? 'fijo-y-uso' : 'fijo-por-hora'
  return modos.includes('por-uso') ? 'por-uso' : 'sin-costo'
}

export const AVISO_ESTIMACION = 'Estimación ilustrativa en unidades relativas (u): no son precios reales de AWS. Sirve para comparar qué pesa más y cómo cambia con el tráfico; para precios reales usá la calculadora de precios de AWS.'

export type SorpresaId = 'nat-por-hora' | 'entre-az'

export type SorpresaCosto = { id: SorpresaId; titulo: string; descripcion: string; nodos: NodoId[]; aristas: string[] }

export const SORPRESAS_COSTO: SorpresaCosto[] = [
  {
    id: 'nat-por-hora', titulo: 'El NAT Gateway cobra de noche',
    descripcion: 'Cobra cada hora que existe, aunque no haya tráfico, más cada GB procesado. Con uno por AZ, ese costo fijo se multiplica por la cantidad de AZ.',
    nodos: ['nat-a', 'nat-b'], aristas: [],
  },
  {
    id: 'entre-az', titulo: 'El tráfico entre AZ se cobra',
    descripcion: 'El tráfico dentro de la misma AZ por IP privada no se cobra, pero entre AZ distintas sí, por ejemplo cuando la EC2 de us-east-1b consulta a la RDS primaria de us-east-1a. Qué tramos exactos factura cada servicio, por verificar.',
    nodos: [], aristas: ['ec2-b->rds-primaria'],
  },
]

export type PartidaCosto = {
  id: string
  titulo: string
  /** The partida applies when these nodes are present (all of them if requiereTodos, else any). */
  nodos: NodoId[]
  requiereTodos?: boolean
  /** Multiplies the fixed weight by the number of present nodes (one NAT per AZ, one EC2 per AZ...). */
  porNodo?: boolean
  /** Illustrative relative weight of the fixed monthly part. */
  fijo: number
  /** Illustrative relative weight per traffic point (0..100), optionally different per variant. */
  porTrafico: number | Partial<Record<VarianteId, number>>
  nota: string
  sorpresa?: SorpresaId
}

export const PARTIDAS_COSTO: PartidaCosto[] = [
  { id: 'nat', titulo: 'NAT Gateway', nodos: ['nat-a', 'nat-b'], porNodo: true, fijo: 3, porTrafico: 0.01, nota: 'Por hora de cada NAT, haya o no tráfico, más cada GB procesado.', sorpresa: 'nat-por-hora' },
  { id: 'alb', titulo: 'Application Load Balancer', nodos: ['alb-a', 'alb-b'], fijo: 2, porTrafico: 0.02, nota: 'Un solo ALB: hora del balanceador más la capacidad consumida.' },
  { id: 'ec2', titulo: 'EC2 (capacidad mínima)', nodos: ['ec2-a', 'ec2-b'], porNodo: true, fijo: 3, porTrafico: 0, nota: 'Cada instancia encendida cobra por hora, atienda o no peticiones.' },
  { id: 'asg', titulo: 'EC2 extra que lanza el ASG', nodos: ['auto-scaling-group'], fijo: 0, porTrafico: { intermedia: 0.04, completa: 0.02 }, nota: 'Con más tráfico el ASG suma instancias. Detrás de CloudFront escala menos porque lo estático no llega al origen.' },
  { id: 'rds', titulo: 'RDS Multi-AZ', nodos: ['rds-primaria', 'rds-standby'], porNodo: true, fijo: 4, porTrafico: 0, nota: 'Hora de la primaria y también de la standby, más almacenamiento y respaldos.' },
  { id: 'ebs', titulo: 'Volúmenes EBS', nodos: ['ebs-a', 'ebs-b'], porNodo: true, fijo: 0.5, porTrafico: 0, nota: 'Por GB aprovisionado al mes, aunque la instancia esté detenida.' },
  { id: 'salida', titulo: 'Datos hacia Internet', nodos: ['internet-gateway'], fijo: 0, porTrafico: 0.05, nota: 'Cada GB que sale hacia los usuarios. En la Completa lo factura CloudFront; sin CDN sale desde la VPC, con otras tarifas (por verificar).' },
  { id: 'entre-az', titulo: 'Tráfico entre AZ', nodos: ['az-a', 'az-b'], requiereTodos: true, fijo: 0, porTrafico: 0.01, nota: 'Solo existe con dos AZ y crece con el tráfico.', sorpresa: 'entre-az' },
  { id: 'waf', titulo: 'AWS WAF', nodos: ['waf'], fijo: 1, porTrafico: 0.01, nota: 'Por web ACL y por regla al mes, más las peticiones inspeccionadas.' },
  { id: 's3', titulo: 'Bucket S3', nodos: ['s3'], fijo: 0.3, porTrafico: 0.005, nota: 'Almacenamiento y versiones, más las peticiones de los cache miss.' },
  { id: 'route53', titulo: 'Route 53', nodos: ['route53'], fijo: 0.2, porTrafico: 0, nota: 'Zona alojada al mes; las consultas ALIAS hacia recursos de AWS no se cobran.' },
  { id: 'cloudwatch', titulo: 'CloudWatch', nodos: ['cloudwatch'], fijo: 0.3, porTrafico: 0, nota: 'Las alarmas del target tracking; las métricas básicas de EC2 no tienen costo.' },
]

export type PartidaEstimada = { id: string; titulo: string; nota: string; unidades: number; fijo: number; variable: number; sorpresa?: SorpresaId }
export type EstimacionCosto = {
  total: number
  fijo: number
  variable: number
  partidas: PartidaEstimada[]
  /** What the NAT Gateways charge with zero traffic. */
  natEnReposo: number
  /** Whether the variant adds capacity with traffic (has an ASG). */
  escala: boolean
}

export const TRAFICO_MAXIMO = 100

export function estimarCosto(variante: VarianteId, trafico: number): EstimacionCosto {
  const nivel = Math.min(Math.max(trafico, 0), TRAFICO_MAXIMO)
  const nodos = new Set(getVariante(variante).nodos)
  const partidas: PartidaEstimada[] = []
  for (const partida of PARTIDAS_COSTO) {
    const presentes = partida.nodos.filter((id) => nodos.has(id)).length
    if (presentes === 0 || (partida.requiereTodos && presentes < partida.nodos.length)) continue
    const fijo = partida.fijo * (partida.porNodo ? presentes : 1)
    const peso = typeof partida.porTrafico === 'number' ? partida.porTrafico : (partida.porTrafico[variante] ?? 0)
    const variable = peso * nivel
    partidas.push({ id: partida.id, titulo: partida.titulo, nota: partida.nota, fijo, variable, unidades: fijo + variable, sorpresa: partida.sorpresa })
  }
  const fijo = partidas.reduce((suma, { fijo: valor }) => suma + valor, 0)
  const variable = partidas.reduce((suma, { variable: valor }) => suma + valor, 0)
  return {
    total: fijo + variable,
    fijo,
    variable,
    partidas,
    natEnReposo: partidas.find(({ id }) => id === 'nat')?.fijo ?? 0,
    escala: nodos.has('auto-scaling-group'),
  }
}

export function etiquetaTrafico(trafico: number): string {
  if (trafico <= 0) return 'Sin tráfico (por ejemplo, de noche)'
  if (trafico <= 30) return 'Tráfico bajo'
  if (trafico <= 60) return 'Tráfico medio'
  return 'Tráfico alto'
}

// ─── Modo 5 · Ruta de aprendizaje ────────────────────────────────────────────

export type ModuloRutaId = 'vpc' | 'ec2' | 'iam' | 'elasticidad' | 'cloudfront'
export type Progreso = 'dominado' | 'en-curso' | 'no-visto'
export type ModuloRuta = { id: ModuloRutaId; etiqueta: string; href: string }

export const MODULOS_RUTA: ModuloRuta[] = [M_VPC, M_EC2, M_IAM, M_ELASTICIDAD, M_CLOUDFRONT].map((modulo) => ({
  id: modulo.href.replace('/servicios/', '') as ModuloRutaId,
  etiqueta: modulo.etiqueta,
  href: modulo.href,
}))

/**
 * Module where each component is studied. Components linked to the architecture guide
 * (ALB, Target Group, Security Groups) are assigned to the course module that covers them.
 */
export const MODULO_DE_COMPONENTE: Record<ComponenteId, ModuloRutaId> = {
  vpc: 'vpc', 'zona-disponibilidad': 'vpc', 'subred-publica': 'vpc', 'subred-privada': 'vpc', 'internet-gateway': 'vpc',
  'nat-gateway': 'vpc', 'tablas-rutas': 'vpc', 'security-groups': 'vpc',
  ec2: 'ec2', ebs: 'ec2', rds: 'ec2',
  'rol-iam': 'iam',
  'auto-scaling-group': 'elasticidad', cloudwatch: 'elasticidad', alb: 'elasticidad', 'target-group': 'elasticidad',
  cloudfront: 'cloudfront', acm: 'cloudfront', s3: 'cloudfront', waf: 'cloudfront', shield: 'cloudfront', route53: 'cloudfront',
}

/** avance = index in MODULOS_RUTA of the module in progress; MODULOS_RUTA.length means all done. */
export type EstadoRuta = { avance: number; ajustes: Partial<Record<ComponenteId, Progreso>> }

export function crearEstadoRuta(): EstadoRuta {
  return { avance: 0, ajustes: {} }
}

export function fijarAvance(_estado: EstadoRuta, avance: number): EstadoRuta {
  return { avance: Math.min(Math.max(Math.round(avance), 0), MODULOS_RUTA.length), ajustes: {} }
}

export function marcarProgreso(estado: EstadoRuta, componente: ComponenteId, progreso: Progreso): EstadoRuta {
  return { ...estado, ajustes: { ...estado.ajustes, [componente]: progreso } }
}

const INDICE_MODULO = new Map(MODULOS_RUTA.map(({ id }, indice) => [id, indice]))

export function progresoComponentes(estado: EstadoRuta): Record<ComponenteId, Progreso> {
  return Object.fromEntries(COMPONENTES.map(({ id }) => {
    const indice = INDICE_MODULO.get(MODULO_DE_COMPONENTE[id])!
    const derivado: Progreso = indice < estado.avance ? 'dominado' : indice === estado.avance ? 'en-curso' : 'no-visto'
    return [id, estado.ajustes[id] ?? derivado]
  })) as Record<ComponenteId, Progreso>
}

export function resumenProgreso(estado: EstadoRuta): Record<Progreso, number> {
  const resumen: Record<Progreso, number> = { dominado: 0, 'en-curso': 0, 'no-visto': 0 }
  for (const progreso of Object.values(progresoComponentes(estado))) resumen[progreso]++
  return resumen
}

/** Unseen components grouped by module, in course order. */
export function pendientesPorModulo(estado: EstadoRuta): { modulo: ModuloRuta; componentes: ComponenteId[] }[] {
  const progreso = progresoComponentes(estado)
  return MODULOS_RUTA.map((modulo) => ({
    modulo,
    componentes: COMPONENTES.map(({ id }) => id).filter((id) => MODULO_DE_COMPONENTE[id] === modulo.id && progreso[id] === 'no-visto'),
  })).filter(({ componentes }) => componentes.length > 0)
}
