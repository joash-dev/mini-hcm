import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth } from "../services/firebase.js";
import { apiRequest } from "../services/api.js";

/**
 * Registration page for new employees.
 * Creates a Firebase Auth account, then calls the server to create
 * the Firestore user doc with hardcoded role: "employee".
 */
export default function RegisterPage({ onProfileCreated }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      /* Step 1: Create Firebase Auth account */
      await createUserWithEmailAndPassword(auth, email, password);

      /* Step 2: Create Firestore user doc via server (role hardcoded server-side) */
      const data = await apiRequest("/users/register", {
        method: "POST",
        body: { name, email },
      });

      /* Update parent auth context with the new profile */
      if (onProfileCreated) {
        onProfileCreated(data.user);
      }

      navigate("/dashboard");
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
          <h1>Create Account</h1>
          <p className="auth-subtitle">Join Mini HCM to start tracking your time</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="register-name">Full Name</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-email">Email</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? "Creating account…" : "Register"}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
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
