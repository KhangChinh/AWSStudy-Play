import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

import './index.css'
import App from './App.jsx'
import { cognitoSecureStorage } from './services/cognitoSecureStorage';

// Cấu hình Amplify Auth
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
});

// Override Cognito token storage → secureStore (safeStorage)
// Thay vì localStorage mặc định, tokens sẽ được mã hóa và lưu qua IPC
cognitoUserPoolsTokenProvider.setKeyValueStorage(cognitoSecureStorage);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)