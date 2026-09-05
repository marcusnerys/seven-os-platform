import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

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
