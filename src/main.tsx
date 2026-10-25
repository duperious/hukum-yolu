import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/main.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Uygulama kökü (#root) bulunamadı.');
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
