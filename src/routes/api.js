import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Создаем корень для приложения
const root = ReactDOM.createRoot(document.getElementById('root'));

// Рендерим только App
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);