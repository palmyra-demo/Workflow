import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { WorkflowPage } from './page/WorkflowPage';

export default function App() {
  return <>
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<WorkflowPage />}></Route>
      </Routes>
    </BrowserRouter>
  </>
}