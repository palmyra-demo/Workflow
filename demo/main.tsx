import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.layer.css';
import 'diagram-js/assets/diagram-js.css';
import '../src/styles.css';
import './demo.css';
import { WorkflowEditor, workflowTheme } from '../src';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={workflowTheme} forceColorScheme="light">
    <WorkflowEditor
      onReady={(modeler) => {
        if (import.meta.env.DEV) (window as unknown as { __wf: unknown }).__wf = modeler;
      }}
    />
  </MantineProvider>,
);
