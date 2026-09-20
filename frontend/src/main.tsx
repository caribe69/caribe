import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource-variable/inter';
import App from './App';
import { ConfirmProvider } from './components/ConfirmProvider';
import { ToastProvider } from './components/ToastProvider';
import './store/theme'; // inicializa theme según hora de Perú
import './index.css';

// Auto-recuperación tras un deploy: si una pieza (chunk) no carga porque salió
// una versión nueva, recarga la página UNA vez para tomar la versión fresca.
// Evita la pantalla en negro cuando el navegador tenía la versión anterior.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  try {
    const KEY = 'chunk-reload-ts';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
