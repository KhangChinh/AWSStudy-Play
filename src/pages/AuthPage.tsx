import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.scss';

const AuthPage = () => {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((window as any).require) {
      const { ipcRenderer } = (window as any).require('electron');
      ipcRenderer.send('login-success');
    }
    navigate('/desktop');
  };

  return (
    <div className="auth-page">
      <div className="stars"></div>
      <div className="twinkling"></div>
      <div className="purple-nebula"></div>

      <div className="auth-container">
        <div className="auth-nav">
          <button
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => setAuthMode('login')}
          >
            Sign In
          </button>
          <button
            className={authMode === 'signup' ? 'active' : ''}
            onClick={() => setAuthMode('signup')}
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

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === 'signup' && (
              <div className="input-group">
                <label>Username</label>
                <input type="text" placeholder="SpaceExplorer99" />
              </div>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input type="email" placeholder="example@gmail.com" />
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} placeholder="••••••••" />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {authMode === 'signup' && (
              <div className="input-group">
                <label>Confirm Password</label>
                <div className="password-input-wrapper">
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {showConfirmPassword ? (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      ) : (
                        <>
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </>
                      )}
                    </svg>
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
};

export default AuthPage;
