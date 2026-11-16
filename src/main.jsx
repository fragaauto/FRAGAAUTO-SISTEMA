import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import '@/index.css'

// O link público não precisa carregar relatórios, PDFs, menus ou verificar login.
const paginaPromocao = /^\/PromocaoPublica\/?$/i.test(window.location.pathname)
const App = lazy(() => paginaPromocao
  ? import('@/components/promocoes/PromocaoPublicaApp')
  : import('@/App.jsx'))

ReactDOM.createRoot(document.getElementById('root')).render(
  <Suspense fallback={
    <div role="status" aria-label="Carregando" className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  }>
    <App />
  </Suspense>
)