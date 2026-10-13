// Carbon Charts styles: top-level import in the app entry, per the Carbon MCP `styles_import` (DESIGN.md §2.3).
import '@carbon/charts/styles.css';
import './styles/index.scss';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
