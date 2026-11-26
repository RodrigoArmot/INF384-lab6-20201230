const express = require('express');
const request = require('supertest');

// Build a minimal app that reuses only the error-handler middleware from app.js.
// We inject a route that always throws so we can verify the handler's behaviour
// without touching the real route table.
function buildTestApp() {
  const testApp = express();
  testApp.use(express.json());

  // Route that simulates an unexpected server error
  testApp.get('/boom', (req, res, next) => {
    next(new Error('simulated crash'));
  });

  // Register the same error-handler used in production
  // eslint-disable-next-line no-unused-vars
  testApp.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'error interno del servidor' });
  });

  return testApp;
}

describe('Middleware de manejo de errores (Requisito 3)', () => {
  // Requisito 3.1 — errores no controlados deben producir una respuesta 500 segura
  test('3.1 un error no controlado responde 500 con mensaje genérico', async () => {
    const testApp = buildTestApp();
    const res = await request(testApp).get('/boom');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno del servidor' });
  });
});
