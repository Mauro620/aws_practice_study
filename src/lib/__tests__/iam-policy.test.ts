import { describe, it, expect } from 'vitest'
import { type Politica, evaluarSolicitud } from '../iam-policy'

describe('evaluarSolicitud — reglas base de evaluación (sección 10)', () => {
  it('sin ninguna política que mencione la acción → deny implícita', () => {
    const r = evaluarSolicitud([], null, 's3:GetObject', 'arn:aws:s3:::x/y')
    expect(r.decisiónFinal).toBe('deny')
    expect(r.identidad.decisión).toBe('no-aplica')
    expect(r.recurso.decisión).toBe('no-aplica')
    expect(r.razónFinal).toMatch(/implícita/i)
  })

  it('un Allow explícito en la política de identidad permite la acción', () => {
    const identidad: Politica = [{ efecto: 'Allow', acciones: ['s3:GetObject'], recursos: ['*'] }]
    const r = evaluarSolicitud(identidad, null, 's3:GetObject', 'arn:aws:s3:::x/y')
    expect(r.decisiónFinal).toBe('allow')
    expect(r.identidad.decisión).toBe('allow')
  })

  it('un Deny explícito anula un Allow explícito, sin importar el orden de los enunciados', () => {
    const ordenDenyPrimero: Politica = [
      { efecto: 'Deny', acciones: ['s3:PutObject'], recursos: ['*'] },
      { efecto: 'Allow', acciones: ['s3:PutObject'], recursos: ['*'] },
    ]
    const ordenAllowPrimero: Politica = [
      { efecto: 'Allow', acciones: ['s3:PutObject'], recursos: ['*'] },
      { efecto: 'Deny', acciones: ['s3:PutObject'], recursos: ['*'] },
    ]
    for (const identidad of [ordenDenyPrimero, ordenAllowPrimero]) {
      const r = evaluarSolicitud(identidad, null, 's3:PutObject', 'arn:aws:s3:::x/y')
      expect(r.decisiónFinal).toBe('deny')
      expect(r.identidad.decisión).toBe('deny')
    }
  })

  it('las acciones admiten comodines (s3:* cubre s3:GetObject)', () => {
    const identidad: Politica = [{ efecto: 'Allow', acciones: ['s3:*'], recursos: ['*'] }]
    const r = evaluarSolicitud(identidad, null, 's3:GetObject', 'arn:aws:s3:::x/y')
    expect(r.decisiónFinal).toBe('allow')
  })

  it('los recursos admiten comodines (arn:...:bucket-x/* cubre un objeto dentro del bucket)', () => {
    const identidad: Politica = [
      { efecto: 'Allow', acciones: ['s3:GetObject'], recursos: ['arn:aws:s3:::bucket-x/*'] },
    ]
    const dentro = evaluarSolicitud(identidad, null, 's3:GetObject', 'arn:aws:s3:::bucket-x/foto.jpg')
    const fuera = evaluarSolicitud(identidad, null, 's3:GetObject', 'arn:aws:s3:::bucket-y/foto.jpg')
    expect(dentro.decisiónFinal).toBe('allow')
    expect(fuera.decisiónFinal).toBe('deny')
  })
})

describe('evaluarSolicitud — Ejemplo A del módulo: Deny explícito de la política de recurso manda', () => {
  const identidadBeto: Politica = [
    { efecto: 'Allow', acciones: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'], recursos: ['arn:aws:s3:::bucket-x/*'] },
  ]
  const recursoBucketX: Politica = [
    { efecto: 'Allow', acciones: ['s3:GetObject', 's3:ListBucket'], recursos: ['arn:aws:s3:::bucket-x/*'] },
    { efecto: 'Deny', acciones: ['s3:PutObject'], recursos: ['arn:aws:s3:::bucket-x/*'] },
  ]

  it('GET → ambas políticas permiten → permitido', () => {
    const r = evaluarSolicitud(identidadBeto, recursoBucketX, 's3:GetObject', 'arn:aws:s3:::bucket-x/foto.jpg')
    expect(r.decisiónFinal).toBe('allow')
  })

  it('PUT → identidad permite pero el bucket lo deniega explícitamente → denegado', () => {
    const r = evaluarSolicitud(identidadBeto, recursoBucketX, 's3:PutObject', 'arn:aws:s3:::bucket-x/foto.jpg')
    expect(r.decisiónFinal).toBe('deny')
    expect(r.identidad.decisión).toBe('allow')
    expect(r.recurso.decisión).toBe('deny')
    expect(r.razónFinal).toMatch(/recurso/i)
  })
})

describe('evaluarSolicitud — Ejemplo B del módulo: basta que una de las dos políticas permita', () => {
  const identidadBeto: Politica = [{ efecto: 'Allow', acciones: ['s3:ListBucket'], recursos: ['arn:aws:s3:::bucket-y/*'] }]
  const recursoBucketY: Politica = [{ efecto: 'Allow', acciones: ['s3:GetObject'], recursos: ['arn:aws:s3:::bucket-y/*'] }]

  it('GET → la identidad no lo menciona, pero el bucket sí lo permite → permitido', () => {
    const r = evaluarSolicitud(identidadBeto, recursoBucketY, 's3:GetObject', 'arn:aws:s3:::bucket-y/foto.jpg')
    expect(r.identidad.decisión).toBe('no-aplica')
    expect(r.recurso.decisión).toBe('allow')
    expect(r.decisiónFinal).toBe('allow')
  })

  it('LIST → ambas políticas permiten → permitido', () => {
    const r = evaluarSolicitud(identidadBeto, recursoBucketY, 's3:ListBucket', 'arn:aws:s3:::bucket-y/')
    expect(r.decisiónFinal).toBe('allow')
  })

  it('PUT → ninguna política lo menciona → deny implícita', () => {
    const r = evaluarSolicitud(identidadBeto, recursoBucketY, 's3:PutObject', 'arn:aws:s3:::bucket-y/foto.jpg')
    expect(r.identidad.decisión).toBe('no-aplica')
    expect(r.recurso.decisión).toBe('no-aplica')
    expect(r.decisiónFinal).toBe('deny')
  })
})

describe('evaluarSolicitud — Ejemplo C del módulo: Allow + Deny sobre NotResource acota el alcance', () => {
  // Allow sobre la tabla concreta + Deny sobre NotResource (todo lo que no sea esa tabla)
  const identidadAcotada: Politica = [
    { efecto: 'Allow', acciones: ['dynamodb:*'], recursos: ['arn:aws:dynamodb:::tabla-permitida'] },
    { efecto: 'Deny', acciones: ['dynamodb:*'], notRecursos: ['arn:aws:dynamodb:::tabla-permitida'] },
  ]

  it('acción sobre la tabla permitida → permitido', () => {
    const r = evaluarSolicitud(identidadAcotada, null, 'dynamodb:GetItem', 'arn:aws:dynamodb:::tabla-permitida')
    expect(r.decisiónFinal).toBe('allow')
  })

  it('la misma acción sobre cualquier otra tabla → denegado por el Deny sobre NotResource', () => {
    const r = evaluarSolicitud(identidadAcotada, null, 'dynamodb:GetItem', 'arn:aws:dynamodb:::otra-tabla')
    expect(r.decisiónFinal).toBe('deny')
    expect(r.identidad.decisión).toBe('deny')
  })

  it('el Deny sobre NotResource bloquea incluso si otra política agrega un Allow adicional', () => {
    const identidadConAllowExtra: Politica = [
      ...identidadAcotada,
      { efecto: 'Allow', acciones: ['dynamodb:*'], recursos: ['*'] },
    ]
    const r = evaluarSolicitud(identidadConAllowExtra, null, 'dynamodb:GetItem', 'arn:aws:dynamodb:::otra-tabla')
    expect(r.decisiónFinal).toBe('deny')
  })
})
