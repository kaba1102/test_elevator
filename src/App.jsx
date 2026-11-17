import React from 'react';
import ElevatorConfigurator from './components/ElevatorConfigurator';

// Демонстрационная точка входа для локального запуска (npm run dev).
// В реальном проекте <ElevatorConfigurator /> подключается на страницу
// сайта Заказчика как самостоятельный React-компонент (см. README.md).
export default function App() {
  return <ElevatorConfigurator />;
}
