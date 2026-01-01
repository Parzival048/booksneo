/**
 * AI Tally Sync - Entry Point
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Suppress AbortError messages (expected when requests are canceled)
// These occur when components unmount before requests complete
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'AbortError' ||
    event.reason?.message?.includes('aborted') ||
    event.reason?.message?.includes('The user aborted a request')) {
    event.preventDefault();
    return;
  }
});

// Also handle general errors from external scripts
window.addEventListener('error', (event) => {
  // Suppress errors from external scripts like browser extensions
  if (event.filename?.includes('frame_ant') ||
    event.message?.includes('AbortError') ||
    event.message?.includes('aborted')) {
    event.preventDefault();
    return;
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
