import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CidrCalculator } from '../CidrCalculator'

describe('CidrCalculator', () => {
  it('shows totals and reserved addresses for the default block', () => {
    render(<CidrCalculator />)

    expect(screen.getByText('65.536')).toBeInTheDocument() // direcciones totales /16
    expect(screen.getByText('65.531')).toBeInTheDocument() // utilizables tras las 5 de AWS
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument() // router de la VPC
  })

  it('recomputes when the user types a different block', async () => {
    const user = userEvent.setup()
    render(<CidrCalculator />)

    const input = screen.getByLabelText(/bloque cidr/i)
    await user.clear(input)
    await user.type(input, '10.0.1.0/24')

    expect(screen.getByText('256')).toBeInTheDocument()
    expect(screen.getByText('251')).toBeInTheDocument()
  })

  it('shows a Spanish validation error instead of crashing on bad input', async () => {
    const user = userEvent.setup()
    render(<CidrCalculator />)

    const input = screen.getByLabelText(/bloque cidr/i)
    await user.clear(input)
    await user.type(input, 'no es un cidr')

    expect(await screen.findByRole('alert')).toHaveTextContent(/formato inválido/i)
  })

  it('splits into the requested number of subnets', async () => {
    const user = userEvent.setup()
    render(<CidrCalculator />)

    const subnetCountInput = screen.getByLabelText(/cantidad de subredes/i)
    await user.clear(subnetCountInput)
    await user.type(subnetCountInput, '4')

    expect(await screen.findByText('4 subredes /18')).toBeInTheDocument()
    expect(screen.getByText('10.0.64.0/18')).toBeInTheDocument()
  })
})
