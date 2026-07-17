/**
 * Signup.jsx — LeetCode-inspired signup page.
 * Matches the login page's design language with labeled inputs,
 * icon-only social buttons (Google + Microsoft), and premium dark theme.
 *
 * Backend endpoints:
 *   POST /api/auth/send-signup-otp  — sends OTP to email
 *   GET  /api/auth/google           — Google OAuth redirect
 *   GET  /api/auth/microsoft        — Microsoft OAuth redirect
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaMicrosoft } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import axiosClient from "../../helpers/axiosClient";
import "../../styles/auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "https://server.mail-or-a.dev";

const Signup = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validate = () => {
    let newErrors = {};
    if (!formData.username) newErrors.username = "Username is required";
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!agreeTerms) {
      newErrors.agreeTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // STEP 1 — Send signup OTP to email
      await axiosClient.post("/api/auth/send-signup-otp", {
        email: formData.email,
      });

      setErrors({});

      navigate("/otp", {
        state: {
          type: "signup",
          email: formData.email,
          username: formData.username,
          password: formData.password,
        },
      });
    } catch (err) {
      if (err.response) {
        setErrors({ server: err.response.data.message });
      } else {
        setErrors({ server: "Failed to send OTP. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Social signup — redirect browser to the backend OAuth endpoint.
   * Backend handles the full OAuth flow and redirects back to
   * /auth/callback?token=...&provider=... on success.
   */
  const handleSocialSignup = (provider) => {
    const url = `${API_BASE}/api/auth/${provider.toLowerCase()}`;
    window.location.href = url;
  };

  /* ── Password strength indicator ── */
  const getPasswordStrength = () => {
    const p = formData.password;
    if (!p) return { level: 0, label: "", color: "transparent" };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p)) score++;

    if (score <= 1) return { level: 20, label: "Weak", color: "#ef4743" };
    if (score === 2) return { level: 40, label: "Fair", color: "#f59e0b" };
    if (score === 3) return { level: 60, label: "Good", color: "#ffa116" };
    if (score === 4) return { level: 80, label: "Strong", color: "#22c55e" };
    return { level: 100, label: "Very Strong", color: "#10b981" };
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* ── Header ── */}
        <div className="auth-header">
          <h2 className="auth-title">Create Account</h2>
          <p className="auth-subtitle">
            Sign up to get started with Mail-or-a
          </p>
        </div>

        {/* ── Server Error ── */}
        {errors.server && (
          <div className="error-text error-text--server">
            {errors.server}
          </div>
        )}

        {/* ── Social Signup (same as login) ── */}
        <div className="social-buttons-container">
          <button
            type="button"
            className="social-btn social-btn--icon"
            onClick={() => handleSocialSignup("Google")}
            title="Continue with Google"
            id="signup-google-btn"
          >
            <FcGoogle size={22} />
          </button>

          <button
            type="button"
            className="social-btn social-btn--icon"
            onClick={() => handleSocialSignup("Microsoft")}
            title="Continue with Microsoft"
            id="signup-microsoft-btn"
          >
            <FaMicrosoft size={20} color="#00a4ef" />
          </button>
        </div>

        <div className="auth-divider">or</div>

        {/* ── Signup Form ── */}
        <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
          <div className="input-group">
            <label className="input-label" htmlFor="signup-username">
              Username
            </label>
            <input
              id="signup-username"
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              className="auth-input"
              autoComplete="username"
            />
            {errors.username && (
              <span className="error-text">{errors.username}</span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className="auth-input"
              autoComplete="email"
            />
            {errors.email && (
              <span className="error-text">{errors.email}</span>
            )}
          </div>



          <div className="input-group">
            <label className="input-label" htmlFor="signup-password">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                className="auth-input"
                autoComplete="new-password"
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                id="signup-toggle-password"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
            {/* Inline password strength bar */}
            {formData.password && (
              <div style={{ marginTop: '6px' }}>
                <div
                  style={{
                    height: '3px',
                    borderRadius: '2px',
                    background: 'rgba(255,255,255,0.08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${strength.level}%`,
                      height: '100%',
                      background: strength.color,
                      borderRadius: '2px',
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: strength.color,
                    marginTop: '3px',
                    display: 'block',
                    fontWeight: 500,
                  }}
                >
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="signup-confirm-password">
              Confirm Password
            </label>
            <div className="input-wrapper">
              <input
                id="signup-confirm-password"
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="auth-input"
                autoComplete="new-password"
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowConfirm(!showConfirm)}
                role="button"
                aria-label={showConfirm ? "Hide password" : "Show password"}
                id="signup-toggle-confirm"
              >
                {showConfirm ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.confirmPassword && (
              <span className="error-text">{errors.confirmPassword}</span>
            )}
          </div>

          <div className="form-options">
            <label className="checkbox-group" id="signup-terms-checkbox">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span className="checkbox-label">
                I agree to the{" "}
                <Link to="/terms" className="auth-link" style={{ fontSize: '13px' }}>
                  Terms & Conditions
                </Link>
              </span>
            </label>
          </div>
          {errors.agreeTerms && (
            <span className="error-text" style={{ marginTop: '-4px' }}>
              {errors.agreeTerms}
            </span>
          )}

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={!agreeTerms || loading}
            id="signup-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating Account…
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link" id="signup-login-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
