import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, connect } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { store, persistor } from './store';
import Dashboard from './features/dashboard/Dashboard';
import AuthPage from './features/auth/AuthPage';
import Spinner from './components/Spinner';

import { handleSyncProfileApi } from './services/syncService';
import { handleLogoutApi } from './services/authService';
import { initializeAuth, getValidAccessToken } from './services/tokenService';

import './index.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isCheckingAuth: true,
    };
  }

  async componentDidMount() {
    try {
      await this.bootstrapSession();
    } catch (error) {
      console.log('[App] Bootstrap failed:', error.message);
    } finally {
      this.setState({ isCheckingAuth: false });
    }

    // Auto-refresh token every 5 minutes to keep backend in sync
    this.tokenRefreshInterval = setInterval(async () => {
      if (this.props.isLoggedIn) {
         try {
            await getValidAccessToken();
         } catch(e) {
            console.warn('[App] Auto token refresh failed', e);
         }
      }
    }, 5 * 60 * 1000);
  }

  componentWillUnmount() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
  }

  bootstrapSession = async () => {
    if (localStorage.getItem('manualLogoutAt')) {
      return;
    }

    const hasValidSession = await initializeAuth();
    if (!hasValidSession) {
      console.log('[App] Không có phiên Cognito hợp lệ hoặc đã hết hạn.');
      await handleLogoutApi({ resizeWindow: false });
      return;
    }
    try {
      await handleSyncProfileApi();
      // Gửi IPC để main process resize cửa sổ sang kích thước Dashboard
      if (window.api?.send) window.api.send('login-success');
    } catch (error) {
      console.warn('[App] Đồng bộ profile thất bại, đăng xuất...', error.message);
      await handleLogoutApi({ resizeWindow: false });
    }
  };

  render() {
    const { isCheckingAuth } = this.state;
    const { isLoggedIn } = this.props;

    if (isCheckingAuth) {
      return (
        <div className="auth-page">
          <Spinner />
        </div>
      );
    }

    return (
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <AuthPage />}
          />
          <Route
            path="/dashboard"
            element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="*"
            element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={1000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </BrowserRouter>
    );
  }
}

const mapStateToProps = (state) => ({
  isLoggedIn: !!state.profile?.userProfile,
});

const ConnectedApp = connect(mapStateToProps)(App);

const Root = () => (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ConnectedApp />
    </PersistGate>
  </Provider>
);

export default Root;