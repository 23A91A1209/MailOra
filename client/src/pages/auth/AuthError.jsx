/**
 * AuthError.jsx — Displays an error when OAuth sign-in fails.
 * The backend redirects here with ?message=google_failed or ?message=microsoft_failed
 */
import { useSearchParams, Link } from "react-router-dom";
import "../../styles/auth.css";

export default function AuthError() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message");

  const getErrorMessage = () => {
    switch (message) {
      case "google_failed":
        return "Google sign-in failed. Please try again.";
      case "microsoft_failed":
        return "Microsoft sign-in failed. Please try again.";
      default:
        return "Authentication failed. Please try again.";
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
        <h2 className="auth-title">Sign In Failed</h2>
        <p className="auth-subtitle" style={{ marginBottom: "20px" }}>
          {getErrorMessage()}
        </p>
        <Link to="/login" className="auth-btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
