import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/code-highlight/styles.css';

const oldRoot = document.getElementById('root-react')
if (oldRoot) {
    oldRoot.parentNode.removeChild(oldRoot)
}
const newRoot = document.createElement('div')
newRoot.id = 'root-react'
document.body.appendChild(newRoot)
// check if there is an element with class "nightMode" or "night-mode" in the document
const nightModeElement = document.querySelector('.nightMode') || document.querySelector('.night-mode');


const defaultScheme = nightModeElement ? 'dark' : 'light';

createRoot(document.getElementById('root-react')).render(
  <StrictMode>
        <MantineProvider 
        withGlobalClasses
        defaultColorScheme={defaultScheme}
      ><App /></MantineProvider>
  </StrictMode>,
)
