# Pendientes de migración — Fase 4

Este archivo documenta contenido de la materia que **no se migró** al app y **por qué**. Sirve como punto de partida cuando aparezca el material faltante y como auditoría de lo que ya pasó.

## Cómo se lee este archivo

Cada ítem dice:
1. Qué falta.
2. Dónde debería estar en la app.
3. Por qué no se pudo migrar.
4. Qué fuente se necesitaría para migrarlo.

Todo ítem marcado como **pendiente de verificación** significa: *no tengo fuente autoritativa en el material del curso disponible*, así que cualquier dato inventado caería en la regla "no inventar datos técnicos de AWS".

## Sección 1 — Contenido sin fuente disponible

### 1.1 Tendencias en la computación en la nube

**Falta:** la página completa "Tendencias en la computación en la nube" del temario (Amazon Bedrock, Amazon Q Business, Amazon Q Developer, autoevaluación de 4 preguntas).

**Dónde iría en la app:** `content/servicios/tendencias/nivel-{1..4}.mdx` + `meta.json` (categoría `Curso`, módulo 0 o 1 según semántica), siguiendo el patrón de `bienvenida` y `well-architected`.

**Por qué no se migró:** el HANDOFF-SIGUIENTE-AGENTE.md (raíz del proyecto) indica que vive en Notion. No existe `.md` local con el contenido de esa página. El MCP de Notion no está configurado en `.mcp.json` del usuario (`/home/mcorreace/.claude/.mcp.json`) — solo está registrado `codebase-memory-mcp`.

**Fuente necesaria:** o bien pegar el contenido de la página de Notion al chat como texto, o configurar el MCP de Notion y volver a leerlo. Cualquiera de las dos opciones habilita la migración sin pérdida.

### 1.2 Antipatrones completos del Módulo 2 (sección "prácticas no recomendadas")

**Falta:** la sección final del Módulo 2 — los antipatrones formales asociados a cada una de las once prácticas de diseño. El material los menciona con sus nombres en una sola línea ("Sin herramientas integradas", "Sin automatización", etc.) pero no desarrolla el catálogo completo.

**Dónde iría en la app:** `content/servicios/well-architected/nivel-3.mdx` en una sección ampliada, después de las once prácticas. Hoy figura con un marcador **pendiente de verificación**.

**Por qué no se migró:** las diapositivas perdidas (slides 34+ del deck oficial AWS según el handoff) no se transcribieron en el `.md` local del Módulo 2. Las que sí están transcritas (slides 27-33) cubren las prácticas 5 a 11 pero **no** los antipatrones específicos.

**Fuente necesaria:** capturas o transcripción de las diapositivas faltantes del Módulo 2, o bien el Módulo 2 completo (sin imágenes perdidas) desde el LMS de AWS Academy.

### 1.3 Preguntas de autoevaluación formales

**Falta:** en el Módulo 1 el handoff menciona "autoevaluación de 5 preguntas" y en el Módulo 2 "autoevaluación de 7 preguntas". El `.md` local sólo trae un "Repaso rápido" con preguntas abiertas en cada uno (5 en Módulo 1, 7 en Módulo 2).

**Dónde iría en la app:** el banco del componente "Motor de práctica tipo examen" (`src/lib/exam-bank.ts`). Hoy tiene 7 preguntas pero todas de Well-Architected pilar Excelencia Operativa, ELB, costos, S3+CloudFront, presigned URLs, región, AZ — el banco no crece.

**Por qué no se quedó cubierto:** las preguntas de autoevaluación formales están en las imágenes de las diapositivas perdidas (que tampoco se transcribieron). El banco del motor de práctica usa actualmente preguntas extraídas de `03-banco-preguntas-...md` que sí está completo.

**Fuente necesaria:** transcripción de las preguntas de autoevaluación del Módulo 1 y Módulo 2 desde el LMS o desde las diapositivas.

### 1.4 `clase 1/Computación en la nube …md`

**No falta:** es un resumen de una página que apunta a los dos `.md` largos (`01-vpc...md` y `02-ec2...md`). El HANDOFF-SIGUIENTE-AGENTE.md lo señala como "no es un módulo aparte, no migrar como tal".

**Acción:** dejar la nota por si cambia el material.

## Sección 2 — Trabajo pendiente del roadmap original (Fase 3/5)

### 2.1 Componente interactivo 8: mapa de dependencias del curso

**Falta:** grafo navegable de servicios del curso, basado en `prerequisitos: string[]` del modelo `Servicio`, mostrando completado/bloqueado cuando se implemente localStorage.

**Dónde iría en la app:** `src/components/GrafoDependencias.tsx` + `src/app/herramientas/dependencias/page.tsx`.

**Estado:** sin empezar. Cuesta más que los componentes anteriores porque requiere persistencia local (Fase 5) para mostrar "completado".

### 2.2 Fase 5 — Persistencia local y accesibilidad

**Falta:**
- Persistencia en localStorage: porcentaje por módulo/servicio, racha de días, conceptos marcados "no me quedó claro", historial de aciertos del motor de práctica.
- Revisión de accesibilidad (WCAG): navegación por teclado, contraste, etiquetas ARIA, foco visible.
- Revisión responsive: la aplicación ya es mobile-first pero falta auditoría sistemática.

**Estado:** sin empezar. Bloqueado en parte por 2.1, en parte independiente.

## Sección 3 — Decisiones de diseño abiertas

### 3.1 Categoría para módulos conceptuales

Los servicios técnicos del catálogo (`vpc`, `ec2`) usan categorías como `Red`, `Cómputo`, `Almacenamiento`, etc. Los módulos conceptuales (`bienvenida`, `well-architected`) usan `Curso`. Si más adelante se incorporan otros módulos conceptuales (Tendencias), habría que evaluar si corresponde crear una categoría dedicada como `Concepto` o mantener `Curso` como paraguas. Decisión postergada hasta que aparezca más contenido conceptual.

### 3.2 Módulo 2 — orden de los pilares

El material del curso usa el orden original de la primera versión del Marco (1. Excelencia operativa, 2. Seguridad, … 6. Sostenibilidad). Hoy AWS publica el Marco con Sostenibilidad antes de Optimización de costos. La migración conservó el orden del material del curso por fidelidad pedagógica. Si se actualizara a la versión actual de la Herramienta, convendría reordenar.
