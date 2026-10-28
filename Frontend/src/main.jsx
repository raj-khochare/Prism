import React from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from './router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import App from './App.jsx';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </RouterProvider>
    </AuthProvider>
  </React.StrictMode>
);