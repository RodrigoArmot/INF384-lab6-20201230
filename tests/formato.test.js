const {
  formatearNombre,
  formatearCreditos,
  formatearCiclo,
  formatearTipo,
  resumenCurso,
  totalCreditos,
  agruparPorCiclo,
  ordenarPorCreditos,
  listaRequisitos,
} = require('../src/util/formato');

describe('formato — formatearNombre', () => {
  test('capitaliza cada palabra', () => {
    expect(formatearNombre('programación orientada a objetos')).toBe(
      'Programación Orientada A Objetos'
    );
  });
  test('convierte a minúsculas antes de capitalizar', () => {
    expect(formatearNombre('ALGORITMOS')).toBe('Algoritmos');
  });
});

describe('formato — formatearCreditos', () => {
  test('formatea con un decimal', () => {
    expect(formatearCreditos(4)).toBe('4.0 créditos');
    expect(formatearCreditos(3.5)).toBe('3.5 créditos');
  });
});

describe('formato — formatearCiclo', () => {
  test('devuelve el ciclo numerado', () => {
    expect(formatearCiclo(5)).toBe('Ciclo 5');
  });
  test('devuelve Electivo para null', () => {
    expect(formatearCiclo(null)).toBe('Electivo');
  });
  test('devuelve Electivo para undefined', () => {
    expect(formatearCiclo(undefined)).toBe('Electivo');
  });
});

describe('formato — formatearTipo', () => {
  test('obligatorio', () => {
    expect(formatearTipo('obligatorio')).toBe('Obligatorio');
  });
  test('electivo', () => {
    expect(formatearTipo('electivo')).toBe('Electivo');
  });
});

describe('formato — resumenCurso', () => {
  test('combina id, nombre y créditos', () => {
    const curso = { id: '1INF25', name: 'Programación 2', credits: 5 };
    expect(resumenCurso(curso)).toBe('1INF25 · Programación 2 · 5.0 créditos');
  });
});

describe('formato — totalCreditos', () => {
  test('suma los créditos de una lista', () => {
    const cursos = [{ credits: 4 }, { credits: 3.5 }, { credits: 2 }];
    expect(totalCreditos(cursos)).toBeCloseTo(9.5);
  });
  test('devuelve 0 para lista vacía', () => {
    expect(totalCreditos([])).toBe(0);
  });
});

describe('formato — agruparPorCiclo', () => {
  test('agrupa cursos por ciclo formateado', () => {
    const cursos = [
      { id: 'A', cycle: 5, credits: 3 },
      { id: 'B', cycle: 6, credits: 2 },
      { id: 'C', cycle: 5, credits: 4 },
    ];
    const grupos = agruparPorCiclo(cursos);
    expect(grupos['Ciclo 5']).toHaveLength(2);
    expect(grupos['Ciclo 6']).toHaveLength(1);
  });
});

describe('formato — ordenarPorCreditos', () => {
  test('ordena de mayor a menor créditos, desempate por id', () => {
    const cursos = [
      { id: 'B', credits: 3 },
      { id: 'A', credits: 5 },
      { id: 'C', credits: 3 },
    ];
    const ordenados = ordenarPorCreditos(cursos);
    expect(ordenados[0].id).toBe('A');
    expect(ordenados[1].id).toBe('B');
    expect(ordenados[2].id).toBe('C');
  });
});

describe('formato — listaRequisitos', () => {
  test('ordena y une con coma', () => {
    expect(listaRequisitos(['1INF30', '1INF25'])).toBe('1INF25, 1INF30');
  });
  test('devuelve Sin requisitos para arreglo vacío', () => {
    expect(listaRequisitos([])).toBe('Sin requisitos');
  });
});
