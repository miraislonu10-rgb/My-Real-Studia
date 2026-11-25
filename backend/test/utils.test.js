import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDurationMs, toInt, toList } from '../src/utils/duration.js';
import { AppError } from '../src/utils/errors.js';
import { assertOwnership } from '../src/utils/ownership.js';

test('parseDurationMs convierte unidades y usa el valor por defecto si no son válidas', () => {
  assert.equal(parseDurationMs('15m', 0), 900_000);
  assert.equal(parseDurationMs('1.5h', 0), 5_400_000);
  assert.equal(parseDurationMs(2500, 0), 2500);
  assert.equal(parseDurationMs('no-es-tiempo', 42), 42);
});

test('toInt conserva el valor por defecto para entradas inválidas', () => {
  assert.equal(toInt('24', 10), 24);
  assert.equal(toInt(undefined, 10), 10);
  assert.equal(toInt('abc', 10), 10);
});

test('toList separa, limpia espacios y descarta entradas vacías', () => {
  assert.deepEqual(toList(' student, tutor ,, admin ', ''), ['student', 'tutor', 'admin']);
});

test('assertOwnership permite al propietario aunque los IDs tengan tipos distintos', () => {
  assert.doesNotThrow(() => assertOwnership({ id: 12, role: 'student' }, '12', 'recurso'));
});

test('assertOwnership permite al administrador', () => {
  assert.doesNotThrow(() => assertOwnership({ id: 1, role: 'admin' }, 12, 'recurso'));
});

test('assertOwnership rechaza el acceso a recursos de otra persona con 403', () => {
  assert.throws(
    () => assertOwnership({ id: 12, role: 'student' }, 13, 'recurso'),
    (error) =>
      error instanceof AppError &&
      error.status === 403 &&
      error.code === 'FORBIDDEN' &&
      error.message.includes('recurso')
  );
});
