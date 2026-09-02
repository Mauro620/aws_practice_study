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

    const runbookLink = screen.getByRole('link', { name: /08\s*comandos, en el orden correcto/i })
    expect(runbookLink).toHaveAttribute('href', '#commands')
    expect(observe).toHaveBeenCalledTimes(8)

    act(() => {
      callback?.([{ isIntersecting: true, intersectionRatio: 1, target: document.getElementById('commands')! } as unknown as IntersectionObserverEntry])
    })

    expect(runbookLink).toHaveAttribute('aria-current', 'location')
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
