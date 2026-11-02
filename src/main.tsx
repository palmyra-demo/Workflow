import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.layer.css';
import 'diagram-js/assets/diagram-js.css';
import './index.css';
import App from './App';
import { theme } from './theme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light" >
    <App />
  </MantineProvider>,
);
