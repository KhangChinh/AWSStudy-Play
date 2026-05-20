import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DesktopHub from './pages/DesktopHub';
import AuthPage from './pages/AuthPage';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/desktop" element={<DesktopHub />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
