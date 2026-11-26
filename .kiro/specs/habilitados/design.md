# Design — POST /habilitados

## Arquitectura general

El endpoint sigue la misma estructura en capas que los endpoints existentes:

```
Request → Express router → validación → lógica de dominio (repositorio) → respuesta
```

No se introducen dependencias nuevas: todo se implementa con módulos ya presentes (`express`, `repositorio.js`).

---

## Contrato HTTP

**Método y ruta:** `POST /habilitados`

**Cuerpo de la petición:**
```json
{ "aprobados": ["1INF25", "1INF27", "1INF49"] }
```

**Respuesta exitosa — 200 OK:**
```json
[
  { "id": "1INF29", "name": "...", "credits": 4.0, "cycle": 5, "type": "obligatorio" },
  ...
]
```
El orden del arreglo no está especificado.

**Respuestas de error:**

| Condición | Status | Body |
|---|---|---|
| `aprobados` ausente o no es array | 400 | `{ "error": "aprobados debe ser un arreglo" }` |
| Array con más de 200 elementos | 400 | `{ "error": "aprobados no puede tener más de 200 elementos" }` |
| Algún código no cumple `^[A-Z0-9]{1,10}$` | 400 | `{ "error": "código inválido: <valor>" }` |

Los errores 500 los maneja el middleware genérico ya existente en `app.js`, que nunca expone el stack trace.

---

## Flujo de validación (orden de evaluación)

1. `aprobados` existe y es array → si no, 400 RS-03.
2. Longitud ≤ 200 → si no, 400 RS-01.
3. Cada elemento cumple `^[A-Z0-9]{1,10}$` → si no, 400 RS-02.
4. Ejecutar lógica de habilitación.

El orden importa: la validación de tipo va primero para evitar que el chequeo de longitud llame `.length` sobre un no-array.

---

## Lógica de habilitación

```
aprobadosSet = new Set(aprobados)

habilitados = repositorio.listar()
  .filter(curso =>
    !aprobadosSet.has(curso.id) &&
    curso.prerequisites.every(req => aprobadosSet.has(req))
  )
  .map(proyectar)   // misma función de cursos.js: { id, name, credits, cycle, type }
```

Complejidad: O(C × R) donde C = 87 cursos y R = máximo de prerrequisitos por curso. Con los datos actuales es constante en la práctica.

---

## Archivos a crear / modificar

| Archivo | Acción | Descripción |
|---|---|---|
| `src/routes/habilitados.js` | Crear | Router con `POST /`. Contiene validación y delega al repositorio. |
| `src/app.js` | Modificar | Montar `app.use('/habilitados', require('./routes/habilitados'))`. |
| `tests/habilitados.test.js` | Crear | Tests de los requisitos RF-01, RF-02, RS-01, RS-02, RS-03. |

No se modifica `repositorio.js` ni `formato.js`: la lógica de habilitación es lo suficientemente simple para vivir en el router.

---

## Gates de CI

### Gate 1 — Detección de secretos (Gitleaks)

| Atributo | Valor |
|---|---|
| Herramienta | `gitleaks/gitleaks-action@v2` |
| Umbral | Cualquier hallazgo (cero tolerancia) |
| Comportamiento | **Bloquea** — el job falla si se detecta un secreto |
| Etapa | Primer job del pipeline (`secret-scan`), antes de instalar dependencias |

**Por qué en esta etapa:** un secreto que llega a `main` es una brecha inmediata aunque el código nunca se despliegue; verificarlo primero hace que el pipeline falle rápido sin consumir tiempo de los jobs siguientes. `fetch-depth: 0` garantiza que se escaneen todos los commits del PR, no solo el último.

**Por qué bloquea:** un secreto en el repositorio no tiene umbral de tolerancia razonable. La política de TI lo prohíbe explícitamente, y avisar sin bloquear crea una falsa sensación de seguridad.

---

### Gate 2 — SCA: análisis de composición de software (npm audit)

| Atributo | Valor |
|---|---|
| Herramienta | `npm audit --audit-level=high` (incluida en npm, sin dependencia adicional) |
| Umbral | Severidad **high** o **critical** |
| Comportamiento | **Bloquea** — el job falla si existe al menos una vulnerabilidad de severidad alta o crítica |
| Etapa | Job `sca`, en paralelo con `secret-scan`, antes del job de tests |

**Por qué en esta etapa:** las vulnerabilidades de dependencias son independientes del código fuente; ejecutar SCA antes de los tests evita desplegar código con componentes comprometidos incluso si todos los tests pasan. Correrlo en paralelo con `secret-scan` reduce el tiempo total del pipeline.

**Por qué bloquea solo desde `high`:** las severidades `low` y `moderate` suelen requerir condiciones de explotación poco probables en este contexto (servicio interno, sin acceso directo a Internet). La política de TI fija el umbral en `high`/`critical`, alineado con el CVSS ≥ 7.0. Avisar en `moderate` sin bloquear quedaría como mejora futura.

**Nota:** `lodash` fue actualizado de `4.17.20` a `4.18.1` (commit `bc5c18f`) para resolver GHSA-35jh-r3h4-6jhm. El gate pasó desde el run [CI #2](https://github.com/RodrigoArmot/INF384-lab6-base/actions/runs/45901125446) en adelante.

---

### Gate 3 — SAST: análisis estático de código fuente (SonarCloud)

| Atributo | Valor |
|---|---|
| Herramienta | `SonarSource/sonarcloud-github-action@v3` |
| Umbral | Quality Gate por defecto de SonarCloud: 0 issues de severidad **Blocker** o **Critical** en código nuevo |
| Comportamiento | **Bloquea** — el job `sast` falla si el Quality Gate no pasa; el job `test` no corre |
| Etapa | Job `sast`, en paralelo con `secret-scan` y `sca`, antes del job `test` |

**Por qué SonarCloud y no CodeQL u otro:**
CodeQL hace análisis de flujo de datos pero su configuración en repos privados requiere licencia; en repos públicos es gratuito pero el Quality Gate no es configurable desde el workflow. SonarCloud ofrece un Quality Gate configurable, dashboard visual con historial de métricas, y se integra con la cuenta existente del equipo. ESLint con `eslint-plugin-security` hace análisis léxico pero no taint tracking — no detecta, por ejemplo, que un valor de entrada llega sin sanear hasta una operación peligrosa.

**Por qué en esta etapa:**
SAST analiza el código fuente independientemente de las dependencias y los tests. Correrlo en paralelo con `secret-scan` y `sca` reduce el tiempo total del pipeline. El job `test` depende de los tres gates para garantizar que ningún commit con hallazgos de seguridad llegue a producción aunque los tests pasen.

**Por qué bloquea:**
Un hallazgo Blocker o Critical en código nuevo representa una vulnerabilidad explotable o un defecto grave introducido en ese PR. Permitir que llegue a `main` aunque los tests pasen es exactamente el escenario que el hallazgo 2 (stack trace expuesto) ejemplificó: el servicio funcionaba, los tests pasaban, pero el código tenía un defecto de seguridad. Avisar sin bloquear no cumple la política de TI.

**Por qué se ejecutan los tests dentro del job `sast`:**
SonarCloud necesita el reporte `coverage/lcov.info` para mostrar la cobertura en el dashboard y para que el Quality Gate pueda incluir métricas de cobertura. Los tests se corren en este job con `--coverageReporters=lcov` antes del análisis. El job `test` los repite de forma independiente para que el pipeline tenga una evidencia de tests separada del análisis SAST.

---

```
secret-scan ──┐
sca ──────────┼──→ test
sast ─────────┘
```

El job `test` declara `needs: [secret-scan, sca, sast]`. Si cualquiera de los tres gates falla, los tests no corren. Esto evita consumir minutos de CI en una suite completa cuando ya se sabe que el commit no puede llegar a `main`.

---

## Decisiones de diseño

Las siguientes situaciones no están definidas en el pedido funcional. Se resuelven aquí para que la implementación sea determinista.

**Orden de la respuesta**
El pedido no especifica ningún orden. Se devuelve el orden natural del catálogo (el mismo que `GET /cursos`), sin ordenamiento adicional. Razón: ordenar consume CPU innecesariamente y ningún cliente documentado depende de un orden concreto; si surgiera esa necesidad, es más limpio añadir un parámetro `?orden=` que imponer un criterio implícito ahora.

**Códigos en `aprobados` que no existen en el catálogo**
El pedido no define qué hacer si un código enviado no corresponde a ningún curso (ej. `["NOEXISTE"]`). Se decide ignorarlos silenciosamente: se añaden al `Set` de aprobados y simplemente ningún curso tendrá ese código como prerrequisito. Razón: un código desconocido no rompe la lógica de habilitación, rechazarlo con 400 obligaría al cliente a conocer el catálogo completo antes de llamar al endpoint, y no hay riesgo de seguridad porque el formato ya está validado por RS-02.

**Duplicados en `aprobados`**
El pedido no dice qué hacer con `["1INF25","1INF25"]`. Se decide aceptarlos: el `Set` los colapsa en uno solo automáticamente. Razón: tratar los duplicados como error añadiría complejidad de validación sin beneficio funcional; el `Set` resuelve el problema de forma natural y sin coste adicional.

**`aprobados` vacío**
El pedido no menciona el caso `[]`. Se decide que es válido y devuelve todos los cursos sin prerrequisitos. Razón: semánticamente es correcto — un alumno que no ha aprobado nada puede llevar los cursos que no dependen de ninguno. Rechazarlo forzaría al cliente a manejar un caso especial innecesario.

**Body JSON malformado o sin `Content-Type: application/json`**
El pedido no especifica la respuesta. Express con `express.json()` devuelve automáticamente HTTP 400 con un mensaje de error antes de que el router procese la petición. Se acepta este comportamiento sin manejarlo explícitamente. Razón: es consistente con el resto de la API y no expone información interna.

**¿Por qué no una función en `repositorio.js`?**
El repositorio expone acceso a datos; el filtro de habilitación es regla de negocio del endpoint. Mantenerlo en el router preserva la separación de responsabilidades y es consistente con cómo `cursos.js` hace sus propios filtros (por ciclo).

**¿Por qué `Set` y no `Array.includes`?**
Con hasta 200 códigos y 87 cursos la diferencia es trivial, pero `Set` expresa la intención (conjunto sin orden ni duplicados) y es O(1) en la búsqueda.

**¿Por qué el límite de 200?**
El catálogo tiene 87 cursos; 200 es holgado para cualquier uso legítimo y bloquea ataques de lista larga mucho antes de que consuman CPU apreciable.
