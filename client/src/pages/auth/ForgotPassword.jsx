/**
 * ForgotPassword.jsx — LeetCode-inspired forgot password page.
 */
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/auth-flow.css";
import "../../styles/auth.css";
import { motion } from "framer-motion";
import axiosClient from "../../helpers/axiosClient";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!email) {
      setMsg("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosClient.post("/api/auth/forgot-password", { email });
      const res = response.data;

      setLoading(false);
      setMsg(""); // clear error
      toast.success(res.message || "Reset link sent to your email!");
      
      // Do not navigate to /otp, just tell them to check their email.
    } catch (err) {
      setLoading(false);
      setMsg(err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div className="auth-page-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-header">
          <div className="auth-brand-icon">M</div>
          <h2 className="auth-title">Forgot Password</h2>
          <p className="auth-subtitle">
            Enter your email and we'll send you a verification code
          </p>
        </div>

        <div className="auth-form">
          <div className="input-group">
            <label className="input-label" htmlFor="forgot-email">
              Email Address
            </label>
            <input
              id="forgot-email"
              className="auth-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <button
            className="auth-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            id="forgot-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Sending…
              </>
            ) : (
              "Send Verification Code"
            )}
          </button>

          {msg && (
            <div className="error-text error-text--server">
              {msg}
            </div>
          )}
        </div>

        <p className="auth-footer-text">
          Remember your password?{" "}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
