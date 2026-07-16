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

import { handleSyncAllApi } from './services/syncService';
import { handleLogoutApi } from './services/authService';
import { initializeAuth } from './services/tokenService';

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
      if (window.api?.invoke) {
        const loadedAiSettings = await window.api.invoke('store:loadAiSettings');
        if (loadedAiSettings) {
          store.dispatch({ type: 'SET_AI_SETTINGS', payload: loadedAiSettings });
        }
      }
    } catch (error) {
      console.warn('[App] Failed to load AI settings:', error);
    }

    try {
      await this.bootstrapSession();
    } catch (error) {
      console.log('[App] Bootstrap failed:', error.message);
    } finally {
      this.setState({ isCheckingAuth: false });
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
    const syncResult = await handleSyncAllApi();
    const profile = syncResult?.profile || this.props.userProfile || store.getState().profile?.userProfile;
    if (!profile) {
      console.warn('[App] No cached profile is available; keeping the Cognito session for a later retry.');
      return;
    }
    // A temporary sync/network failure must not invalidate a valid Cognito session.
    if (syncResult?.syncError) {
      console.warn('[App] Using cached profile while background sync is unavailable:', syncResult.syncError);
    }
    if (window.api?.send) window.api.send('login-success');
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
  userProfile: state.profile?.userProfile,
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