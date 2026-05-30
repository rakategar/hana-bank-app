import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DemoTimeProvider } from './contexts/DemoTimeContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <DemoTimeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </DemoTimeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
