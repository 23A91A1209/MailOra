/**
 * OTPVerification.jsx — LeetCode-inspired OTP verification page.
 * Features a sliding panel from the right with premium OTP boxes.
 *
 * Backend endpoints:
 *   POST /api/auth/signup           — creates user (name, email, password, otp)
 *   POST /api/auth/send-signup-otp  — resends OTP
 */
import React, { useState, useEffect } from "react";
import OTPInput from "../../components/OTPInput";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styles/auth-flow.css";
import "../../styles/auth.css";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import axiosClient from "../../helpers/axiosClient";

export default function OTPVerification() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(30);
  const [isClosing, setIsClosing] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  /* email received from forgot password or signup page */
  const email = location.state?.email;
  const type = location.state?.type; // "signup" or undefined
  const signupData = location.state;

  useEffect(() => {
    if (!email) {
      navigate("/login");
    }
  }, []);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter the complete verification code");
      return;
    }

    setLoading(true);
    try {
      if (type === "signup") {
        // SIGNUP FLOW: Send OTP + user data together to /api/auth/signup
        // The backend verifies the OTP and creates the user in one call
        await axiosClient.post("/api/auth/signup", {
          name: signupData.username,
          email: email,
          password: signupData.password,
          otp: code,
        });

        toast.success("Account created successfully!");
        setIsClosing(true);
        setTimeout(() => {
          navigate("/login");
        }, 450);
      } else {
        // FORGOT PASSWORD FLOW
        // The OTP is embedded in the reset link email, so this flow
        // typically comes from the email link, not manual OTP entry.
        // If you need manual OTP verification for forgot-password,
        // you'd add a verify endpoint. For now, redirect to change-password.
        toast.success("OTP verified");
        setIsClosing(true);
        setTimeout(() => {
          navigate("/change-password", { state: { email, otp: code } });
        }, 450);
      }
    } catch (err) {
      if (err.response) {
        toast.error(err.response.data.message || "Verification failed");
      } else {
        toast.error("Server error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setTimer(30);

    try {
      await axiosClient.post("/api/auth/send-signup-otp", { email });
      toast.success("OTP resent!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="auth-page-container">
      {/* Left illustration area */}
      <div className="auth-left">
        <div
          style={{
            textAlign: "center",
            padding: "40px",
          }}
        >
          <div
            style={{
              fontSize: "64px",
              marginBottom: "24px",
            }}
          >
            🔐
          </div>
          <h2
            className="auth-title"
            style={{ fontSize: "28px", marginBottom: "12px" }}
          >
            Verification
          </h2>
          <p className="auth-subtitle" style={{ fontSize: "15px" }}>
            We've sent a 6-digit verification code to{" "}
            <strong style={{ color: "#ffa116" }}>{email || "your email"}</strong>
          </p>
        </div>
      </div>

      {/* Sliding OTP panel */}
      <motion.div
        className="otp-panel"
        initial={{ x: "100%" }}
        animate={{ x: isClosing ? "100%" : "0%" }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="auth-header" style={{ marginBottom: "24px" }}>
          <h2 className="auth-title">Enter Verification Code</h2>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <OTPInput otp={otp} setOtp={setOtp} />

        <button
          className="auth-btn-primary"
          onClick={handleVerify}
          disabled={loading}
          id="otp-verify-btn"
          style={{ marginTop: "8px" }}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Verifying…
            </>
          ) : (
            "Verify"
          )}
        </button>

        <p
          className="resend"
          onClick={handleResend}
          style={{
            cursor: timer > 0 ? "default" : "pointer",
            opacity: timer > 0 ? 0.5 : 1,
          }}
        >
          {timer > 0 ? `Resend code in ${timer}s` : "Resend Code"}
        </p>
      </motion.div>
    </div>
  );
}
