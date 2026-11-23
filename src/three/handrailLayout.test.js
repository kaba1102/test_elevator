import { test } from 'node:test';
import assert from 'node:assert/strict';
// eslint-disable-next-line import/extensions -- node ESM требует расширение
import { getHandrailLayout } from './handrailLayout.js';

const WALL = 0.06;
const dims = { width: 1.1, depth: 2.1, height: 2.2 };

test('непроходная кабина: поручень вдоль задней стенки (с зеркалом), внутри кабины', () => {
  const l = getHandrailLayout(dims, { throughType: false, wallThickness: WALL });
  assert.equal(l.visible, true);

  // Цилиндр по умолчанию вдоль Y; поворот по Z на 90° кладёт его вдоль X.
  assert.ok(Math.abs(Math.abs(l.rotation.z) - Math.PI / 2) < 1e-9);
  assert.equal(l.rotation.x, 0);
  assert.equal(l.rotation.y, 0);

  // По ширине не выходит за боковые стенки.
  assert.equal(l.position.x, 0);
  assert.ok(l.length < dims.width);
  assert.ok(l.position.x - l.length / 2 > -dims.width / 2);
  assert.ok(l.position.x + l.length / 2 < dims.width / 2);

  // Стоит у задней стенки, с отступом внутрь кабины.
  const backInner = -dims.depth / 2;
  assert.ok(l.position.z - l.radius > backInner);
  assert.ok(l.position.z < backInner + 0.15);
});

test('проходная кабина (две двери): поручень скрыт', () => {
  const l = getHandrailLayout(dims, { throughType: true, wallThickness: WALL });
  assert.equal(l.visible, false);
});
