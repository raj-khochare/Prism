import React, { useState } from 'react';
import { useRouter } from '../router.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Shield, Eye, EyeOff } from '../components/common/Icons.jsx';

export default function Register() {
  const { navigate } = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const validate = () => {
    const newErrors = {};

    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required.';
    }

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      newErrors.username = 'Username is required.';
    } else if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(trimmedUsername)) {
      newErrors.username = 'Username must be 3-32 characters (letters, numbers, _ . -).';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        displayName: name.trim(),
        role
      });
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
            <span>CREATE ACCOUNT</span>
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
            Set up your PRISM security workspace account.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className="form-group">
              <label htmlFor="register-name" className="form-label">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                placeholder="Jane Analyst"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                }}
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span className="form-field-error" role="alert">{errors.name}</span>}
            </div>

            {/* Username */}
            <div className="form-group">
              <label htmlFor="register-username" className="form-label">
                Username
              </label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                className={`form-input ${errors.username ? 'form-input-error' : ''}`}
                placeholder="analyst"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: '' }));
                }}
                aria-invalid={Boolean(errors.username)}
              />
              {errors.username && <span className="form-field-error" role="alert">{errors.username}</span>}
            </div>

            {/* Email */}
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
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <span className="form-field-error" role="alert">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="register-role">Role</label>
              <select
                id="register-role"
                className="form-select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="DEVELOPER">Developer / Admin (scan, register, configure alerts)</option>
                <option value="REVIEWER">Reviewer (read-only auditor)</option>
              </select>
            </div>

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
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <span className="form-field-error" role="alert">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
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
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                  aria-invalid={Boolean(errors.confirmPassword)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="form-field-error" role="alert">{errors.confirmPassword}</span>
              )}
            </div>

            {serverError && (
              <div className="form-field-error" role="alert" style={{ marginBottom: '12px' }}>
                {serverError}
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" className="btn btn-primary auth-submit-btn" disabled={submitting}>
              {submitting ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
            </button>
          </form>

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
    </div>
  );
}
