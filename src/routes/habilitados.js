const { Router } = require('express');
const repositorio = require('../data/repositorio');

const router = Router();

// POST /habilitados — versión sin validaciones (para evidencia de falla en CI)
router.post('/', (req, res) => {
  const { aprobados } = req.body;

  const aprobadosSet = new Set(Array.isArray(aprobados) ? aprobados : []);

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
