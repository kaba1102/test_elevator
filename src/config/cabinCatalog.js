/**
 * cabinCatalog.js
 * -----------------------------------------------------------------------
 * Дата-driven каталог опций конфигуратора кабины лифта.
 *
 * Структура полностью соответствует разделу 4 ТЗ «СТРУКТУРА МАТЕРИАЛОВ»
 * (см. «ТЗ на разработку 3D-конфигуратора_18.08.26.docx», пп. 4.1–4.16).
 *
 * ВАЖНО: цвета/значения roughness-metalness ниже — ПЛЕЙСХОЛДЕРЫ.
 * В реальном проекте пп. 2.1 ТЗ предусматривают передачу Заказчиком
 * архива исходных текстур (jpeg/png) и перечня материалов — при
 * интеграции реальных ресурсов меняются только поля `map` / `normalMap` /
 * `roughnessMap` (пути к текстурам), сама структура каталога и код,
 * который её потребляет (SceneEngine.js), не меняются.
 *
 * Каждый материал — самостоятельный объект вида:
 * {
 *   id, name, color (hex-заглушка), roughness, metalness,
 *   map, normalMap, roughnessMap, metalnessMap (пути к текстурам, null пока)
 * }
 */

// ---------------------------------------------------------------------
// Утилиты генерации плейсхолдер-материалов
// ---------------------------------------------------------------------

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Генерирует серию из `count` материалов отделки с плавным градиентом
 * тона/светлоты — используется как заглушка реальных swatch-текстур.
 */
function makeMaterialSeries(
  count,
  {
    prefix,
    category,
    baseHue = 210,
    hueSpread = 40,
    saturation = 0.1,
    lightnessRange = [0.25, 0.86],
    roughness = 0.55,
    metalness = 0.05,
  },
) {
  return Array.from({ length: count }).map((_, i) => {
    const t = count <= 1 ? 0 : i / (count - 1);
    const hue = baseHue + (t - 0.5) * hueSpread;
    const lightness = lightnessRange[0] + t * (lightnessRange[1] - lightnessRange[0]);
    return {
      id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
      name: `${category} — вариант ${i + 1}`,
      color: hslToHex(hue, saturation, lightness),
      roughness,
      metalness,
      map: null,
      normalMap: null,
      roughnessMap: null,
      metalnessMap: null,
    };
  });
}

function makeRalSeries(count, { prefix, category, hues }) {
  return Array.from({ length: count }).map((_, i) => {
    const hue = hues[i % hues.length];
    return {
      id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
      name: `${category} — RAL ${1000 + i * 137}`,
      color: hslToHex(hue, 0.55, 0.42),
      roughness: 0.35,
      metalness: 0.15,
      map: null,
      normalMap: null,
      roughnessMap: null,
      metalnessMap: null,
    };
  });
}

const RAL_HUES = [0, 25, 45, 60, 100, 140, 170, 200, 230, 260, 290, 320];

// ---------------------------------------------------------------------
// 4.1 Модели кабины (4 шт.)
// hasInserts / hasCorners / hasPlinth кодируют п. 4.6 / 4.9 / 4.10:
//   вставки между щитами — ровно в 1 из 4 моделей,
//   углы                — ровно в 2 из 4 моделей,
//   плинтус             — ровно в 2 из 4 моделей.
// ---------------------------------------------------------------------
export const CABIN_MODELS = [
  {
    id: 'model-1',
    name: 'Модель 1 — Стандарт',
    hasInserts: false,
    hasCorners: false,
    hasPlinth: false,
  },
  {
    id: 'model-2',
    name: 'Модель 2 — Премиум',
    hasInserts: false,
    hasCorners: true,
    hasPlinth: true,
  },
  {
    id: 'model-3',
    name: 'Модель 3 — Бизнес',
    hasInserts: false,
    hasCorners: true,
    hasPlinth: false,
  },
  {
    id: 'model-4',
    name: 'Модель 4 — Дизайн',
    hasInserts: true,
    hasCorners: false,
    hasPlinth: true,
  },
];

// ---------------------------------------------------------------------
// 4.2 Габариты кабины (3 шт.)
// ---------------------------------------------------------------------
export const CABIN_DIMENSIONS = [
  {
    id: 'dim-square',
    name: 'Квадратная 1100×1400×2200 мм',
    width: 1100,
    depth: 1400,
    height: 2200,
    entrySide: 'depth', // вход по узкой (глубинной) стороне
  },
  {
    id: 'dim-elongated-narrow-entry',
    name: 'Вытянутая 2100×1100×2200 мм (вход по узкой стороне)',
    width: 2100,
    depth: 1100,
    height: 2200,
    entrySide: 'depth',
  },
  {
    id: 'dim-elongated-wide-entry',
    name: 'Вытянутая 1100×2100×2200 мм (вход по широкой стороне)',
    width: 1100,
    depth: 2100,
    height: 2200,
    entrySide: 'width',
  },
];

// ---------------------------------------------------------------------
// 4.3 Тип кабины (2 шт.)
// ---------------------------------------------------------------------
export const CABIN_ENTRY_TYPES = [
  { id: 'entry-single', name: 'С одним входом (непроходная)', throughType: false },
  { id: 'entry-through', name: 'С двумя входами (проходная)', throughType: true },
];

// ---------------------------------------------------------------------
// 4.4 Тип дверей (3 шт.)
// ---------------------------------------------------------------------
export const DOOR_TYPES = [
  { id: 'door-center-opening', name: 'Центрально-раздвижные' },
  { id: 'door-side-opening', name: 'Телескопические (боковые)' },
  { id: 'door-swing', name: 'Распашные' },
];

// ---------------------------------------------------------------------
// 4.5 Отделка стен (24 варианта)
// ---------------------------------------------------------------------
export const WALL_MATERIALS = makeMaterialSeries(24, {
  prefix: 'wall',
  category: 'Отделка стен',
  baseHue: 30,
  hueSpread: 60,
  saturation: 0.12,
  lightnessRange: [0.22, 0.85],
  roughness: 0.65,
  metalness: 0.04,
});

// ---------------------------------------------------------------------
// 4.6 Вставки между щитами — 3 цвета RAL (только для моделей hasInserts)
// ---------------------------------------------------------------------
export const INSERT_RAL_COLORS = makeRalSeries(3, {
  prefix: 'insert-ral',
  category: 'Вставка между щитами',
  hues: RAL_HUES,
});

// ---------------------------------------------------------------------
// 4.7 Потолок: 6 конструктивных решений × 2 форм-фактора,
// каждый доступен в 16 вариантах материалов отделки.
// ---------------------------------------------------------------------
export const CEILING_TYPES = [
  { id: 'ceiling-flat', name: 'Плоский' },
  { id: 'ceiling-recessed', name: 'С подсветкой по периметру' },
  { id: 'ceiling-spot', name: 'Точечные светильники' },
  { id: 'ceiling-panel', name: 'Кассетный' },
  { id: 'ceiling-mirror-frame', name: 'С зеркальным обрамлением' },
  { id: 'ceiling-backlit-glass', name: 'Стеклянный с подсветкой' },
].map((t) => ({ ...t, formFactors: ['square', 'rectangular'] }));

export const CEILING_FORM_FACTORS = [
  { id: 'square', name: 'Квадратный' },
  { id: 'rectangular', name: 'Прямоугольный' },
];

export const CEILING_MATERIALS = makeMaterialSeries(16, {
  prefix: 'ceiling',
  category: 'Отделка потолка',
  baseHue: 45,
  hueSpread: 30,
  saturation: 0.08,
  lightnessRange: [0.55, 0.95],
  roughness: 0.4,
  metalness: 0.1,
});

// ---------------------------------------------------------------------
// 4.8 Пол (9 вариантов)
// ---------------------------------------------------------------------
export const FLOOR_MATERIALS = makeMaterialSeries(9, {
  prefix: 'floor',
  category: 'Напольное покрытие',
  baseHue: 25,
  hueSpread: 40,
  saturation: 0.18,
  lightnessRange: [0.15, 0.55],
  roughness: 0.5,
  metalness: 0.02,
});

// ---------------------------------------------------------------------
// 4.9 Углы (24 варианта, только для моделей hasCorners)
// ---------------------------------------------------------------------
export const CORNER_MATERIALS = makeMaterialSeries(24, {
  prefix: 'corner',
  category: 'Отделка углов',
  baseHue: 210,
  hueSpread: 50,
  saturation: 0.06,
  lightnessRange: [0.3, 0.85],
  roughness: 0.35,
  metalness: 0.55,
});

// ---------------------------------------------------------------------
// 4.10 Плинтус (19 вариантов, только для моделей hasPlinth)
// ---------------------------------------------------------------------
export const PLINTH_MATERIALS = makeMaterialSeries(19, {
  prefix: 'plinth',
  category: 'Плинтус',
  baseHue: 220,
  hueSpread: 40,
  saturation: 0.05,
  lightnessRange: [0.2, 0.7],
  roughness: 0.4,
  metalness: 0.5,
});

// ---------------------------------------------------------------------
// 4.11 Приказной пост
// Тип I: 18 материалов корпуса × 4 дисплея × 4 кнопки
// Тип II: 1 материал корпуса, 1 дисплей и 1 набор кнопок «в цвет корпуса»
// ---------------------------------------------------------------------
export const CONTROL_PANEL_POSITIONS = [
  { id: 'panel-left', name: 'Левая стена' },
  { id: 'panel-right', name: 'Правая стена' },
];

export const CONTROL_PANEL_TYPES = [
  { id: 'panel-type-1', name: 'Тип I' },
  { id: 'panel-type-2', name: 'Тип II' },
];

export const CONTROL_PANEL_TYPE1_BODY_MATERIALS = makeMaterialSeries(18, {
  prefix: 'panel1-body',
  category: 'Корпус поста (Тип I)',
  baseHue: 210,
  hueSpread: 30,
  saturation: 0.05,
  lightnessRange: [0.15, 0.75],
  roughness: 0.3,
  metalness: 0.7,
});

export const CONTROL_PANEL_TYPE1_DISPLAYS = makeMaterialSeries(4, {
  prefix: 'panel1-display',
  category: 'Дисплей (Тип I)',
  baseHue: 200,
  saturation: 0.02,
  lightnessRange: [0.05, 0.2],
  roughness: 0.15,
  metalness: 0.1,
});

export const CONTROL_PANEL_TYPE1_BUTTONS = makeMaterialSeries(4, {
  prefix: 'panel1-buttons',
  category: 'Кнопки (Тип I)',
  baseHue: 45,
  saturation: 0.1,
  lightnessRange: [0.6, 0.9],
  roughness: 0.25,
  metalness: 0.3,
});

// Тип II — единственная комбинация «всё в цвет корпуса»
export const CONTROL_PANEL_TYPE2_BODY_MATERIALS = makeMaterialSeries(1, {
  prefix: 'panel2-body',
  category: 'Корпус поста (Тип II, в цвет корпуса)',
  baseHue: 210,
  saturation: 0.04,
  lightnessRange: [0.5, 0.5],
  roughness: 0.3,
  metalness: 0.7,
});

// ---------------------------------------------------------------------
// 4.12 Аксессуары
// ---------------------------------------------------------------------
export const MIRROR_VARIANTS = [
  { id: 'mirror-01', name: 'Зеркало во всю стену', screenCompatible: true },
  { id: 'mirror-02', name: 'Зеркало с фацетом', screenCompatible: true },
  { id: 'mirror-03', name: 'Два узких зеркала', screenCompatible: true },
  { id: 'mirror-04', name: 'Зеркало в раме', screenCompatible: true },
];

export const HANDRAIL_VARIANTS = [
  { id: 'handrail-01', name: 'Прямой поручень', paintable: true },
  { id: 'handrail-02', name: 'Поручень с кронштейнами', paintable: false },
  { id: 'handrail-03', name: 'Трубчатый двойной', paintable: false },
  { id: 'handrail-04', name: 'Комбинированный', paintable: false },
];

export const HANDRAIL_RAL_COLORS = makeRalSeries(10, {
  prefix: 'handrail-ral',
  category: 'Поручень',
  hues: RAL_HUES,
});

export const DOME_CAMERA_VARIANT = { id: 'dome-camera-01', name: 'Купольная видеокамера' };

// ---------------------------------------------------------------------
// 4.13 Двери кабины (24 варианта)
// ---------------------------------------------------------------------
export const CABIN_DOOR_MATERIALS = makeMaterialSeries(24, {
  prefix: 'cabin-door',
  category: 'Двери кабины',
  baseHue: 210,
  hueSpread: 50,
  saturation: 0.07,
  lightnessRange: [0.2, 0.85],
  roughness: 0.4,
  metalness: 0.4,
});

// ---------------------------------------------------------------------
// 4.14 Двери шахты (24 варианта)
// ---------------------------------------------------------------------
export const SHAFT_DOOR_MATERIALS = makeMaterialSeries(24, {
  prefix: 'shaft-door',
  category: 'Двери шахты',
  baseHue: 220,
  hueSpread: 50,
  saturation: 0.06,
  lightnessRange: [0.2, 0.85],
  roughness: 0.4,
  metalness: 0.4,
});

// ---------------------------------------------------------------------
// 4.15 Лифтовой холл
// ---------------------------------------------------------------------
export const CALL_POST_VARIANTS = makeMaterialSeries(22, {
  prefix: 'call-post',
  category: 'Вызывной пост',
  baseHue: 210,
  hueSpread: 30,
  saturation: 0.05,
  lightnessRange: [0.15, 0.75],
  roughness: 0.3,
  metalness: 0.65,
});

export const FLOOR_INDICATOR_VARIANTS = makeMaterialSeries(4, {
  prefix: 'floor-indicator',
  category: 'Этажное табло',
  baseHue: 200,
  saturation: 0.03,
  lightnessRange: [0.1, 0.3],
  roughness: 0.2,
  metalness: 0.2,
});

export const HALL_COLOR_PALETTE = makeMaterialSeries(12, {
  prefix: 'hall-color',
  category: 'Отделка холла',
  baseHue: 40,
  hueSpread: 300,
  saturation: 0.2,
  lightnessRange: [0.3, 0.85],
  roughness: 0.6,
  metalness: 0.03,
});

// ---------------------------------------------------------------------
// Вспомогательные lookup-функции
// ---------------------------------------------------------------------
export function findById(collection, id) {
  return collection.find((item) => item.id === id) || null;
}

/**
 * Части стен, доступные для индивидуального выбора отделки —
 * зависят от модели и типа кабины (п. 4.5): в проходном исполнении
 * дверные проёмы занимают обе торцевые стороны, поэтому индивидуальная
 * отделка доступна только для боковых стен; в непроходном — добавляется
 * задняя стена.
 */
export function getWallParts(entryTypeId) {
  const throughType = findById(CABIN_ENTRY_TYPES, entryTypeId)?.throughType;
  return throughType
    ? [
        { id: 'left', name: 'Левая стена' },
        { id: 'right', name: 'Правая стена' },
      ]
    : [
        { id: 'back', name: 'Задняя стена' },
        { id: 'left', name: 'Левая стена' },
        { id: 'right', name: 'Правая стена' },
      ];
}
