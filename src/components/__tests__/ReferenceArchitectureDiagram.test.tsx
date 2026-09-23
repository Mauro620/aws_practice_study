import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ReferenceArchitectureDiagram } from '../ReferenceArchitectureDiagram'

const diagrama = () => screen.getByRole('group', { name: /diagrama completo/i })
const capas = () => screen.getByRole('group', { name: /arquitectura por capas/i })
const elegirModo = async (user: ReturnType<typeof userEvent.setup>, nombre: RegExp) =>
  user.click(within(screen.getByRole('group', { name: /modos del diagrama/i })).getByRole('button', { name: nombre }))

describe('ReferenceArchitectureDiagram', () => {
  it('shows the five modes, all enabled', () => {
    render(<ReferenceArchitectureDiagram />)
    const modos = within(screen.getByRole('group', { name: /modos del diagrama/i })).getAllByRole('button')
    expect(modos).toHaveLength(5)
    expect(modos.every((boton) => !(boton as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.queryByText('Próximamente')).not.toBeInTheDocument()
  })

  it('Seguridad: toggling layers shows where each acts and which components are left with no layer', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    await elegirModo(user, /Seguridad/)
    const capasSeg = screen.getByRole('group', { name: /capas de seguridad/i })
    expect(within(capasSeg).getByRole('button', { name: /Security Groups/ })).toHaveAttribute('aria-pressed', 'true')
    expect(within(diagrama()).getAllByRole('button', { name: /^EC2, aplicación, protegido por: Security Groups/ })).toHaveLength(2)
    expect(within(diagrama()).getByRole('button', { name: /^Bucket S3, privado · OAC, sin ninguna capa activa/ })).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^NAT Gateway, salida de 1a, sin ninguna capa activa/ })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Qué no cubre' }).length).toBe(1)

    await user.click(within(capasSeg).getByRole('button', { name: /OAC/ }))
    expect(within(diagrama()).getByRole('button', { name: /^Bucket S3, privado · OAC, protegido por: OAC/ })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Qué no cubre' }).length).toBe(2)

    await user.click(screen.getByRole('button', { name: 'Activar todas' }))
    expect(screen.getByText(/Ningún componente queda sin cobertura/)).toBeInTheDocument()
    expect(screen.getByText(/Dependen de una sola capa/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ninguna' }))
    expect(within(capas()).getByRole('button', { name: /^RDS primaria, Multi-AZ, sin ninguna capa activa/ })).toBeInTheDocument()
  })

  it('Costos: colors by charge category, flags the surprises and changes the illustrative estimate with traffic', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    await elegirModo(user, /Costos/)
    expect(screen.getByText(/no son precios reales de AWS/)).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^NAT Gateway, salida de 1a, fijo por hora y por uso, sorpresa/ })).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^VPC, 10\.0\.0\.0\/16, sin costo/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /El NAT Gateway cobra de noche/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /El tráfico entre AZ se cobra/ })).toBeInTheDocument()

    const total = () => screen.getByTestId('costo-total').textContent
    const deslizador = screen.getByRole('slider', { name: /volumen de tráfico/i })
    const antes = total()
    fireEvent.change(deslizador, { target: { value: '100' } })
    expect(total()).not.toBe(antes)
    expect(deslizador).toHaveAttribute('aria-valuetext', expect.stringMatching(/Tráfico alto/))
    fireEvent.change(deslizador, { target: { value: '0' } })
    expect(deslizador).toHaveAttribute('aria-valuetext', expect.stringMatching(/Sin tráfico/))
    expect(screen.getByText(/los NAT Gateway suman/)).toBeInTheDocument()
  })

  it('Ruta de aprendizaje: colors by progress and links an unseen component to its module', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    await elegirModo(user, /Ruta de aprendizaje/)
    expect(within(diagrama()).getByRole('button', { name: /^NAT Gateway, salida de 1a, en curso/ })).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^CloudFront, edge locations, no visto/ })).toBeInTheDocument()

    await user.click(within(screen.getByRole('group', { name: /por dónde vas/i })).getByRole('button', { name: /M5/ }))
    expect(within(diagrama()).getByRole('button', { name: /^NAT Gateway, salida de 1a, dominado/ })).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^Rol de IAM, perfil de instancia, en curso/ })).toBeInTheDocument()

    await user.click(within(diagrama()).getByRole('button', { name: /^CloudFront, edge locations, no visto/ }))
    const panel = screen.getByRole('dialog', { name: 'CloudFront' })
    expect(within(panel).getByRole('link', { name: /Estudiarlo en M7/ })).toHaveAttribute('href', '/servicios/cloudfront')
    await user.click(within(panel).getByRole('button', { name: 'Dominado' }))
    expect(within(panel).queryByRole('link', { name: /Estudiarlo en M7/ })).not.toBeInTheDocument()
  })

  it('Variantes: locked to Completa in traffic mode; Mínima hides the CDN and private layer in the diagram and the stack', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    const variantes = () => screen.getByRole('group', { name: /variante de la arquitectura/i })
    expect(within(variantes()).getByRole('button', { name: /Mínima/ })).toBeDisabled()
    expect(within(variantes()).getByRole('button', { name: /Completa/ })).toHaveAttribute('aria-pressed', 'true')

    await elegirModo(user, /Costos/)
    await user.click(within(variantes()).getByRole('button', { name: /Mínima/ }))
    expect(within(diagrama()).queryByRole('button', { name: /^CloudFront/ })).not.toBeInTheDocument()
    expect(within(diagrama()).queryByRole('button', { name: /^ALB/ })).not.toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^EC2, IP pública/ })).toBeInTheDocument()
    expect(within(capas()).getAllByRole('heading', { level: 3 }).map(({ textContent }) => textContent)).toEqual(['Red pública', 'Datos', 'Transversal'])
    expect(screen.getByRole('heading', { name: 'Le falta' })).toBeInTheDocument()

    await user.click(within(variantes()).getByRole('button', { name: /Intermedia/ }))
    expect(screen.getByRole('heading', { name: /Gana frente a la Mínima/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Cuesta más/ })).toBeInTheDocument()

    await user.click(within(variantes()).getByRole('button', { name: /Completa/ }))
    expect(screen.getByText(/Por qué existe cada componente que la Completa suma a la Mínima/)).toBeInTheDocument()
  })

  it('renders the diagram from the node data in both the SVG and the stacked layout', () => {
    render(<ReferenceArchitectureDiagram />)
    expect(within(diagrama()).getByRole('button', { name: /^Subred privada, 10\.0\.11\.0\/24/ })).toBeInTheDocument()
    expect(within(capas()).getByRole('button', { name: /^Subred privada, 10\.0\.11\.0\/24/ })).toBeInTheDocument()
    expect(within(capas()).getAllByRole('heading', { level: 3 }).map(({ textContent }) => textContent)).toEqual([
      'Borde', 'Red pública', 'Red privada', 'Datos', 'Transversal',
    ])
  })

  it('opens the component panel with the five fields in order when a node is clicked', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    await user.click(within(diagrama()).getByRole('button', { name: /^RDS primaria/ }))

    const panel = screen.getByRole('dialog', { name: /RDS Multi-AZ/ })
    expect(within(panel).getAllByRole('heading', { level: 3 }).map(({ textContent }) => textContent)).toEqual([
      'Qué es', 'En qué módulo', 'Por qué está', 'Qué se rompe si lo quitás', 'Cómo cobra',
    ])
    expect(within(panel).getByRole('link', { name: /M4 Amazon EC2/ })).toHaveAttribute('href', '/servicios/ec2')
    expect(within(panel).getByText(/no tiene un módulo dedicado/)).toBeInTheDocument()
    expect(within(panel).getByText('Fijo por hora')).toBeInTheDocument()
  })

  it('activates SVG nodes from the keyboard', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    within(diagrama()).getByRole('button', { name: /^Target Group/ }).focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Target Group' })).toBeInTheDocument()
  })

  it('steps through a traffic route manually and highlights the acting node', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    await user.click(screen.getByRole('button', { name: /Dinámico/ }))
    expect(screen.getByText(/Paso 1 de 10/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Paso anterior' })).toBeDisabled()

    for (let i = 0; i < 4; i++) await user.click(screen.getByRole('button', { name: 'Siguiente paso' }))
    expect(screen.getByText(/Paso 5 de 10/)).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^ALB, nodo en 1a, paso actual/ })).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^Internet Gateway, paso anterior/ })).toBeInTheDocument()
    expect(within(diagrama()).getByRole('button', { name: /^Route 53, ALIAS, ya recorrido/ })).toBeInTheDocument()
  })

  it('injects an AZ failure and walks through its phases', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    await user.click(within(screen.getByRole('group', { name: /modos del diagrama/i })).getByRole('button', { name: /Alta disponibilidad/ }))
    await user.click(screen.getByRole('button', { name: 'Cae una zona' }))

    expect(within(diagrama()).getByRole('button', { name: /^RDS primaria, Multi-AZ, caído/ })).toBeInTheDocument()
    expect(screen.getByText(/Fase 1 de 4/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Siguiente fase' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente fase' }))
    expect(screen.getByText(/Fase 3 de 4/)).toBeInTheDocument()
    expect(screen.getByText('RDS promueve la standby')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Restablecer' }))
    expect(within(diagrama()).getByRole('button', { name: /^RDS primaria, Multi-AZ$/ })).toBeInTheDocument()
  })

  it('zooms by changing the SVG viewBox and resets it', async () => {
    const user = userEvent.setup()
    render(<ReferenceArchitectureDiagram />)
    const inicial = diagrama().getAttribute('viewBox')
    await user.click(screen.getByRole('button', { name: 'Acercar' }))
    expect(diagrama().getAttribute('viewBox')).not.toBe(inicial)
    await user.click(screen.getByRole('button', { name: 'Restablecer vista' }))
    expect(diagrama().getAttribute('viewBox')).toBe(inicial)
  })
})
