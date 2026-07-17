/**
 * Login.jsx — LeetCode-inspired login page.
 * Clean dark-first design with amber accent, labeled inputs,
 * and icon-only social login (Google + Microsoft).
 *
 * Backend endpoints:
 *   POST /api/auth/login          — email + password login
 *   GET  /api/auth/google         — Google OAuth redirect
 *   GET  /api/auth/microsoft      — Microsoft OAuth redirect
 */
import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaEye, FaEyeSlash, FaMicrosoft } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import axiosClient from "../../helpers/axiosClient";
import { useAuth } from "../../context/AuthContext";
import "../../styles/auth.css";

const API_BASE = import.meta.env.VITE_API_URL || "https://server.mail-or-a.dev";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();

  // Redirect back to the page the user originally tried to visit
  const from = location.state?.from?.pathname || "/dashboard";

  const validate = () => {
    let newErrors = {};
    if (!identifier) newErrors.identifier = "Username or Email is required";
    if (!password)   newErrors.password   = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await axiosClient.post("/api/auth/login", {
        email: identifier,
        password,
      });

      const userData  = res.data?.user  || res.data || {};
      const authToken = res.data?.token || null;
      login(userData, authToken);

      navigate(from, { replace: true });
    } catch (err) {
      if (err.response) {
        setErrors({ server: err.response.data.message });
      } else {
        setErrors({ server: "Login failed. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Social login — redirect browser to the backend OAuth endpoint.
   * The backend handles the full OAuth flow and redirects back to
   * /auth/callback?token=...&provider=... on success.
   */
  const handleSocialLogin = (provider) => {
    const url = `${API_BASE}/api/auth/${provider.toLowerCase()}`;
    window.location.href = url;
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        {/* ── Header ── */}
        <div className="auth-header">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">
            Sign in to continue to your account
          </p>
        </div>

        {/* ── Server Error ── */}
        {errors.server && (
          <div className="error-text error-text--server">
            {errors.server}
          </div>
        )}

        {/* ── Social Login (icon-only) ── */}
        <div className="social-buttons-container">
          <button
            type="button"
            className="social-btn social-btn--icon"
            onClick={() => handleSocialLogin("Google")}
            title="Continue with Google"
            id="login-google-btn"
          >
            <FcGoogle size={22} />
          </button>

          <button
            type="button"
            className="social-btn social-btn--icon"
            onClick={() => handleSocialLogin("Microsoft")}
            title="Continue with Microsoft"
            id="login-microsoft-btn"
          >
            <FaMicrosoft size={20} color="#00a4ef" />
          </button>
        </div>

        <div className="auth-divider">or</div>

        {/* ── Login Form ── */}
        <form onSubmit={handleSubmit} className="auth-form" id="login-form">
          <div className="input-group">
            <label className="input-label" htmlFor="login-identifier">
              Email or Username
            </label>
            <input
              id="login-identifier"
              type="text"
              placeholder="Enter your email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="auth-input"
              autoComplete="username"
            />
            {errors.identifier && (
              <span className="error-text">{errors.identifier}</span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="login-password">
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                autoComplete="current-password"
              />
              <span
                className="password-toggle-icon"
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                id="login-toggle-password"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <div className="form-options">
            <label className="checkbox-group" id="login-remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkbox-label">Remember me</span>
            </label>
            <Link to="/forgot-password" className="auth-link" id="login-forgot-link">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-btn-primary"
            disabled={loading}
            id="login-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="auth-footer-text">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link" id="login-signup-link">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
