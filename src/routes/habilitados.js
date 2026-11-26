const { Router } = require('express');
const repositorio = require('../data/repositorio');

const router = Router();

const CODIGO_RE = /^[A-Z0-9]{1,10}$/;
const MAX_APROBADOS = 200;

// POST /habilitados
router.post('/', (req, res) => {
  const { aprobados } = req.body;

  // RS-03: debe ser array
  if (!Array.isArray(aprobados)) {
    return res.status(400).json({ error: 'aprobados debe ser un arreglo' });
  }

  // RS-01: límite de tamaño
  if (aprobados.length > MAX_APROBADOS) {
    return res.status(400).json({ error: 'aprobados no puede tener más de 200 elementos' });
  }

  // RS-02: cada código debe ser string con formato válido
  for (const codigo of aprobados) {
    if (typeof codigo !== 'string' || !CODIGO_RE.test(codigo)) {
      return res.status(400).json({ error: `código inválido: ${codigo}` });
    }
  }

  const aprobadosSet = new Set(aprobados);

  const habilitados = repositorio
    .listar()
    .filter(
      (curso) =>
        !aprobadosSet.has(curso.id) &&
        curso.prerequisites.every((req) => aprobadosSet.has(req))
    )
    .map(({ id, name, credits, cycle, type }) => ({ id, name, credits, cycle, type }));

  return res.json(habilitados);
});

module.exports = router;
