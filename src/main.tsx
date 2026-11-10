
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeDatabase } from './database/db';

async function startApplication() {
  await initializeDatabase();

  ReactDOM.createRoot(
    document.getElementById('root')!
  ).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

startApplication();
