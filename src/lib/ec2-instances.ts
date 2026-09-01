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

const FAMILIAS_VALIDAS = ['T', 'M', 'C', 'R', 'X', 'I', 'D', 'H', 'P', 'G', 'Inf', 'Trn']
const PROCESADORES_VALIDOS = ['a', 'g', 'i']
const ATRIBUTOS_VALIDOS = ['d', 'n', 'e', 'z', 'b', 'flex']
// 'nano' / 'metal' no están en el spec de saltos pero aparecen como casos borde reales.
// Documentamos los tamaños oficiales del material; nano no es un tamaño EC2 real
// (es solo free-tier y marketing), metal sí.
const TAMANOS_VALIDOS = [
  'micro', 'small', 'medium', 'large',
  'xlarge', '2xlarge', '4xlarge', '8xlarge', '12xlarge', '16xlarge',
  '24xlarge', '32xlarge', '48xlarge', 'metal',
]

const SIZE_PATTERN = `(${TAMANOS_VALIDOS.join('|')})`

export function parsearTipoInstancia(input: string): TipoInstanciaParseado | null {
  if (!input) return null

  const raw = input.trim().toLowerCase()
  if (!raw) return null

  // Pattern: family + generation + (processor)? + (atributos) + . + size
  // Attributes are lowercase letters validated against ATRIBUTOS_VALIDOS.
  const pattern = new RegExp(`^([a-z])(\\d+)([agi]?)([a-z]*)\\.${SIZE_PATTERN}$`)
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
    familia: 'D',
    categoria: 'Almacenamiento denso',
    perfil: 'HDD de gran capacidad',
    casosDeUso: 'Hadoop, data lakes',
    ejemplos: 'd2, d3',
    reglaMnemotecnica: 'Dense',
  },
  {
    familia: 'P',
    categoria: 'Aceleradas (GPU)',
    perfil: 'GPU o chips de IA',
    casosDeUso: 'Machine learning, entrenamiento, inferencia, renderizado',
    ejemplos: 'p4, p5',
    reglaMnemotecnica: 'GPU (junto con G/Inf/Trn)',
  },
]
