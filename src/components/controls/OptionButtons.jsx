import React from 'react';

/**
 * OptionButtons — выбор одного варианта из именованного списка
 * (модель, габариты, тип кабины и т.п.), без цветового превью.
 */
export default function OptionButtons({ options, value, onChange, disabled = false }) {
  return (
    <div className="option-buttons" role="group">
      {options.map((option) => {
        const isSelected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            className={`option-button${isSelected ? ' option-button--selected' : ''}`}
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.id)}
          >
            {option.name}
          </button>
        );
      })}
    </div>
  );
}
