import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (!import.meta.env.VITE_API_BASE) {
  console.warn('⚠️ VITE_API_BASE is missing! The application will fall back to local offline storage.');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
