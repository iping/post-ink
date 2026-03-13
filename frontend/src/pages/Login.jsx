import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API } from '../api';
import styles from './Login.module.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('redirect') || '/manage';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      login(data.token, data.user);
      navigate(next, { replace: true });
    } catch (err) {
      const msg = err?.message || '';
      const isNetworkError = !msg || msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('Load failed');
      setError(
        isNetworkError
          ? 'Cannot reach the server. Start the backend first: from the project root run "npm run dev", or in a separate terminal run "cd backend && npm run dev".'
          : msg || 'Something went wrong. Try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>InkedHub</h1>
        <p className={styles.subtitle}>Sign in to manage the platform</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error} role="alert">{error}</div>}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@post.ink"
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link to="/">Back to Discover</Link>
        </p>
        <p className={styles.help}>
          First time? Run <code>npm run dev</code> from the project root to start both backend and frontend. Default login: admin@post.ink / admin123
        </p>
      </div>
    </div>
  );
}
