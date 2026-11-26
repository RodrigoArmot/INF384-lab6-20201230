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

## Decisiones de diseño

**¿Por qué no una función en `repositorio.js`?**
El repositorio expone acceso a datos; el filtro de habilitación es regla de negocio del endpoint. Mantenerlo en el router preserva la separación de responsabilidades y es consistente con cómo `cursos.js` hace sus propios filtros (por ciclo).

**¿Por qué `Set` y no `Array.includes`?**
Con hasta 200 códigos y 87 cursos la diferencia es trivial, pero `Set` expresa la intención (conjunto sin orden ni duplicados) y es O(1) en la búsqueda.

**¿Por qué el límite de 200?**
El catálogo tiene 87 cursos; 200 es holgado para cualquier uso legítimo y bloquea ataques de lista larga mucho antes de que consuman CPU apreciable.
