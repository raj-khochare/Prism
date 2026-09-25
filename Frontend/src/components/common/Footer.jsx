import React from 'react';
import { useRouter } from '../../router.jsx';

export default function Footer() {
  const { navigate } = useRouter();

  return (
    <footer className="app-footer">
      <div className="footer-brand">
        <strong>PRISM</strong>
        <span>&mdash;</span>
        <span>Protocol Risk Intelligence &amp; Security Monitor Platform</span>
      </div>

      <nav className="footer-links" aria-label="Legal navigation">
        <button
          type="button"
          className="btn-ghost footer-link"
          onClick={() => navigate('/privacy')}
        >
          Privacy Policy
        </button>
        <button
          type="button"
          className="btn-ghost footer-link"
          onClick={() => navigate('/terms')}
        >
          Terms &amp; Conditions
        </button>
      </nav>
    </footer>
  );
}
