import './styles.css';
import { applyTheme } from './theme.js';
import { createRoot } from 'react-dom/client';
import { DashboardApp } from './app.js';

applyTheme();

const container = document.getElementById('app');

if (!container) {
  throw new Error('Dashboard root element not found.');
}

createRoot(container).render(<DashboardApp />);
