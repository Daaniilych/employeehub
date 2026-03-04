import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Placeholder for password reset functionality
      // In a real implementation, this would call an API endpoint
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call
      setSuccess(true);
    } catch (err) {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.container}>
        <div style={styles.formCard}>
          <div style={styles.successSection}>
            <div style={styles.successIcon}>
              <CheckCircle size={64} color="var(--success-color)" />
            </div>
            <h1 style={styles.title}>Check Your Email</h1>
            <p style={styles.successText}>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p style={styles.instructionText}>
              Click the link in the email to reset your password. If you don't
              see the email, check your spam folder.
            </p>
            <Link
              to="/login"
              className="btn btn-primary"
              style={{
                marginTop: "1.5rem",
                width: "100%",
                justifyContent: "center",
              }}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        {/* Back Button */}
        <Link to="/login" style={styles.backButton} className="forgot-back-btn">
          <ArrowLeft size={20} />
          <span>Back to Login</span>
        </Link>

        <div style={styles.logoSection}>
          <Building2 size={48} color="var(--primary-color)" />
          <h1 style={styles.title}>Forgot Password?</h1>
          <p style={styles.subtitle}>
            No worries! Enter your email address and we'll send you a link to
            reset your password.
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={20} color="var(--gray)" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={styles.inputWithIcon}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Remember your password?{" "}
            <Link to="/login" style={styles.link}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "1rem",
  },
  formCard: {
    backgroundColor: "var(--white)",
    borderRadius: "1rem",
    padding: "clamp(1.5rem, 4vw, 3rem)",
    width: "100%",
    maxWidth: "450px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    position: "relative",
  },
  backButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "var(--text-secondary)",
    fontSize: "0.9rem",
    fontWeight: "500",
    textDecoration: "none",
    marginBottom: "1rem",
    transition: "all 0.2s ease",
    padding: "0.5rem 0",
  },
  logoSection: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "clamp(1.5rem, 4vw, 2rem)",
    fontWeight: "700",
    marginTop: "1rem",
    marginBottom: "0.5rem",
    color: "var(--text-primary)",
  },
  subtitle: {
    color: "var(--text-secondary)",
    fontSize: "clamp(0.875rem, 2vw, 1rem)",
    lineHeight: "1.6",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "1rem",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    color: "var(--danger-color)",
    borderRadius: "0.5rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputWithIcon: {
    width: "100%",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    padding: "0.75rem 0.75rem 0.75rem 2.75rem",
    fontSize: "1rem",
  },
  footer: {
    marginTop: "1.5rem",
    textAlign: "center",
  },
  footerText: {
    color: "var(--text-secondary)",
    marginBottom: "0",
  },
  link: {
    color: "var(--primary-color)",
    fontWeight: "600",
    textDecoration: "none",
  },
  successSection: {
    textAlign: "center",
  },
  successIcon: {
    marginBottom: "1.5rem",
    display: "flex",
    justifyContent: "center",
  },
  successText: {
    fontSize: "1rem",
    color: "var(--text-primary)",
    marginBottom: "1rem",
    lineHeight: "1.6",
  },
  instructionText: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    lineHeight: "1.6",
  },
};

// Override input icon positioning and add hover effects
if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("forgot-password-styles");
  if (!existingStyle) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "forgot-password-styles";
    styleSheet.textContent = `
      .input-group > div > svg {
        position: absolute;
        left: 0.75rem;
        pointer-events: none;
      }

      /* Back button hover */
      .forgot-back-btn:hover {
        color: var(--primary-color) !important;
        transform: translateX(-3px);
      }

      /* Link hover */
      a[href="/login"]:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default ForgotPassword;
