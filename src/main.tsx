import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { requestPersist } from './lib/storage'

// 브라우저가 저장 공간이 부족할 때 IndexedDB를 지우지 않도록 요청한다
requestPersist()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
