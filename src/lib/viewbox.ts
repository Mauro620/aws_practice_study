/**
 * Pure viewBox math for zoomable/pannable SVG diagrams. Zooming changes the
 * visible window (viewBox) instead of CSS-scaling the element, so text stays
 * crisp and the SVG keeps its layout width.
 */

export type ViewBox = { x: number; y: number; w: number; h: number }

/** Maximum zoom-in, relative to the full diagram. */
export const MAX_ZOOM = 4

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampInside(vb: ViewBox, bounds: ViewBox): ViewBox {
  return {
    ...vb,
    x: clamp(vb.x, bounds.x, bounds.x + bounds.w - vb.w),
    y: clamp(vb.y, bounds.y, bounds.y + bounds.h - vb.h),
  }
}

/**
 * factor > 1 zooms in, factor < 1 zooms out. The focal point (diagram
 * coordinates) stays in place; defaults to the window center.
 */
export function zoomViewBox(vb: ViewBox, factor: number, bounds: ViewBox, focal?: { x: number; y: number }): ViewBox {
  const w = clamp(vb.w / factor, bounds.w / MAX_ZOOM, bounds.w)
  const h = w * (bounds.h / bounds.w)
  const fx = focal?.x ?? vb.x + vb.w / 2
  const fy = focal?.y ?? vb.y + vb.h / 2
  const ratio = w / vb.w
  return clampInside({ x: fx - (fx - vb.x) * ratio, y: fy - (fy - vb.y) * ratio, w, h }, bounds)
}

export function panViewBox(vb: ViewBox, dx: number, dy: number, bounds: ViewBox): ViewBox {
  return clampInside({ ...vb, x: vb.x + dx, y: vb.y + dy }, bounds)
}

export function toViewBoxString({ x, y, w, h }: ViewBox) {
  return `${x} ${y} ${w} ${h}`
}
