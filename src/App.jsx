import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, connect } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { getCurrentUser, signOut } from 'aws-amplify/auth';
import 'react-toastify/dist/ReactToastify.css';

import store from './store';
import Dashboard from './features/dashboard/Dashboard';
import AuthPage from './features/auth/AuthPage';
import Spinner from './components/Spinner';
import { notifyLoginSuccess, notifyLogout } from './services/ipcWindowService';
import { getUserFromApi } from './services/userService';
import { userLogin, userLogout } from './store/actions';
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
      const user = await getCurrentUser();
      if (user) {
        // 1. Setup ban đầu & resize window
        notifyLoginSuccess();

        // 2. Thử đọc user data đã cache từ electron-store
        let userData = null;
        if (window.api) {
          try {
            const storeResult = await window.api.invoke('store:getUser');
            if (storeResult.success && storeResult.data) {
              userData = storeResult.data;
              console.log('[App] Đã load thông tin user từ electron-store:', userData);
            }
          } catch (storeError) {
            console.error('[App] Lỗi đọc user store:', storeError);
          }
        }

        // 3. Dispatch login tạm thời với data cache hoặc data Cognito
        this.props.userLogin({
          userId: userData?.UserID || user.username,
          email: userData?.Information?.email || user.signInDetails?.loginId || user.username,
          name: userData?.Information?.name || user.username,
          createdAt: userData?.createdAt,
        });

        // 4. Đồng bộ thông tin mới nhất từ API
        try {
          const apiResult = await getUserFromApi();
          if (apiResult.success && apiResult.data) {
            const freshData = apiResult.data;
            if (window.api) {
              await window.api.invoke('store:saveUser', freshData).catch(() => { });
            }
            this.props.userLogin({
              userId: freshData.UserID,
              email: freshData.Information?.email,
              name: freshData.Information?.name,
              createdAt: freshData.createdAt,
            });
          } else {
            // Nếu API báo lỗi 401 hoặc Unauthorized, dọn dẹp session và logout
            if (apiResult.error?.includes('401') || apiResult.error?.toLowerCase().includes('unauthorized')) {
              console.warn('[App] Session unauthorized, logging out...');
              await signOut().catch(() => { });
              if (window.api) {
                await window.api.invoke('store:clearUser').catch(() => { });
              }
              notifyLogout();
              this.props.userLogout();
            }
          }
        } catch (apiError) {
          console.error('[App] Lỗi đồng bộ user từ API:', apiError);
        }
      }
    } catch (error) {
      console.log('No active session found.');
    } finally {
      this.setState({ isCheckingAuth: false });
    }
  }

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
            element={isLoggedIn ? <Navigate to="/desktop" replace /> : <AuthPage />}
          />
          <Route
            path="/desktop"
            element={isLoggedIn ? <Dashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="*"
            element={<Navigate to={isLoggedIn ? "/desktop" : "/login"} replace />}
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
  isLoggedIn: state.isLoggedIn,
});

const mapDispatchToProps = (dispatch) => ({
  userLogin: (info) => dispatch(userLogin(info)),
  userLogout: () => dispatch(userLogout()),
});

const ConnectedApp = connect(mapStateToProps, mapDispatchToProps)(App);

const Root = () => (
  <Provider store={store}>
    <ConnectedApp />
  </Provider>
);

export default Root;
