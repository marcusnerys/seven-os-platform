/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import { registerSW } from 'virtual:pwa-register';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

// Registro pelo módulo do plugin, que recarrega a página quando a versão nova
// assume. O script padrão só registrava o service worker: quem tinha o app
// instalado na tela inicial seguia na versão antiga depois de um deploy — uma
// correção feita durante o teste só chegava na segunda abertura a frio. A
// procura por atualização acontece ao voltar para o app, e não no meio do uso.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    if (!registro) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registro.update().catch(() => {});
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {/* Fica na raiz para contar também o link público de agendamento,
          que é renderizado fora da árvore do app autenticado. */}
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
);
