/**
 * Расчёт расположения поручня (без зависимости от Three.js, чтобы
 * покрывать тестами). Поручень — цилиндр, ось которого по умолчанию
 * направлена вдоль Y.
 */

export const HANDRAIL_RADIUS = 0.02;
// Отступ оси поручня от плоскости зеркала на задней стенке.
const HANDRAIL_STANDOFF = 0.05;

export function getHandrailLayout(dims, { throughType, wallThickness }) {
  const halfD = dims.depth / 2;
  return {
    // В проходной кабине задней стенки нет (там вторая дверь) — поручень не ставим.
    visible: !throughType,
    radius: HANDRAIL_RADIUS,
    length: dims.width * 0.6,
    // Поворот по Z на 90° кладёт цилиндр вдоль X — параллельно задней стенке.
    rotation: { x: 0, y: 0, z: Math.PI / 2 },
    position: { x: 0, y: dims.height * 0.45, z: -halfD + wallThickness + HANDRAIL_STANDOFF },
  };
}
