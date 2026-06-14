import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Entry point: find <div id="root"> in index.html and render our React tree into it.
// StrictMode is a dev-only wrapper that surfaces unsafe patterns (it has no effect
// in production builds). It intentionally double-invokes some functions in dev.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
