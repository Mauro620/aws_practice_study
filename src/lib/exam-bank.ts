/**
 * Practice exam engine for the AWS study app.
 *
 * Question bank is taken verbatim from 03-banco-preguntas-...md
 * (Well-Architected, ELB, costos, S3+CloudFront, presigned URLs,
 * elección de región, elección de AZ). Each question carries the
 * full source rationale for every distractor so we can show it as
 * feedback.
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
