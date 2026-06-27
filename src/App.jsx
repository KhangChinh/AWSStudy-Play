import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, connect } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import 'react-toastify/dist/ReactToastify.css';

import store from './store';
import Dashboard from './features/dashboard/Dashboard';
import AuthPage from './features/auth/AuthPage';
import Spinner from './components/Spinner';
import { notifyLoginSuccess, notifyLogout } from './services/ipcWindowService';
import { getUserFromApi } from './services/userService';
import { userLogin, userLogout, setDailyQuests } from './store/actions';
import './index.css';

/**
 * Sliding Expiration: Phiên hết hạn sau 48 giờ không hoạt động
 */
const SESSION_MAX_IDLE_MS = 48 * 60 * 60 * 1000; // 48 giờ

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
  }

  /**
   * Bootstrap Sliding Expiration — Chạy 1 lần khi app khởi động
   *
   * Luồng:
   *   1. Đọc lastActiveTimestamp từ secureStore
   *   2. Nếu không có → Không có phiên cũ → hiện Login
   *   3. Nếu > 48h → Phiên hết hạn → clear store + sign out
   *   4. Nếu ≤ 48h → Phiên còn hạn → renew session + load fresh user data
   */
  bootstrapSession = async () => {
    // 1. Đọc lastActiveTimestamp
    let lastActive = null;
    if (window.api) {
      const result = await window.api.invoke('secureStore:getItem', 'lastActiveTimestamp');
      if (result.success && result.value) {
        lastActive = Number(result.value);
      }
    }

    // 2. Không có timestamp → chưa từng login hoặc đã bị clear
    if (!lastActive) {
      console.log('[App] Không có phiên cũ.');
      return;
    }

    const elapsed = Date.now() - lastActive;

    // 3. Quá 48h → Phiên hết hạn
    if (elapsed > SESSION_MAX_IDLE_MS) {
      console.warn(`[App] Phiên hết hạn (idle ${Math.round(elapsed / 3600000)}h > 48h). Force sign out.`);
      if (window.api) {
        await window.api.invoke('secureStore:clear').catch(() => { });
      }
      await signOut().catch(() => { });
      notifyLogout();
      this.props.userLogout();
      return;
    }

    // 4. Còn trong 48h → Renew session
    console.log(`[App] Phiên còn hạn (idle ${Math.round(elapsed / 60000)} phút). Đang renew...`);

    // 4a. Gọi fetchAuthSession → Cognito tự dùng custom storage lấy refresh token → renew
    const session = await fetchAuthSession();
    if (!session.tokens?.idToken) {
      // Token hết hạn hoặc refresh token invalid → force logout
      console.warn('[App] Không thể renew session. Force sign out.');
      if (window.api) {
        await window.api.invoke('secureStore:clear').catch(() => { });
      }
      await signOut().catch(() => { });
      notifyLogout();
      this.props.userLogout();
      return;
    }

    // 4b. Resize window cho Desktop mode
    notifyLoginSuccess();

    // 4c. Gọi API lấy userData mới nhất → nạp vào Redux (KHÔNG lưu disk)
    const apiResult = await getUserFromApi();
    if (apiResult.success && apiResult.data) {
      const freshData = apiResult.data;
      console.log('Fresh data from API:', freshData);
      this.props.userLogin({
        userId: freshData.PK,
        email: freshData.information?.email,
        name: freshData.information?.name,
        createdAt: freshData.createdAt,
      });
    } else {
      // API thất bại (401, network error...) → kiểm tra có phải unauthorized
      if (apiResult.error?.includes('401') || apiResult.error?.toLowerCase().includes('unauthorized')) {
        console.warn('[App] Session unauthorized, logging out...');
        if (window.api) {
          await window.api.invoke('secureStore:clear').catch(() => { });
        }
        await signOut().catch(() => { });
        notifyLogout();
        this.props.userLogout();
        return;
      }
      // Lỗi khác (network) → vẫn cho vào app nhưng log warning
      console.warn('[App] Không thể đồng bộ user từ API:', apiResult.error);
    }

    // 4d. Update lastActiveTimestamp = now (Sliding Expiration)
    if (window.api) {
      await window.api.invoke('secureStore:setItem', {
        key: 'lastActiveTimestamp',
        value: String(Date.now()),
      }).catch(() => { });

      // 4e. Load cached quest data từ electron-store (base64 encoded)
      try {
        const questResult = await window.api.invoke('quest:load');
        if (questResult?.data?.quests && questResult.data.expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          if (questResult.data.expiresAt > now) {
            this.props.setDailyQuests(questResult.data);
            console.log('[App] Quest cache hợp lệ → loaded vào Redux');
          } else {
            console.log('[App] Quest cache hết hạn → Dashboard sẽ gọi API refresh');
          }
        }
      } catch (e) {
        console.warn('[App] Failed to load quests from store:', e);
      }
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
  setDailyQuests: (data) => dispatch(setDailyQuests(data)),
});

const ConnectedApp = connect(mapStateToProps, mapDispatchToProps)(App);

const Root = () => (
  <Provider store={store}>
    <ConnectedApp />
  </Provider>
);

export default Root;
