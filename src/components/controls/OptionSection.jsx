import React from 'react';

/**
 * OptionSection — семантическая секция панели настроек (<section> + <h3>,
 * см. п. 2.8 ТЗ «Семантическая вёрстка»). Раскрывается/сворачивается
 * нативным <details>, без дополнительного JS-состояния.
 */
export default function OptionSection({ title, subtitle, defaultOpen = true, children }) {
  return (
    <details className="option-section" open={defaultOpen}>
      <summary className="option-section__summary">
        <span className="option-section__title">{title}</span>
        {subtitle && <span className="option-section__subtitle">{subtitle}</span>}
      </summary>
      <div className="option-section__body">{children}</div>
    </details>
  );
}
