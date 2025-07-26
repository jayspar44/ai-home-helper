import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importing global styles
import App from './App'; // Importing your main App component

// This is the standard way to initialize a React application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
