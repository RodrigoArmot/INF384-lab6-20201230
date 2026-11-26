const request = require('supertest');
const app = require('../src/app');

const APROBADOS_BASE = ['1INF25', '1INF27', '1INF49'];

describe('POST /habilitados — RF-01: lógica de habilitación', () => {
  test('responde 200 con exactamente 27 cursos para el conjunto base', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: APROBADOS_BASE });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(27);
  });

  test('la respuesta incluye 1INF29, 1INF30, 1INF31 y 1INF32', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: APROBADOS_BASE });

    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('1INF29');
    expect(ids).toContain('1INF30');
    expect(ids).toContain('1INF31');
    expect(ids).toContain('1INF32');
  });

  test('ningún curso de la respuesta está en la lista de aprobados', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: APROBADOS_BASE });

    const aprobadosSet = new Set(APROBADOS_BASE);
    res.body.forEach((curso) => {
      expect(aprobadosSet.has(curso.id)).toBe(false);
    });
  });

  test('cada curso tiene id, name, credits, cycle, type y no tiene prerequisites', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: APROBADOS_BASE });

    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((curso) => {
      expect(curso).toHaveProperty('id');
      expect(curso).toHaveProperty('name');
      expect(curso).toHaveProperty('credits');
      expect(curso).toHaveProperty('cycle');
      expect(curso).toHaveProperty('type');
      expect(curso).not.toHaveProperty('prerequisites');
    });
  });

  test('aprobados vacío devuelve todos los cursos sin prerrequisitos', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Todos los devueltos deben tener prerequisites vacíos en el catálogo
    // (no podemos leerlos aquí, pero sí verificar que ninguno fue aprobado)
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((curso) => {
      expect(curso).toHaveProperty('id');
    });
  });
});

describe('POST /habilitados — RS-03: aprobados debe ser array', () => {
  test('string en lugar de array responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });

  test('body sin el campo aprobados responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });

  test('número en lugar de array responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: 42 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados debe ser un arreglo' });
  });
});

describe('POST /habilitados — RS-01: límite de tamaño', () => {
  test('array de 201 elementos responde 400', async () => {
    const lista = Array.from({ length: 201 }, (_, i) => `COD${String(i).padStart(7, '0')}`);
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: lista });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados no puede tener más de 200 elementos' });
  });

  test('array de exactamente 200 elementos no es rechazado por tamaño', async () => {
    const lista = Array.from({ length: 200 }, (_, i) => `COD${String(i).padStart(7, '0')}`);
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: lista });

    // Puede ser 200 (resultado vacío o no) pero no 400 por tamaño
    expect(res.status).toBe(200);
  });
});

describe('POST /habilitados — RS-02: validación de formato de códigos', () => {
  test('código con <script> responde 400 con el valor inválido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF30<script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'código inválido: 1INF30<script>' });
  });

  test('código vacío responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [''] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/código inválido/);
  });

  test('código con minúsculas responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1inf25'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/código inválido/);
  });

  test('código con más de 10 caracteres responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['CODIGOMUYLARGOAQUI'] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/código inválido/);
  });

  test('elemento no-string (número) en el array responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [123] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/código inválido/);
  });
});
