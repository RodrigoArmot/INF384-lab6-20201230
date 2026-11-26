# Requirements — POST /habilitados

## Contexto

El Centro Federado de Informática necesita un endpoint que, dado el conjunto de cursos que un alumno ya aprobó, devuelva los cursos que puede matricular: aquellos cuyos requisitos están todos cubiertos por los aprobados, y que el alumno aún no aprobó.

---

## Requisitos funcionales

### RF-01 — Lógica de habilitación
**EARS (Event-driven):** When the client sends a valid POST /habilitados request, the system shall return all courses whose prerequisites are entirely contained in the approved set and that are not themselves in the approved set.

- Un curso sin prerrequisitos siempre está habilitado (si no fue aprobado).
- La respuesta incluye los campos `id`, `name`, `credits`, `cycle` y `type` de cada curso habilitado (mismo esquema que `GET /cursos`).
- Con el conjunto `["1INF25","1INF27","1INF49"]` la respuesta contiene exactamente 27 cursos, entre ellos `1INF29`, `1INF30`, `1INF31` y `1INF32`.

### RF-02 — Formato de entrada
**EARS (Ubiquitous):** The system shall accept a JSON body `{ "aprobados": [<string>, ...] }` where `aprobados` is an array of course ID strings.

---

## Requisitos de seguridad

### RS-01 — Límite de tamaño de la lista (hallazgo 1: DoS por lista de 5 000 códigos)
**EARS (Unwanted behaviour):** If the `aprobados` array contains more than 200 elements, then the system shall respond with HTTP 400 and body `{ "error": "aprobados no puede tener más de 200 elementos" }` without executing any business logic.

### RS-02 — Validación de formato de cada código (hallazgo 2: código con `<script>` causó 500 con stack trace)
**EARS (Unwanted behaviour):** If any element of `aprobados` is not a string matching the pattern `^[A-Z0-9]{1,10}$`, then the system shall respond with HTTP 400 and body `{ "error": "código inválido: <valor>" }` without executing any business logic.

### RS-03 — Validación de tipo del campo aprobados (hallazgo 3: string en lugar de array causó 200 con resultados incorrectos)
**EARS (Unwanted behaviour):** If the request body is missing the `aprobados` field or `aprobados` is not an array, then the system shall respond with HTTP 400 and body `{ "error": "aprobados debe ser un arreglo" }`.

---

## Requisito de calidad

### RQ-01 — Cobertura de líneas (política de TI)
**EARS (Ubiquitous):** The CI pipeline shall reject any commit that causes global line coverage, as measured by `jest --coverage --coverageThreshold='{"global":{"lines":80}}'`, to fall below 80 %.
