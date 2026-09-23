/**
 * Practice exam engine for the AWS study app.
 *
 * Question bank is taken verbatim from 03-banco-preguntas-...md
 * (Well-Architected, ELB, costos, S3+CloudFront, presigned URLs,
 * elección de región, elección de AZ) for P1–P7. P8–P19 cover the
 * Elasticidad (Auto Scaling, Target Groups, CloudWatch) and Entrega de
 * contenido (CloudFront, HTTPS/ACM, S3) modules, written from the class
 * notes 05-auto-scaling-target-groups-cloudwatch.md and
 * 04-cloudfront-https-s3.md. Each question carries the rationale for
 * every distractor so we can show it as feedback.
 */

export type Pregunta = {
  /** Stable identifier from the source ("P1", "P2", ...). */
  id: string
  tema: string
  /** "simple" = one correct answer. "multiple-2" = exactly 2 of 5. */
  tipo: 'simple' | 'multiple-2'
  enunciado: string
  opciones: Opcion[]
  /** Set of option ids that are correct. */
  correctas: string[]
  /** Per-option feedback (markdown fragments, kept short). */
  justificaciones: Record<string, string>
  /** Optional mnemonic / summary line. */
  regla?: string
}

export type Opcion = {
  id: string
  /** "A" through "E". */
  letra: string
  texto: string
}

export type Respuesta = {
  preguntaId: string
  /** Chosen option ids. Order independent. */
  elegidas: string[]
}

export type ResultadoPregunta = {
  pregunta: Pregunta
  /** What the user picked. */
  elegidas: string[]
  /** Did the user get this question fully right? */
  correcta: boolean
  /** Per-option verdict given the user's picks. */
  porOpcion: Record<string, 'acertada' | 'errada' | 'no-elegida-correcta' | 'no-elegida-incorrecta'>
  /** Options the user missed (relevant for multi-select questions). */
  faltaronCorrectas: string[]
  /** Options the user wrongly picked (relevant for multi-select questions). */
  elegidasMal: string[]
}

export type ResultadoExamen = {
  total: number
  correctas: number
  preguntas: ResultadoPregunta[]
}

// ────────────────────────────────────────────────────────────────────────
// Pure scoring
// ────────────────────────────────────────────────────────────────────────

/**
 * Simple question: pick exactly the ONE correct option. Any extras → wrong.
 * Multiple-2 question: pick exactly TWO of five. Missing or extra → wrong.
 * Order doesn't matter.
 */
function aciertoTotal(p: Pregunta, elegidas: string[]): boolean {
  if (elegidas.length !== p.correctas.length) return false
  const setCorrectas = new Set(p.correctas)
  return elegidas.every((e) => setCorrectas.has(e))
}

export function evaluarPregunta(p: Pregunta, elegidas: string[]): ResultadoPregunta {
  const setElegidas = new Set(elegidas)
  const setCorrectas = new Set(p.correctas)
  const correcta = aciertoTotal(p, elegidas)

  const porOpcion: ResultadoPregunta['porOpcion'] = {}
  for (const o of p.opciones) {
    const fueElegida = setElegidas.has(o.id)
    const esCorrecta = setCorrectas.has(o.id)
    if (fueElegida && esCorrecta) porOpcion[o.id] = 'acertada'
    else if (fueElegida && !esCorrecta) porOpcion[o.id] = 'errada'
    else if (!fueElegida && esCorrecta) porOpcion[o.id] = 'no-elegida-correcta'
    else porOpcion[o.id] = 'no-elegida-incorrecta'
  }

  return {
    pregunta: p,
    elegidas,
    correcta,
    porOpcion,
    faltaronCorrectas: p.correctas.filter((c) => !setElegidas.has(c)),
    elegidasMal: elegidas.filter((e) => !setCorrectas.has(e)),
  }
}

export function evaluarExamen(preguntas: Pregunta[], respuestas: Respuesta[]): ResultadoExamen {
  const mapa = new Map(respuestas.map((r) => [r.preguntaId, r.elegidas]))
  const evaluados = preguntas.map((p) => evaluarPregunta(p, mapa.get(p.id) ?? []))
  return {
    total: preguntas.length,
    correctas: evaluados.filter((r) => r.correcta).length,
    preguntas: evaluados,
  }
}

// ────────────────────────────────────────────────────────────────────────
// Bank
// ────────────────────────────────────────────────────────────────────────

export const BANCO_PREGUNTAS: Pregunta[] = [
  {
    id: 'P1',
    tema: 'Well-Architected — Excelencia Operativa',
    tipo: 'multiple-2',
    enunciado:
      '¿Qué acciones son coherentes con el pilar de excelencia operativa del Marco de AWS Well-Architected?',
    opciones: [
      { id: 'P1-A', letra: 'A', texto: 'Asegurar que el personal de operaciones documente los cambios en la infraestructura.' },
      { id: 'P1-B', letra: 'B', texto: 'Aplicar principios y metodología de ingeniería de software a la infraestructura como código.' },
      { id: 'P1-C', letra: 'C', texto: 'Evaluar las estructuras organizacionales y los roles para identificar las brechas de habilidades.' },
      { id: 'P1-D', letra: 'D', texto: 'Revisar y mejorar los procesos y procedimientos en un ciclo continuo.' },
      { id: 'P1-E', letra: 'E', texto: 'Planificar y administrar el ciclo de vida completo de los activos de hardware.' },
    ],
    correctas: ['P1-B', 'P1-D'],
    justificaciones: {
      'P1-A':
        'Trampa clásica. El framework valora la documentación, pero el principio real es anotarla de forma automatizada como parte del código y del pipeline. "Que el personal documente" describe el enfoque manual que este pilar busca reemplazar.',
      'P1-B':
        'Correcta — corresponde al principio "realizar las operaciones como código", uno de los cinco principios de diseño del pilar.',
      'P1-C':
        'Aparece en el área de Organización del pilar, pero no es uno de los cinco principios de diseño. En una pregunta de "seleccione DOS", B y D son más fuertes.',
      'P1-D':
        'Correcta — corresponde al principio "perfeccionar los procedimientos de operación con frecuencia".',
      'P1-E':
        'Descartable de entrada: en la nube el hardware es responsabilidad de AWS. Cualquier opción sobre gestionar hardware físico es incorrecta por definición.',
    },
    regla:
      'Si la pregunta es de Excelencia Operativa, busca opciones sobre automatización, código, iteración y aprendizaje de fallos. Si una opción menciona hardware físico, cifrado o disponibilidad, pertenece a otro pilar.',
  },
  {
    id: 'P2',
    tema: 'Arquitectura desacoplada / ELB',
    tipo: 'simple',
    enunciado:
      'Una aplicación requiere un nivel web frontend de varios servidores que se comunican con un nivel de aplicación backend de varios servidores. ¿Qué diseño se ajusta más a las prácticas recomendadas de AWS?',
    opciones: [
      { id: 'P2-A', letra: 'A', texto: 'Asignar un servidor de aplicaciones dedicado y una conexión dedicada a cada servidor web.' },
      { id: 'P2-B', letra: 'B', texto: 'Crear una red de malla completa entre los niveles web y de aplicaciones.' },
      { id: 'P2-C', letra: 'C', texto: 'Crear varias instancias que combinen frontend web y backend en la misma instancia.' },
      { id: 'P2-D', letra: 'D', texto: 'Diseñar el nivel web para que se comunique con el nivel de aplicación a través de Elastic Load Balancing.' },
    ],
    correctas: ['P2-D'],
    justificaciones: {
      'P2-A':
        'Acoplamiento rígido 1:1. Si cae un backend su frontend queda inútil, y no se pueden escalar los niveles de forma independiente, que es la ventaja de separarlos.',
      'P2-B':
        'Con N servidores web y M de aplicación hay N×M conexiones que mantener. Cada vez que Auto Scaling añade o quita una instancia hay que reconfigurar todo. Contradice la elasticidad.',
      'P2-C':
        'Monolito. Obliga a escalar ambas capas juntas aunque solo una esté saturada, e impide aplicar Security Groups distintos a cada nivel.',
      'P2-D':
        'Correcta — principio de desacoplamiento (loose coupling). El nivel web no conoce las IPs ni la cantidad de servidores del backend: habla con un endpoint estable y el balanceador reparte el tráfico y saca de rotación las instancias que fallan. Implementación concreta: ALB interno en las subredes privadas.',
    },
    regla:
      'Cuando la opción correcta implica poner algo en medio para que las capas no se conozcan entre sí, esa suele ser la respuesta. ELB para tráfico síncrono, SQS/SNS para asíncrono. Las opciones con conexiones directas, fijas o punto a punto casi siempre son incorrectas.',
  },
  {
    id: 'P3',
    tema: 'Optimización de costos / migración',
    tipo: 'simple',
    enunciado:
      'Una empresa evalúa migrar su centro de datos on-premise a la nube. El motivo principal es aumentar la rentabilidad. ¿Qué enfoque se ajusta más a las prácticas recomendadas?',
    opciones: [
      { id: 'P3-A', letra: 'A', texto: 'Replicar su centro de datos en las instalaciones en la nube.' },
      { id: 'P3-B', letra: 'B', texto: 'Aprovisionar los servidores que sean necesarios y detener los servicios cuando no se utilicen.' },
      { id: 'P3-C', letra: 'C', texto: 'Aprovisionar algunos servidores en la nube y garantizar que funcionen de forma ininterrumpida.' },
      { id: 'P3-D', letra: 'D', texto: 'Conservar el centro de datos en las instalaciones el mayor tiempo posible.' },
    ],
    correctas: ['P3-B'],
    justificaciones: {
      'P3-A':
        'Lift and shift sin optimizar. Migra el mismo sobredimensionamiento que había on-premise, donde se compraba hardware para el pico anual y quedaba ocioso el resto del año. Funciona, pero no ahorra; a veces sale más caro.',
      'P3-B':
        'Correcta — describe el cambio de CAPEX a OPEX y el pago por uso. Dato concreto: apagar entornos de desarrollo fuera del horario laboral (8-18 entre semana en vez de 24/7) recorta el gasto de esas instancias alrededor de un 70%.',
      'P3-C':
        'Lo contrario de la elasticidad. Renuncia voluntariamente a la principal palanca de ahorro.',
      'P3-D':
        'No responde a la pregunta, que es sobre cómo migrar.',
    },
    regla:
      'Si la pregunta menciona costos, la respuesta correcta casi siempre habla de pagar solo por lo que se usa, escalar según demanda o apagar recursos ociosos. Capacidad fija, hardware permanente o replicar lo existente son distractores.',
  },
  {
    id: 'P4',
    tema: 'S3 + CloudFront',
    tipo: 'simple',
    enunciado:
      'Una empresa almacena datos de solo lectura en Amazon S3. La mayoría de usuarios está en el mismo país que la sede. Algunos usuarios están en todo el mundo. ¿Qué decisión de diseño se ajusta más a las prácticas recomendadas?',
    opciones: [
      { id: 'P4-A', letra: 'A', texto: 'Utilizar un bucket en la región más cercana a la sede.' },
      { id: 'P4-B', letra: 'B', texto: 'Replicar objetos en buckets de regiones de todo el mundo; cada usuario accede al más cercano.' },
      { id: 'P4-C', letra: 'C', texto: 'Utilizar un bucket en la región más cercana a la sede y que todos los usuarios accedan vía CloudFront.' },
      { id: 'P4-D', letra: 'D', texto: 'Utilizar un bucket en la región con la latencia media más baja para todos los usuarios.' },
    ],
    correctas: ['P4-C'],
    justificaciones: {
      'P4-A':
        'Funciona para la mayoría pero deja a los usuarios internacionales con latencia alta. No hay razón para no mejorarlo.',
      'P4-B':
        'Trampa "más regiones = mejor". Multiplica costo de almacenamiento, añade cargos de replicación entre regiones y complica consistencia y enrutamiento, todo para servir a unos pocos usuarios. Replicar tiene sentido para cumplimiento normativo o disaster recovery, NO para reducir latencia de lectura.',
      'P4-C':
        'Correcta — tres señales en el enunciado: datos de SOLO LECTURA, mayoría concentrada en un país, minoría dispersa. CloudFront cachea en cientos de edge locations. Beneficio adicional de costo: la transferencia del bucket hacia CloudFront no se cobra, las salidas por CloudFront son más baratas que por S3 directo, y el cacheo reduce las peticiones al origen.',
      'P4-D':
        'Optimizar el promedio empeora la experiencia de la mayoría. Poner el bucket "en el medio" perjudica a los usuarios locales, que son la mayor parte del tráfico. La media es engañosa aquí.',
    },
    regla:
      'Contenido estático o de solo lectura con audiencia dispersa → CloudFront. Contenido dinámico con enrutamiento a distintos endpoints → Route 53 (latency routing) o Global Accelerator. Replicación entre regiones solo es correcta si el enunciado menciona disaster recovery, residencia de datos o requisitos legales.',
  },
  {
    id: 'P5',
    tema: 'S3 / acceso temporal',
    tipo: 'simple',
    enunciado:
      'Un consultor debe acceder a un objeto de gran tamaño en un bucket de S3. Necesitará un día para acceder al archivo. ¿Qué método de concesión de acceso se ajusta más a las prácticas recomendadas?',
    opciones: [
      { id: 'P5-A', letra: 'A', texto: 'Habilitar el acceso público al bucket y entregar la URL del objeto.' },
      { id: 'P5-B', letra: 'B', texto: 'Crear una cuenta de usuario para el consultor y otorgarle permisos sobre el bucket vía consola.' },
      { id: 'P5-C', letra: 'C', texto: 'Copiar el objeto a un nuevo bucket, habilitar acceso público y entregar esa URL.' },
      { id: 'P5-D', letra: 'D', texto: 'Crear una URL prefirmada para el objeto que caduque en 24 horas y entregarla al consultor.' },
    ],
    correctas: ['P5-D'],
    justificaciones: {
      'P5-A':
        'Expone el objeto a cualquiera que tenga o adivine la URL, sin expiración ni registro de quién descargó.',
      'P5-B':
        'Es el distractor fuerte, técnicamente seguro pero desproporcionado. Implica gestionar credenciales, políticas y sobre todo acordarse de eliminar el usuario después. El acceso no expira solo: si nadie limpia, el usuario conserva permisos indefinidamente (problema clásico de cuentas huérfanas de contratistas).',
      'P5-C':
        'Todo lo malo de A, más duplicar un archivo grande con su costo de almacenamiento, y dejar un bucket público olvidado. Los buckets públicos mal configurados son causa frecuente de filtraciones.',
      'P5-D':
        'Correcta — dos señales: acceso TEMPORAL ("un día") y UN SOLO OBJETO. Una presigned URL da acceso a un objeto específico por un tiempo definido, caduca sola, no requiere que el consultor tenga cuenta de AWS, y el bucket permanece privado.',
    },
    regla:
      'Cualquier opción que diga "habilitar acceso público" es casi siempre incorrecta, salvo que el enunciado hable de un sitio web estático o contenido destinado a ser público. Matiz: acceso puntual y temporal → presigned URL. Acceso recurrente, a varios recursos o por meses → rol IAM o identidad federada.',
  },
  {
    id: 'P6',
    tema: 'Elección de REGIÓN',
    tipo: 'multiple-2',
    enunciado: '¿Cuáles son las principales consideraciones que influyen en la elección de las regiones de AWS a utilizar?',
    opciones: [
      { id: 'P6-A', letra: 'A', texto: 'Control de acceso y seguridad' },
      { id: 'P6-B', letra: 'B', texto: 'Cumplimiento de las leyes y reglamentos' },
      { id: 'P6-C', letra: 'C', texto: 'Resiliencia de las aplicaciones en caso de errores del sistema' },
      { id: 'P6-D', letra: 'D', texto: 'Reducción de la latencia para los usuarios finales' },
      { id: 'P6-E', letra: 'E', texto: 'Protección contra desastres naturales localizados' },
    ],
    correctas: ['P6-B', 'P6-D'],
    justificaciones: {
      'P6-A':
        'IAM, Security Groups y KMS funcionan igual en cualquier región; IAM es global. No se elige Virginia sobre São Paulo porque una sea "más segura". La seguridad es un requisito transversal, no un criterio geográfico. No confundir con B: el cumplimiento SÍ es geográfico porque la residencia de datos obliga a mantener la información dentro de una jurisdicción (GDPR, Ley 1581 en Colombia).',
      'P6-B':
        'Correcta — los cuatro criterios de elección de región son: cumplimiento normativo, latencia hacia los usuarios, disponibilidad del servicio y precio.',
      'P6-C':
        'Se resuelve DENTRO de una región, distribuyendo en varias AZ. Es la decisión que se toma después de elegir región.',
      'P6-D':
        'Correcta — criterio de elección de región. Distancia física al usuario afecta latencia.',
      'P6-E':
        'Las AZ tienen energía, refrigeración y red independientes; para eso existen. Esto se decide después de elegir región, eligiendo AZ dentro de ella.',
    },
    regla:
      'Cumplimiento y latencia son criterios de REGIÓN. Resiliencia y desastres localizados son criterios de AZ (P7). Seguridad, control de acceso y cifrado NO son criterios geográficos: IAM es global.',
  },
  {
    id: 'P7',
    tema: 'Elección de ZONA DE DISPONIBILIDAD',
    tipo: 'multiple-2',
    enunciado: '¿Cuáles son las principales consideraciones que influyen en la elección de las zonas de disponibilidad a utilizar?',
    opciones: [
      { id: 'P7-A', letra: 'A', texto: 'Protección contra desastres naturales localizados' },
      { id: 'P7-B', letra: 'B', texto: 'Resiliencia de las aplicaciones en caso de errores del sistema' },
      { id: 'P7-C', letra: 'C', texto: 'Reducción de la latencia para los usuarios finales' },
      { id: 'P7-D', letra: 'D', texto: 'Cumplimiento de las leyes y reglamentos' },
      { id: 'P7-E', letra: 'E', texto: 'Control de acceso y seguridad' },
    ],
    correctas: ['P7-A', 'P7-B'],
    justificaciones: {
      'P7-A':
        'Correcta — las AZ están separadas por kilómetros con infraestructura independiente. Un incendio, inundación o corte eléctrico en una no alcanza a las otras.',
      'P7-B':
        'Correcta — desplegar en al menos dos AZ es el requisito básico de alta disponibilidad.',
      'P7-C':
        'Criterio de región. La latencia entre AZ de una misma región es de milisegundos, imperceptible para el usuario final.',
      'P7-D':
        'Criterio de región. El marco legal es el mismo dentro de una región.',
      'P7-E':
        'Mismo razonamiento que en P6: IAM, Security Groups y KMS funcionan idénticamente en todas las AZ. La seguridad nunca es criterio geográfico.',
    },
    regla:
      'P6 y P7 son pares deliberados con la misma lista. Las correctas de una son las descartadas de la otra. "Control de acceso y seguridad" es distractor compartido.',
  },
  // ── Elasticidad (Auto Scaling, Target Groups, CloudWatch) ─────────────
  {
    id: 'P8',
    tema: 'Elasticidad — Escalado vertical vs. horizontal',
    tipo: 'simple',
    enunciado:
      'Una tienda en línea corre en una única instancia m5.large. En temporada alta la CPU llega al 95% y el sitio se vuelve lento; el resto del año está casi ociosa. El equipo quiere absorber los picos sin pagar capacidad ociosa y sin que la caída de un servidor tumbe la tienda. ¿Qué enfoque se ajusta más a las prácticas recomendadas?',
    opciones: [
      { id: 'P8-A', letra: 'A', texto: 'Cambiar la instancia a un tipo más grande antes de cada temporada alta y volver al tamaño original después.' },
      { id: 'P8-B', letra: 'B', texto: 'Poner varias instancias detrás de un Application Load Balancer en un Auto Scaling Group que agregue o quite instancias según la demanda.' },
      { id: 'P8-C', letra: 'C', texto: 'Migrar permanentemente a la instancia más grande de la familia para no tener que volver a preocuparse por los picos.' },
      { id: 'P8-D', letra: 'D', texto: 'Mantener la instancia actual y activar Detailed Monitoring para detectar antes los picos.' },
    ],
    correctas: ['P8-B'],
    justificaciones: {
      'P8-A':
        'Es escalado vertical. Parece razonable porque sí agrega capacidad, pero cambiar el tipo exige detener la instancia (hay corte de servicio), depende de alguien que se acuerde de hacerlo y sigue siendo un punto único de fallo: si esa instancia cae, cae la tienda.',
      'P8-B':
        'Correcta — escalado horizontal y elástico. El ASG agrega instancias cuando sube la demanda y las retira cuando baja (no se paga capacidad ociosa), el balanceador reparte el tráfico, y si una instancia cae las demás siguen atendiendo mientras el grupo la reemplaza.',
      'P8-C':
        'Resuelve el pico comprando para el pico, que es exactamente el modelo de centro de datos tradicional. Paga capacidad ociosa once meses al año y sigue siendo un punto único de fallo. Además, el tipo más grande es un techo: el vertical tiene límite.',
      'P8-D':
        'Detailed Monitoring baja la resolución de las métricas a 1 minuto, pero medir mejor no agrega capacidad. Es parte de una solución de escalado, no una solución por sí sola.',
    },
    regla:
      'Si el enunciado pide absorber variaciones de demanda sin pagar capacidad ociosa, o tolerar la caída de un servidor, la respuesta es escalado horizontal (ASG + balanceador). El vertical tiene techo, requiere detener la instancia y no elimina el punto único de fallo.',
  },
  {
    id: 'P9',
    tema: 'Elasticidad — Verificación de salud EC2 vs. ELB',
    tipo: 'simple',
    enunciado:
      'Un Auto Scaling Group detrás de un Application Load Balancer usa la verificación de salud por defecto. El proceso del servidor web de una instancia se cae, pero la instancia sigue encendida. El balanceador deja de enviarle tráfico, pero la instancia nunca se reemplaza. ¿Qué cambio resuelve el problema?',
    opciones: [
      { id: 'P9-A', letra: 'A', texto: 'Cambiar el tipo de verificación de salud del Auto Scaling Group de EC2 a ELB.' },
      { id: 'P9-B', letra: 'B', texto: 'Reducir el intervalo de los health checks del Target Group de 30 a 5 segundos.' },
      { id: 'P9-C', letra: 'C', texto: 'Aumentar la capacidad mínima del grupo para que haya más instancias disponibles.' },
      { id: 'P9-D', letra: 'D', texto: 'Crear una alarma de CloudWatch sobre StatusCheckFailed que notifique al equipo por correo.' },
    ],
    correctas: ['P9-A'],
    justificaciones: {
      'P9-A':
        'Correcta — la verificación por defecto (EC2) solo comprueba que la instancia esté running y pase los status checks, así que una instancia encendida con la aplicación caída cuenta como sana. Con el tipo ELB, el ASG además tiene en cuenta los health checks del Target Group: si la aplicación no responde, la termina y lanza otra.',
      'P9-B':
        'Tienta porque apunta a los health checks, pero el Target Group ya detectó el problema (por eso dejó de enviarle tráfico). Detectar más rápido no sirve si el ASG no usa ese resultado para decidir reemplazos.',
      'P9-C':
        'Disimula el síntoma: hay más instancias sanas repartiendo la carga, pero la instancia rota sigue ocupando un lugar del grupo sin trabajar. El problema de fondo sigue intacto.',
      'P9-D':
        'StatusCheckFailed mide la salud de la instancia y del host, no la de la aplicación: con el servidor web caído probablemente siga en 0. Y aunque disparara, notificar a una persona es reacción manual, lo contrario de la autorreparación.',
    },
    regla:
      'Con balanceador delante, la verificación de salud del ASG debe ser ELB. EC2 solo sabe si la máquina está encendida; ELB sabe si la aplicación responde. "Instancia encendida pero la app no responde y no se reemplaza" → cambiar a ELB.',
  },
  {
    id: 'P10',
    tema: 'Elasticidad — Estado local',
    tipo: 'simple',
    enunciado:
      'Una aplicación guarda las sesiones de los usuarios en la memoria de cada instancia. Al activar un Auto Scaling Group detrás de un balanceador, los usuarios reportan que el sistema les pide iniciar sesión de nuevo varias veces por hora. ¿Qué solución se ajusta más a las prácticas recomendadas?',
    opciones: [
      { id: 'P10-A', letra: 'A', texto: 'Activar sticky sessions en el balanceador para que cada usuario vuelva siempre a la misma instancia.' },
      { id: 'P10-B', letra: 'B', texto: 'Mover el almacenamiento de sesiones fuera de las instancias, a un servicio compartido como ElastiCache o DynamoDB.' },
      { id: 'P10-C', letra: 'C', texto: 'Fijar la capacidad mínima, deseada y máxima en el mismo valor para que el grupo no cambie de tamaño.' },
      { id: 'P10-D', letra: 'D', texto: 'Usar una instancia más grande con más memoria para que las sesiones no se pierdan.' },
    ],
    correctas: ['P10-B'],
    justificaciones: {
      'P10-A':
        'Es el distractor fuerte: reduce el síntoma y es una función real del balanceador. Pero cuando el scale in termina esa instancia (o falla), las sesiones que vivían ahí se pierden igual, y la carga queda mal repartida porque los usuarios quedan atados a instancias concretas.',
      'P10-B':
        'Correcta — el escalado horizontal supone que cualquier instancia puede atender cualquier petición. Con las sesiones en un almacén compartido, da igual a qué instancia llegue el usuario o cuál se termine: las instancias pasan a ser intercambiables (ganado, no mascotas).',
      'P10-C':
        'Renuncia a la elasticidad para esconder el problema. Y ni siquiera lo esconde: el balanceador sigue repartiendo peticiones entre instancias, así que el usuario sigue cayendo en instancias que no tienen su sesión.',
      'P10-D':
        'Vuelve al escalado vertical. El problema no es cuánta memoria hay, sino que la memoria de una instancia no la ven las demás.',
    },
    regla:
      'Si una aplicación "pierde" usuarios, archivos o sesiones al escalar, el problema es estado local. La solución es sacar el estado de la instancia (ElastiCache, DynamoDB, S3, RDS). Sticky sessions disimulan el síntoma, no lo resuelven.',
  },
  {
    id: 'P11',
    tema: 'Elasticidad — Elección de política de escalado',
    tipo: 'multiple-2',
    enunciado: '¿Qué DOS combinaciones de patrón de carga y política de escalado son adecuadas?',
    opciones: [
      { id: 'P11-A', letra: 'A', texto: 'Una aplicación interna que se usa solo de lunes a viernes de 8 a 18 → escalado programado (scheduled).' },
      { id: 'P11-B', letra: 'B', texto: 'Una carga variable sin patrón conocido donde se quiere mantener la CPU promedio alrededor del 60% → simple scaling.' },
      { id: 'P11-C', letra: 'C', texto: 'Una carga variable sin patrón conocido donde se quiere mantener la CPU promedio alrededor del 60% → target tracking.' },
      { id: 'P11-D', letra: 'D', texto: 'Un pico repentino e impredecible causado por una noticia viral → escalado predictivo.' },
      { id: 'P11-E', letra: 'E', texto: 'Una carga estable que no cambia nunca → step scaling con varios escalones.' },
    ],
    correctas: ['P11-A', 'P11-C'],
    justificaciones: {
      'P11-A':
        'Correcta — el patrón se conoce de antemano. Programar el escalado permite tener la capacidad lista antes de las 8, en lugar de reaccionar con minutos de retraso cuando todos llegan a la vez.',
      'P11-B':
        'El objetivo es correcto, pero la política no: simple scaling hace un único ajuste por alarma y espera un cooldown; es la política heredada. Mantener una métrica en un valor objetivo es exactamente lo que hace target tracking.',
      'P11-C':
        'Correcta — target tracking es la opción por defecto: defines la métrica y el objetivo, y AWS calcula cuántas instancias hacen falta para volver a él, sin que tengas que definir umbrales ni cantidades.',
      'P11-D':
        'Predictive aprende de patrones históricos. Un pico viral no tiene historia de la que aprender: ahí se reacciona con target tracking o step scaling, y el margen del objetivo absorbe el golpe mientras llegan las instancias.',
      'P11-E':
        'Si la carga no cambia, no hay nada que escalar: un grupo de tamaño fijo (mínimo = deseada = máximo) alcanza para autorrepararse. Los escalones de step scaling sirven para reaccionar distinto según la magnitud de un pico.',
    },
    regla:
      'Patrón conocido de calendario → scheduled. Estacionalidad con historia → predictive. Variable sin patrón, mantener una métrica → target tracking (la opción por defecto). Reacción más fuerte ante picos mayores → step scaling. Simple scaling es heredada: casi nunca es la respuesta.',
  },
  {
    id: 'P12',
    tema: 'Elasticidad — Grace period',
    tipo: 'simple',
    enunciado:
      'Un Auto Scaling Group con verificación de salud ELB entra en un ciclo: lanza instancias, las marca como no sanas y las termina, una y otra vez. La aplicación tarda unos 4 minutos en arrancar. ¿Cuál es la causa más probable?',
    opciones: [
      { id: 'P12-A', letra: 'A', texto: 'El máximo del grupo es demasiado bajo para la carga actual.' },
      { id: 'P12-B', letra: 'B', texto: 'El cooldown de la política de escalado es demasiado corto.' },
      { id: 'P12-C', letra: 'C', texto: 'El health check grace period es más corto que el tiempo de arranque de la aplicación.' },
      { id: 'P12-D', letra: 'D', texto: 'El deregistration delay del Target Group es demasiado largo.' },
    ],
    correctas: ['P12-C'],
    justificaciones: {
      'P12-A':
        'Un máximo bajo limita cuántas instancias hay, pero no hace que se marquen como no sanas. El síntoma sería saturación, no un ciclo de creación y destrucción.',
      'P12-B':
        'Es el distractor fuerte porque el cooldown también es un "tiempo de espera" tras lanzar instancias. Pero el cooldown evita acciones de escalado seguidas; no decide cuándo se evalúa la salud de una instancia nueva.',
      'P12-C':
        'Correcta — el grace period es el tiempo que el ASG espera tras lanzar una instancia antes de evaluar su salud. Si es menor que el arranque, la instancia falla el health check ELB porque todavía no terminó de iniciar; el ASG la termina y lanza otra, que corre la misma suerte.',
      'P12-D':
        'El deregistration delay actúa al retirar una instancia (espera a que terminen sus conexiones). Uno largo hace más lento el scale in, pero no marca instancias nuevas como no sanas.',
    },
    regla:
      'Ciclo de lanzar → no sana → terminar → lanzar, con verificación ELB, apunta al grace period. La regla: grace period mayor que el tiempo real de arranque de la aplicación, medido.',
  },
  {
    id: 'P13',
    tema: 'Elasticidad — Scale in conservador',
    tipo: 'simple',
    enunciado:
      '¿Por qué las políticas de escalado suelen reducir capacidad (scale in) de forma más conservadora de lo que la aumentan (scale out)?',
    opciones: [
      { id: 'P13-A', letra: 'A', texto: 'Porque AWS cobra una penalización por terminar instancias antes de completar su primera hora.' },
      { id: 'P13-B', letra: 'B', texto: 'Porque el costo de tener una instancia de más unos minutos es pequeño, mientras que quitar una de menos puede dejar el servicio sin capacidad cuando la carga vuelve.' },
      { id: 'P13-C', letra: 'C', texto: 'Porque terminar una instancia tarda más que lanzarla.' },
      { id: 'P13-D', letra: 'D', texto: 'Porque CloudWatch mide las métricas de bajada con menos frecuencia que las de subida.' },
    ],
    correctas: ['P13-B'],
    justificaciones: {
      'P13-A':
        'Suena plausible por los modelos de facturación antiguos, pero no es el motivo. Linux se factura por segundo (con mínimo de 60 s) y no hay penalización por terminar: el motivo es de riesgo, no de facturación.',
      'P13-B':
        'Correcta — la asimetría es de riesgo. Una instancia sobrante cuesta centavos durante unos minutos; una faltante puede tumbar el servicio, y volver a lanzarla tarda varios minutos. Por eso se exige que la métrica esté baja durante más tiempo antes de reducir, y por eso usar el mismo umbral para subir y bajar hace oscilar al grupo.',
      'P13-C':
        'El deregistration delay sí retrasa la salida de una instancia, pero eso es consecuencia de retirar con cuidado las conexiones en curso, no la razón por la que la política es conservadora.',
      'P13-D':
        'CloudWatch no distingue la dirección de la métrica: publica con la misma resolución (5 minutos, o 1 con Detailed Monitoring). Lo que cambia entre subir y bajar es cuánto tiempo exige la política, no la frecuencia de medición.',
    },
    regla:
      'Escalar hacia arriba rápido, hacia abajo despacio: sobrar cuesta poco, faltar cuesta el servicio. Umbrales iguales para subir y bajar → oscilación.',
  },
  // ── Entrega de contenido (CloudFront, HTTPS/ACM, S3) ──────────────────
  {
    id: 'P14',
    tema: 'Entrega de contenido — CloudFront vs. replicación entre regiones',
    tipo: 'simple',
    enunciado:
      'Una empresa sirve imágenes y videos de solo lectura desde un bucket en us-east-1. Empieza a crecer su audiencia en Sudamérica, Europa y Asia, que se queja de lentitud. No hay requisitos legales de residencia de datos. ¿Qué solución se ajusta más a las prácticas recomendadas?',
    opciones: [
      { id: 'P14-A', letra: 'A', texto: 'Configurar replicación entre regiones (CRR) hacia buckets en São Paulo, Fráncfort y Singapur, y dirigir a cada usuario al más cercano.' },
      { id: 'P14-B', letra: 'B', texto: 'Mantener el bucket en us-east-1 y poner delante una distribución de CloudFront.' },
      { id: 'P14-C', letra: 'C', texto: 'Mover el bucket a la región con la latencia promedio más baja para todos los usuarios.' },
      { id: 'P14-D', letra: 'D', texto: 'Cambiar los objetos a S3 Intelligent-Tiering para mejorar el rendimiento de acceso.' },
    ],
    correctas: ['P14-B'],
    justificaciones: {
      'P14-A':
        'Trampa "más regiones = mejor". Funciona, pero triplica el almacenamiento, suma cargos de transferencia entre regiones y obliga a resolver el enrutamiento. La replicación entre regiones es para disaster recovery, residencia de datos o cumplimiento, y el enunciado descarta explícitamente lo legal.',
      'P14-B':
        'Correcta — contenido de solo lectura con audiencia dispersa es el caso de libro de una CDN. CloudFront cachea en edge locations cercanas a cada usuario, la transferencia de S3 hacia CloudFront no se cobra y el caché reduce las peticiones al bucket.',
      'P14-C':
        'Optimiza el promedio a costa de todos: ningún usuario queda realmente cerca, y los que estaban bien servidos empeoran. Una sola ubicación no puede estar cerca de tres continentes.',
      'P14-D':
        'Intelligent-Tiering optimiza costo de almacenamiento según el patrón de acceso, no latencia. El objeto sigue en us-east-1, igual de lejos.',
    },
    regla:
      'Lectura con audiencia dispersa → CloudFront. Replicación entre regiones solo si el enunciado menciona disaster recovery, residencia de datos o requisitos legales. Las clases de almacenamiento cambian costo, no distancia.',
  },
  {
    id: 'P15',
    tema: 'Entrega de contenido — Bucket privado con OAC',
    tipo: 'simple',
    enunciado:
      'Un equipo sirve un sitio estático desde S3 a través de CloudFront. Para que CloudFront pudiera leer los archivos, desactivaron Block Public Access y agregaron una política de bucket que permite s3:GetObject a cualquiera ("Principal": "*"). ¿Cuál es el problema principal y cómo se corrige?',
    opciones: [
      { id: 'P15-A', letra: 'A', texto: 'No hay problema: el contenido de un sitio web es público de todas formas.' },
      { id: 'P15-B', letra: 'B', texto: 'Cualquiera puede acceder al bucket saltándose CloudFront. Se corrige dejando el bucket privado y usando Origin Access Control (OAC) con una política que solo acepte peticiones de esa distribución.' },
      { id: 'P15-C', letra: 'C', texto: 'El problema es el costo: se corrige activando el versionado del bucket.' },
      { id: 'P15-D', letra: 'D', texto: 'Cualquiera puede acceder al bucket. Se corrige creando un usuario de IAM para CloudFront y guardando sus claves de acceso en la distribución.' },
    ],
    correctas: ['P15-B'],
    justificaciones: {
      'P15-A':
        'Es el distractor fuerte: el contenido sí es público. Pero que se pueda leer no significa que deba leerse desde el origen. Con el bucket público, cualquiera se salta la CDN: se pierde el caché, el control (geo restriction, WAF, signed URLs) y las métricas, y el origen queda expuesto a tráfico directo.',
      'P15-B':
        'Correcta — con OAC, CloudFront firma cada petición al origen y la política de bucket solo acepta las firmadas por esa distribución concreta. El bucket queda completamente privado, con Block Public Access activado, y la única puerta de entrada es la CDN.',
      'P15-C':
        'El versionado protege contra sobrescritura y borrado accidentales; no tiene relación con quién puede leer el bucket. Y además aumenta el costo, no lo reduce.',
      'P15-D':
        'Identifica bien el problema pero propone la peor corrección: credenciales de larga duración guardadas en una configuración. CloudFront no usa claves de acceso para leer S3; para eso existe OAC.',
    },
    regla:
      'Un bucket casi nunca necesita ser público. Si la opción dice "hacer público el bucket para que CloudFront lo lea", es incorrecta: la respuesta es bucket privado + OAC. OAC reemplaza a OAI, el mecanismo anterior.',
  },
  {
    id: 'P16',
    tema: 'Entrega de contenido — Región del certificado ACM',
    tipo: 'simple',
    enunciado:
      'Una empresa tiene toda su infraestructura en sa-east-1 (São Paulo). Solicitó en ACM, en sa-east-1, un certificado para www.miapp.com y quiere usarlo en su distribución de CloudFront, pero el certificado no aparece en la lista para seleccionar. ¿Qué debe hacer?',
    opciones: [
      { id: 'P16-A', letra: 'A', texto: 'Esperar a que el certificado se propague a todas las regiones, lo que puede tardar hasta 24 horas.' },
      { id: 'P16-B', letra: 'B', texto: 'Solicitar el certificado en ACM en la región us-east-1 (Norte de Virginia).' },
      { id: 'P16-C', letra: 'C', texto: 'Exportar el certificado de ACM y subirlo manualmente a CloudFront.' },
      { id: 'P16-D', letra: 'D', texto: 'Mover la distribución de CloudFront a la región sa-east-1.' },
    ],
    correctas: ['P16-B'],
    justificaciones: {
      'P16-A':
        'No hay propagación automática de certificados entre regiones: un certificado de ACM existe en la región donde se solicitó. Esperar no cambia nada.',
      'P16-B':
        'Correcta — CloudFront solo puede usar certificados de ACM solicitados en us-east-1, sin importar dónde esté el resto de la infraestructura. Para un ALB en São Paulo, en cambio, el certificado sí va en sa-east-1: si hay ambos, hacen falta dos certificados.',
      'P16-C':
        'Suena a atajo, pero no ataca la causa: el problema es la región, no el formato. Un certificado estándar de ACM no se exporta (AWS gestiona la clave privada), y aunque existiera una vía para hacerlo (*por verificar*: ACM incorporó certificados públicos exportables con costo), se pierde la renovación automática integrada. Pedirlo en us-east-1 es gratis y se renueva solo.',
      'P16-D':
        'CloudFront es un servicio global: una distribución no pertenece a una región, así que no hay nada que "mover". Es la razón por la que toma sus certificados de una región fija.',
    },
    regla:
      'Certificado para CloudFront → siempre us-east-1. Certificado para ALB → la región del balanceador. Si el enunciado dice que "el certificado no aparece" en CloudFront, la respuesta es la región.',
  },
  {
    id: 'P17',
    tema: 'Entrega de contenido — Cobertura de un certificado wildcard',
    tipo: 'multiple-2',
    enunciado: 'Una distribución usa un certificado que declara únicamente *.miapp.com. ¿Qué DOS nombres NO quedan cubiertos por ese certificado?',
    opciones: [
      { id: 'P17-A', letra: 'A', texto: 'www.miapp.com' },
      { id: 'P17-B', letra: 'B', texto: 'miapp.com' },
      { id: 'P17-C', letra: 'C', texto: 'cdn.miapp.com' },
      { id: 'P17-D', letra: 'D', texto: 'api.v2.miapp.com' },
      { id: 'P17-E', letra: 'E', texto: 'tienda.miapp.com' },
    ],
    correctas: ['P17-B', 'P17-D'],
    justificaciones: {
      'P17-A':
        'Cubierto: www es un subdominio de un solo nivel, exactamente lo que reemplaza el asterisco.',
      'P17-B':
        'Correcta (no cubierto) — el dominio raíz no tiene ninguna etiqueta en la posición del asterisco. Es el error más común: por eso lo habitual es un certificado que declare miapp.com y *.miapp.com juntos.',
      'P17-C':
        'Cubierto: un nivel de subdominio.',
      'P17-D':
        'Correcta (no cubierto) — son dos niveles (api y v2). El asterisco reemplaza exactamente una etiqueta. Haría falta declarar api.v2.miapp.com o *.v2.miapp.com.',
      'P17-E':
        'Cubierto: un nivel de subdominio. Es un distractor para quien crea que el wildcard solo cubre los subdominios "conocidos" al emitirlo; cubre cualquiera de un nivel, incluso los creados después.',
    },
    regla:
      '*.dominio.com cubre exactamente un nivel de subdominio. No cubre el dominio raíz ni dos niveles. Para cubrir raíz y subdominios, el certificado declara ambos nombres.',
  },
  {
    id: 'P18',
    tema: 'Entrega de contenido — Clase de almacenamiento según patrón de acceso',
    tipo: 'simple',
    enunciado:
      'Un hospital debe conservar imágenes de estudios médicos durante años. Casi nunca se consultan, pero cuando un médico pide una, debe verla en el momento, sin esperas de minutos u horas. ¿Qué clase de almacenamiento de S3 es la más adecuada?',
    opciones: [
      { id: 'P18-A', letra: 'A', texto: 'S3 Standard' },
      { id: 'P18-B', letra: 'B', texto: 'S3 Glacier Deep Archive' },
      { id: 'P18-C', letra: 'C', texto: 'S3 Glacier Instant Retrieval' },
      { id: 'P18-D', letra: 'D', texto: 'S3 One Zone-IA' },
    ],
    correctas: ['P18-C'],
    justificaciones: {
      'P18-A':
        'Cumple el requisito de acceso inmediato, pero es la clase pensada para acceso frecuente: pagar su almacenamiento durante años por datos que casi nunca se leen es sobrecosto.',
      'P18-B':
        'Es la más barata para guardar y tienta por "conservar durante años". Pero la recuperación tarda horas, lo que viola el requisito explícito de verla en el momento.',
      'P18-C':
        'Correcta — dos señales: acceso RARO y recuperación INMEDIATA. Glacier Instant Retrieval tiene almacenamiento de costo de archivo con recuperación en milisegundos. El costo por recuperar es más alto, pero es aceptable porque casi nunca se recupera.',
      'P18-D':
        'Recuperación inmediata y más barata que Standard, pero guarda los datos en una sola AZ: si esa zona se pierde, se pierden las imágenes. Solo sirve para datos que se pueden regenerar, y un estudio médico no lo es.',
    },
    regla:
      'Leer dos señales: cada cuánto se accede y cuán rápido debe llegar. Frecuente → Standard. Desconocido → Intelligent-Tiering. Raro pero inmediato → Glacier Instant Retrieval. Raro y puede esperar → Glacier Flexible o Deep Archive. One Zone-IA solo para datos reproducibles.',
  },
  {
    id: 'P19',
    tema: 'Entrega de contenido — Alcance del versionado de S3',
    tipo: 'multiple-2',
    enunciado: 'Un bucket tiene el versionado habilitado. ¿Contra qué DOS situaciones protege el versionado por sí solo?',
    opciones: [
      { id: 'P19-A', letra: 'A', texto: 'Un usuario sobrescribe por error un archivo de configuración con una versión defectuosa.' },
      { id: 'P19-B', letra: 'B', texto: 'La pérdida completa de la región donde está el bucket.' },
      { id: 'P19-C', letra: 'C', texto: 'Un usuario borra por error un objeto desde la consola sin indicar una versión concreta.' },
      { id: 'P19-D', letra: 'D', texto: 'El crecimiento de la factura de almacenamiento por guardar muchas copias.' },
      { id: 'P19-E', letra: 'E', texto: 'Un atacante con permisos para borrar versiones elimina todas las versiones de los objetos.' },
    ],
    correctas: ['P19-A', 'P19-C'],
    justificaciones: {
      'P19-A':
        'Correcta — cada escritura crea una versión nueva; la anterior sigue ahí y se puede restaurar.',
      'P19-B':
        'Todas las versiones viven en el mismo bucket, en la misma región. Contra la pérdida de una región protege la replicación entre regiones (CRR), no el versionado.',
      'P19-C':
        'Correcta — un borrado sin versión no elimina el objeto: S3 coloca un delete marker que lo oculta. Quitando el marcador, el objeto vuelve.',
      'P19-D':
        'Al revés: el versionado aumenta la factura, porque cada versión se cobra por separado. Lo que la controla son las reglas de ciclo de vida sobre las versiones anteriores.',
      'P19-E':
        'Tienta porque "el versionado protege contra borrados". Pero borrar una versión concreta la elimina de forma permanente: quien tiene ese permiso puede borrar el historial. Para blindarlo hacen falta controles adicionales (MFA Delete, Object Lock) y permisos de mínimo privilegio.',
    },
    regla:
      'Versionado: protege contra sobrescritura y borrado accidentales. No protege contra la pérdida de la región (eso es CRR), no baja costos (los sube: combinarlo con ciclo de vida) y no detiene a quien puede borrar versiones. La durabilidad de once nueves protege contra pérdida técnica, no contra borrados.',
  },
]

/**
 * Shuffle with deterministic-ish order without mutating the source array.
 * Uses Mulberry32 so a test can pin a seed and verify the deck.
 */
export function barajarPreguntas(preguntas: Pregunta[], seed: number): Pregunta[] {
  const rng = mulberry32(seed >>> 0)
  const copia = [...preguntas]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
