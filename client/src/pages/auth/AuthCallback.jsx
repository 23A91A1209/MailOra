/**
 * AuthCallback.jsx — Handles OAuth redirect from Google/Microsoft.
 *
 * After the backend completes the OAuth flow, it redirects to:
 *   /auth/callback?token=JWT_TOKEN&provider=google|microsoft
 *
 * This page reads the token from the URL, stores it in AuthContext,
 * and redirects to the dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import axiosClient from "../../helpers/axiosClient";
import "../../styles/auth.css";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const provider = searchParams.get("provider");

      if (!token) {
        setError("Authentication failed. No token received.");
        setTimeout(() => navigate("/login"), 3000);
        return;
      }

      try {
        // Fetch the user profile using the token
        // The token is already set as an httpOnly cookie by the backend,
        // but we also got it in the query string for localStorage storage.
        const res = await axiosClient.get("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = res.data?.user || res.data;
        login(userData, token);
        navigate("/dashboard", { replace: true });
      } catch (err) {
        // If /api/user/me fails, still store the token and basic info
        login(
          { provider: provider || "social" },
          token
        );
        navigate("/dashboard", { replace: true });
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="auth-page-container">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h2 className="auth-title" style={{ color: "#ef4743" }}>
            Authentication Failed
          </h2>
          <p className="auth-subtitle">{error}</p>
          <p className="auth-subtitle" style={{ marginTop: "8px" }}>
            Redirecting to login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "16px" }}>🔄</div>
        <h2 className="auth-title">Signing you in…</h2>
        <p className="auth-subtitle">
          Please wait while we complete your authentication.
        </p>
        <div style={{ marginTop: "16px" }}>
          <span className="spinner" style={{
            display: "inline-block",
            width: "24px",
            height: "24px",
            border: "3px solid rgba(255,161,22,0.2)",
            borderTopColor: "#ffa116",
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }} />
        </div>
      </div>
    </div>
  );
}
