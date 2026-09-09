/**
 * IAM policy evaluator for the AWS study app.
 *
 * Modeled on 03-proteccion-del-acceso-iam.md sections 9-11:
 *   Rule 1: everything is denied by default (implicit deny).
 *   Rule 2: an explicit Allow overrides the default deny.
 *   Rule 3: an explicit Deny overrides ANY explicit Allow — in either
 *           policy, regardless of statement order (order never changes
 *           the result, only which statement gets cited).
 *
 * Two policies can apply to one request: an identity-based policy
 * (attached to the user/group/role) and a resource-based policy
 * (attached to the resource itself, e.g. a bucket policy). Within a
 * single account, an Allow in EITHER policy is enough to permit the
 * action; a Deny in EITHER is enough to block it (Ejemplo A/B).
 *
 * `notRecursos` models the policy language's `NotResource`: it matches
 * every resource that is NOT in the list, which is what makes the
 * Allow-this-resource + Deny-NotResource pattern a hard scope limit
 * that no later Allow can widen (Ejemplo C).
 */

export type Efecto = 'Allow' | 'Deny'

export type Enunciado = {
  sid?: string
  efecto: Efecto
  acciones: string[]
  /** Recursos que este enunciado cubre. Mutuamente excluyente con notRecursos. */
  recursos?: string[]
  /** "NotResource": cubre todo recurso que NO esté en esta lista. */
  notRecursos?: string[]
}

export type Politica = Enunciado[]

export type DecisiónPolítica = {
  decisión: 'allow' | 'deny' | 'no-aplica'
  razón: string
  enunciadoAplicado?: Enunciado
}

export type ResultadoEvaluaciónIam = {
  identidad: DecisiónPolítica
  recurso: DecisiónPolítica
  decisiónFinal: 'allow' | 'deny'
  razónFinal: string
}

function coincidePatrón(patrón: string, valor: string): boolean {
  if (patrón === '*') return true
  const regex = new RegExp(
    '^' + patrón.split('*').map((parte) => parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'
  )
  return regex.test(valor)
}

function coincideAlguno(patrones: string[], valor: string): boolean {
  return patrones.some((p) => coincidePatrón(p, valor))
}

function enunciadoAplica(enunciado: Enunciado, accion: string, recurso: string): boolean {
  if (!coincideAlguno(enunciado.acciones, accion)) return false
  if (enunciado.notRecursos) return !coincideAlguno(enunciado.notRecursos, recurso)
  return coincideAlguno(enunciado.recursos ?? [], recurso)
}

/**
 * Evaluates one policy against an action+resource. An explicit Deny
 * always wins over an explicit Allow, independent of statement order.
 */
function evaluarPolítica(politica: Politica, accion: string, recurso: string, origen: string): DecisiónPolítica {
  const aplicables = politica.filter((e) => enunciadoAplica(e, accion, recurso))
  const deny = aplicables.find((e) => e.efecto === 'Deny')
  if (deny) {
    return { decisión: 'deny', razón: `${origen}: Deny explícito${deny.sid ? ` ("${deny.sid}")` : ''}`, enunciadoAplicado: deny }
  }

  const allow = aplicables.find((e) => e.efecto === 'Allow')
  if (allow) {
    return { decisión: 'allow', razón: `${origen}: Allow explícito${allow.sid ? ` ("${allow.sid}")` : ''}`, enunciadoAplicado: allow }
  }

  return { decisión: 'no-aplica', razón: `${origen}: ningún enunciado menciona esta acción/recurso` }
}

export function evaluarSolicitud(
  politicaIdentidad: Politica,
  politicaRecurso: Politica | null,
  accion: string,
  recurso: string
): ResultadoEvaluaciónIam {
  const identidad = evaluarPolítica(politicaIdentidad, accion, recurso, 'Política de identidad')
  const recursoResultado: DecisiónPolítica = politicaRecurso
    ? evaluarPolítica(politicaRecurso, accion, recurso, 'Política de recurso')
    : { decisión: 'no-aplica', razón: 'Política de recurso: no hay política de recurso adjunta' }

  if (identidad.decisión === 'deny' || recursoResultado.decisión === 'deny') {
    const cual = identidad.decisión === 'deny' ? identidad : recursoResultado
    return {
      identidad,
      recurso: recursoResultado,
      decisiónFinal: 'deny',
      razónFinal: `Denegado: un Deny explícito siempre gana. ${cual.razón}.`,
    }
  }

  if (identidad.decisión === 'allow' || recursoResultado.decisión === 'allow') {
    const cual = identidad.decisión === 'allow' ? identidad : recursoResultado
    return {
      identidad,
      recurso: recursoResultado,
      decisiónFinal: 'allow',
      razónFinal: `Permitido: ${cual.razón}.`,
    }
  }

  return {
    identidad,
    recurso: recursoResultado,
    decisiónFinal: 'deny',
    razónFinal: 'Denegado por deny implícita: ninguna política menciona esta acción sobre este recurso.',
  }
}
