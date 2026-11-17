import { useCallback, useMemo, useState } from 'react';
import {
  CABIN_MODELS,
  CABIN_DIMENSIONS,
  CABIN_ENTRY_TYPES,
  DOOR_TYPES,
  WALL_MATERIALS,
  INSERT_RAL_COLORS,
  CEILING_TYPES,
  CEILING_MATERIALS,
  FLOOR_MATERIALS,
  CORNER_MATERIALS,
  PLINTH_MATERIALS,
  CONTROL_PANEL_POSITIONS,
  CONTROL_PANEL_TYPES,
  CONTROL_PANEL_TYPE1_BODY_MATERIALS,
  CONTROL_PANEL_TYPE1_DISPLAYS,
  CONTROL_PANEL_TYPE1_BUTTONS,
  CONTROL_PANEL_TYPE2_BODY_MATERIALS,
  MIRROR_VARIANTS,
  HANDRAIL_VARIANTS,
  HANDRAIL_RAL_COLORS,
  CABIN_DOOR_MATERIALS,
  SHAFT_DOOR_MATERIALS,
  CALL_POST_VARIANTS,
  FLOOR_INDICATOR_VARIANTS,
  HALL_COLOR_PALETTE,
  getWallParts,
  findById,
} from '../config/cabinCatalog';

/**
 * useCabinConfigurator
 * -----------------------------------------------------------------------
 * Хук управляет состоянием выбора пользователя и приводит его к
 * «разрешённой» конфигурации (resolvedConfig), которую напрямую
 * потребляет SceneEngine.buildCabin(). Здесь же поддерживается
 * согласованность выбора при смене модели/типа кабины (п. 4.16 ТЗ —
 * взаимоисключающие элементы): при смене модели автоматически
 * сбрасываются опции, недоступные для новой модели (вставки/углы/
 * плинтус), а при смене типа кабины — пересобирается набор частей стен.
 *
 * Полный перечень ограничений совместимости элементов (детальная
 * матрица исключений) поставляется Заказчиком отдельно после заключения
 * договора (п. 4.16 ТЗ) — здесь предусмотрена точка расширения
 * `isOptionDisabled`, куда эта матрица подключается без изменения
 * остальной логики.
 */
export default function useCabinConfigurator() {
  const initialModel = CABIN_MODELS[0];
  const initialEntryType = CABIN_ENTRY_TYPES[0];
  const initialWallParts = getWallParts(initialEntryType.id);

  const [modelId, setModelIdState] = useState(initialModel.id);
  const [dimensionId, setDimensionId] = useState(CABIN_DIMENSIONS[0].id);
  const [entryTypeId, setEntryTypeIdState] = useState(initialEntryType.id);
  const [doorTypeId, setDoorTypeId] = useState(DOOR_TYPES[0].id);

  const [wallMaterialByPart, setWallMaterialByPart] = useState(() =>
    Object.fromEntries(initialWallParts.map((p) => [p.id, WALL_MATERIALS[0].id])),
  );
  const [insertColorId, setInsertColorId] = useState(INSERT_RAL_COLORS[0].id);

  const [ceilingTypeId, setCeilingTypeId] = useState(CEILING_TYPES[0].id);
  const [ceilingFormFactor, setCeilingFormFactor] = useState('square');
  const [ceilingMaterialId, setCeilingMaterialId] = useState(CEILING_MATERIALS[0].id);

  const [floorMaterialId, setFloorMaterialId] = useState(FLOOR_MATERIALS[0].id);
  const [cornerMaterialId, setCornerMaterialId] = useState(CORNER_MATERIALS[0].id);
  const [plinthMaterialId, setPlinthMaterialId] = useState(PLINTH_MATERIALS[0].id);

  const [controlPanel, setControlPanel] = useState({
    position: 'panel-left',
    type: 'panel-type-1',
    bodyId: CONTROL_PANEL_TYPE1_BODY_MATERIALS[0].id,
    displayId: CONTROL_PANEL_TYPE1_DISPLAYS[0].id,
    buttonsId: CONTROL_PANEL_TYPE1_BUTTONS[0].id,
  });

  const [accessories, setAccessories] = useState({
    mirrorId: MIRROR_VARIANTS[0].id,
    mirrorScreen: false,
    handrailId: HANDRAIL_VARIANTS[0].id,
    handrailColorId: HANDRAIL_RAL_COLORS[0].id,
    wallScreen: false,
    domeCamera: false,
  });

  const [cabinDoorMaterialId, setCabinDoorMaterialId] = useState(CABIN_DOOR_MATERIALS[0].id);
  const [shaftDoorMaterialId, setShaftDoorMaterialId] = useState(SHAFT_DOOR_MATERIALS[0].id);

  const [liftHall, setLiftHall] = useState({
    visible: false,
    callPostId: CALL_POST_VARIANTS[0].id,
    floorIndicatorId: FLOOR_INDICATOR_VARIANTS[0].id,
    wallColorId: HALL_COLOR_PALETTE[0].id,
    floorColorId: HALL_COLOR_PALETTE[1].id,
  });

  const model = findById(CABIN_MODELS, modelId);
  const entryType = findById(CABIN_ENTRY_TYPES, entryTypeId);
  const wallParts = useMemo(() => getWallParts(entryTypeId), [entryTypeId]);

  // -- модель: при смене сбрасываем опции, недоступные новой модели -----
  const setModelId = useCallback((nextId) => {
    const nextModel = findById(CABIN_MODELS, nextId);
    setModelIdState(nextId);
    if (!nextModel.hasInserts) setInsertColorId(INSERT_RAL_COLORS[0].id);
    if (!nextModel.hasCorners) setCornerMaterialId(CORNER_MATERIALS[0].id);
    if (!nextModel.hasPlinth) setPlinthMaterialId(PLINTH_MATERIALS[0].id);
  }, []);

  // -- тип кабины: пересобираем набор частей стен ------------------------
  const setEntryTypeId = useCallback((nextId) => {
    setEntryTypeIdState(nextId);
    const nextParts = getWallParts(nextId);
    setWallMaterialByPart((prev) => {
      const next = {};
      nextParts.forEach((p) => {
        next[p.id] = prev[p.id] || WALL_MATERIALS[0].id;
      });
      return next;
    });
  }, []);

  const setWallMaterial = useCallback((partId, materialId) => {
    setWallMaterialByPart((prev) => ({ ...prev, [partId]: materialId }));
  }, []);

  const setControlPanelType = useCallback((type) => {
    setControlPanel((prev) => {
      if (type === 'panel-type-2') {
        return {
          ...prev,
          type,
          bodyId: CONTROL_PANEL_TYPE2_BODY_MATERIALS[0].id,
          displayId: null,
          buttonsId: null,
        };
      }
      return {
        ...prev,
        type,
        bodyId: CONTROL_PANEL_TYPE1_BODY_MATERIALS[0].id,
        displayId: CONTROL_PANEL_TYPE1_DISPLAYS[0].id,
        buttonsId: CONTROL_PANEL_TYPE1_BUTTONS[0].id,
      };
    });
  }, []);

  const setControlPanelField = useCallback((field, value) => {
    setControlPanel((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setAccessoryField = useCallback((field, value) => {
    setAccessories((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setLiftHallField = useCallback((field, value) => {
    setLiftHall((prev) => ({ ...prev, [field]: value }));
  }, []);

  // -- сборка "разрешённой" конфигурации для SceneEngine ------------------
  const resolvedConfig = useMemo(() => {
    const dimension = findById(CABIN_DIMENSIONS, dimensionId);
    const wallSpecs = Object.fromEntries(
      wallParts.map((p) => [p.id, findById(WALL_MATERIALS, wallMaterialByPart[p.id]) || WALL_MATERIALS[0]]),
    );

    const panelBodyCatalog =
      controlPanel.type === 'panel-type-2' ? CONTROL_PANEL_TYPE2_BODY_MATERIALS : CONTROL_PANEL_TYPE1_BODY_MATERIALS;

    const mirrorVariant = findById(MIRROR_VARIANTS, accessories.mirrorId);
    const handrailVariant = findById(HANDRAIL_VARIANTS, accessories.handrailId);

    return {
      model,
      dimension,
      entryType,
      doorType: findById(DOOR_TYPES, doorTypeId),
      ceiling: {
        typeId: ceilingTypeId,
        formFactor: ceilingFormFactor,
      },
      materials: {
        walls: wallSpecs,
        insert: model.hasInserts ? findById(INSERT_RAL_COLORS, insertColorId) : null,
        ceiling: findById(CEILING_MATERIALS, ceilingMaterialId),
        floor: findById(FLOOR_MATERIALS, floorMaterialId),
        corner: model.hasCorners ? findById(CORNER_MATERIALS, cornerMaterialId) : null,
        plinth: model.hasPlinth ? findById(PLINTH_MATERIALS, plinthMaterialId) : null,
        cabinDoor: findById(CABIN_DOOR_MATERIALS, cabinDoorMaterialId),
        shaftDoor: findById(SHAFT_DOOR_MATERIALS, shaftDoorMaterialId),
      },
      controlPanel: {
        position: controlPanel.position,
        type: controlPanel.type,
        materials: {
          body: findById(panelBodyCatalog, controlPanel.bodyId) || panelBodyCatalog[0],
          display:
            controlPanel.type === 'panel-type-1' ? findById(CONTROL_PANEL_TYPE1_DISPLAYS, controlPanel.displayId) : null,
          buttons:
            controlPanel.type === 'panel-type-1' ? findById(CONTROL_PANEL_TYPE1_BUTTONS, controlPanel.buttonsId) : null,
        },
      },
      accessories: {
        mirror: mirrorVariant ? { ...mirrorVariant, screenEnabled: accessories.mirrorScreen } : null,
        handrail: handrailVariant
          ? {
              ...handrailVariant,
              materialSpec: handrailVariant.paintable
                ? findById(HANDRAIL_RAL_COLORS, accessories.handrailColorId)
                : { color: '#c7ccd1', roughness: 0.3, metalness: 0.7 },
            }
          : null,
        wallScreen: accessories.wallScreen,
        domeCamera: accessories.domeCamera,
      },
      liftHall: {
        visible: liftHall.visible,
        callPost: findById(CALL_POST_VARIANTS, liftHall.callPostId),
        floorIndicator: findById(FLOOR_INDICATOR_VARIANTS, liftHall.floorIndicatorId),
        materials: {
          wall: findById(HALL_COLOR_PALETTE, liftHall.wallColorId),
          floor: findById(HALL_COLOR_PALETTE, liftHall.floorColorId),
        },
      },
    };
  }, [
    model,
    dimensionId,
    entryType,
    doorTypeId,
    wallParts,
    wallMaterialByPart,
    insertColorId,
    ceilingTypeId,
    ceilingFormFactor,
    ceilingMaterialId,
    floorMaterialId,
    cornerMaterialId,
    plinthMaterialId,
    controlPanel,
    accessories,
    cabinDoorMaterialId,
    shaftDoorMaterialId,
    liftHall,
  ]);

  return {
    catalog: {
      CABIN_MODELS,
      CABIN_DIMENSIONS,
      CABIN_ENTRY_TYPES,
      DOOR_TYPES,
      WALL_MATERIALS,
      INSERT_RAL_COLORS,
      CEILING_TYPES,
      CEILING_MATERIALS,
      FLOOR_MATERIALS,
      CORNER_MATERIALS,
      PLINTH_MATERIALS,
      CONTROL_PANEL_POSITIONS,
      CONTROL_PANEL_TYPES,
      CONTROL_PANEL_TYPE1_BODY_MATERIALS,
      CONTROL_PANEL_TYPE1_DISPLAYS,
      CONTROL_PANEL_TYPE1_BUTTONS,
      CONTROL_PANEL_TYPE2_BODY_MATERIALS,
      MIRROR_VARIANTS,
      HANDRAIL_VARIANTS,
      HANDRAIL_RAL_COLORS,
      CABIN_DOOR_MATERIALS,
      SHAFT_DOOR_MATERIALS,
      CALL_POST_VARIANTS,
      FLOOR_INDICATOR_VARIANTS,
      HALL_COLOR_PALETTE,
    },
    wallParts,
    state: {
      modelId,
      dimensionId,
      entryTypeId,
      doorTypeId,
      wallMaterialByPart,
      insertColorId,
      ceilingTypeId,
      ceilingFormFactor,
      ceilingMaterialId,
      floorMaterialId,
      cornerMaterialId,
      plinthMaterialId,
      controlPanel,
      accessories,
      cabinDoorMaterialId,
      shaftDoorMaterialId,
      liftHall,
    },
    actions: {
      setModelId,
      setDimensionId,
      setEntryTypeId,
      setDoorTypeId,
      setWallMaterial,
      setInsertColorId,
      setCeilingTypeId,
      setCeilingFormFactor,
      setCeilingMaterialId,
      setFloorMaterialId,
      setCornerMaterialId,
      setPlinthMaterialId,
      setControlPanelType,
      setControlPanelField,
      setAccessoryField,
      setCabinDoorMaterialId,
      setShaftDoorMaterialId,
      setLiftHallField,
    },
    resolvedConfig,
  };
}
