import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@fontsource/noto-serif-sc/400.css'
import '@fontsource/noto-serif-sc/600.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(<App />)
