import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AWSArchitectureGuide } from '../AWSArchitectureGuide'

describe('AWSArchitectureGuide', () => {
  const writeText = vi.fn()

  beforeEach(() => {
    writeText.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the complete architecture workflow and deployment commands', () => {
    render(<AWSArchitectureGuide />)
    expect(screen.getByRole('heading', { name: /diseñar la vpc/i })).toBeInTheDocument()
    expect(screen.getByText(/VPC Dashboard > Create VPC/i)).toBeInTheDocument()
    expect(screen.getByText(/EC2 > Launch instances/i)).toBeInTheDocument()
    expect(screen.getByText(/Configure storage/i)).toBeInTheDocument()
    expect(screen.getByText(/EC2 > Target Groups/i)).toBeInTheDocument()
    expect(screen.getByText(/Elastic IPs > Allocate/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /controlar el tráfico/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /distribuir tráfico/i })).toBeInTheDocument()
    expect(screen.getByText(/0\.0\.0\.0\/0 significa cualquier IP de internet/i)).toBeInTheDocument()
    expect(screen.getByText(/responde 200 solo cuando la base de datos está disponible/i)).toBeInTheDocument()
    expect(screen.getByText(/dnf update -y/)).toBeInTheDocument()
    expect(screen.getByText(/cd \/var\/www\/html\//)).toBeInTheDocument()
  })

  it('includes the runbook in the ToC and tracks it as the active section', () => {
    let callback: ((entries: IntersectionObserverEntry[]) => void) | undefined
    const observe = vi.fn()
    const MockIntersectionObserver = class {
      constructor(nextCallback: IntersectionObserverCallback) {
        callback = nextCallback as (entries: IntersectionObserverEntry[]) => void
      }

      observe = observe
      disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)

    render(<AWSArchitectureGuide />)

    const runbookLink = screen.getByRole('link', { name: /10\s*comandos, en el orden correcto/i })
    expect(runbookLink).toHaveAttribute('href', '#commands')
    expect(observe).toHaveBeenCalledTimes(10)

    act(() => {
      callback?.([{ isIntersecting: true, intersectionRatio: 1, target: document.getElementById('commands')! } as unknown as IntersectionObserverEntry])
    })

    expect(runbookLink).toHaveAttribute('aria-current', 'location')
  })

  it('adds the Auto Scaling stage right after ALB and Target Groups', () => {
    render(<AWSArchitectureGuide />)
    const albLink = screen.getByRole('link', { name: /05\s*distribuir tráfico con alb/i })
    const asgLink = screen.getByRole('link', { name: /06\s*escalar con auto scaling groups/i })
    expect(asgLink).toHaveAttribute('href', '#auto-scaling-groups')
    expect(albLink.compareDocumentPosition(asgLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('link', { name: /07\s*resolver acceso/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /08\s*configurar el servidor/i })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /escalar con auto scaling groups/i })).toBeInTheDocument()
    expect(screen.getByText(/EC2 > Launch Templates/i)).toBeInTheDocument()
    expect(screen.getByText(/EC2 > Auto Scaling Groups/i)).toBeInTheDocument()
    expect(screen.getByText(/Target tracking scaling policy/i)).toBeInTheDocument()
    expect(screen.getByText(/verificación de salud por defecto \(EC2\)/i)).toBeInTheDocument()
  })

  it('adds the CloudFront + S3 stage before the command runbook', () => {
    render(<AWSArchitectureGuide />)
    const cdnLink = screen.getByRole('link', { name: /09\s*entregar contenido estático con cloudfront y s3/i })
    expect(cdnLink).toHaveAttribute('href', '#cloudfront-s3')
    const runbookLink = screen.getByRole('link', { name: /10\s*comandos/i })
    expect(cdnLink.compareDocumentPosition(runbookLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(screen.getByRole('heading', { name: /entregar contenido estático con cloudfront y s3/i })).toBeInTheDocument()
    expect(screen.getByText(/Origin access control settings/i)).toBeInTheDocument()
    expect(screen.getAllByText(/us-east-1/i).length).toBeGreaterThan(0)
    const tocEntries = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('#'))
    expect(screen.getByText(`${tocEntries.length} etapas`)).toBeInTheDocument()
  })

  it('keeps the mobile table of contents within the viewport', () => {
    render(<AWSArchitectureGuide />)
    const navigation = screen.getByRole('navigation', { name: 'Secciones de la guía' })

    expect(navigation).toHaveClass('flex-col')
    expect(navigation).not.toHaveClass('min-w-max')
  })

  it('uses accessible native disclosures for the deep-dive topics', async () => {
    const user = userEvent.setup()
    render(<AWSArchitectureGuide />)
    const disclosure = screen.getByText(/la regla 0\.0\.0\.0\/0: cuándo usarla/i).closest('summary')
    expect(disclosure).toBeTruthy()
    const details = disclosure?.parentElement
    expect(details).not.toHaveAttribute('open')
    await user.click(disclosure!)
    expect(details).toHaveAttribute('open')
  })

  it('copies a bash snippet and announces success', async () => {
    const user = userEvent.setup()
    render(<AWSArchitectureGuide />)
    const clipboardWrite = vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText)
    await user.click(screen.getByRole('button', { name: /copiar comando de preparar/i }))
    expect(screen.getByText('Copiado')).toBeInTheDocument()
    expect(clipboardWrite).toHaveBeenCalledWith('sudo su\ndnf update -y\ndnf install httpd')
  })
})
