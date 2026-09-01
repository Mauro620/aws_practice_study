'use client'

import { useState, type ReactNode } from 'react'
import { NOMBRES_NIVEL, type NumeroNivel } from '@/lib/types'

type NivelConContenido = {
  numero: NumeroNivel
  titulo: string
  node: ReactNode
}

export function NivelSelector({ niveles }: { niveles: NivelConContenido[] }) {
  const [activo, setActivo] = useState(niveles[0]?.numero)
  const actual = niveles.find((n) => n.numero === activo)

  return (
    <div>
      <div role="tablist" aria-label="Nivel de profundidad" className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {niveles.map((nivel) => (
          <button
            key={nivel.numero}
            role="tab"
            type="button"
            aria-selected={nivel.numero === activo}
            onClick={() => setActivo(nivel.numero)}
            className={
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors ' +
              (nivel.numero === activo
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
            }
          >
            {nivel.numero} · {NOMBRES_NIVEL[nivel.numero] ?? nivel.titulo}
          </button>
        ))}
      </div>
      <div className="pt-6">{actual?.node}</div>
    </div>
  )
}
