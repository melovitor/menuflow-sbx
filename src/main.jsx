import React from 'react'
import ReactDOM from 'react-dom/client'
import { getInitialTheme, applyTheme } from './utils/theme'
import App from './App'
import './index.css'

applyTheme(getInitialTheme())

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
