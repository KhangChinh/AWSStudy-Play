import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Slide, ToastContainer, toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';

import './AuthPage.scss';
import Spinner from '../../components/Spinner';
import { withRouter } from '../../utils/withRouter';
import { handleLoginSuccessApi } from '../../services/authServices';
import { userLogin } from '../../store/actions';

class AuthPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authMode: 'login',
      showPassword: false,
      showConfirmPassword: false,
      isLoading: false,
      // Form fields
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      // DisableButton
      disabledButtons: {
        submit: false,
      },
    };
  }
  //form input
  handleInputChange = (field, value) => {
    this.setState({ [field]: value });
  };
  handleToggleAuthMode = (mode) => {
    this.setState({
      authMode: mode,
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      showPassword: false,
      showConfirmPassword: false,
    });
  };
  //submit
  handleSubmit = async (e) => {
    e.preventDefault();
    const { authMode, email, password, username, confirmPassword } = this.state;
    if (!email || !password) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (authMode === 'signup') {
      if (!username) {
        toast.error('Vui lòng nhập username!');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Mật khẩu xác nhận không khớp!');
        return;
      }
    }
    this.setState({ isLoading: true });
    try {
      handleLoginSuccessApi(); // Gửi lệnh resize ngay lập tức
      this.props.userLogin({ email, username: username || email });
      toast.success(authMode === 'login' ? 'Đăng nhập thành công!' : 'Đăng ký thành công!');

      setTimeout(() => {
        this.props.navigate('/desktop');
      }, 100);
    } catch (e) {
      console.log('Error:', e);
      toast.error('Xảy ra lỗi, vui lòng thử lại!');
    }
    this.setState({ isLoading: false });
  };
  //render
  render() {
    const { authMode, showPassword, showConfirmPassword, isLoading, email, password, username, confirmPassword } = this.state;
    return (
      <div className="auth-page">
        {isLoading && <Spinner />}
        <div className="stars"></div>
        <div className="twinkling"></div>
        <div className="purple-nebula"></div>

        <div className="auth-container">
          <div className="auth-nav">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => this.handleToggleAuthMode('login')}
            >
              Sign In
            </button>
            <button
              className={authMode === 'signup' ? 'active' : ''}
              onClick={() => this.handleToggleAuthMode('signup')}
            >
              Create Account
            </button>
          </div>

          <div className="form-wrapper">
            <h2 className="title">
              {authMode === 'login' ? 'Welcome Back!' : 'Join the Universe'}
            </h2>
            <p className="subtitle">
              {authMode === 'login'
                ? 'Enter your credentials to access your system.'
                : 'Register a new identity in our system.'}
            </p>

            <form className="auth-form" onSubmit={this.handleSubmit}>
              {authMode === 'signup' && (
                <div className="input-group">
                  <label>Username</label>
                  <input type="text" placeholder="SpaceExplorer99" value={username} onChange={(e) => this.handleInputChange('username', e.target.value)} />
                </div>
              )}

              <div className="input-group">
                <label>Email Address</label>
                <input type="email" placeholder="example@gmail.com" value={email} onChange={(e) => this.handleInputChange('email', e.target.value)} />
              </div>

              <div className="input-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => this.handleInputChange('password', e.target.value)} />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => this.setState({ showPassword: !showPassword })}
                  >
                    <IonIcon icon={showPassword ? eyeOutline : eyeOffOutline} />
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <div className="input-group">
                  <label>Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => this.handleInputChange('confirmPassword', e.target.value)} />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => this.setState({ showConfirmPassword: !showConfirmPassword })}
                    >
                      <IonIcon icon={showConfirmPassword ? eyeOutline : eyeOffOutline} />
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'login' && (
                <div className="forgot-password">
                  <a href="#">Forgot password?</a>
                </div>
              )}

              <button type="submit" className="btn-cosmic">
                {authMode === 'login' ? 'Initialize Login' : 'Register Identity'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  userInfo: state.userInfo,
  isLoggedIn: state.isLoggedIn,
});

const mapDispatchToProps = (dispatch) => ({
  userLogin: (info) => dispatch(userLogin(info)),
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AuthPage));
