import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { HERRAMIENTAS_TRANSVERSALES } from '@/lib/herramientas'
import { COURSE_MODULES, SiteNav } from '../SiteNav'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/guia-arquitectura',
}))

const serviceNames = {
  bienvenida: 'Le damos la bienvenida a AWS Academy Cloud Architecting',
  'well-architected': 'Marco de AWS Well-Architected',
  iam: 'Protección del acceso (AWS IAM)',
  vpc: 'Amazon VPC (Virtual Private Cloud)',
  ec2: 'Amazon EC2 (Elastic Compute Cloud)',
  elasticidad: 'Elasticidad (Auto Scaling, Target Groups y CloudWatch)',
  cloudfront: 'Entrega de contenido (CloudFront, HTTPS y S3)',
}

const servicios = Object.keys(serviceNames).map((id, index) => ({
  id,
  nombre: serviceNames[id as keyof typeof serviceNames],
  categoria: 'Red' as const,
  modulo: index + 1,
  prerequisitos: [],
  resumenUnaLinea: '',
  erroresFrecuentes: [],
  glosario: [],
  preguntas: [],
}))

describe('SiteNav', () => {
  it('lists all seven modules in logical order, ending with IAM, Elasticidad and Entrega de contenido as M5, M6, M7', () => {
    const group = COURSE_MODULES.find(({ modules }) => modules.some(({ id }) => id === 'iam'))!
    const ids = group.modules.map(({ id }) => id)
    expect(ids).toEqual(['bienvenida', 'well-architected', 'vpc', 'ec2', 'iam', 'elasticidad', 'cloudfront'])
    const iamIndex = ids.indexOf('iam')
    expect(group.modules[iamIndex].label).toMatch(/^M5 /)
    expect(group.modules[iamIndex + 1].label).toMatch(/^M6 /)
    expect(group.modules[iamIndex + 2].label).toMatch(/^M7 /)
  })

  it('renders the requested learning categories, labels, and routes', () => {
    render(<SiteNav servicios={servicios} />)

    for (const { category, modules } of COURSE_MODULES) {
      expect(screen.getAllByRole('heading', { name: category, level: 2 })).toHaveLength(2)
      for (const { id, label } of modules) {
        const links = screen.getAllByRole('link', { name: label })
        expect(links).toHaveLength(2)
        expect(links.every((link) => link.getAttribute('href') === `/servicios/${id}`)).toBe(true)
      }
    }
  })

  it('places the architecture guide and every transversal tool in the transversal subsection', () => {
    render(<SiteNav servicios={servicios} />)

    expect(screen.getAllByRole('heading', { name: 'Guía transversal', level: 2 })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Guía de arquitectura AWS' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Guía de arquitectura AWS' }).every((link) => link.getAttribute('href') === '/guia-arquitectura')).toBe(true)
    expect(screen.getAllByRole('link', { name: 'Arquitectura de referencia' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Arquitectura de referencia' }).every((link) => link.getAttribute('href') === '/arquitectura-referencia')).toBe(true)

    for (const herramienta of HERRAMIENTAS_TRANSVERSALES) {
      const links = screen.getAllByRole('link', { name: herramienta.label })
      expect(links).toHaveLength(2)
      expect(links.every((link) => link.getAttribute('href') === herramienta.href)).toBe(true)
    }
  })

  it('marks the active transversal route and leaves others inactive', () => {
    render(<SiteNav servicios={servicios} />)

    for (const link of screen.getAllByRole('link', { name: 'Guía de arquitectura AWS' })) {
      expect(link).toHaveAttribute('aria-current', 'page')
    }
    for (const herramienta of HERRAMIENTAS_TRANSVERSALES) {
      for (const link of screen.getAllByRole('link', { name: herramienta.label })) {
        expect(link).not.toHaveAttribute('aria-current')
      }
    }
  })

  it('no longer renders a standing lab/tools group in the left nav', () => {
    render(<SiteNav servicios={servicios} />)

    expect(screen.queryAllByRole('navigation', { name: 'Laboratorios interactivos' })).toHaveLength(0)
    expect(screen.queryAllByRole('link', { name: 'Calculadora de CIDR' })).toHaveLength(0)
  })

  it('keeps separate landmarks and a bounded sticky desktop sidebar', () => {
    render(<SiteNav servicios={servicios} />)

    expect(screen.getAllByRole('navigation', { name: 'Contenido de aprendizaje' })).toHaveLength(2)
    expect(document.querySelector('aside')).toHaveClass('md:sticky', 'md:top-0', 'md:h-dvh', 'md:self-start', 'md:max-h-dvh', 'md:overflow-y-auto')
  })
})
