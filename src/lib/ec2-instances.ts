/**
 * EC2 instance-type decoder + family reference for the AWS study app.
 *
 * Decoder is built from the schema in 02-ec2-elastic-compute-cloud.md
 * (section 2.1 — "Cómo leer el nombre"). It is intentionally a *decoder*,
 * not a catalog: the source documents the naming convention and the
 * family table, but does not list a per-instance catalog of vCPU/RAM/
 * network/storage. Adding those would mean inventing values not in the
 * course material.
 *
 * Family table (categoría/perfil/casos de uso/ejemplos) is taken from
 * the markdown table in section 2.2 of the same file.
 */

export type TipoInstanciaParseado = {
  familia: string
  generacion: number
  procesador: string | null
  atributos: string[]
  tamano: string
  raw: string
}

// Uppercase throughout: parsearTipoInstancia always uppercases the matched
// family, so comparisons here must be against the same case (INF, not Inf).
const FAMILIAS_VALIDAS = ['T', 'M', 'C', 'R', 'X', 'I', 'D', 'H', 'P', 'G', 'INF', 'TRN']
const PROCESADORES_VALIDOS = ['a', 'g', 'i']
const ATRIBUTOS_VALIDOS = ['d', 'n', 'e', 'z', 'b', 'flex']
// Exactly the progression from section 2.1: "nano → micro → ... → 32xlarge →
// metal". Nothing added beyond it (e.g. 48xlarge exists on real AWS families
// but isn't in this course material, so it's not treated as valid here).
const TAMANOS_VALIDOS = [
  'nano', 'micro', 'small', 'medium', 'large',
  'xlarge', '2xlarge', '4xlarge', '8xlarge', '12xlarge', '16xlarge',
  '24xlarge', '32xlarge', 'metal',
]

const SIZE_PATTERN = `(${TAMANOS_VALIDOS.join('|')})`

export function parsearTipoInstancia(input: string): TipoInstanciaParseado | null {
  if (!input) return null

  const raw = input.trim().toLowerCase()
  if (!raw) return null

  // Pattern: family + generation + (processor)? + (atributos) + . + size
  // Family is one-or-more letters (lazy) so multi-letter prefixes like "inf"
  // or "trn" resolve correctly instead of being cut to their first letter.
  // Attributes are lowercase letters validated against ATRIBUTOS_VALIDOS.
  const pattern = new RegExp(`^([a-z]+?)(\\d+)([agi]?)([a-z]*)\\.${SIZE_PATTERN}$`)
  const m = pattern.exec(raw)
  if (!m) return null

  const [, familiaChar, genStr, procChar, attrsRaw] = m
  const familia = familiaChar.toUpperCase()
  const generacion = Number(genStr)
  const procesador = procChar === '' ? null : procChar

  // Validate family
  if (!FAMILIAS_VALIDAS.includes(familia)) return null

  // Validate processor
  if (procesador !== null && !PROCESADORES_VALIDOS.includes(procesador)) return null

  // Validate attrs: each char must be in ATRIBUTOS_VALIDOS; 'flex' would be a
  // substring match if naively split, so we work char-by-char.
  const atributos: string[] = []
  for (const c of attrsRaw) {
    if (!ATRIBUTOS_VALIDOS.includes(c)) return null
    if (!atributos.includes(c)) atributos.push(c)
  }

  return {
    familia,
    generacion,
    procesador,
    atributos,
    tamano: m[5],
    raw,
  }
}

export type FamiliaInstancia = {
  familia: string
  categoria: string
  perfil: string
  casosDeUso: string
  ejemplos: string
  reglaMnemotecnica?: string
}

export const familiasInstancia: FamiliaInstancia[] = [
  {
    familia: 'T',
    categoria: 'Ráfaga',
    perfil: 'Bajo costo, CPU por créditos',
    casosDeUso: 'Dev/test, blogs, microservicios de bajo tráfico',
    ejemplos: 't3, t4g',
    reglaMnemotecnica: 'Tiny',
  },
  {
    familia: 'M',
    categoria: 'Propósito general',
    perfil: 'Balance 1:4 (vCPU:GiB)',
    casosDeUso: 'Servidores web, app servers, backends medianos',
    ejemplos: 'm6i, m7g',
    reglaMnemotecnica: 'Main',
  },
  {
    familia: 'C',
    categoria: 'Cómputo optimizado',
    perfil: 'Más CPU, menos RAM (1:2)',
    casosDeUso: 'Procesamiento por lotes, codificación de video, HPC, servidores de juegos',
    ejemplos: 'c6i, c7g',
    reglaMnemotecnica: 'Compute',
  },
  {
    familia: 'R',
    categoria: 'Memoria optimizada',
    perfil: 'Más RAM (1:8)',
    casosDeUso: 'Bases de datos, cachés, análisis en memoria',
    ejemplos: 'r6i, r7g',
    reglaMnemotecnica: 'RAM',
  },
  {
    familia: 'X',
    categoria: 'Memoria extrema',
    perfil: 'Ratio 1:16 o más',
    casosDeUso: 'SAP HANA, Redis gigantes',
    ejemplos: 'x2',
    reglaMnemotecnica: 'eXtreme memory',
  },
  {
    familia: 'I',
    categoria: 'Almacenamiento I/O',
    perfil: 'NVMe local muy rápido',
    casosDeUso: 'NoSQL, data warehouses, bases transaccionales',
    ejemplos: 'i4i',
    reglaMnemotecnica: 'I/O',
  },
  {
    // Source groups D and H in one row ("D / H") with no per-family example
    // codes — split here for lookup purposes, same sourced text for both,
    // ejemplos left blank rather than inventing instance codes.
    familia: 'D',
    categoria: 'Almacenamiento denso',
    perfil: 'HDD de gran capacidad',
    casosDeUso: 'Hadoop, data lakes',
    ejemplos: '',
    reglaMnemotecnica: 'Dense',
  },
  {
    familia: 'H',
    categoria: 'Almacenamiento denso',
    perfil: 'HDD de gran capacidad',
    casosDeUso: 'Hadoop, data lakes',
    ejemplos: '',
  },
  {
    // Source groups P / G / Inf / Trn in one row, same reasoning as D/H.
    // The mnemonic assigns "GPU" to the letter G specifically, not P.
    familia: 'P',
    categoria: 'Aceleradas (GPU o chips de IA)',
    perfil: 'GPU o chips de IA',
    casosDeUso: 'Machine learning, entrenamiento, inferencia, renderizado',
    ejemplos: '',
  },
  {
    familia: 'G',
    categoria: 'Aceleradas (GPU o chips de IA)',
    perfil: 'GPU o chips de IA',
    casosDeUso: 'Machine learning, entrenamiento, inferencia, renderizado',
    ejemplos: '',
    reglaMnemotecnica: 'GPU',
  },
  {
    familia: 'INF',
    categoria: 'Aceleradas (GPU o chips de IA)',
    perfil: 'GPU o chips de IA',
    casosDeUso: 'Machine learning, entrenamiento, inferencia, renderizado',
    ejemplos: '',
  },
  {
    familia: 'TRN',
    categoria: 'Aceleradas (GPU o chips de IA)',
    perfil: 'GPU o chips de IA',
    casosDeUso: 'Machine learning, entrenamiento, inferencia, renderizado',
    ejemplos: '',
  },
]
