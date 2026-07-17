import { Component } from 'react';
import { withTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { IonIcon } from '@ionic/react';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, fetchAuthSession } from 'aws-amplify/auth';
import './AuthPage.scss';
import Spinner from '../../components/Spinner';
import { handleLoginApi, handleLogoutApi } from '../../services/authService';

class AuthPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authMode: 'login',
      showPassword: false,
      showConfirmPassword: false,
      isLoading: false,
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

  handleTogglePasswordVisibility = (field) => {
    this.setState((prevState) => ({ [field]: !prevState[field] }));
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
    const { t } = this.props;
    const { email, resendCooldown, authMode } = this.state;
    if (resendCooldown > 0) return;
    if (!email) {
      toast.error(t('auth.enter_email_to_resend'));
      return;
    }
    this.setState({ isLoading: true });
    try {
      if (authMode === 'resetPassword') {
        await resetPassword({ username: email });
      } else {
        await resendSignUpCode({ username: email });
      }
      toast.success(t('auth.resend_success'));
      this.startResendCooldown();
    } catch (error) {
      console.log('Error resending code:', error);
      toast.error(error.message || t('auth.resend_failed'));
    }
    this.setState({ isLoading: false });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { t } = this.props;
    const { authMode, email, password, username, confirmPassword, verificationCode, newPassword, confirmNewPassword } = this.state;
    if ((authMode === 'login' || authMode === 'register') && (!email || !password)) {
      toast.error(t('auth.fill_required'));
      return;
    }
    if (authMode === 'register') {
      if (!username) {
        toast.error(t('auth.enter_username'));
        return;
      }
      if (password !== confirmPassword) {
        toast.error(t('auth.password_mismatch'));
        return;
      }
    }
    if (authMode === 'confirm') {
      if (!verificationCode) {
        toast.error(t('auth.enter_verification_code'));
        return;
      }
    }
    if (authMode === 'forgot') {
      if (!email) {
        toast.error(t('auth.enter_email'));
        return;
      }
    }
    if (authMode === 'resetPassword') {
      if (!verificationCode || !newPassword) {
        toast.error(t('auth.fill_required'));
        return;
      }
      if (newPassword !== confirmNewPassword) {
        toast.error(t('auth.password_mismatch'));
        return;
      }
    }
    this.setState({ isLoading: true });
    try {
      if (authMode === 'login') {
        const { isSignedIn, nextStep } = await signIn({ username: email, password });
        if (isSignedIn) {
          toast.success(t('auth.login_success'));
          await handleLoginApi();
          localStorage.removeItem('manualLogoutAt');
          
          try {
            const session = await fetchAuthSession();
            if (session?.credentials && window.api?.invoke) {
              await window.api.invoke('aws:setCredentials', session.credentials);
            }
          } catch (err) {
            console.warn('[AuthPage] Failed to fetch AWS credentials:', err);
          }

          if (window.api?.send) window.api.send('login-success');
          setTimeout(() => {
            this.props.navigate('/dashboard');
          }, 100);
        } else {
          if (nextStep && nextStep.signInStep === 'CONFIRM_SIGN_UP') {
            toast.info(t('auth.account_not_confirmed'));
            this.setState({ authMode: 'confirm' });
          } else {
            toast.info(t('auth.complete_next_step', { step: nextStep?.signInStep || '' }));
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
              toast.info(t('auth.existing_unconfirmed'));
              this.startResendCooldown();
              this.setState({ authMode: 'confirm', verificationCode: '', isLoading: false });
              return;
            } catch (resendError) {
              throw signUpError;
            }
          }
          throw signUpError;
        }
        toast.success(t('auth.register_success'));
        this.startResendCooldown();
        this.setState({ authMode: 'confirm', verificationCode: '' });
      } else if (authMode === 'confirm') {
        const { isSignUpComplete } = await confirmSignUp({
          username: email,
          confirmationCode: verificationCode
        });
        if (isSignUpComplete) {
          toast.info(t('auth.confirm_success'));
          this.setState({ authMode: 'login', password: '', confirmPassword: '', verificationCode: '' });
        } else {
          toast.info(t('auth.confirm_incomplete'));
        }
      } else if (authMode === 'forgot') {
        const output = await resetPassword({ username: email });
        const { nextStep } = output;
        if (nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
          toast.success(t('auth.reset_code_sent'));
          this.startResendCooldown();
          this.setState({ authMode: 'resetPassword', verificationCode: '' });
        } else {
          toast.success(t('auth.password_reset_done'));
          this.setState({ authMode: 'login' });
        }
      } else if (authMode === 'resetPassword') {
        await confirmResetPassword({
          username: email,
          confirmationCode: verificationCode,
          newPassword: newPassword
        });
        toast.success(t('auth.password_reset_success'));
        this.setState({ authMode: 'login', verificationCode: '', newPassword: '', confirmNewPassword: '' });
      }
    } catch (error) {
      if (error.name === 'UserAlreadyAuthenticatedException' || error.message?.includes('already a signed in user')) {
        toast.info(t('auth.stale_session_cleanup'));
        try {
          await handleLogoutApi();
        } catch (logoutError) {
          console.error('Error during cleanup:', logoutError);
        }
      } else {
        toast.error(error.message || t('auth.generic_error'));
      }
    }
    this.setState({ isLoading: false });
  };

  render() {
    const { authMode, showPassword, showConfirmPassword, isLoading, email, password, username, confirmPassword, verificationCode } = this.state;
    const { t } = this.props;
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
              {t('auth.sign_in')}
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => this.handleToggleAuthMode('register')}
              disabled={authMode === 'confirm' || authMode === 'forgot' || authMode === 'resetPassword'}
            >
              {t('auth.sign_up')}
            </button>
          </div>

          <div className="form-wrapper">
            <h2 className="title">
              {authMode === 'login' && t('auth.welcome_back')}
              {authMode === 'register' && t('auth.join_universe')}
              {authMode === 'confirm' && t('auth.verify_identity')}
              {authMode === 'forgot' && t('auth.reset_password')}
              {authMode === 'resetPassword' && t('auth.new_password')}
            </h2>
            <p className="subtitle">
              {authMode === 'login' && t('auth.enter_credentials')}
              {authMode === 'register' && t('auth.register_identity')}
              {authMode === 'confirm' && t('auth.enter_verify_code')}
              {authMode === 'forgot' && t('auth.enter_email_reset')}
              {authMode === 'resetPassword' && t('auth.enter_code_and_password')}
            </p>

            <form className="auth-form" onSubmit={this.handleSubmit}>
              {authMode === 'register' && (
                <div className="input-group">
                  <label>{t('auth.username')}</label>
                  <input type="text" placeholder="SpaceExplorer99" value={username} onChange={(e) => this.handleInputChange('username', e.target.value)} disabled={isLoading} />
                </div>
              )}

              {authMode !== 'resetPassword' && (
                <div className="input-group">
                  <label>{t('auth.email_address')}</label>
                  <input type="email" placeholder="example@gmail.com" value={email} onChange={(e) => this.handleInputChange('email', e.target.value)} disabled={isLoading || authMode === 'confirm'} readOnly={authMode === 'confirm'} />
                </div>
              )}

              {(authMode === 'login' || authMode === 'register') && (
                <div className="input-group">
                  <label>{t('auth.password')}</label>
                  <div className="password-input-wrapper">
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => this.handleInputChange('password', e.target.value)} disabled={isLoading} />
                    <button
                      type="button"
                      className="toggle-password"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      onClick={() => this.handleTogglePasswordVisibility('showPassword')}
                      disabled={isLoading}
                    >
                      <IonIcon icon={showPassword ? eyeOutline : eyeOffOutline} />
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'register' && (
                <div className="input-group">
                  <label>{t('auth.confirm_password')}</label>
                  <div className="password-input-wrapper">
                    <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => this.handleInputChange('confirmPassword', e.target.value)} disabled={isLoading} />
                    <button
                      type="button"
                      className="toggle-password"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirmPassword}
                      onClick={() => this.handleTogglePasswordVisibility('showConfirmPassword')}
                      disabled={isLoading}
                    >
                      <IonIcon icon={showConfirmPassword ? eyeOutline : eyeOffOutline} />
                    </button>
                  </div>
                </div>
              )}

              {(authMode === 'confirm' || authMode === 'resetPassword') && (
                <div className="input-group">
                  <label>{t('auth.verification_code')}</label>
                  <input type="text" placeholder="e.g. 123456" value={verificationCode} onChange={(e) => this.handleInputChange('verificationCode', e.target.value)} disabled={isLoading} />
                </div>
              )}

              {authMode === 'resetPassword' && (
                <>
                  <div className="input-group">
                    <label>{t('auth.new_password_label')}</label>
                    <div className="password-input-wrapper">
                      <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={this.state.newPassword} onChange={(e) => this.handleInputChange('newPassword', e.target.value)} disabled={isLoading} />
                      <button
                        type="button"
                        className="toggle-password"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        onClick={() => this.handleTogglePasswordVisibility('showPassword')}
                        disabled={isLoading}
                      >
                        <IonIcon icon={showPassword ? eyeOutline : eyeOffOutline} />
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>{t('auth.confirm_new_password')}</label>
                    <div className="password-input-wrapper">
                      <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={this.state.confirmNewPassword} onChange={(e) => this.handleInputChange('confirmNewPassword', e.target.value)} disabled={isLoading} />
                      <button
                        type="button"
                        className="toggle-password"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showConfirmPassword}
                        onClick={() => this.handleTogglePasswordVisibility('showConfirmPassword')}
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
                    <a href="#" onClick={(e) => { e.preventDefault(); if (!isLoading) this.handleToggleAuthMode('forgot'); }}>{t('auth.forgot_password')}</a>
                  </div>
                </div>
              )}

              {authMode === 'confirm' && (
                <div className="auth-helper-links">
                  <button type="button" className="btn-link" onClick={this.handleResendCode} disabled={isLoading || this.state.resendCooldown > 0}>
                    {this.state.resendCooldown > 0
                      ? t('auth.resend_code_countdown', { count: this.state.resendCooldown })
                      : t('auth.resend_code')}
                  </button>
                  <button type="button" className="btn-link" onClick={() => this.handleToggleAuthMode('login')} disabled={isLoading}>
                    {t('auth.back_to_sign_in')}
                  </button>
                </div>
              )}

              {(authMode === 'forgot' || authMode === 'resetPassword') && (
                <div className="auth-helper-links">
                  {authMode === 'resetPassword' && (
                    <button type="button" className="btn-link" onClick={this.handleResendCode} disabled={isLoading || this.state.resendCooldown > 0}>
                      {this.state.resendCooldown > 0
                        ? t('auth.resend_code_countdown', { count: this.state.resendCooldown })
                        : t('auth.resend_code')}
                    </button>
                  )}
                  <button type="button" className="btn-link" onClick={() => this.handleToggleAuthMode('login')} disabled={isLoading}>
                    {t('auth.back_to_sign_in')}
                  </button>
                </div>
              )}

              <button type="submit" className="btn-cosmic" disabled={isLoading}>
                {authMode === 'login' && t('auth.btn_login')}
                {authMode === 'register' && t('auth.btn_register')}
                {authMode === 'confirm' && t('auth.btn_verify')}
                {authMode === 'forgot' && t('auth.btn_send_reset')}
                {authMode === 'resetPassword' && t('auth.btn_reset_password')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(AuthPage);
