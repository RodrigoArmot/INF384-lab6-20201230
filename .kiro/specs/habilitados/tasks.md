# Tasks — POST /habilitados

## T1 — Crear `src/routes/habilitados.js`

Implementar el router Express con `POST /`:

- [ ] Validar que `req.body.aprobados` existe y es array (RS-03). Responder 400 si no.
- [ ] Validar que el array tiene ≤ 200 elementos (RS-01). Responder 400 si no.
- [ ] Validar que cada elemento cumple `/^[A-Z0-9]{1,10}$/` (RS-02). Responder 400 con el valor inválido si no.
- [ ] Construir un `Set` con los aprobados.
- [ ] Filtrar `repositorio.listar()`: cursos no aprobados cuyos prerrequisitos están todos en el Set.
- [ ] Proyectar cada resultado a `{ id, name, credits, cycle, type }`.
- [ ] Responder 200 con el arreglo resultante.

**Criterio de aceptación:** con `["1INF25","1INF27","1INF49"]` la respuesta tiene 27 cursos e incluye `1INF29`, `1INF30`, `1INF31` y `1INF32`.

---

## T2 — Montar el router en `src/app.js`

- [ ] Agregar `app.use('/habilitados', require('./routes/habilitados'))` antes del middleware de error.

---

## T3 — Escribir `tests/habilitados.test.js`

Cubrir los siguientes casos:

- [ ] **RF-01** — `POST /habilitados` con `["1INF25","1INF27","1INF49"]` responde 200 con exactamente 27 cursos.
- [ ] **RF-01** — La respuesta incluye `1INF29`, `1INF30`, `1INF31` y `1INF32`.
- [ ] **RF-01** — Ningún curso de la respuesta está en la lista de aprobados.
- [ ] **RF-01** — Cada curso de la respuesta tiene los campos `id`, `name`, `credits`, `cycle`, `type` y no tiene `prerequisites`.
- [ ] **RF-01** — `aprobados: []` devuelve todos los cursos sin prerrequisitos (cursos de entrada sin dependencias).
- [ ] **RS-03** — `{ "aprobados": "1INF25" }` responde 400 con `{ "error": "aprobados debe ser un arreglo" }`.
- [ ] **RS-03** — Body sin el campo `aprobados` responde 400 con `{ "error": "aprobados debe ser un arreglo" }`.
- [ ] **RS-01** — Array de 201 elementos responde 400 con `{ "error": "aprobados no puede tener más de 200 elementos" }`.
- [ ] **RS-02** — Código `"1INF30<script>"` responde 400 con `{ "error": "código inválido: 1INF30<script>" }`.
- [ ] **RS-02** — Código vacío `""` responde 400.

---

## T4 — Verificar cobertura (RQ-01)

- [ ] Ejecutar `npx jest --coverage` y confirmar que la cobertura de líneas global es ≥ 80 %.
- [ ] Si algún archivo queda por debajo, agregar los tests faltantes antes de hacer merge.
