import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Preview from './Preview.jsx'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/code-highlight/styles.css';

// isCard check
const basicIds = ['front-card-basic', 'back-card-basic', 'extra-card-basic'];
const clozeIds = ['front-card-cloze', 'back-card-cloze', 'extra-card-cloze'];
const isCard = [...basicIds, ...clozeIds].some(id => document.getElementById(id) !== null);

// Document setup for React
const oldRoot = document.getElementById('root-react')
if (oldRoot) {
    oldRoot.parentNode.removeChild(oldRoot)
}
const newRoot = document.createElement('div')
newRoot.id = 'root-react'

if (!isCard) {
  const fieldsElement = document.getElementById('fields') || document.querySelector('.fields');
  fieldsElement?.parentNode?.insertBefore(newRoot, fieldsElement.nextSibling);
} else {
  document.body.appendChild(newRoot)
}
// detect light or dark mode
const nightModeElement = document.querySelector('.nightMode') || document.querySelector('.night-mode');
const defaultScheme = nightModeElement ? 'dark' : 'light';

const _root = createRoot(document.getElementById('root-react')).render(
  <StrictMode>
        <MantineProvider 
        withGlobalClasses
        defaultColorScheme={defaultScheme}
      >
      {(isCard ? <App /> : <Preview />)}
      </MantineProvider>
  </StrictMode>,
)