import '@google/model-viewer';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './lib/preloadModels';
import { migrateBloatedLocalStorageToIdb } from './lib/migrateBloatedLocalStorage';

async function start() {
  await migrateBloatedLocalStorageToIdb();
  const { default: App } = await import('./App.tsx');
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

void start().catch((e) => {
  console.error(e);
});
