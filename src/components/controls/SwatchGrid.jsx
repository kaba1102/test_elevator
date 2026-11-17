import React from 'react';

/**
 * SwatchGrid — переиспользуемый выбор материала/цвета из каталога.
 * Каждый вариант — доступная кнопка (семантика <button>, п. 3.1/2.8 ТЗ)
 * с подписью по aria-label и визуальной индикацией выбранного элемента.
 */
export default function SwatchGrid({ options, value, onChange, disabled = false }) {
  return (
    <div className="swatch-grid" role="group">
      {options.map((option) => {
        const isSelected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            className={`swatch${isSelected ? ' swatch--selected' : ''}`}
            style={{ backgroundColor: option.color }}
            aria-pressed={isSelected}
            aria-label={option.name}
            title={option.name}
            disabled={disabled}
            onClick={() => onChange(option.id)}
          >
            {isSelected && <span className="swatch__check" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}
