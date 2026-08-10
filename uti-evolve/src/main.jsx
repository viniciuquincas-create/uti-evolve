import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// PWA: armazena somente a interface estática. APIs e dados clínicos continuam
// sempre na rede/Supabase e nunca são interceptados pelo service worker.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('Não foi possível registrar o modo aplicativo:', error)
    })
  })
}
