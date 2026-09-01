import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { NivelSelector } from '../NivelSelector'

const niveles = [
  { numero: 1 as const, titulo: 'Analogía', node: <p>Contenido nivel uno</p> },
  { numero: 3 as const, titulo: 'Caso realista', node: <p>Contenido nivel tres</p> },
]

describe('NivelSelector', () => {
  it('shows the lowest-numbered level first', () => {
    render(<NivelSelector niveles={niveles} />)

    expect(screen.getByText('Contenido nivel uno')).toBeInTheDocument()
    expect(screen.queryByText('Contenido nivel tres')).not.toBeInTheDocument()
  })

  it('switches content when a different level is selected, without losing the selector', async () => {
    const user = userEvent.setup()
    render(<NivelSelector niveles={niveles} />)

    await user.click(screen.getByRole('tab', { name: /caso realista/i }))

    expect(screen.getByText('Contenido nivel tres')).toBeInTheDocument()
    expect(screen.queryByText('Contenido nivel uno')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /analogía/i })).toBeInTheDocument()
  })

  it('marks the active level for assistive tech', async () => {
    const user = userEvent.setup()
    render(<NivelSelector niveles={niveles} />)

    expect(screen.getByRole('tab', { name: /analogía/i })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: /caso realista/i }))

    expect(screen.getByRole('tab', { name: /caso realista/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /analogía/i })).toHaveAttribute('aria-selected', 'false')
  })
})
