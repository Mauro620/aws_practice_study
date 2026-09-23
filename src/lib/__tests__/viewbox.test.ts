import { describe, expect, it } from 'vitest'
import { type ViewBox, panViewBox, toViewBoxString, zoomViewBox } from '../viewbox'

const bounds: ViewBox = { x: 0, y: 0, w: 960, h: 800 }

describe('zoomViewBox', () => {
  it('zooms in around the center by shrinking the visible window', () => {
    expect(zoomViewBox(bounds, 2, bounds)).toEqual({ x: 240, y: 200, w: 480, h: 400 })
  })

  it('zooms around an explicit focal point, keeping that point fixed', () => {
    const next = zoomViewBox(bounds, 2, bounds, { x: 0, y: 0 })
    expect(next).toEqual({ x: 0, y: 0, w: 480, h: 400 })
  })

  it('never zooms out beyond the full diagram', () => {
    expect(zoomViewBox(bounds, 0.5, bounds)).toEqual(bounds)
  })

  it('caps the zoom-in level', () => {
    let vb = bounds
    for (let i = 0; i < 20; i++) vb = zoomViewBox(vb, 2, bounds)
    expect(vb.w).toBeCloseTo(bounds.w / 4)
    expect(vb.h).toBeCloseTo(bounds.h / 4)
  })

  it('clamps the window inside the diagram after zooming out near an edge', () => {
    const zoomed = { x: 480, y: 400, w: 480, h: 400 }
    expect(zoomViewBox(zoomed, 0.8, bounds)).toEqual({ x: 360, y: 300, w: 600, h: 500 })
  })
})

describe('panViewBox', () => {
  it('moves the visible window by the given delta', () => {
    expect(panViewBox({ x: 100, y: 100, w: 480, h: 400 }, 50, -40, bounds)).toEqual({ x: 150, y: 60, w: 480, h: 400 })
  })

  it('does not move past the diagram edges', () => {
    expect(panViewBox({ x: 100, y: 100, w: 480, h: 400 }, -500, 900, bounds)).toEqual({ x: 0, y: 400, w: 480, h: 400 })
    expect(panViewBox(bounds, 100, 100, bounds)).toEqual(bounds)
  })
})

describe('toViewBoxString', () => {
  it('serializes for the svg viewBox attribute', () => {
    expect(toViewBoxString({ x: 1.5, y: 2, w: 3, h: 4 })).toBe('1.5 2 3 4')
  })
})
