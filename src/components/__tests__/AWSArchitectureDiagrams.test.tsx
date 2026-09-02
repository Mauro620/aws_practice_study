import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AWSArchitectureDiagrams } from '../AWSArchitectureDiagrams'

describe('AWSArchitectureDiagrams', () => {
  it('switches between the three diagram modes', async () => {
    const user = userEvent.setup()
    render(<AWSArchitectureDiagrams />)

    expect(screen.getByRole('button', { name: /Internet, origen público, seleccionado/i })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /capas de seguridad/i }))
    expect(screen.getByRole('button', { name: /SG del ALB, entrada web, seleccionado/i })).toBeInTheDocument()
    expect(screen.getByText(/0\.0\.0\.0\/0 pertenece solo/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /despliegue/i }))
    expect(screen.getByText('dnf + Apache')).toBeInTheDocument()
  })

  it('selects nodes and exposes the explanation panel', async () => {
    const user = userEvent.setup()
    render(<AWSArchitectureDiagrams />)

    await user.click(screen.getByRole('button', { name: /ALB, subred pública/i }))
    expect(screen.getByRole('heading', { name: 'ALB' })).toBeInTheDocument()
    expect(screen.getByText(/Qué ocurre/)).toBeInTheDocument()
    expect(screen.getByText(/Listener: 80\/443/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ALB, subred pública, seleccionado/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('supports keyboard activation for deployment steps', async () => {
    const user = userEvent.setup()
    render(<AWSArchitectureDiagrams />)
    await user.click(screen.getByRole('tab', { name: /despliegue/i }))

    const step = screen.getByRole('button', { name: /SSH, paso 3/i })
    step.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'SSH' })).toBeInTheDocument()
    expect(step).toHaveAttribute('aria-pressed', 'true')
  })
})
