import React, { Component } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, connect } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import 'react-toastify/dist/ReactToastify.css';

import store from './store';
import Dashboard from './features/dashboard/Dashboard';
import AuthPage from './features/auth/AuthPage';
import TimerWidget from './features/focus/TimerWidget';
import Spinner from './components/Spinner';
import { handleLoginSuccessApi, initializeAuth } from './services/authService';
import { userLogin } from './store/actions';
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
      // Khởi tạo Auth (lấy token vào RAM)
      await initializeAuth();
      
      const user = await getCurrentUser();
      const attributes = await fetchUserAttributes();
      if (user) {
        // Nếu đã đăng nhập, thực hiện setup ban đầu
        handleLoginSuccessApi(); // Resize window
        this.props.userLogin({
          email: attributes.email || user.signInDetails?.loginId || user.username,
          username: attributes.name || attributes.nickname || user.username
        });
      }
    } catch (_error) {
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
      <HashRouter>
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
            path="/timer-widget"
            element={<TimerWidget />}
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
      </HashRouter>
    );
  }
}

const mapStateToProps = (state) => ({
  isLoggedIn: state.isLoggedIn,
});

const mapDispatchToProps = (dispatch) => ({
  userLogin: (info) => dispatch(userLogin(info)),
});

const ConnectedApp = connect(mapStateToProps, mapDispatchToProps)(App);

const Root = () => (
  <Provider store={store}>
    <ConnectedApp />
  </Provider>
);

export default Root;
