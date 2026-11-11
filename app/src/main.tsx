import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './app.css';
import './app-interface.css';

function BrowserGuards() {
  useEffect(() => {
    const stopContextMenu = (event: MouseEvent) => event.preventDefault();
    const stopDevToolsShortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modified = event.ctrlKey || event.metaKey;
      const blocked = event.key === 'F12'
        || (modified && event.shiftKey && ['i', 'j', 'c'].includes(key))
        || (modified && key === 'u');
      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', stopContextMenu);
    document.addEventListener('keydown', stopDevToolsShortcuts, true);
    return () => {
      document.removeEventListener('contextmenu', stopContextMenu);
      document.removeEventListener('keydown', stopDevToolsShortcuts, true);
    };
  }, []);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><BrowserGuards /><App /></BrowserRouter></React.StrictMode>
);
