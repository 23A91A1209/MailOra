/**
 * ChangePassword.jsx — LeetCode-inspired change password page.
 */
import React, { useState } from "react";
import PasswordInput from "../../components/PasswordInput";
import axiosClient from "../../helpers/axiosClient";
import toast from "react-hot-toast";
import "../../styles/auth-flow.css";
import "../../styles/auth.css";
import { useNavigate, Link, useSearchParams } from "react-router-dom";

export default function ChangePassword() {
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /* email and otp coming from URL query params */
  const encryptedEmail = searchParams.get("email");
  const otp = searchParams.get("otp");

  if (!encryptedEmail || !otp) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h2>Invalid Link</h2>
          <p>This password reset link is invalid or missing information.</p>
          <Link to="/forgot-password" className="auth-btn-primary" style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none' }}>Back to Forgot Password</Link>
        </div>
      </div>
    );
  }

  /* ── Password strength ── */
  const getStrength = () => {
    if (!newPass) return { level: 0, label: "", color: "transparent" };
    let score = 0;
    if (newPass.length >= 6) score++;
    if (newPass.length >= 10) score++;
    if (/[A-Z]/.test(newPass)) score++;
    if (/[0-9]/.test(newPass)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPass)) score++;

    if (score <= 1) return { level: 20, label: "Weak", color: "#ef4743" };
    if (score === 2) return { level: 40, label: "Fair", color: "#f59e0b" };
    if (score === 3) return { level: 60, label: "Good", color: "#ffa116" };
    if (score === 4) return { level: 80, label: "Strong", color: "#22c55e" };
    return { level: 100, label: "Very Strong", color: "#10b981" };
  };

  const strength = getStrength();

  const handleSubmit = async () => {
    if (newPass !== confirmPass) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await axiosClient.post("/api/auth/reset-password", {
        encryptedEmail,
        otp,
        newPassword: newPass,
      });

      // Backend returns { message: ... } on success
      toast.success(res.data.message || "Password reset successful 🎉");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-icon">M</div>
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">
            Create a new password for your account
          </p>
        </div>

        <div className="auth-form">
          <div className="input-group">
            <label className="input-label" htmlFor="new-password">
              New Password
            </label>
            <PasswordInput
              placeholder="Enter new password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
            {/* Inline strength bar */}
            {newPass && (
              <div style={{ marginTop: '4px' }}>
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
                    marginTop: '4px',
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
            <label className="input-label" htmlFor="confirm-password">
              Confirm Password
            </label>
            <PasswordInput
              placeholder="Re-enter new password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>

          <button
            className="auth-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            id="reset-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner" />
                Resetting…
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </div>

        <p className="auth-footer-text">
          Back to{" "}
          <Link to="/login" className="auth-link">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
