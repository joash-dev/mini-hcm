import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../services/firebase.js";
import { apiRequest } from "../services/api.js";

/**
 * Login page for all users (employees and admins).
 * Authenticates with Firebase Auth, then fetches the user's profile
 * to determine role-based routing.
 */
export default function LoginPage({ onProfileCreated }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      /* Fetch profile to determine role-based routing */
      const data = await apiRequest("/users/me");

      if (onProfileCreated) {
        onProfileCreated(data.user);
      }

      if (data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-split-card">
        {/* Left Panel: Form */}
        <div className="auth-form-panel">
          <h1>Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your Mini HCM account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="auth-switch">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </div>

        {/* Right Panel: Decorative */}
        <div className="auth-deco-panel">
          <div className="deco-blob deco-blob--1"></div>
          <div className="deco-blob deco-blob--2"></div>
          <div className="deco-blob deco-blob--3"></div>
          <div className="deco-blob deco-blob--4"></div>
          <div className="auth-deco-text">
            <h2>Track time. Get paid right.</h2>
            <p>Simple time tracking for modern teams.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
