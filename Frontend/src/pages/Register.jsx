import React, { useState } from 'react';
import { useRouter } from '../router.jsx';
import { Shield, Eye, EyeOff, ArrowLeft } from '../components/common/Icons.jsx';

export default function Register() {
  const { navigate } = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const newErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required.';
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please provide a valid email format (e.g. analyst@prism.sec).';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation is required.';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match.';
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
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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

      {/* Main Register Panel */}
      <div className="auth-card prism-panel">
        <div className="prism-panel-header">
          <div className="panel-title-group">
            <span>CREATE ACCOUNT</span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 6px',
              backgroundColor: 'var(--accent-teal-light)',
              border: '1.5px solid var(--border-default)',
              boxShadow: '1px 1px 0px #111111',
              borderRadius: 'var(--radius-xs)',
              letterSpacing: '0.05em'
            }}
          >
            WORKSPACE REGISTRATION
          </span>
        </div>

        <div className="prism-panel-body">
          <p className="auth-description">
            Create your PRISM security workspace.
          </p>

          {submitted ? (
            <div className="auth-demo-notice" role="status">
              <div className="auth-demo-notice-header">
                <span className="status-dot healthy"></span>
                <span>REGISTRATION PREVIEW STATE</span>
              </div>
              <p className="auth-demo-notice-body">
                Account creation inputs validated for <code>{email}</code>. PRISM is currently running in frontend-only mode — authentication backend is not yet connected. No credentials were stored or transmitted.
              </p>
              <div className="auth-demo-notice-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate('/login')}
                >
                  Proceed to Sign In &rarr;
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/overview')}
                >
                  Return to Demo Dashboard
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleReset}
                >
                  Reset Form
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {/* Name Field */}
              <div className="form-group">
                <label htmlFor="register-name" className="form-label">
                  Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  placeholder="Alex Rivera"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) {
                      setErrors((prev) => ({ ...prev, name: '' }));
                    }
                  }}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'register-name-error' : undefined}
                />
                {errors.name && (
                  <span id="register-name-error" className="form-field-error" role="alert">
                    {errors.name}
                  </span>
                )}
              </div>

              {/* Email Field */}
              <div className="form-group">
                <label htmlFor="register-email" className="form-label">
                  Email
                </label>
                <input
                  id="register-email"
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
                  aria-describedby={errors.email ? 'register-email-error' : undefined}
                />
                {errors.email && (
                  <span id="register-email-error" className="form-field-error" role="alert">
                    {errors.email}
                  </span>
                )}
              </div>

              {/* Password Field */}
              <div className="form-group">
                <label htmlFor="register-password" className="form-label">
                  Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: '' }));
                      }
                    }}
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'register-password-error' : undefined}
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
                  <span id="register-password-error" className="form-field-error" role="alert">
                    {errors.password}
                  </span>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="form-group">
                <label htmlFor="register-confirm-password" className="form-label">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }
                    }}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    aria-describedby={errors.confirmPassword ? 'register-confirm-error' : undefined}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span id="register-confirm-error" className="form-field-error" role="alert">
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button type="submit" className="btn btn-primary auth-submit-btn">
                CREATE ACCOUNT
              </button>
            </form>
          )}

          {/* Switch to Login */}
          <hr className="auth-divider" />
          <div className="auth-switch-section">
            <span className="auth-switch-label">Already have an account?</span>
            <button
              type="button"
              className="btn btn-secondary auth-switch-btn"
              onClick={() => navigate('/login')}
            >
              SIGN IN
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
