export type Categoria =
  | 'Red'
  | 'Cómputo'
  | 'Almacenamiento'
  | 'Bases de datos'
  | 'Seguridad'
  | 'Gestión'

export type NumeroNivel = 1 | 2 | 3 | 4

export const NOMBRES_NIVEL: Record<NumeroNivel, string> = {
  1: 'Analogía',
  2: 'Caso mínimo',
  3: 'Caso realista',
  4: 'Bordes y trampas',
}

/** A level's `contenido` is raw MDX source, compiled at render time by the page. */
export type Nivel = {
  numero: NumeroNivel
  titulo: string
  contenido: string
}

export type ErrorFrecuente = {
  descripcion: string
}

export type TerminoGlosario = {
  termino: string
  definicion: string
}

export type Pregunta = {
  id: string
  enunciado: string
  opciones: { texto: string; correcta: boolean; explicacion: string }[]
}

export type Servicio = {
  id: string
  nombre: string
  categoria: Categoria
  modulo: number
  prerequisitos: string[]
  resumenUnaLinea: string
  niveles: Nivel[]
  erroresFrecuentes: ErrorFrecuente[]
  glosario: TerminoGlosario[]
  preguntas: Pregunta[]
}

/** Metadata for a Servicio, minus the `niveles` prose content (loaded separately from MDX files). */
export type ServicioMeta = Omit<Servicio, 'niveles'>
