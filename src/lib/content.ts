import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { Nivel, NumeroNivel, Servicio, ServicioMeta } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content', 'servicios')

function readMeta(id: string): ServicioMeta {
  const metaPath = path.join(CONTENT_DIR, id, 'meta.json')
  if (!fs.existsSync(metaPath)) {
    throw new Error(`No existe contenido para el servicio "${id}" (falta ${metaPath})`)
  }
  return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as ServicioMeta
}

function readNiveles(id: string): Nivel[] {
  const dir = path.join(CONTENT_DIR, id)
  const niveles: Nivel[] = []

  for (const numero of [1, 2, 3, 4] satisfies NumeroNivel[]) {
    const filePath = path.join(dir, `nivel-${numero}.mdx`)
    if (!fs.existsSync(filePath)) continue // omit, don't pad — see brief

    const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'))
    niveles.push({ numero, titulo: data.titulo ?? '', contenido: content })
  }

  return niveles
}

export function getServicio(id: string): Servicio {
  const meta = readMeta(id)
  const niveles = readNiveles(id)

  if (niveles.length === 0) {
    throw new Error(`El servicio "${id}" no tiene ningún nivel de contenido en ${CONTENT_DIR}`)
  }

  return { ...meta, niveles }
}

export function getAllServicios(): ServicioMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return []

  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readMeta(entry.name))
    .sort((a, b) => a.modulo - b.modulo || a.nombre.localeCompare(b.nombre))
}
