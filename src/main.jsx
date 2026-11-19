import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import './index.css'
import App from './App.jsx'
import AppearanceProvider from './components/AppearanceProvider'
import { ClerkProvider } from '@clerk/react'
import { authEnabled, clerkKey } from './shared/auth'

const app = <AppearanceProvider><App /></AppearanceProvider>

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {authEnabled
      ? <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">{app}</ClerkProvider>
      : app}
  </StrictMode>,
)
