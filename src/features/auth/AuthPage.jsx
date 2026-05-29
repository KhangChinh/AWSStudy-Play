import React, { Component } from 'react';
import { connect } from 'react-redux';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, signOut } from 'aws-amplify/auth';

import './AuthPage.scss';
import Spinner from '../../components/Spinner';
import { withRouter } from '../../utils/withRouter';
import { notifyLoginSuccess } from '../../services/ipcWindowService';
import { getUserFromApi } from '../../services/userService';
import { userLogin, userLogout } from '../../store/actions';

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
      verificationCode: '',
      newPassword: '',
      confirmNewPassword: '',
      resendCooldown: 0,
    };
  }

  componentWillUnmount() {
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);
  }

  startResendCooldown = () => {
    this.setState({ resendCooldown: 300 });
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);
    this.resendTimerInterval = setInterval(() => {
      this.setState((prev) => {
        if (prev.resendCooldown <= 1) {
          clearInterval(this.resendTimerInterval);
          this.resendTimerInterval = null;
          return { resendCooldown: 0 };
        }
        return { resendCooldown: prev.resendCooldown - 1 };
      });
    }, 1000);
  };
  handleInputChange = (field, value) => {
    this.setState({ [field]: value });
  };
  /**
   * Load thông tin user khi đăng nhập (Zero-Trust)
   * Luồng: API Gateway (JWT) → Lambda → DynamoDB → Redux (chỉ memory, KHÔNG lưu disk)
   */
  loadUserOnLogin = async () => {
    try {
      const apiResult = await getUserFromApi();
      if (!apiResult.success || !apiResult.data) {
        console.error('Không lấy được thông tin user từ API:', apiResult.error);
        await signOut().catch(err => console.error('Signout error:', err));
        if (window.api) {
          await window.api.invoke('secureStore:clear').catch(() => { });
        }
        this.props.userLogout();
        throw new Error(apiResult.error || 'Failed to retrieve user data from API');
      }
      const userData = apiResult.data;
      this.props.userLogin({
        userId: userData.UserID,
        email: userData.Information?.email,
        name: userData.Information?.name,
        createdAt: userData.createdAt,
      });
      if (window.api) {
        await window.api.invoke('secureStore:setItem', {
          key: 'lastActiveTimestamp',
          value: String(Date.now()),
        }).catch(() => { });
      }
    } catch (error) {
      console.error('❌ Lỗi khi load thông tin user:', error);
      throw error;
    }
  };
  handleToggleAuthMode = (mode) => {
    const keepEmail = ['confirm', 'forgot', 'resetPassword'].includes(mode);
    this.setState({
      authMode: mode,
      username: '',
      email: keepEmail ? this.state.email : '',
      password: '',
      confirmPassword: '',
      verificationCode: '',
      newPassword: '',
      confirmNewPassword: '',
      showPassword: false,
      showConfirmPassword: false,
    });
  };
  handleResendCode = async () => {
    const { email, resendCooldown, authMode } = this.state;
    if (resendCooldown > 0) return;
    if (!email) {
      toast.error('Vui lòng nhập email để gửi lại mã!');
      return;
    }
    this.setState({ isLoading: true });
    try {
      if (authMode === 'resetPassword') {
        await resetPassword({ username: email });
      } else {
        await resendSignUpCode({ username: email });
      }
      toast.success('Đã gửi lại mã xác nhận thành công! Hãy kiểm tra hòm thư.');
      this.startResendCooldown();
    } catch (error) {
      console.log('Error resending code:', error);
      toast.error(error.message || 'Gửi lại mã thất bại, vui lòng thử lại!');
    }
    this.setState({ isLoading: false });
  };
  handleSubmit = async (e) => {
    e.preventDefault();
    const { authMode, email, password, username, confirmPassword, verificationCode, newPassword, confirmNewPassword } = this.state;

    // Validation
    if ((authMode === 'login' || authMode === 'register') && (!email || !password)) {
      toast.error('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    if (authMode === 'register') {
      if (!username) {
        toast.error('Vui lòng nhập username!');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Mật khẩu xác nhận không khớp!');
        return;
      }
    }
    if (authMode === 'confirm') {
      if (!verificationCode) {
        toast.error('Vui lòng nhập mã xác nhận!');
        return;
      }
    }
    if (authMode === 'forgot') {
      if (!email) {
        toast.error('Vui lòng nhập email!');
        return;
      }
    }
    if (authMode === 'resetPassword') {
      if (!verificationCode || !newPassword) {
        toast.error('Vui lòng nhập đầy đủ thông tin!');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error('Mật khẩu xác nhận không khớp!');
        return;
      }
    }

    this.setState({ isLoading: true });
    try {
      if (authMode === 'login') {
        const { isSignedIn, nextStep } = await signIn({ username: email, password });
        if (isSignedIn) {
          notifyLoginSuccess();
          toast.success('Đăng nhập thành công!');
          await this.loadUserOnLogin();
          setTimeout(() => {
            this.props.navigate('/desktop');
          }, 100);
        } else {
          console.log('Next step:', nextStep);
          if (nextStep && nextStep.signInStep === 'CONFIRM_SIGN_UP') {
            toast.info('Tài khoản chưa được kích hoạt. Hãy nhập mã xác thực!');
            this.setState({ authMode: 'confirm' });
          } else {
            toast.info('Vui lòng hoàn tất bước tiếp theo: ' + (nextStep?.signInStep || ''));
          }
        }
      } else if (authMode === 'register') {
        try {
          await signUp({
            username: email,
            password,
            options: {
              userAttributes: {
                email,
                name: username,
              }
            }
          });
        } catch (signUpError) {
          if (signUpError.name === 'UsernameExistsException') {
            try {
              await resendSignUpCode({ username: email });
              toast.info('Tài khoản đã tồn tại nhưng chưa xác thực. Đã gửi lại mã xác nhận!');
              this.startResendCooldown();
              this.setState({ authMode: 'confirm', verificationCode: '', isLoading: false });
              return;
            } catch (resendError) {
              throw signUpError;
            }
          }
          throw signUpError;
        }
        toast.success('Đăng ký thành công! Vui lòng nhập mã xác nhận gửi tới email của bạn.');
        this.startResendCooldown();
        this.setState({ authMode: 'confirm', verificationCode: '' });
      } else if (authMode === 'confirm') {
        const { isSignUpComplete } = await confirmSignUp({
          username: email,
          confirmationCode: verificationCode
        });
        if (isSignUpComplete) {
          // Verify thành công → Cognito trigger tự tạo DB record
          // → Auto đăng nhập + load user từ API
          toast.success('Xác thực thành công! Đang đăng nhập...');
          const { isSignedIn } = await signIn({ username: email, password });
          if (isSignedIn) {
            notifyLoginSuccess();
            await this.loadUserOnLogin();
            setTimeout(() => {
              this.props.navigate('/desktop');
            }, 100);
          } else {
            // Trường hợp hiếm: verify OK nhưng auto-login thất bại
            toast.info('Xác thực thành công! Vui lòng đăng nhập.');
            this.setState({ authMode: 'login', password: '', confirmPassword: '', verificationCode: '' });
          }
        } else {
          toast.info('Xác thực chưa hoàn tất. Vui lòng kiểm tra lại.');
        }
      } else if (authMode === 'forgot') {
        const output = await resetPassword({ username: email });
        const { nextStep } = output;
        if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
          toast.success('Mã khôi phục đã được gửi tới email của bạn!');
          this.startResendCooldown();
          this.setState({ authMode: 'resetPassword', verificationCode: '' });
        } else {
          toast.success('Mật khẩu đã được đặt lại thành công!');
          this.setState({ authMode: 'login' });
        }
      } else if (authMode === 'resetPassword') {
        await confirmResetPassword({
          username: email,
          confirmationCode: verificationCode,
          newPassword: newPassword
        });
        toast.success('Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.');
        this.setState({ authMode: 'login', verificationCode: '', newPassword: '', confirmNewPassword: '' });
      }
    } catch (error) {
      console.log('Error:', error);
      if (error.name === 'UserAlreadyAuthenticatedException' || error.message?.includes('already a signed in user')) {
        toast.info('Phát hiện phiên đăng nhập cũ chưa dọn dẹp. Đang làm sạch, vui lòng bấm đăng nhập lại...');
        try {
          await signOut().catch(() => { });
          if (window.api) {
            await window.api.invoke('secureStore:clear').catch(() => { });
          }
          this.props.userLogout();
        } catch (logoutError) {
          console.error('Error during cleanup:', logoutError);
        }
      } else {
        toast.error(error.message || 'Xảy ra lỗi, vui lòng thử lại!');
      }
    }
    this.setState({ isLoading: false });
  };
  render() {
    const { authMode, showPassword, showConfirmPassword, isLoading, email, password, username, confirmPassword, verificationCode } = this.state;
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
              disabled={authMode === 'confirm' || authMode === 'forgot' || authMode === 'resetPassword'}
            >
              Sign In
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => this.handleToggleAuthMode('register')}
              disabled={authMode === 'confirm' || authMode === 'forgot' || authMode === 'resetPassword'}
            >
              Sign Up
            </button>
          </div>

          <div className="form-wrapper">
            <h2 className="title">
              {authMode === 'login' && 'Welcome Back!'}
              {authMode === 'register' && 'Join the Universe'}
              {authMode === 'confirm' && 'Verify Identity'}
              {authMode === 'forgot' && 'Reset Password'}
              {authMode === 'resetPassword' && 'New Password'}
            </h2>
            <p className="subtitle">
              {authMode === 'login' && 'Enter your credentials to access your system.'}
              {authMode === 'register' && 'Register a new identity in our system.'}
              {authMode === 'confirm' && 'Enter the verification code sent to your email.'}
              {authMode === 'forgot' && 'Enter your email to receive a password reset code.'}
              {authMode === 'resetPassword' && 'Enter the code and your new password.'}
            </p>

            <form className="auth-form" onSubmit={this.handleSubmit}>
              {authMode === 'register' && (
                <div className="input-group">
                  <label>Username</label>
                  <input type="text" placeholder="SpaceExplorer99" value={username} onChange={(e) => this.handleInputChange('username', e.target.value)} disabled={isLoading} />
                </div>
              )}

              {authMode !== 'resetPassword' && (
                <div className="input-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="example@gmail.com" value={email} onChange={(e) => this.handleInputChange('email', e.target.value)} disabled={isLoading || authMode === 'confirm'} readOnly={authMode === 'confirm'} />
                </div>
              )}

              {(authMode === 'login' || authMode === 'register') && (
                <div className="input-group">
                  <label>Password</label>
                  <div className="password-input-wrapper">
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => this.handleInputChange('password', e.target.value)} disabled={isLoading} />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => this.setState({ showPassword: !showPassword })}
                      disabled={isLoading}
                    >
                      <IonIcon icon={showPassword ? eyeOutline : eyeOffOutline} />
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'register' && (
                <div className="input-group">
                  <label>Confirm Password</label>
                  <div className="password-input-wrapper">
                    <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => this.handleInputChange('confirmPassword', e.target.value)} disabled={isLoading} />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => this.setState({ showConfirmPassword: !showConfirmPassword })}
                      disabled={isLoading}
                    >
                      <IonIcon icon={showConfirmPassword ? eyeOutline : eyeOffOutline} />
                    </button>
                  </div>
                </div>
              )}

              {(authMode === 'confirm' || authMode === 'resetPassword') && (
                <div className="input-group">
                  <label>Verification Code</label>
                  <input type="text" placeholder="e.g. 123456" value={verificationCode} onChange={(e) => this.handleInputChange('verificationCode', e.target.value)} disabled={isLoading} />
                </div>
              )}

              {authMode === 'resetPassword' && (
                <>
                  <div className="input-group">
                    <label>New Password</label>
                    <div className="password-input-wrapper">
                      <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={this.state.newPassword} onChange={(e) => this.handleInputChange('newPassword', e.target.value)} disabled={isLoading} />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => this.setState({ showPassword: !showPassword })}
                        disabled={isLoading}
                      >
                        <IonIcon icon={showPassword ? eyeOutline : eyeOffOutline} />
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <div className="password-input-wrapper">
                      <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={this.state.confirmNewPassword} onChange={(e) => this.handleInputChange('confirmNewPassword', e.target.value)} disabled={isLoading} />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => this.setState({ showConfirmPassword: !showConfirmPassword })}
                        disabled={isLoading}
                      >
                        <IonIcon icon={showConfirmPassword ? eyeOutline : eyeOffOutline} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {authMode === 'login' && (
                <div className="auth-helper-links">
                  <div className="forgot-password">
                    <a href="#" onClick={(e) => { e.preventDefault(); if (!isLoading) this.handleToggleAuthMode('forgot'); }}>Forgot password?</a>
                  </div>
                </div>
              )}

              {authMode === 'confirm' && (
                <div className="auth-helper-links">
                  <button type="button" className="btn-link" onClick={this.handleResendCode} disabled={isLoading || this.state.resendCooldown > 0}>
                    {this.state.resendCooldown > 0 ? `Resend code (${this.state.resendCooldown}s)` : 'Resend code'}
                  </button>
                  <button type="button" className="btn-link" onClick={() => this.handleToggleAuthMode('login')} disabled={isLoading}>
                    Back to Sign In
                  </button>
                </div>
              )}

              {(authMode === 'forgot' || authMode === 'resetPassword') && (
                <div className="auth-helper-links">
                  {authMode === 'resetPassword' && (
                    <button type="button" className="btn-link" onClick={this.handleResendCode} disabled={isLoading || this.state.resendCooldown > 0}>
                      {this.state.resendCooldown > 0 ? `Resend code (${this.state.resendCooldown}s)` : 'Resend code'}
                    </button>
                  )}
                  <button type="button" className="btn-link" onClick={() => this.handleToggleAuthMode('login')} disabled={isLoading}>
                    Back to Sign In
                  </button>
                </div>
              )}

              <button type="submit" className="btn-cosmic" disabled={isLoading}>
                {authMode === 'login' && 'Initialize Login'}
                {authMode === 'register' && 'Register Identity'}
                {authMode === 'confirm' && 'Verify Identity'}
                {authMode === 'forgot' && 'Send Reset Code'}
                {authMode === 'resetPassword' && 'Reset Password'}
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
  userLogout: () => dispatch(userLogout()),
});

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AuthPage));
