import React, { useState } from 'react';
import { useRouter } from '../router.jsx';
import { Shield, Eye, EyeOff, ArrowLeft } from '../components/common/Icons.jsx';

export default function Login() {
  const { navigate } = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const newErrors = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please provide a valid email format (e.g. analyst@prism.sec).';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Frontend-only confirmation state.
      // Do not store, transmit, or process credentials.
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setEmail('');
    setPassword('');
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="auth-page-container">
      {/* Brand Header */}
      <div className="auth-brand-header">
        <button
          type="button"
          className="auth-brand-glyph"
          onClick={() => navigate('/overview')}
          title="Return to PRISM Dashboard"
          aria-label="Return to PRISM Dashboard"
        >
          <Shield size={22} />
        </button>
        <div className="auth-brand-text">
          <h1 className="auth-brand-title">PRISM</h1>
          <span className="auth-brand-sub">SECURITY MONITOR</span>
        </div>
      </div>

      {/* Main Auth Panel */}
      <div className="auth-card prism-panel">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <span>SIGN IN</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              backgroundColor: 'var(--accent-sand)',
              border: '1.5px solid var(--border-default)',
              boxShadow: '1px 1px 0px #111111',
              borderRadius: 'var(--radius-xs)',
              letterSpacing: '0.05em'
            }}
          >
            WORKSPACE ACCESS
          </span>
        </div>

        <div className="prism-panel-body">
          <p className="auth-description">
            Access your PRISM security workspace.
          </p>

          {submitted ? (
            <div className="auth-demo-notice" role="status">
              <div className="auth-demo-notice-header">
                <span className="status-dot healthy"></span>
                <span>AUTHENTICATION PREVIEW STATE</span>
              </div>
              <p className="auth-demo-notice-body">
                Validation passed for <code>{email}</code>. PRISM is currently running in frontend-only mode — authentication backend is not yet connected. No credentials were stored or transmitted.
              </p>
              <div className="auth-demo-notice-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/overview')}
                >
                  Continue to Demo Dashboard &rarr;
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                >
                  Reset Form
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="login-email" className="form-label">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                  placeholder="analyst@prism.sec"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => ({ ...prev, email: '' }));
                    }
                  }}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                />
                {errors.email && (
                  <span id="login-email-error" className="form-field-error" role="alert">
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label htmlFor="login-password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && (
                  <span id="login-password-error" className="form-field-error" role="alert">
                    {errors.password}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary auth-submit-btn">
                SIGN IN
              </button>
            </form>
          )}

          {/* Switch to Register */}
          <hr className="auth-divider" />
          <div className="auth-switch-section">
            <span className="auth-switch-label">Don't have an account?</span>
            <button
              type="button"
              className="btn btn-secondary auth-switch-btn"
              onClick={() => navigate('/register')}
            >
              CREATE ACCOUNT
            </button>
          </div>
        </div>
      </div>

      {/* Back to Demo Control */}
      <div className="auth-back-container">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/overview')}
          aria-label="Back to PRISM Demo Mode"
        >
          <ArrowLeft size={13} />
          <span>Back to Demo</span>
        </button>
      </div>
    </div>
  );
}
