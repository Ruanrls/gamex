import { App } from "./app"
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <App />
        </StrictMode>,
    )
}