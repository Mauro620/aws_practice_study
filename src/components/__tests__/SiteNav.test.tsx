import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { COURSE_MODULES, LAB_GROUPS, SiteNav } from '../SiteNav'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/herramientas/cidr',
}))

const serviceNames = {
  bienvenida: 'Le damos la bienvenida a AWS Academy Cloud Architecting',
  'well-architected': 'Marco de AWS Well-Architected',
  iam: 'Protección del acceso (AWS IAM)',
  vpc: 'Amazon VPC (Virtual Private Cloud)',
  ec2: 'Amazon EC2 (Elastic Compute Cloud)',
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

  it('places the architecture guide in the transversal learning subsection', () => {
    render(<SiteNav servicios={servicios} />)

    expect(screen.getAllByRole('heading', { name: 'Guía transversal', level: 2 })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Guía de arquitectura AWS' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Guía de arquitectura AWS' }).every((link) => link.getAttribute('href') === '/guia-arquitectura')).toBe(true)
  })

  it('groups every existing lab route under native collapsible subgroups', () => {
    render(<SiteNav servicios={servicios} />)

    const navs = screen.getAllByRole('navigation', { name: 'Laboratorios interactivos' })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      expect(within(nav).getAllByRole('group')).toHaveLength(3)
      for (const { label, items } of LAB_GROUPS) {
        const subgroup = within(nav).getByRole('group', { name: label })
        expect(within(subgroup).getByText(label).tagName).toBe('SUMMARY')
        for (const item of items) {
          expect(within(subgroup).getByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
        }
      }
    }
  })

  it('opens the active lab subgroup and marks only exact routes active', () => {
    render(<SiteNav servicios={servicios} />)

    for (const link of screen.getAllByRole('link', { name: 'Calculadora de CIDR' })) {
      expect(link).toHaveAttribute('aria-current', 'page')
    }
    for (const link of screen.getAllByRole('link', { name: 'Constructor visual de VPC' })) {
      expect(link).not.toHaveAttribute('aria-current')
    }
    for (const nav of screen.getAllByRole('navigation', { name: 'Laboratorios interactivos' })) {
      expect(within(nav).getByRole('group', { name: 'Red y conectividad' })).toHaveAttribute('open')
      expect(within(nav).getByRole('group', { name: 'Cómputo y seguridad' })).not.toHaveAttribute('open')
    }
  })

  it('keeps separate landmarks and a bounded sticky desktop sidebar', () => {
    render(<SiteNav servicios={servicios} />)

    expect(screen.getAllByRole('navigation', { name: 'Contenido de aprendizaje' })).toHaveLength(2)
    expect(screen.getAllByRole('navigation', { name: 'Laboratorios interactivos' })).toHaveLength(2)
    expect(document.querySelector('aside')).toHaveClass('md:sticky', 'md:top-0', 'md:h-dvh', 'md:self-start', 'md:max-h-dvh', 'md:overflow-y-auto')
  })
})
