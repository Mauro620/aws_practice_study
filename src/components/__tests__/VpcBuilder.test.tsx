import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { VpcBuilder } from '../VpcBuilder'

/** Subnet names also appear as SVG <text> in the diagram and as <option> text
 * in the NAT/instance pickers, so plain getByText is ambiguous — this finds
 * the row's <span> label specifically. */
function filaDeSubred(nombre: string): HTMLElement {
  const candidato = screen.getAllByText(nombre).find((el) => el.tagName === 'SPAN')
  if (!candidato) throw new Error(`No row found for "${nombre}"`)
  return candidato.closest('li')!
}

describe('VpcBuilder', () => {
  it('starts with a seeded example and flags the single-AZ setup', () => {
    render(<VpcBuilder />)

    expect(screen.getByLabelText(/diagrama desplazable/i)).toBeInTheDocument()
    expect(filaDeSubred('Subred pública A')).toBeInTheDocument()
    expect(filaDeSubred('Subred privada A')).toBeInTheDocument()
    expect(screen.getByText(/solo tenés una az/i)).toBeInTheDocument()
  })

  it('adding a subnet shows it in the list', async () => {
    const user = userEvent.setup()
    render(<VpcBuilder />)

    await user.type(screen.getByPlaceholderText('Subred pública B'), 'Subred de pruebas')
    await user.click(screen.getByRole('button', { name: /agregar subred/i }))

    expect(filaDeSubred('Subred de pruebas')).toBeInTheDocument()
  })

  it("changing a subnet's route updates its pública/privada badge", async () => {
    const user = userEvent.setup()
    render(<VpcBuilder />)

    const fila = filaDeSubred('Subred privada A')
    expect(within(fila).getByText('Privada')).toBeInTheDocument()

    await user.selectOptions(within(fila).getByLabelText('Ruta'), 'igw')

    expect(within(fila).getByText('Pública')).toBeInTheDocument()
  })

  it('flags a NAT Gateway moved into a private subnet', async () => {
    const user = userEvent.setup()
    render(<VpcBuilder />)

    await user.selectOptions(screen.getByLabelText(/ubicado en/i), 'Subred privada A')

    expect(await screen.findByRole('alert')).toHaveTextContent(/NAT Gateway.*subred privada/i)
  })
})
