import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify';

import './index.css'
import './i18n'
import App from './App.jsx'
import { initializeAuth } from './services/authService';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_AUTHORITY.split('/').pop(),
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});

// Khởi tạo Auth (Lấy Token vào RAM) trước khi render
initializeAuth().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
});

