import { createRoot } from 'react-dom/client';
import { DashboardApp } from './app.js';

const container = document.getElementById('app');

if (!container) {
  throw new Error('Dashboard root element not found.');
}

createRoot(container).render(<DashboardApp />);
