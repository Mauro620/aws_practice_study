'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type Ref } from 'react'
import {
  AVISO_ESTIMACION,
  CONTROLES_SEGURIDAD,
  DIAGRAMA,
  FALLAS,
  MODOS,
  MODULOS_RUTA,
  NODOS,
  OBJETIVOS_SEGURIDAD,
  RUTAS_TRAFICO,
  SORPRESAS_COSTO,
  TRAFICO_MAXIMO,
  VARIANTES,
  activarTodosControles,
  alternarControl,
  aristasDeVariante,
  avanzarFase,
  cambiarRuta,
  capasApiladasDe,
  categoriaCobro,
  coberturaSeguridad,
  crearEstadoFallas,
  crearEstadoRuta,
  crearEstadoSeguridad,
  crearEstadoTrafico,
  desactivarTodosControles,
  diferenciaVariantes,
  estadoNodos,
  estimarCosto,
  etiquetaTrafico,
  fijarAvance,
  getComponente,
  getVariante,
  idArista,
  inyectarFalla,
  marcarProgreso,
  nodosDeVariante,
  pasoAnterior,
  pendientesPorModulo,
  progresoComponentes,
  resaltadoTrafico,
  restablecer,
  resumenProgreso,
  retrocederFase,
  siguientePaso,
  varianteEfectiva,
  type Actor,
  type Arista,
  type Capa,
  type CategoriaCobro,
  type CoberturaSeguridad,
  type ControlId,
  type EstadoRuta,
  type EstadoSeguridad,
  type FallaId,
  type ModoCobro,
  type ModoId,
  type Nodo,
  type NodoId,
  type Progreso,
  type RutaId,
  type Salud,
  type VarianteId,
} from '@/lib/reference-architecture'
import { MAX_ZOOM, panViewBox, toViewBoxString, zoomViewBox, type ViewBox } from '@/lib/viewbox'

// Same palette as VpcReferenceDiagram so both diagrams read as one app.
const INK = '#1c1a17'
const MUTED = '#5c574f'
const ACCENT = '#8a5a2b'
const LINE = '#c9c2b4'
const HIGHLIGHT = '#ff9900'

const CAPA_ESTILO: Record<Capa, { fill: string; stroke: string; titulo: string }> = {
  borde: { fill: '#fbf3e6', stroke: '#8a5a2b', titulo: 'Borde' },
  publica: { fill: '#f3ead9', stroke: '#8a5a2b', titulo: 'Red pública' },
  privada: { fill: '#eef1ec', stroke: '#4f6b57', titulo: 'Red privada' },
  datos: { fill: '#e9eef5', stroke: '#3f5f86', titulo: 'Datos' },
  transversal: { fill: '#f1efea', stroke: '#6b6457', titulo: 'Transversal' },
}

// Colorblind-safe pair (crimson vs. amber) that never relies on color alone:
// each state also gets a dash pattern, an icon and text in the accessible name.
const SALUD_ESTILO: Record<Exclude<Salud, 'ok'>, { fill: string; stroke: string; texto: string; icono: string }> = {
  caido: { fill: '#f6d5d8', stroke: '#9f1d35', texto: 'caído', icono: '✕' },
  degradado: { fill: '#fdf0c2', stroke: '#8a6100', texto: 'degradado', icono: '!' },
}

const COBRO_ETIQUETA: Record<ModoCobro, string> = { 'fijo-por-hora': 'Fijo por hora', 'por-uso': 'Por uso', 'sin-costo': 'Sin costo' }

/**
 * Mode-specific coloring (Seguridad, Costos, Ruta). Like SALUD_ESTILO, color is never alone:
 * every paint carries a dash pattern or icon and a text that goes into the accessible name.
 */
type Pintura = { fill: string; stroke: string; dash?: string; icono: string; texto: string }

const PROTEGIDO = { fill: '#e3eefa', stroke: '#1f5f99' }
const EXPUESTO: Omit<Pintura, 'texto'> = { fill: '#f6d5d8', stroke: '#9f1d35', dash: '7 4', icono: '!' }

const CATEGORIA_ESTILO: Record<CategoriaCobro, Omit<Pintura, 'texto'> & { titulo: string; texto: string; ayuda: string }> = {
  'fijo-y-uso': { fill: '#f6d5d8', stroke: '#9f1d35', icono: 'h+u', titulo: 'Por hora y por uso', texto: 'fijo por hora y por uso', ayuda: 'Cobra cada hora que existe y además según el uso.' },
  'fijo-por-hora': { fill: '#efdff3', stroke: '#6d2f7c', icono: 'h', titulo: 'Por hora', texto: 'fijo por hora', ayuda: 'Cobra cada hora que está encendido, atienda o no peticiones.' },
  'por-uso': { fill: '#fdf0c2', stroke: '#8a6100', dash: '6 3', icono: 'u', titulo: 'Por uso', texto: 'por uso', ayuda: 'Cobra según lo que se usa o se guarda.' },
  'sin-costo': { fill: '#e7efe8', stroke: '#4f6b57', dash: '2 3', icono: '0', titulo: 'Sin costo propio', texto: 'sin costo', ayuda: 'No tiene cargo propio; se pagan los recursos que contiene o que usan.' },
}

const PROGRESO_ESTILO: Record<Progreso, Omit<Pintura, 'texto'> & { titulo: string; texto: string }> = {
  dominado: { fill: '#dcefe0', stroke: '#2f6b3f', icono: '✓', titulo: 'Dominado', texto: 'dominado' },
  'en-curso': { fill: '#fdf0c2', stroke: '#8a6100', dash: '6 3', icono: '▸', titulo: 'En curso', texto: 'en curso' },
  'no-visto': { fill: '#f1efea', stroke: '#6b6457', dash: '2 3', icono: '○', titulo: 'No visto', texto: 'no visto' },
}

const SORPRESA_NAT = 'sorpresa: cobra por hora aunque no haya tráfico'
const ARISTA_SORPRESA = '#9f1d35'

const USUARIO = { x: 420, y: 12, w: 120, h: 52 }

type Tono = 'activo' | 'anterior' | 'recorrido' | 'atenuado' | 'normal'
type Visual = { tono: Tono; salud: Salud; pintura?: Pintura }
type Caja = { x: number; y: number; w: number; h: number }
type MapaNodos = Map<NodoId, Nodo>

const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

function anclas(de: Caja, a: Caja) {
  if (a.y >= de.y + de.h) return { x1: de.x + de.w / 2, y1: de.y + de.h, x2: a.x + a.w / 2, y2: a.y }
  if (a.y + a.h <= de.y) return { x1: de.x + de.w / 2, y1: de.y, x2: a.x + a.w / 2, y2: a.y + a.h }
  const derecha = a.x >= de.x + de.w
  return { x1: derecha ? de.x + de.w : de.x, y1: de.y + de.h / 2, x2: derecha ? a.x : a.x + a.w, y2: a.y + a.h / 2 }
}

/** Curve that leaves the left side of `de`, goes around what is in between and lands on the top of `a`. */
function curva(de: Caja, a: Caja) {
  const x0 = de.x
  const y0 = de.y + de.h / 2
  const lateral = Math.min(de.x, a.x) - 40
  const x1 = a.x + 20
  return `M${x0} ${y0} C ${lateral} ${y0}, ${lateral} ${a.y}, ${x1} ${a.y}`
}

const TONO_TEXTO: Record<Tono, string> = { activo: 'paso actual', anterior: 'paso anterior', recorrido: 'ya recorrido', atenuado: '', normal: '' }

function nombreAccesible(nodo: Nodo, visual: Visual) {
  const estado = visual.salud !== 'ok' ? SALUD_ESTILO[visual.salud].texto : visual.pintura ? visual.pintura.texto : TONO_TEXTO[visual.tono]
  return [nodo.etiqueta, nodo.detalle, estado].filter(Boolean).join(', ')
}

function useMediaQuery(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    if (typeof window.matchMedia !== 'function') return () => {}
    const media = window.matchMedia(query)
    media.addEventListener('change', notify)
    return () => media.removeEventListener('change', notify)
  }, [query])
  return useSyncExternalStore(
    subscribe,
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

// ─── SVG ─────────────────────────────────────────────────────────────────────

function Marcador({ x, y, visual }: { x: number; y: number; visual: Visual }) {
  if (visual.salud !== 'ok') {
    const estilo = SALUD_ESTILO[visual.salud]
    return <g aria-hidden="true">
      {visual.salud === 'caido'
        ? <circle cx={x} cy={y} r={11} fill={estilo.stroke} />
        : <path d={`M${x} ${y - 12} L${x + 12} ${y + 9} L${x - 12} ${y + 9} Z`} fill={estilo.stroke} />}
      <text x={x} y={y + 5} fontSize={13} fontWeight={700} fill="white" textAnchor="middle">{estilo.icono}</text>
    </g>
  }
  if (visual.pintura) {
    const ancho = 14 + visual.pintura.icono.length * 8
    return <g aria-hidden="true">
      <rect x={x + 11 - ancho} y={y - 11} width={ancho} height={22} rx={11} fill={visual.pintura.stroke} />
      <text x={x + 11 - ancho / 2} y={y + 5} fontSize={13} fontWeight={700} fill="white" textAnchor="middle">{visual.pintura.icono}</text>
    </g>
  }
  if (visual.tono === 'activo') return <circle aria-hidden="true" cx={x} cy={y} r={8} fill={HIGHLIGHT} stroke={INK} strokeWidth={1.5} />
  if (visual.tono === 'recorrido' || visual.tono === 'anterior') {
    return <path aria-hidden="true" d={`M${x - 7} ${y} l5 5 l9 -10`} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  }
  return null
}

function estiloCaja(nodo: Nodo, visual: Visual) {
  const capa = CAPA_ESTILO[nodo.capa]
  if (visual.salud !== 'ok') {
    const salud = SALUD_ESTILO[visual.salud]
    return { fill: salud.fill, stroke: salud.stroke, strokeWidth: 2.5, dash: visual.salud === 'caido' ? '7 4' : '2 3', opacity: 1 }
  }
  if (visual.pintura) return { fill: visual.pintura.fill, stroke: visual.pintura.stroke, strokeWidth: 2.5, dash: visual.pintura.dash, opacity: 1 }
  switch (visual.tono) {
    case 'activo': return { fill: '#ffe2b3', stroke: '#b35900', strokeWidth: 3.5, dash: undefined, opacity: 1 }
    case 'anterior': return { fill: capa.fill, stroke: ACCENT, strokeWidth: 2.5, dash: '6 3', opacity: 1 }
    case 'recorrido': return { fill: capa.fill, stroke: ACCENT, strokeWidth: 2, dash: undefined, opacity: 1 }
    case 'atenuado': return { fill: capa.fill, stroke: capa.stroke, strokeWidth: 1.25, dash: undefined, opacity: 0.4 }
    default: return { fill: nodo.contenedor ? 'none' : capa.fill, stroke: capa.stroke, strokeWidth: 1.25, dash: undefined, opacity: 1 }
  }
}

function contenedorFill(nodo: Nodo, visual: Visual) {
  if (visual.salud !== 'ok' || visual.tono === 'activo') return estiloCaja(nodo, visual).fill
  if (nodo.componente === 'subred-publica') return CAPA_ESTILO.publica.fill
  if (nodo.componente === 'subred-privada') return CAPA_ESTILO.privada.fill
  return 'transparent'
}

type NodoSvgProps = {
  nodo: Nodo
  visual: Visual
  seleccionado: boolean
  onActivar: (id: NodoId, origen: Element) => void
  onFoco: (nodo: Nodo) => void
}

function activarConTeclado(event: KeyboardEvent<Element>, accion: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    accion()
  }
}

function NodoSvg({ nodo, visual, seleccionado, onActivar, onFoco }: NodoSvgProps) {
  const estilo = estiloCaja(nodo, visual)
  const activar = (element: Element) => onActivar(nodo.id, element)
  const comunes = {
    role: 'button',
    tabIndex: 0,
    'aria-label': nombreAccesible(nodo, visual),
    'aria-pressed': seleccionado,
    'data-nodo': nodo.id,
    className: 'group cursor-pointer outline-none',
    onClick: (event: { currentTarget: Element }) => activar(event.currentTarget),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => activarConTeclado(event, () => activar(event.currentTarget)),
    onFocus: () => onFoco(nodo),
  } as const

  if (nodo.contenedor) {
    const asg = nodo.componente === 'auto-scaling-group'
    const az = nodo.componente === 'zona-disponibilidad'
    return <g {...comunes} opacity={estilo.opacity}>
      <rect x={nodo.x} y={nodo.y} width={nodo.w} height={nodo.h} rx={8} fill={contenedorFill(nodo, visual)}
        stroke={seleccionado ? HIGHLIGHT : estilo.stroke} strokeWidth={seleccionado ? 3 : Math.max(estilo.strokeWidth, 1.25)}
        strokeDasharray={estilo.dash ?? (az || asg ? '6 4' : undefined)} />
      <rect x={nodo.x - 3} y={nodo.y - 3} width={nodo.w + 6} height={nodo.h + 6} rx={10} fill="none" stroke={HIGHLIGHT} strokeWidth={4}
        className="opacity-0 group-hover:opacity-50 group-focus-visible:opacity-100" />
      <text x={nodo.x + 12} y={nodo.y + 24} fontSize={15} fontWeight={600} fill={asg ? ACCENT : INK}>
        {nodo.etiqueta}{nodo.detalle ? ` · ${nodo.detalle}` : ''}
      </text>
      <Marcador x={nodo.x + nodo.w - 18} y={nodo.y + 18} visual={visual} />
    </g>
  }

  return <g {...comunes} opacity={estilo.opacity}>
    <rect x={nodo.x - 5} y={nodo.y - 5} width={nodo.w + 10} height={nodo.h + 10} rx={10} fill="none" stroke={HIGHLIGHT} strokeWidth={4}
      className="opacity-0 group-focus-visible:opacity-100" />
    <rect x={nodo.x} y={nodo.y} width={nodo.w} height={nodo.h} rx={7} fill={estilo.fill}
      stroke={seleccionado ? HIGHLIGHT : estilo.stroke} strokeWidth={seleccionado ? 3.5 : estilo.strokeWidth}
      strokeDasharray={estilo.dash} className="group-hover:stroke-[#ff9900]" />
    <text x={nodo.x + nodo.w / 2} y={nodo.y + (nodo.detalle ? 28 : 38)} fontSize={16} fontWeight={600} fill={INK} textAnchor="middle">{nodo.etiqueta}</text>
    {nodo.detalle && <text x={nodo.x + nodo.w / 2} y={nodo.y + 48} fontSize={13} fill={MUTED} textAnchor="middle">{nodo.detalle}</text>}
    <Marcador x={nodo.x + nodo.w - 14} y={nodo.y + 14} visual={visual} />
  </g>
}

/** What a simpler variant lacks stays as a faint outline, so the comparison is visible without being interactive. */
function NodoFantasma({ nodo }: { nodo: Nodo }) {
  return <g aria-hidden="true" opacity={0.22} pointerEvents="none">
    <rect x={nodo.x} y={nodo.y} width={nodo.w} height={nodo.h} rx={nodo.contenedor ? 8 : 7} fill="none" stroke={MUTED} strokeWidth={1.25} strokeDasharray="3 4" />
    {!nodo.contenedor && <text x={nodo.x + nodo.w / 2} y={nodo.y + nodo.h / 2 + 5} fontSize={14} fill={MUTED} textAnchor="middle">{nodo.etiqueta}</text>}
  </g>
}

const porArea = (a: Nodo, b: Nodo) => b.w * b.h - a.w * a.h

// ─── Panel de componente ─────────────────────────────────────────────────────

type ProgresoPanel = { valor: Progreso; onCambiar: (progreso: Progreso) => void }

function PanelComponente({ nodo, tituloId, tituloRef, onCerrar, progreso }: { nodo: Nodo; tituloId: string; tituloRef?: Ref<HTMLHeadingElement>; onCerrar?: () => void; progreso?: ProgresoPanel }) {
  const componente = getComponente(nodo.componente)
  return <div className="p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.14em] text-accent uppercase">{CAPA_ESTILO[nodo.capa].titulo}{nodo.detalle ? ` · ${nodo.detalle}` : ''}</p>
        <h2 id={tituloId} ref={tituloRef} tabIndex={-1} className="mt-2 text-xl font-semibold tracking-[-0.02em] outline-none">{componente.nombre}</h2>
      </div>
      {onCerrar && <button type="button" onClick={onCerrar} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md border border-border text-lg hover:bg-foreground/5" aria-label="Cerrar detalle">✕</button>}
    </div>
    {progreso && <div className="mt-5 rounded-md border border-border p-4">
      <h3 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Tu progreso</h3>
      <div role="group" aria-label={`Progreso en ${componente.nombre}`} className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        {(Object.keys(PROGRESO_ESTILO) as Progreso[]).map((valor) => <button key={valor} type="button" aria-pressed={progreso.valor === valor}
          onClick={() => progreso.onCambiar(valor)} className={`${botonClase(progreso.valor === valor)} text-center`}>{PROGRESO_ESTILO[valor].titulo}</button>)}
      </div>
      {progreso.valor === 'no-visto' && componente.modulo.href && <Link href={componente.modulo.href}
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Estudiarlo en {componente.modulo.etiqueta} →
      </Link>}
    </div>}
    <dl className="mt-5 space-y-5 text-sm leading-6 text-foreground/80">
      <div><dt><h3 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Qué es</h3></dt><dd className="mt-1">{componente.queEs}</dd></div>
      <div><dt><h3 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">En qué módulo</h3></dt><dd className="mt-1">
        {componente.modulo.href
          ? <Link href={componente.modulo.href} className="inline-flex min-h-11 items-center font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">{componente.modulo.etiqueta}</Link>
          : <span className="font-medium">{componente.modulo.etiqueta}</span>}
        {componente.modulo.nota && <p className="text-foreground/65">{componente.modulo.nota}</p>}
      </dd></div>
      <div><dt><h3 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Por qué está</h3></dt><dd className="mt-1">{componente.porQue}</dd></div>
      <div><dt><h3 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Qué se rompe si lo quitás</h3></dt><dd className="mt-1">{componente.siLoQuitas}</dd></div>
      <div><dt><h3 className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">Cómo cobra</h3></dt><dd className="mt-1">
        <ul className="mb-2 flex flex-wrap gap-2" aria-label="Modalidad de cobro">
          {componente.cobro.modos.map((modo) => <li key={modo} className="rounded-md border border-accent/40 bg-accent/[0.07] px-2 py-0.5 text-xs font-medium text-accent">{COBRO_ETIQUETA[modo]}</li>)}
        </ul>
        {componente.cobro.detalle}
      </dd></div>
    </dl>
  </div>
}

// ─── Controles de modo ───────────────────────────────────────────────────────

const botonClase = (activo: boolean) => `min-h-11 rounded-md border px-3 py-2 text-left text-sm motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${activo ? 'border-accent bg-accent/10 font-semibold' : 'border-border hover:border-accent/60'}`
const tituloSeccion = 'text-xs font-semibold tracking-[0.12em] text-accent uppercase'

function nombreNodo(nodo: Nodo) {
  return `${nodo.etiqueta}${nodo.detalle ? ` (${nodo.detalle})` : ''}`
}

function nombreActor(actor: Actor, mapa: MapaNodos) {
  if (actor === 'usuario') return 'Usuario'
  const nodo = mapa.get(actor)
  return nodo ? nombreNodo(nodo) : actor
}

function listaNombres(ids: NodoId[], mapa: MapaNodos) {
  return ids.map((id) => nombreActor(id, mapa)).join(', ')
}

function ControlesTrafico({ estado, onCambiar, mapa }: { estado: ReturnType<typeof crearEstadoTrafico>; onCambiar: (estado: ReturnType<typeof crearEstadoTrafico>) => void; mapa: MapaNodos }) {
  const ruta = RUTAS_TRAFICO[estado.ruta]
  const paso = ruta.pasos[estado.indice]
  const total = ruta.pasos.length
  return <div className="space-y-4">
    <div role="group" aria-label="Ruta de la petición" className="grid gap-2 sm:grid-cols-3">
      {(Object.keys(RUTAS_TRAFICO) as RutaId[]).map((id) => <button key={id} type="button" aria-pressed={estado.ruta === id} onClick={() => onCambiar(cambiarRuta(estado, id))} className={botonClase(estado.ruta === id)}>
        <span className="block">{RUTAS_TRAFICO[id].titulo}</span>
        <span className="mt-0.5 block text-xs font-normal text-foreground/60">{RUTAS_TRAFICO[id].descripcion}</span>
      </button>)}
    </div>
    <div className="rounded-md border border-accent/35 bg-accent/[0.06] p-4">
      <div aria-live="polite">
        <p className={tituloSeccion}>Paso {estado.indice + 1} de {total} · {nombreActor(paso.actor, mapa)}</p>
        <p className="mt-2 text-sm leading-6"><span className="font-semibold">Qué hace: </span>{paso.accion}</p>
        <p className="mt-1 text-sm leading-6"><span className="font-semibold">Qué decide: </span>{paso.decision}</p>
        {paso.apoyos && <p className="mt-1 text-xs text-foreground/65">También participan: {paso.apoyos.map((actor) => nombreActor(actor, mapa)).join(', ')}.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onCambiar(pasoAnterior(estado))} disabled={estado.indice === 0} className={botonClase(false)}>Paso anterior</button>
        <button type="button" onClick={() => onCambiar(siguientePaso(estado))} disabled={estado.indice === total - 1} className={botonClase(false)}>Siguiente paso</button>
      </div>
    </div>
  </div>
}

function ControlesFallas({ estado, onCambiar }: { estado: ReturnType<typeof crearEstadoFallas>; onCambiar: (estado: ReturnType<typeof crearEstadoFallas>) => void }) {
  const falla = estado.falla ? FALLAS[estado.falla] : null
  const fase = falla?.fases[estado.fase]
  return <div className="space-y-4">
    <div role="group" aria-label="Falla a inyectar" className="grid gap-2 sm:grid-cols-3">
      {(Object.keys(FALLAS) as FallaId[]).map((id) => <button key={id} type="button" aria-pressed={estado.falla === id} onClick={() => onCambiar(inyectarFalla(estado, id))} className={botonClase(estado.falla === id)}>{FALLAS[id].titulo}</button>)}
    </div>
    <Leyenda />
    <div className="rounded-md border border-accent/35 bg-accent/[0.06] p-4">
      <div aria-live="polite">
        {falla && fase ? <>
          <p className={tituloSeccion}>{falla.titulo} · Fase {estado.fase + 1} de {falla.fases.length}</p>
          <p className="mt-2 text-sm font-semibold">{fase.titulo}</p>
          <p className="mt-1 text-sm leading-6">{fase.descripcion}</p>
        </> : <p className="text-sm leading-6">Todo está sano. Elegí una falla para inyectarla y avanzá fase por fase.</p>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onCambiar(retrocederFase(estado))} disabled={!falla || estado.fase === 0} className={botonClase(false)}>Fase anterior</button>
        <button type="button" onClick={() => onCambiar(avanzarFase(estado))} disabled={!falla || estado.fase === falla.fases.length - 1} className={botonClase(false)}>Siguiente fase</button>
        <button type="button" onClick={() => onCambiar(restablecer())} disabled={!falla} className={botonClase(false)}>Restablecer</button>
      </div>
    </div>
    {falla && <div className="grid gap-4 text-sm leading-6 md:grid-cols-3">
      <div><h3 className={tituloSeccion}>Sigue funcionando</h3><ul className="mt-1 list-disc space-y-1 pl-5">{falla.sigueFuncionando.map((texto) => <li key={texto}>{texto}</li>)}</ul></div>
      <div><h3 className={tituloSeccion}>Se degrada</h3><ul className="mt-1 list-disc space-y-1 pl-5">{falla.seDegrada.map((texto) => <li key={texto}>{texto}</li>)}</ul></div>
      <div><h3 className={tituloSeccion}>Recuperación</h3><p className="mt-1">{falla.recuperacion}</p></div>
    </div>}
  </div>
}

function Muestra({ fill, stroke, dash, icono }: { fill: string; stroke: string; dash?: string; icono?: string }) {
  const estilo = dash === '7 4' || dash === '6 3' ? 'border-dashed' : dash ? 'border-dotted' : 'border-solid'
  return <span aria-hidden="true" className={`inline-flex h-5 min-w-8 shrink-0 items-center justify-center rounded-sm border-2 px-1 text-[10px] font-bold ${estilo}`}
    style={{ backgroundColor: fill, borderColor: stroke, color: stroke }}>{icono}</span>
}

function Leyenda() {
  return <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/75" aria-label="Leyenda de estados">
    <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-4 w-6 rounded-sm border border-[#6b6457] bg-[#f1efea]" />Sano</li>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-flex h-4 w-6 items-center justify-center rounded-sm border-2 border-dashed border-[#9f1d35] bg-[#f6d5d8] text-[10px] font-bold text-[#9f1d35]">✕</span>Caído</li>
    <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-flex h-4 w-6 items-center justify-center rounded-sm border-2 border-dotted border-[#8a6100] bg-[#fdf0c2] text-[10px] font-bold text-[#8a6100]">!</span>Degradado</li>
  </ul>
}

// Modo 2 · Seguridad

function ControlesSeguridad({ estado, onCambiar, cobertura, variante, mapa }: { estado: EstadoSeguridad; onCambiar: (estado: EstadoSeguridad) => void; cobertura: CoberturaSeguridad; variante: VarianteId; mapa: MapaNodos }) {
  const aristas = new Map(aristasDeVariante(variante).map((arista) => [idArista(arista), arista]))
  const activos = CONTROLES_SEGURIDAD.filter(({ id }) => estado.activos.includes(id))
  const n = activos.length
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-foreground/75">Activá una o varias capas. Cada una se ilumina en azul donde actúa; en rojo quedan los componentes que ninguna capa activa protege. Ninguna capa cubre todo: la defensa en profundidad es la suma.</p>
    <div role="group" aria-label="Capas de seguridad" className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-4">
      {CONTROLES_SEGURIDAD.map((control) => <button key={control.id} type="button" aria-pressed={estado.activos.includes(control.id)}
        onClick={() => onCambiar(alternarControl(estado, control.id))} className={botonClase(estado.activos.includes(control.id))}>
        <span aria-hidden="true" className="mr-2 inline-block w-4 text-center">{estado.activos.includes(control.id) ? '✓' : '+'}</span>{control.titulo}
      </button>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => onCambiar(activarTodosControles())} disabled={n === CONTROLES_SEGURIDAD.length} className={botonClase(false)}>Activar todas</button>
      <button type="button" onClick={() => onCambiar(desactivarTodosControles())} disabled={n === 0} className={botonClase(false)}>Ninguna</button>
    </div>
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/75" aria-label="Leyenda de seguridad">
      <li className="flex items-center gap-2"><Muestra {...PROTEGIDO} icono="2" />Protegido (el número es cuántas capas activas actúan)</li>
      <li className="flex items-center gap-2"><Muestra {...EXPUESTO} />Sin ninguna capa activa</li>
      <li className="flex items-center gap-2"><span aria-hidden="true" className="inline-block h-1 w-8 rounded bg-[#1f5f99]" />Tramo protegido</li>
    </ul>
    <div className="rounded-md border border-accent/35 bg-accent/[0.06] p-4 text-sm leading-6" aria-live="polite">
      <p className="font-semibold">{n === 0 ? 'Ninguna capa activa.' : `${n} ${n === 1 ? 'capa activa' : 'capas activas'}.`}</p>
      {cobertura.sinCobertura.length > 0
        ? <p className="mt-1">Sin ninguna capa: {listaNombres(cobertura.sinCobertura, mapa)}.</p>
        : <p className="mt-1">Ningún componente queda sin cobertura.</p>}
      {n > 0 && cobertura.unaSolaCapa.length > 0 && <p className="mt-1">Dependen de una sola capa, así que si esa capa falta o está mal configurada quedan expuestos: {listaNombres(cobertura.unaSolaCapa, mapa)}.</p>}
    </div>
    {activos.length > 0 && <div className="grid gap-4 xl:grid-cols-2">
      {activos.map((control) => {
        const nodos = control.nodos.filter((id) => mapa.has(id) && OBJETIVOS_SEGURIDAD.includes(id))
        const tramos = control.aristas.flatMap((id) => { const arista = aristas.get(id); return arista ? [arista] : [] })
        return <article key={control.id} className="rounded-md border border-border p-4 text-sm leading-6" aria-labelledby={`control-${control.id}`}>
          <h3 id={`control-${control.id}`} className="text-base font-semibold">{control.titulo}</h3>
          <h4 className={`mt-3 ${tituloSeccion}`}>Dónde actúa</h4>
          <p className="mt-1">{control.alcance}</p>
          {nodos.length + tramos.length === 0
            ? <p className="mt-1 font-medium">En esta variante no tiene dónde actuar.</p>
            : <>
              {nodos.length > 0 && <p className="mt-1 text-foreground/75">Componentes: {listaNombres(nodos, mapa)}.</p>}
              {tramos.length > 0 && <p className="mt-1 text-foreground/75">Tramos: {tramos.map(({ de, a }) => `${nombreActor(de, mapa)} → ${nombreActor(a, mapa)}`).join('; ')}.</p>}
            </>}
          <h4 className={`mt-3 ${tituloSeccion}`}>Protege contra</h4>
          <ul className="mt-1 list-disc space-y-1 pl-5">{control.protegeContra.map((texto) => <li key={texto}>{texto}</li>)}</ul>
          <div className="mt-3 rounded-md border-l-4 border-[#9f1d35] bg-[#f6d5d8]/40 py-2 pr-2 pl-3">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-[#9f1d35] uppercase">Qué no cubre</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5">{control.noCubre.map((texto) => <li key={texto}>{texto}</li>)}</ul>
          </div>
          {control.herramienta && <Link href={control.herramienta.href} className="mt-2 inline-flex min-h-11 items-center font-medium text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">Probalo en el {control.herramienta.etiqueta}</Link>}
        </article>
      })}
    </div>}
  </div>
}

// Modo 4 · Costos

function ControlesCostos({ variante, trafico, onTrafico }: { variante: VarianteId; trafico: number; onTrafico: (valor: number) => void }) {
  const idDeslizador = useId()
  const estimacion = estimarCosto(variante, trafico)
  const enReposo = estimarCosto(variante, 0)
  const maximo = Math.max(...estimacion.partidas.map(({ unidades }) => unidades), 1)
  const tieneEntreAz = estimacion.partidas.some(({ id }) => id === 'entre-az')
  const sinCosto = [...new Set(nodosDeVariante(variante).map(({ componente }) => componente))].filter((id) => categoriaCobro(id) === 'sin-costo')
  const [nat, entreAz] = SORPRESAS_COSTO
  const porcentajeNat = enReposo.total > 0 ? Math.round((enReposo.natEnReposo / enReposo.total) * 100) : 0
  return <div className="space-y-4">
    <p role="note" className="rounded-md border-2 border-dashed border-[#8a6100] bg-[#fdf0c2]/50 p-3 text-sm leading-6">
      <span className="font-semibold">Estimación ilustrativa. </span>{AVISO_ESTIMACION}
    </p>
    <ul className="grid gap-2 text-xs text-foreground/75 min-[400px]:grid-cols-2" aria-label="Leyenda de cobro">
      {(Object.keys(CATEGORIA_ESTILO) as CategoriaCobro[]).map((categoria) => {
        const estilo = CATEGORIA_ESTILO[categoria]
        return <li key={categoria} className="flex items-start gap-2"><Muestra {...estilo} /><span><span className="font-semibold text-foreground">{estilo.titulo}.</span> {estilo.ayuda}</span></li>
      })}
    </ul>
    <div className="rounded-md border border-accent/35 bg-accent/[0.06] p-4">
      <label htmlFor={idDeslizador} className="block text-sm font-semibold">Volumen de tráfico mensual</label>
      <input id={idDeslizador} type="range" min={0} max={TRAFICO_MAXIMO} step={10} value={trafico}
        onChange={(event) => onTrafico(Number(event.target.value))}
        aria-valuetext={`${etiquetaTrafico(trafico)}, nivel ${trafico} de ${TRAFICO_MAXIMO}`}
        className="mt-2 h-11 w-full cursor-pointer accent-[#8a5a2b]" />
      <p className="text-xs text-foreground/65">{etiquetaTrafico(trafico)} · nivel {trafico} de {TRAFICO_MAXIMO} (escala relativa, no GB reales)</p>
      <p className="mt-3 text-sm" aria-live="polite" data-testid="costo-total">
        <span className="text-2xl font-semibold tracking-[-0.02em]">≈ {numero.format(estimacion.total)} u</span> al mes en la variante {getVariante(variante).titulo}: {numero.format(estimacion.fijo)} u fijas y {numero.format(estimacion.variable)} u que dependen del tráfico.
      </p>
      {!estimacion.escala && <p className="mt-2 text-sm leading-6">Esta variante no escala: con tráfico alto el costo casi no sube, pero la única instancia se satura y el sitio se degrada.</p>}
    </div>
    <div>
      <h3 className={tituloSeccion}>Cargos sorpresa</h3>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <article className="rounded-md border-2 border-[#9f1d35] p-4 text-sm leading-6" aria-labelledby="sorpresa-nat">
          <h4 id="sorpresa-nat" className="font-semibold"><span aria-hidden="true" className="mr-1 text-[#9f1d35]">⚠</span>{nat.titulo}</h4>
          <p className="mt-1">{nat.descripcion}</p>
          <p className="mt-2 font-medium">{enReposo.natEnReposo > 0
            ? `Sin tráfico, los NAT Gateway suman ${numero.format(enReposo.natEnReposo)} u de ${numero.format(enReposo.total)} u (${porcentajeNat} %) en esta estimación.`
            : 'Esta variante no tiene NAT Gateway: este cargo no aparece.'}</p>
        </article>
        <article className="rounded-md border-2 border-[#9f1d35] p-4 text-sm leading-6" aria-labelledby="sorpresa-az">
          <h4 id="sorpresa-az" className="font-semibold"><span aria-hidden="true" className="mr-1 text-[#9f1d35]">⚠</span>{entreAz.titulo}</h4>
          <p className="mt-1">{entreAz.descripcion}</p>
          <p className="mt-2 font-medium">{tieneEntreAz
            ? 'En el diagrama es la línea roja punteada de la EC2 de us-east-1b a la RDS primaria.'
            : 'Esta variante usa una sola AZ: no hay tráfico entre AZ, ni tampoco alta disponibilidad.'}</p>
        </article>
      </div>
    </div>
    <div>
      <h3 className={tituloSeccion}>Qué pesa en la estimación</h3>
      <ul className="mt-2 space-y-2">
        {estimacion.partidas.map((partida) => <li key={partida.id} className="rounded-md border border-border p-3 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold">{partida.sorpresa && <span aria-hidden="true" className="mr-1 text-[#9f1d35]">⚠</span>}{partida.titulo}{partida.sorpresa && <span className="sr-only"> (cargo sorpresa)</span>}</span>
            <span className="font-mono text-xs">{numero.format(partida.unidades)} u</span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 rounded bg-foreground/10">
            <div className={`h-2 rounded ${partida.sorpresa ? 'bg-[#9f1d35]' : 'bg-accent'}`} style={{ width: `${(partida.unidades / maximo) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs leading-5 text-foreground/65">{partida.nota}</p>
        </li>)}
      </ul>
      {sinCosto.length > 0 && <p className="mt-2 text-xs leading-5 text-foreground/65">Sin cargo propio en esta variante: {sinCosto.map((id) => getComponente(id).nombre).join(', ')}.</p>}
    </div>
  </div>
}

// Modo 5 · Ruta de aprendizaje

function ControlesRuta({ estado, onCambiar }: { estado: EstadoRuta; onCambiar: (estado: EstadoRuta) => void }) {
  const resumen = resumenProgreso(estado)
  const pendientes = pendientesPorModulo(estado)
  const opciones = [...MODULOS_RUTA.map(({ etiqueta }) => `Cursando ${etiqueta}`), 'Terminé los cinco módulos']
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-foreground/75">Elegí por dónde vas: los módulos anteriores quedan como dominados, el actual en curso y los siguientes sin ver. Después podés ajustar cada componente desde su panel.</p>
    <div role="group" aria-label="¿Por dónde vas en el curso?" className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-3">
      {opciones.map((texto, indice) => <button key={texto} type="button" aria-pressed={estado.avance === indice}
        onClick={() => onCambiar(fijarAvance(estado, indice))} className={botonClase(estado.avance === indice)}>{texto}</button>)}
    </div>
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground/75" aria-label="Leyenda de progreso">
      {(Object.keys(PROGRESO_ESTILO) as Progreso[]).map((valor) => <li key={valor} className="flex items-center gap-2"><Muestra {...PROGRESO_ESTILO[valor]} />{PROGRESO_ESTILO[valor].titulo}</li>)}
    </ul>
    <p className="rounded-md border border-accent/35 bg-accent/[0.06] p-4 text-sm leading-6" aria-live="polite">
      {resumen.dominado} dominados, {resumen['en-curso']} en curso y {resumen['no-visto']} sin ver, de {resumen.dominado + resumen['en-curso'] + resumen['no-visto']} componentes.
    </p>
    <div>
      <h3 className={tituloSeccion}>Qué te falta ver</h3>
      {pendientes.length === 0
        ? <p className="mt-1 text-sm">No queda nada sin ver.</p>
        : <ul className="mt-2 space-y-3">
          {pendientes.map(({ modulo, componentes }) => <li key={modulo.id} className="text-sm">
            <Link href={modulo.href} className="inline-flex min-h-11 items-center font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">{modulo.etiqueta}</Link>
            <ul className="flex flex-wrap gap-2">
              {componentes.map((id) => {
                const componente = getComponente(id)
                return <li key={id}><Link href={componente.modulo.href ?? modulo.href} className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm hover:border-accent/60">{componente.nombre}</Link></li>
              })}
            </ul>
          </li>)}
        </ul>}
    </div>
    <p className="text-xs leading-5 text-foreground/60">Tu progreso vive solo en esta pestaña: no se guarda ni se envía a ningún lado, y se reinicia al recargar la página.</p>
  </div>
}

// Variantes

function PanelVariante({ variante }: { variante: VarianteId }) {
  const indice = VARIANTES.findIndex(({ id }) => id === variante)
  const actual = VARIANTES[indice]
  const anterior = indice > 0 ? VARIANTES[indice - 1] : null
  const nuevos = anterior ? diferenciaVariantes(anterior.id, actual.id).agregados : []
  const desdeMinima = actual.id === 'completa' ? diferenciaVariantes('minima', 'completa').agregados : []
  return <section aria-labelledby="variante-titulo" className="mt-6 border-t border-border pt-6">
    <h3 id="variante-titulo" className="text-base font-semibold">Variante {actual.titulo}</h3>
    <p className="mt-1 text-sm leading-6 text-foreground/75">{actual.descripcion}</p>
    {anterior && actual.frenteAnterior && <>
      <p className="mt-2 text-sm leading-6 text-foreground/75">Componentes nuevos frente a la {anterior.titulo}: {nuevos.map((id) => getComponente(id).nombre).join(', ')}.</p>
      <div className="mt-4 grid gap-4 text-sm leading-6 md:grid-cols-2">
        <div><h4 className={tituloSeccion}>Gana frente a la {anterior.titulo}</h4><ul className="mt-1 list-disc space-y-1 pl-5">{actual.frenteAnterior.gana.map((texto) => <li key={texto}>{texto}</li>)}</ul></div>
        <div><h4 className={tituloSeccion}>Cuesta más frente a la {anterior.titulo}</h4><ul className="mt-1 list-disc space-y-1 pl-5">{actual.frenteAnterior.cuestaMas.map((texto) => <li key={texto}>{texto}</li>)}</ul></div>
      </div>
    </>}
    <div className="mt-4 text-sm leading-6"><h4 className={tituloSeccion}>Le falta</h4><ul className="mt-1 list-disc space-y-1 pl-5">{actual.leFalta.map((texto) => <li key={texto}>{texto}</li>)}</ul></div>
    {desdeMinima.length > 0 && <details className="mt-4 rounded-md border border-border text-sm leading-6">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 font-semibold focus-visible:outline-2 focus-visible:outline-accent">Por qué existe cada componente que la Completa suma a la Mínima ({desdeMinima.length})</summary>
      <dl className="space-y-3 px-4 pb-4">
        {desdeMinima.map((id) => <div key={id}><dt className="font-semibold">{getComponente(id).nombre}</dt><dd className="text-foreground/75">{getComponente(id).porQue}</dd></div>)}
      </dl>
    </details>}
  </section>
}

// ─── Componente principal ────────────────────────────────────────────────────

const PASO_PAN = 0.2
const MODOS_CON_VARIANTE: ModoId[] = ['seguridad', 'costos', 'ruta-aprendizaje']

export function ReferenceArchitectureDiagram() {
  const [modo, setModo] = useState<ModoId>('trafico')
  const [varianteElegida, setVariante] = useState<VarianteId>('completa')
  const [trafico, setTrafico] = useState(() => crearEstadoTrafico('estatico-hit'))
  const [fallas, setFallas] = useState(crearEstadoFallas)
  const [seguridad, setSeguridad] = useState(crearEstadoSeguridad)
  const [volumen, setVolumen] = useState(30)
  const [ruta, setRuta] = useState(crearEstadoRuta)
  const [seleccionElegida, setSeleccion] = useState<NodoId | null>(null)
  const [vista, setVista] = useState<ViewBox>(DIAGRAMA)
  const acoplado = useMediaQuery('(min-width: 96rem)')

  const dialogRef = useRef<HTMLDialogElement>(null)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  const disparadorRef = useRef<HTMLElement | SVGElement | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const arrastre = useRef<{ x: number; y: number; id: number; moviendo: boolean } | null>(null)
  const tituloId = useId()
  const svgTituloId = useId()
  const notaVarianteId = useId()

  const variante = varianteEfectiva(modo, varianteElegida)
  const varianteBloqueada = !MODOS_CON_VARIANTE.includes(modo)
  const nodosVista = nodosDeVariante(variante)
  const mapa: MapaNodos = new Map(nodosVista.map((nodo) => [nodo.id, nodo]))
  const aristasVista = aristasDeVariante(variante)
  const ausentes = NODOS.filter(({ id }) => !mapa.has(id)).sort(porArea)
  const contenedores = nodosVista.filter((nodo) => nodo.contenedor).sort(porArea)
  const hojas = nodosVista.filter((nodo) => !nodo.contenedor)
  const seleccion = seleccionElegida && mapa.has(seleccionElegida) ? seleccionElegida : null

  const resaltado = modo === 'trafico' ? resaltadoTrafico(trafico) : null
  const salud = modo === 'alta-disponibilidad' ? estadoNodos(fallas) : null
  const cobertura = modo === 'seguridad' ? coberturaSeguridad(seguridad, variante) : null
  const progreso = modo === 'ruta-aprendizaje' ? progresoComponentes(ruta) : null
  const aristasSorpresa = new Set(modo === 'costos' ? SORPRESAS_COSTO.flatMap(({ aristas }) => aristas) : [])
  const nodosSorpresa = new Set(modo === 'costos' ? SORPRESAS_COSTO.flatMap(({ nodos }) => nodos) : [])

  const visualDe = (nodo: Nodo): Visual => {
    if (salud) return { tono: 'normal', salud: salud[nodo.id] }
    if (cobertura) {
      const controles = cobertura.porNodo[nodo.id]
      if (controles) {
        const titulos = controles.map((id: ControlId) => CONTROLES_SEGURIDAD.find((control) => control.id === id)!.titulo)
        return { tono: 'normal', salud: 'ok', pintura: { ...PROTEGIDO, icono: String(controles.length), texto: `protegido por: ${titulos.join(', ')}` } }
      }
      if (cobertura.sinCobertura.includes(nodo.id)) return { tono: 'normal', salud: 'ok', pintura: { ...EXPUESTO, texto: 'sin ninguna capa activa' } }
      return { tono: nodo.contenedor ? 'normal' : 'atenuado', salud: 'ok' }
    }
    if (modo === 'costos') {
      const estilo = CATEGORIA_ESTILO[categoriaCobro(nodo.componente)]
      const sorpresa = nodosSorpresa.has(nodo.id)
      return { tono: 'normal', salud: 'ok', pintura: { ...estilo, icono: sorpresa ? '!' : estilo.icono, texto: sorpresa ? `${estilo.texto}, ${SORPRESA_NAT}` : estilo.texto } }
    }
    if (progreso) {
      const estilo = PROGRESO_ESTILO[progreso[nodo.componente]]
      return { tono: 'normal', salud: 'ok', pintura: { ...estilo } }
    }
    if (!resaltado) return { tono: 'normal', salud: 'ok' }
    if (resaltado.activos.includes(nodo.id)) return { tono: 'activo', salud: 'ok' }
    if (resaltado.anterior === nodo.id) return { tono: 'anterior', salud: 'ok' }
    if (resaltado.recorridos.includes(nodo.id)) return { tono: 'recorrido', salud: 'ok' }
    return { tono: nodo.contenedor ? 'normal' : 'atenuado', salud: 'ok' }
  }

  const estiloArista = (arista: Arista) => {
    const id = idArista(arista)
    if (cobertura) {
      return cobertura.porArista[id] ? { stroke: PROTEGIDO.stroke, width: 4, dash: undefined, opacity: 1 } : { stroke: LINE, width: 1.75, dash: arista.punteada ? '4 4' : undefined, opacity: 0.6 }
    }
    if (aristasSorpresa.has(id)) return { stroke: ARISTA_SORPRESA, width: 4, dash: '8 4', opacity: 1 }
    return { stroke: arista.punteada ? ACCENT : LINE, width: 1.75, dash: arista.punteada ? '4 4' : undefined, opacity: 1 }
  }

  const cajaDe = (id: Actor): Caja => (id === 'usuario' ? USUARIO : mapa.get(id)!)

  const abrir = (id: NodoId, origen: Element) => {
    disparadorRef.current = origen as HTMLElement
    setSeleccion(id)
  }

  const cerrarDialogo = () => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (typeof dialog.close === 'function') dialog.close()
    else { dialog.removeAttribute('open'); setSeleccion(null) }
  }

  // Drawer below 2xl: a native modal <dialog> gives focus containment, Esc and an inert background.
  useEffect(() => {
    const dialog = dialogRef.current
    if (acoplado || !seleccion || !dialog) return
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal()
      else dialog.setAttribute('open', '')
    }
    tituloRef.current?.focus()
  }, [seleccion, acoplado])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const alCerrar = () => {
      setSeleccion(null)
      const disparador = disparadorRef.current
      if (disparador && document.contains(disparador)) disparador.focus()
    }
    dialog.addEventListener('close', alCerrar)
    return () => dialog.removeEventListener('close', alCerrar)
  }, [acoplado])

  const zoomeado = vista.w < DIAGRAMA.w

  // Keyboard users tabbing through a zoomed diagram: bring the focused node into view.
  const asegurarVisible = (nodo: Nodo) => {
    setVista((actual) => {
      const dentro = nodo.x >= actual.x && nodo.y >= actual.y && nodo.x + nodo.w <= actual.x + actual.w && nodo.y + nodo.h <= actual.y + actual.h
      if (dentro || nodo.contenedor) return actual
      return panViewBox(actual, nodo.x + nodo.w / 2 - (actual.x + actual.w / 2), nodo.y + nodo.h / 2 - (actual.y + actual.h / 2), DIAGRAMA)
    })
  }

  // Drag to pan. Pointer capture starts only after a real drag, so a plain click still reaches the node.
  const alPresionar = (event: PointerEvent<SVGSVGElement>) => {
    if (!zoomeado || event.button !== 0) return
    arrastre.current = { x: event.clientX, y: event.clientY, id: event.pointerId, moviendo: false }
  }
  const alMover = (event: PointerEvent<SVGSVGElement>) => {
    const inicio = arrastre.current
    const svg = svgRef.current
    if (!inicio || !svg || inicio.id !== event.pointerId) return
    const dx = event.clientX - inicio.x
    const dy = event.clientY - inicio.y
    if (!inicio.moviendo && Math.hypot(dx, dy) < 6) return
    if (!inicio.moviendo) { inicio.moviendo = true; svg.setPointerCapture?.(event.pointerId) }
    const escala = vista.w / svg.getBoundingClientRect().width
    setVista((actual) => panViewBox(actual, -dx * escala, -dy * escala, DIAGRAMA))
    inicio.x = event.clientX
    inicio.y = event.clientY
  }
  const alSoltar = () => { arrastre.current = null }

  const modoInfo = MODOS.find(({ id }) => id === modo)!
  const usuarioActivo = resaltado?.activos.includes('usuario')
  const tieneRds = mapa.has('rds-primaria') && mapa.has('rds-standby')
  const progresoPanel = (id: NodoId): ProgresoPanel | undefined => {
    if (!progreso) return undefined
    const componente = mapa.get(id)!.componente
    return { valor: progreso[componente], onCambiar: (valor) => setRuta((actual) => marcarProgreso(actual, componente, valor)) }
  }

  return <section className="not-prose" aria-labelledby="arquitectura-modos-titulo">
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border p-4 sm:p-6">
        <h2 id="arquitectura-modos-titulo" className="text-lg font-semibold tracking-[-0.02em]">Modo de exploración</h2>
        <p className="mt-1 text-sm leading-6 text-foreground/70">Tocá cualquier componente para ver qué es y dónde se estudia. Cada modo muestra otra forma de leer la misma arquitectura.</p>
        <div role="group" aria-label="Modos del diagrama" className="mt-4 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {MODOS.map((opcion) => <button key={opcion.id} type="button" disabled={!opcion.disponible} aria-pressed={modo === opcion.id}
            onClick={() => setModo(opcion.id)} className={`${botonClase(modo === opcion.id)} min-h-14`}>
            <span className="block"><span className="font-mono text-xs text-accent">{opcion.numero}</span> · {opcion.titulo}</span>
            <span className="mt-0.5 block text-xs font-normal text-foreground/60">{opcion.descripcion}</span>
          </button>)}
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Variante de la arquitectura</h3>
          <div role="group" aria-label="Variante de la arquitectura" aria-describedby={notaVarianteId} className="mt-2 grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
            {VARIANTES.map((opcion) => <button key={opcion.id} type="button" disabled={varianteBloqueada} aria-pressed={variante === opcion.id}
              onClick={() => setVariante(opcion.id)} className={`${botonClase(variante === opcion.id)} text-center`}>{opcion.titulo}</button>)}
          </div>
          <p id={notaVarianteId} className="mt-2 text-xs leading-5 text-foreground/65">
            {varianteBloqueada
              ? 'Los modos 1 y 3 recorren paso a paso la variante Completa. Elegí Seguridad, Costos o Ruta de aprendizaje para comparar las tres variantes.'
              : 'Compará cómo cambian la seguridad, el costo y lo que tenés que estudiar entre una arquitectura mínima y la completa.'}
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <h2 className="sr-only">{modoInfo.titulo}</h2>
        {modo === 'trafico' && <ControlesTrafico estado={trafico} onCambiar={setTrafico} mapa={mapa} />}
        {modo === 'seguridad' && cobertura && <ControlesSeguridad estado={seguridad} onCambiar={setSeguridad} cobertura={cobertura} variante={variante} mapa={mapa} />}
        {modo === 'alta-disponibilidad' && <ControlesFallas estado={fallas} onCambiar={setFallas} />}
        {modo === 'costos' && <ControlesCostos variante={variante} trafico={volumen} onTrafico={setVolumen} />}
        {modo === 'ruta-aprendizaje' && <ControlesRuta estado={ruta} onCambiar={setRuta} />}
        {!varianteBloqueada && <PanelVariante variante={variante} />}
      </div>
    </div>

    <div className="mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="min-w-0">
        {/* ≥ lg: full SVG diagram with pan/zoom */}
        <div className="hidden lg:block">
          <div className="mb-2 flex flex-wrap items-center gap-2" role="group" aria-label="Controles de zoom del diagrama">
            <button type="button" onClick={() => setVista((v) => zoomViewBox(v, 1.5, DIAGRAMA))} disabled={vista.w <= DIAGRAMA.w / MAX_ZOOM + 0.5} className={`${botonClase(false)} min-w-11 text-center`} aria-label="Acercar">+</button>
            <button type="button" onClick={() => setVista((v) => zoomViewBox(v, 1 / 1.5, DIAGRAMA))} disabled={!zoomeado} className={`${botonClase(false)} min-w-11 text-center`} aria-label="Alejar">−</button>
            <button type="button" onClick={() => setVista((v) => panViewBox(v, -v.w * PASO_PAN, 0, DIAGRAMA))} disabled={!zoomeado} className={`${botonClase(false)} min-w-11 text-center`} aria-label="Desplazar a la izquierda">←</button>
            <button type="button" onClick={() => setVista((v) => panViewBox(v, 0, -v.h * PASO_PAN, DIAGRAMA))} disabled={!zoomeado} className={`${botonClase(false)} min-w-11 text-center`} aria-label="Desplazar hacia arriba">↑</button>
            <button type="button" onClick={() => setVista((v) => panViewBox(v, 0, v.h * PASO_PAN, DIAGRAMA))} disabled={!zoomeado} className={`${botonClase(false)} min-w-11 text-center`} aria-label="Desplazar hacia abajo">↓</button>
            <button type="button" onClick={() => setVista((v) => panViewBox(v, v.w * PASO_PAN, 0, DIAGRAMA))} disabled={!zoomeado} className={`${botonClase(false)} min-w-11 text-center`} aria-label="Desplazar a la derecha">→</button>
            <button type="button" onClick={() => setVista(DIAGRAMA)} disabled={!zoomeado} className={botonClase(false)}>Restablecer vista</button>
            <span className="text-xs text-foreground/60" aria-live="polite">Zoom {Math.round((DIAGRAMA.w / vista.w) * 100)}%{zoomeado ? ' · arrastrá para desplazarte' : ''}</span>
          </div>
          <div className="overflow-hidden rounded-md border border-border/60 bg-white">
            <svg ref={svgRef} viewBox={toViewBoxString(vista)} role="group" aria-label="Diagrama completo de la arquitectura de referencia" aria-describedby={svgTituloId}
              className={`block h-auto w-full select-none ${zoomeado ? 'cursor-grab touch-none active:cursor-grabbing' : ''}`}
              onPointerDown={alPresionar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar}>
              <desc id={svgTituloId}>{variante === 'completa'
                ? 'Route 53 y CloudFront en el borde; S3 como origen estático; una VPC 10.0.0.0/16 con dos zonas de disponibilidad, cada una con subred pública (ALB y NAT Gateway) y subred privada (EC2 del Auto Scaling Group, EBS y RDS). Abajo, los servicios transversales.'
                : `Variante ${getVariante(variante).titulo}: ${getVariante(variante).descripcion} Los componentes que esta variante no tiene aparecen como contornos tenues.`}</desc>
              <g aria-hidden="true">
                {ausentes.map((nodo) => <NodoFantasma key={nodo.id} nodo={nodo} />)}
              </g>
              <g aria-hidden="true">
                {aristasVista.map((arista) => {
                  const estilo = estiloArista(arista)
                  const comunes = { stroke: estilo.stroke, strokeWidth: estilo.width, strokeDasharray: estilo.dash, opacity: estilo.opacity, fill: 'none' }
                  return arista.curva
                    ? <path key={idArista(arista)} d={curva(cajaDe(arista.de), cajaDe(arista.a))} {...comunes} />
                    : <line key={idArista(arista)} {...anclas(cajaDe(arista.de), cajaDe(arista.a))} {...comunes} />
                })}
                {tieneRds && <text x={(mapa.get('rds-primaria')!.x + mapa.get('rds-primaria')!.w + mapa.get('rds-standby')!.x) / 2} y={mapa.get('rds-primaria')!.y + 24} fontSize={12} fill={ACCENT} textAnchor="middle">replicación sincrónica</text>}
                {modo === 'costos' && mapa.has('ec2-b') && mapa.has('rds-primaria') && <text x={430} y={742} fontSize={13} fontWeight={700} fill={ARISTA_SORPRESA} textAnchor="middle">entre AZ: se cobra</text>}
                <text x={20} y={912} fontSize={13} fontWeight={600} fill={MUTED}>Servicios transversales</text>
              </g>
              <g>
                <rect x={USUARIO.x} y={USUARIO.y} width={USUARIO.w} height={USUARIO.h} rx={26}
                  fill={usuarioActivo ? '#ffe2b3' : 'white'} stroke={usuarioActivo ? '#b35900' : INK}
                  strokeWidth={usuarioActivo ? 3.5 : 1.25} />
                <text x={USUARIO.x + USUARIO.w / 2} y={USUARIO.y + 32} fontSize={16} fontWeight={600} fill={INK} textAnchor="middle">Usuario</text>
              </g>
              {contenedores.map((nodo) => <NodoSvg key={nodo.id} nodo={nodo} visual={visualDe(nodo)} seleccionado={seleccion === nodo.id} onActivar={abrir} onFoco={asegurarVisible} />)}
              {hojas.map((nodo) => <NodoSvg key={nodo.id} nodo={nodo} visual={visualDe(nodo)} seleccionado={seleccion === nodo.id} onActivar={abrir} onFoco={asegurarVisible} />)}
            </svg>
          </div>
        </div>

        {/* < lg: the same nodes reflowed as a vertical stack of layers */}
        <div role="group" aria-label="Arquitectura por capas" className="space-y-4 lg:hidden">
          {variante !== 'completa' && <p className="text-sm leading-6 text-foreground/70">Variante {getVariante(variante).titulo}: solo se muestran los componentes que tiene.</p>}
          {capasApiladasDe(variante).map(({ capa, titulo, descripcion, grupos }) => <section key={capa} aria-labelledby={`capa-${capa}`} className="rounded-md border border-border bg-background p-4" style={{ borderLeft: `4px solid ${CAPA_ESTILO[capa].stroke}` }}>
            <h3 id={`capa-${capa}`} className="text-base font-semibold">{titulo}</h3>
            <p className="text-xs text-foreground/60">{descripcion}</p>
            <div className="mt-3 space-y-3">
              {grupos.map((grupo) => <div key={grupo.titulo}>
                <h4 className="text-xs font-medium tracking-wide text-foreground/55 uppercase">{grupo.titulo}</h4>
                <ul className="mt-1.5 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                  {grupo.nodos.map((id) => {
                    const nodo = mapa.get(id)!
                    return <li key={id}><NodoApilado nodo={nodo} visual={visualDe(nodo)} seleccionado={seleccion === id} onActivar={abrir} /></li>
                  })}
                </ul>
              </div>)}
            </div>
          </section>)}
        </div>
      </div>

      {acoplado
        ? <aside aria-labelledby={seleccion ? tituloId : undefined} aria-label={seleccion ? undefined : 'Detalle del componente'} className="self-start rounded-md border border-accent/35 bg-accent/[0.04] 2xl:sticky 2xl:top-8 2xl:max-h-[calc(100dvh-4rem)] 2xl:overflow-y-auto">
          {/* Docked panel keeps focus on the diagram; a short live message tells screen readers where the detail is. */}
          <p className="sr-only" aria-live="polite">{seleccion ? `Detalle de ${getComponente(mapa.get(seleccion)!.componente).nombre} en el panel lateral.` : ''}</p>
          {seleccion
            ? <PanelComponente nodo={mapa.get(seleccion)!} tituloId={tituloId} progreso={progresoPanel(seleccion)} />
            : <p className="p-6 text-sm leading-6 text-foreground/70">Seleccioná un componente del diagrama para ver qué es, en qué módulo se estudia, por qué está, qué se rompe sin él y cómo cobra.</p>}
        </aside>
        : <dialog ref={dialogRef} aria-labelledby={tituloId}
          onClick={(event) => { if (event.target === event.currentTarget) cerrarDialogo() }}
          className="m-0 mt-auto max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/40 sm:mt-0 sm:ml-auto sm:h-dvh sm:max-h-dvh sm:w-[26rem] sm:rounded-none">
          {seleccion && <PanelComponente nodo={mapa.get(seleccion)!} tituloId={tituloId} tituloRef={tituloRef} onCerrar={cerrarDialogo} progreso={progresoPanel(seleccion)} />}
        </dialog>}
    </div>
  </section>
}

function NodoApilado({ nodo, visual, seleccionado, onActivar }: { nodo: Nodo; visual: Visual; seleccionado: boolean; onActivar: (id: NodoId, origen: Element) => void }) {
  const salud = visual.salud !== 'ok' ? SALUD_ESTILO[visual.salud] : null
  const pintura = !salud ? visual.pintura : undefined
  const insignia = salud ? `${salud.icono} ${salud.texto}` : pintura ? `${pintura.icono} ${pintura.texto}` : visual.tono === 'activo' ? '● paso actual' : visual.tono === 'anterior' ? '✓ paso anterior' : visual.tono === 'recorrido' ? '✓ recorrido' : null
  const borde = salud ? salud.stroke : pintura ? pintura.stroke : visual.tono === 'activo' ? '#b35900' : seleccionado ? HIGHLIGHT : CAPA_ESTILO[nodo.capa].stroke
  const fondo = salud ? salud.fill : pintura ? pintura.fill : visual.tono === 'activo' ? '#ffe2b3' : CAPA_ESTILO[nodo.capa].fill
  const trazo = salud ? (salud.texto === 'caído' ? 'border-dashed' : 'border-dotted') : pintura?.dash ? (pintura.dash === '2 3' ? 'border-dotted' : 'border-dashed') : ''
  return <button type="button" aria-pressed={seleccionado} aria-label={nombreAccesible(nodo, visual)} onClick={(event) => onActivar(nodo.id, event.currentTarget)}
    className={`flex min-h-14 w-full flex-col items-start justify-center rounded-md border-2 px-3 py-2 text-left ${visual.tono === 'atenuado' ? 'opacity-50' : ''} ${trazo} ${seleccionado ? 'outline-2 outline-offset-2 outline-[#ff9900]' : ''}`}
    style={{ borderColor: borde, backgroundColor: fondo }}>
    <span className="text-sm font-semibold">{nodo.etiqueta}</span>
    {nodo.detalle && <span className="text-xs text-foreground/65">{nodo.detalle}</span>}
    {insignia && <span aria-hidden="true" className="mt-1 text-xs font-semibold [overflow-wrap:anywhere]" style={{ color: salud ? salud.stroke : pintura ? pintura.stroke : ACCENT }}>{insignia}</span>}
  </button>
}
