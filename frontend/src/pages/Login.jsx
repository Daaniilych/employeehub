import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Building2, Mail, Lock, AlertCircle, ArrowLeft } from "lucide-react";
import { t } from "../i18n";
import { useIsMobile } from "../hooks/useIsMobile";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    // Placeholder for social login functionality
    alert(`${provider} login will be implemented soon!`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        {/* Back Button */}
        <Link to="/" style={styles.backButton} className="login-back-btn">
          <ArrowLeft size={20} />
          <span>{t("common.back")}</span>
        </Link>

        <div style={styles.logoSection}>
          <Building2 size={48} color="var(--primary-color)" />
          <h1 style={styles.title}>{t("auth.loginWelcomeBack")}</h1>
          <p style={styles.subtitle}>{t("auth.loginSignInToAccount")}</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="input-group">
            <label htmlFor="email">{t("auth.email")}</label>
            <div style={styles.inputWrapper}>
              <Mail size={20} color="var(--gray)" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.loginEnterEmail")}
                required
                style={{...styles.inputWithIcon, ...(isMobile ? styles.inputWithIconMobile : {})}}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">{t("auth.password")}</label>
            <div style={styles.inputWrapper}>
              <Lock size={20} color="var(--gray)" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.loginEnterPassword")}
                required
                style={{...styles.inputWithIcon, ...(isMobile ? styles.inputWithIconMobile : {})}}
              />
            </div>
          </div>

          {/* Forgot Password Link */}
          <div style={styles.forgotPasswordWrapper}>
            <Link to="/forgot-password" style={styles.forgotPasswordLink}>
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {loading ? t("auth.loginSigningIn") : t("auth.loginSignIn")}
          </button>
        </form>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>{t("auth.loginOr")}</span>
          <span style={styles.dividerLine}></span>
        </div>

        {/* Social Login Buttons */}
        <div style={styles.socialButtons}>
          <button
            type="button"
            onClick={() => handleSocialLogin("Google")}
            style={styles.socialButton}
            className="social-login-btn"
          >
            <svg style={styles.socialIcon} viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{t("auth.loginContinueWithGoogle")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin("Apple")}
            style={styles.socialButton}
            className="social-login-btn"
          >
            <svg style={styles.socialIcon} viewBox="0 0 24 24">
              <path
                fill="#000000"
                d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              />
            </svg>
            <span>{t("auth.loginContinueWithApple")}</span>
          </button>
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            {t("auth.dontHaveAccount")}{" "}
            <Link to="/register" style={styles.link}>
              {t("auth.registerSignUp")}
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
  inputWithIconMobile: {
    fontSize: "16px",
    minHeight: "44px",
    padding: "0.875rem 0.875rem 0.875rem 2.75rem",
  },
  forgotPasswordWrapper: {
    marginTop: "-0.5rem",
    textAlign: "right",
  },
  forgotPasswordLink: {
    color: "var(--primary-color)",
    fontSize: "0.875rem",
    fontWeight: "500",
    textDecoration: "none",
    transition: "opacity 0.2s ease",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    margin: "1.5rem 0",
  },
  dividerLine: {
    flex: 1,
    height: "1px",
    backgroundColor: "var(--border-color)",
  },
  dividerText: {
    color: "var(--text-secondary)",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  socialButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  socialButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    backgroundColor: "var(--white)",
    fontSize: "0.95rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  socialIcon: {
    width: "20px",
    height: "20px",
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
};

// Override input icon positioning and add hover effects
if (typeof document !== "undefined") {
  const existingStyle = document.getElementById("login-page-styles");
  if (!existingStyle) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "login-page-styles";
    styleSheet.textContent = `
      .input-group > div > svg {
        position: absolute;
        left: 0.75rem;
        pointer-events: none;
      }

      /* Back button hover */
      a[style*="backButton"]:hover,
      .login-back-btn:hover {
        color: var(--primary-color) !important;
        transform: translateX(-3px);
      }

      /* Forgot password link hover */
      a[href="/forgot-password"]:hover {
        opacity: 0.8;
      }

      /* Social login button hover */
      .social-login-btn:hover {
        background-color: var(--background) !important;
        border-color: var(--primary-color) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      /* Link hover */
      a[href="/register"]:hover {
        opacity: 0.8;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default Login;
