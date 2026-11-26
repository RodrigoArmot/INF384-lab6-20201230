const request = require('supertest');
const app = require('../src/app');

describe('GET /cursos', () => {
  // Requisito 1.1 — devuelve todos los cursos con los campos correctos
  test('1.1 responde 200 con un arreglo de cursos con los campos requeridos', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const curso = res.body[0];
    expect(curso).toHaveProperty('id');
    expect(curso).toHaveProperty('name');
    expect(curso).toHaveProperty('credits');
    expect(curso).toHaveProperty('cycle');
    expect(curso).toHaveProperty('type');
    // prerequisites NO debe estar en la respuesta de listado
    expect(curso).not.toHaveProperty('prerequisites');
  });

  test('1.1 devuelve los 87 cursos del JSON', async () => {
    const res = await request(app).get('/cursos');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(87);
  });

  // Requisito 1.2 — filtro por ciclo válido
  test('1.2 filtra por ciclo y devuelve solo los cursos de ese ciclo', async () => {
    const res = await request(app).get('/cursos?ciclo=6');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((c) => expect(c.cycle).toBe(6));
  });

  test('1.2 ciclo=5 devuelve exactamente los cursos del ciclo 5', async () => {
    const res = await request(app).get('/cursos?ciclo=5');
    expect(res.status).toBe(200);
    res.body.forEach((c) => expect(c.cycle).toBe(5));
  });

  test('1.2 ciclo=10 devuelve exactamente los cursos del ciclo 10', async () => {
    const res = await request(app).get('/cursos?ciclo=10');
    expect(res.status).toBe(200);
    res.body.forEach((c) => expect(c.cycle).toBe(10));
  });

  // Requisito 1.3 — ciclo inválido
  test('1.3 ciclo=4 responde 400 con mensaje de error', async () => {
    const res = await request(app).get('/cursos?ciclo=4');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ciclo=11 responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=11');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ciclo=abc responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ciclo=5.5 (no entero) responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=5.5');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });
});

describe('GET /cursos/:codigo', () => {
  // Requisito 2.1 — devuelve el curso con sus requisitos
  test('2.1 responde 200 con el curso y sus prerrequisitos (id y nombre)', async () => {
    const res = await request(app).get('/cursos/1CON27');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', '1CON27');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('credits');
    expect(res.body).toHaveProperty('cycle');
    expect(res.body).toHaveProperty('type');
    expect(Array.isArray(res.body.prerequisites)).toBe(true);

    const prereq = res.body.prerequisites[0];
    expect(prereq).toHaveProperty('id');
    expect(prereq).toHaveProperty('name');
  });

  test('2.1 los prerrequisitos incluyen código y nombre correctos', async () => {
    // 1CON27 tiene prerequisito 1IND90 "Empresa y su Entorno"
    const res = await request(app).get('/cursos/1CON27');
    expect(res.status).toBe(200);
    expect(res.body.prerequisites).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '1IND90', name: 'Empresa y su Entorno' }),
      ])
    );
  });

  test('2.1 curso sin prerrequisitos devuelve prerequisites como arreglo vacío', async () => {
    // 1GES92 no tiene prerrequisitos
    const res = await request(app).get('/cursos/1GES92');
    expect(res.status).toBe(200);
    expect(res.body.prerequisites).toEqual([]);
  });

  // Requisito 2.2 — código inexistente
  test('2.2 código inexistente responde 404 con mensaje de error', async () => {
    const res = await request(app).get('/cursos/NOEXISTE');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'curso no encontrado' });
  });
});
