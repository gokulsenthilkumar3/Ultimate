import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UserStoreProvider } from './context/UserStore.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserStoreProvider>
      <App />
    </UserStoreProvider>
  </StrictMode>,
)
