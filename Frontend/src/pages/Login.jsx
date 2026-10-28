import React, { useState } from 'react';
import { useRouter } from '../router.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, Eye, EyeOff } from '../components/common/Icons.jsx';

export default function Login() {
  const { navigate } = useRouter();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Username or email is required.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      navigate('/overview');
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-container">
      {/* Brand Header */}
      <div className="auth-brand-header">
        <div className="auth-brand-glyph" aria-hidden="true">
          <Shield size={22} />
        </div>
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

          <form onSubmit={handleSubmit} noValidate>
            {/* Identifier Field (username or email) */}
            <div className="form-group">
              <label htmlFor="login-identifier" className="form-label">
                Username or Email
              </label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                className={`form-input ${errors.identifier ? 'form-input-error' : ''}`}
                placeholder="analyst or analyst@prism.sec"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: '' }));
                }}
                aria-invalid={Boolean(errors.identifier)}
                aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
              />
              {errors.identifier && (
                <span id="login-identifier-error" className="form-field-error" role="alert">
                  {errors.identifier}
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
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
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

            {serverError && (
              <div className="form-field-error" role="alert" style={{ marginBottom: '12px' }}>
                {serverError}
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={submitting}>
              {submitting ? 'SIGNING IN…' : 'SIGN IN'}
            </button>
          </form>

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
    </div>
  );
}
