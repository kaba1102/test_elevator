import React, { useEffect, useRef } from 'react';
import SceneEngine from '../three/SceneEngine';
import useCabinConfigurator from '../hooks/useCabinConfigurator';
import OptionSection from './controls/OptionSection';
import OptionButtons from './controls/OptionButtons';
import SwatchGrid from './controls/SwatchGrid';
import './ElevatorConfigurator.css';

/**
 * ElevatorConfigurator
 * -----------------------------------------------------------------------
 * Функциональный React-компонент (только Hooks, без классовых компонентов —
 * п. 2.8 ТЗ), реализующий:
 *
 *  — Раздел 4 ТЗ «СТРУКТУРА МАТЕРИАЛОВ»: полный набор параметров кабины
 *    (модель, габариты, тип кабины, двери, стены, вставки, потолок, пол,
 *    углы, плинтус, приказной пост, аксессуары, двери кабины/шахты,
 *    лифтовой холл) — панель управления справа.
 *
 *  — Раздел 6 ТЗ «ТРЕБОВАНИЯ К 3D-МОДЕЛЯМ»: 3D-визуализация слева,
 *    построенная на Three.js через SceneEngine — физически корректные
 *    отражения, мягкий реалистичный свет, отсутствие потери качества
 *    при масштабировании, анизотропная фильтрация текстур.
 *
 * Компонент самодостаточен: вся логика — на клиенте (без обращения к
 * серверу), что соответствует п. 2.3 ТЗ «Автономное функционирование».
 */
export default function ElevatorConfigurator() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  const { catalog, wallParts, state, actions, resolvedConfig } = useCabinConfigurator();

  // Инициализация Three.js-движка один раз при монтировании и полная
  // очистка ресурсов (geometry/material/texture/renderer) при размонтировании
  // — предотвращает утечки RAM/VRAM (п. 2.8 ТЗ «Управление памятью»).
  useEffect(() => {
    if (!canvasRef.current) return undefined;
    const engine = new SceneEngine(canvasRef.current);
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Перестроение геометрии кабины при изменении выбранной конфигурации.
  // Выполняется вне цикла рендеринга (requestAnimationFrame), только по
  // факту изменения пользовательского выбора — соответствует требованию
  // не выполнять тяжёлые операции внутри animate()/tick() (п. 2.8 ТЗ).
  useEffect(() => {
    engineRef.current?.buildCabin(resolvedConfig);
  }, [resolvedConfig]);

  const panelBodyCatalog =
    state.controlPanel.type === 'panel-type-2'
      ? catalog.CONTROL_PANEL_TYPE2_BODY_MATERIALS
      : catalog.CONTROL_PANEL_TYPE1_BODY_MATERIALS;

  const selectedHandrail = catalog.HANDRAIL_VARIANTS.find((h) => h.id === state.accessories.handrailId);
  const selectedMirror = catalog.MIRROR_VARIANTS.find((m) => m.id === state.accessories.mirrorId);

  return (
    <div className="configurator">
      <div className="configurator__viewport">
        <canvas ref={canvasRef} className="configurator__canvas" aria-label="3D-визуализация кабины лифта" />
      </div>

      <aside className="configurator__panel" aria-label="Параметры конфигурации кабины">
        <h2 className="configurator__panel-title">Конфигурация кабины</h2>

        <OptionSection title="Модель кабины">
          <OptionButtons options={catalog.CABIN_MODELS} value={state.modelId} onChange={actions.setModelId} />
        </OptionSection>

        <OptionSection title="Габариты кабины">
          <OptionButtons
            options={catalog.CABIN_DIMENSIONS}
            value={state.dimensionId}
            onChange={actions.setDimensionId}
          />
        </OptionSection>

        <OptionSection title="Тип кабины">
          <OptionButtons
            options={catalog.CABIN_ENTRY_TYPES}
            value={state.entryTypeId}
            onChange={actions.setEntryTypeId}
          />
        </OptionSection>

        <OptionSection title="Тип дверей">
          <OptionButtons options={catalog.DOOR_TYPES} value={state.doorTypeId} onChange={actions.setDoorTypeId} />
        </OptionSection>

        <OptionSection title="Отделка стен" subtitle="24 варианта">
          {wallParts.map((part) => (
            <div key={part.id} className="sub-option">
              <span className="sub-option__label">{part.name}</span>
              <SwatchGrid
                options={catalog.WALL_MATERIALS}
                value={state.wallMaterialByPart[part.id]}
                onChange={(id) => actions.setWallMaterial(part.id, id)}
              />
            </div>
          ))}
        </OptionSection>

        {resolvedConfig.model.hasInserts && (
          <OptionSection title="Вставки между щитами" subtitle="3 цвета RAL">
            <SwatchGrid
              options={catalog.INSERT_RAL_COLORS}
              value={state.insertColorId}
              onChange={actions.setInsertColorId}
            />
          </OptionSection>
        )}

        <OptionSection title="Потолок" subtitle="6 решений × 2 форм-фактора × 16 материалов">
          <div className="sub-option">
            <span className="sub-option__label">Конструктивное решение</span>
            <OptionButtons
              options={catalog.CEILING_TYPES}
              value={state.ceilingTypeId}
              onChange={actions.setCeilingTypeId}
            />
          </div>
          <div className="sub-option">
            <span className="sub-option__label">Форм-фактор</span>
            <OptionButtons
              options={[
                { id: 'square', name: 'Квадратный' },
                { id: 'rectangular', name: 'Прямоугольный' },
              ]}
              value={state.ceilingFormFactor}
              onChange={actions.setCeilingFormFactor}
            />
          </div>
          <div className="sub-option">
            <span className="sub-option__label">Материал отделки</span>
            <SwatchGrid
              options={catalog.CEILING_MATERIALS}
              value={state.ceilingMaterialId}
              onChange={actions.setCeilingMaterialId}
            />
          </div>
        </OptionSection>

        <OptionSection title="Пол" subtitle="9 вариантов">
          <SwatchGrid options={catalog.FLOOR_MATERIALS} value={state.floorMaterialId} onChange={actions.setFloorMaterialId} />
        </OptionSection>

        {resolvedConfig.model.hasCorners && (
          <OptionSection title="Углы" subtitle="24 варианта">
            <SwatchGrid
              options={catalog.CORNER_MATERIALS}
              value={state.cornerMaterialId}
              onChange={actions.setCornerMaterialId}
            />
          </OptionSection>
        )}

        {resolvedConfig.model.hasPlinth && (
          <OptionSection title="Плинтус" subtitle="19 вариантов">
            <SwatchGrid
              options={catalog.PLINTH_MATERIALS}
              value={state.plinthMaterialId}
              onChange={actions.setPlinthMaterialId}
            />
          </OptionSection>
        )}

        <OptionSection title="Приказной пост">
          <div className="sub-option">
            <span className="sub-option__label">Расположение</span>
            <OptionButtons
              options={catalog.CONTROL_PANEL_POSITIONS}
              value={state.controlPanel.position}
              onChange={(v) => actions.setControlPanelField('position', v)}
            />
          </div>
          <div className="sub-option">
            <span className="sub-option__label">Тип поста</span>
            <OptionButtons
              options={catalog.CONTROL_PANEL_TYPES}
              value={state.controlPanel.type}
              onChange={actions.setControlPanelType}
            />
          </div>
          <div className="sub-option">
            <span className="sub-option__label">Материал корпуса</span>
            <SwatchGrid
              options={panelBodyCatalog}
              value={state.controlPanel.bodyId}
              onChange={(v) => actions.setControlPanelField('bodyId', v)}
            />
          </div>
          {state.controlPanel.type === 'panel-type-1' && (
            <>
              <div className="sub-option">
                <span className="sub-option__label">Дисплей</span>
                <SwatchGrid
                  options={catalog.CONTROL_PANEL_TYPE1_DISPLAYS}
                  value={state.controlPanel.displayId}
                  onChange={(v) => actions.setControlPanelField('displayId', v)}
                />
              </div>
              <div className="sub-option">
                <span className="sub-option__label">Кнопки</span>
                <SwatchGrid
                  options={catalog.CONTROL_PANEL_TYPE1_BUTTONS}
                  value={state.controlPanel.buttonsId}
                  onChange={(v) => actions.setControlPanelField('buttonsId', v)}
                />
              </div>
            </>
          )}
        </OptionSection>

        <OptionSection title="Аксессуары">
          <div className="sub-option">
            <span className="sub-option__label">Зеркало</span>
            <OptionButtons
              options={catalog.MIRROR_VARIANTS}
              value={state.accessories.mirrorId}
              onChange={(v) => actions.setAccessoryField('mirrorId', v)}
            />
          </div>
          {selectedMirror?.screenCompatible && (
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={state.accessories.mirrorScreen}
                onChange={(e) => actions.setAccessoryField('mirrorScreen', e.target.checked)}
              />
              Встроенный экран в зеркало
            </label>
          )}

          <div className="sub-option">
            <span className="sub-option__label">Поручень</span>
            <OptionButtons
              options={catalog.HANDRAIL_VARIANTS}
              value={state.accessories.handrailId}
              onChange={(v) => actions.setAccessoryField('handrailId', v)}
            />
          </div>
          {selectedHandrail?.paintable && (
            <div className="sub-option">
              <span className="sub-option__label">Цвет поручня (RAL)</span>
              <SwatchGrid
                options={catalog.HANDRAIL_RAL_COLORS}
                value={state.accessories.handrailColorId}
                onChange={(v) => actions.setAccessoryField('handrailColorId', v)}
              />
            </div>
          )}

          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={state.accessories.wallScreen}
              onChange={(e) => actions.setAccessoryField('wallScreen', e.target.checked)}
            />
            Отдельный экран, встроенный в стену
          </label>

          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={state.accessories.domeCamera}
              onChange={(e) => actions.setAccessoryField('domeCamera', e.target.checked)}
            />
            Купольная видеокамера
          </label>
        </OptionSection>

        <OptionSection title="Двери кабины" subtitle="24 варианта">
          <SwatchGrid
            options={catalog.CABIN_DOOR_MATERIALS}
            value={state.cabinDoorMaterialId}
            onChange={actions.setCabinDoorMaterialId}
          />
        </OptionSection>

        <OptionSection title="Двери шахты" subtitle="24 варианта">
          <SwatchGrid
            options={catalog.SHAFT_DOOR_MATERIALS}
            value={state.shaftDoorMaterialId}
            onChange={actions.setShaftDoorMaterialId}
          />
        </OptionSection>

        <OptionSection title="Лифтовой холл" defaultOpen={false}>
          <label className="checkbox-option">
            <input
              type="checkbox"
              checked={state.liftHall.visible}
              onChange={(e) => actions.setLiftHallField('visible', e.target.checked)}
            />
            Показывать вид из лифтового холла
          </label>
          {state.liftHall.visible && (
            <>
              <div className="sub-option">
                <span className="sub-option__label">Вызывной пост</span>
                <SwatchGrid
                  options={catalog.CALL_POST_VARIANTS}
                  value={state.liftHall.callPostId}
                  onChange={(v) => actions.setLiftHallField('callPostId', v)}
                />
              </div>
              <div className="sub-option">
                <span className="sub-option__label">Этажное табло</span>
                <SwatchGrid
                  options={catalog.FLOOR_INDICATOR_VARIANTS}
                  value={state.liftHall.floorIndicatorId}
                  onChange={(v) => actions.setLiftHallField('floorIndicatorId', v)}
                />
              </div>
              <div className="sub-option">
                <span className="sub-option__label">Цвет стен холла</span>
                <SwatchGrid
                  options={catalog.HALL_COLOR_PALETTE}
                  value={state.liftHall.wallColorId}
                  onChange={(v) => actions.setLiftHallField('wallColorId', v)}
                />
              </div>
              <div className="sub-option">
                <span className="sub-option__label">Цвет пола холла</span>
                <SwatchGrid
                  options={catalog.HALL_COLOR_PALETTE}
                  value={state.liftHall.floorColorId}
                  onChange={(v) => actions.setLiftHallField('floorColorId', v)}
                />
              </div>
            </>
          )}
        </OptionSection>
      </aside>
    </div>
  );
}
