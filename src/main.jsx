import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './components/common/ToastProvider.jsx';
import { appEnv } from './config/env.js';
import { OperationsProvider } from './state/OperationsContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <OperationsProvider>
          <App />
        </OperationsProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

if (appEnv.enablePwa && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
