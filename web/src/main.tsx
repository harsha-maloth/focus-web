import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { captureStartupAuthError } from './lib/authErrors'
import './index.css'

// Must run before the router mounts: it removes auth error params from the URL.
captureStartupAuthError()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
