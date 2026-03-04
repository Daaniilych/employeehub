import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { companyAPI } from "../services/api";
import { Building2, Plus, LogIn, AlertCircle } from "lucide-react";
import { t } from "../i18n";

const CompanySetup = () => {
  const [mode, setMode] = useState("choose"); // 'choose', 'create', 'join'
  const [companyName, setCompanyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshCompanies } = useAuth();
  const navigate = useNavigate();

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setError("");

    // Validate company name length
    if (companyName.trim().length < 2) {
      setError(t("companySetup.companyNameMinLength"));
      return;
    }

    if (companyName.trim().length > 50) {
      setError(t("companySetup.companyNameMaxLength"));
      return;
    }

    setLoading(true);

    try {
      await companyAPI.create({ name: companyName.trim() });
      await refreshCompanies();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || t("companySetup.failedToCreateCompany"));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompany = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await companyAPI.join(inviteCode);
      await refreshCompanies();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || t("companySetup.failedToJoinCompany"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Building2 size={48} color="var(--primary-color)" />
          <h1 style={styles.title}>{t("companySetup.title")}</h1>
          <p style={styles.subtitle}>
            {t("companySetup.subtitle")}
          </p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {mode === "choose" && (
          <div style={styles.choiceContainer}>
            <button
              onClick={() => setMode("create")}
              style={styles.choiceButton}
            >
              <div style={styles.choiceIcon}>
                <Plus size={32} />
              </div>
              <h3 style={styles.choiceTitle}>{t("companySetup.createCompany")}</h3>
              <p style={styles.choiceDescription}>
                {t("companySetup.createCompanyDescription")}
              </p>
            </button>

            <button onClick={() => setMode("join")} style={styles.choiceButton}>
              <div style={styles.choiceIcon}>
                <LogIn size={32} />
              </div>
              <h3 style={styles.choiceTitle}>{t("companySetup.joinCompany")}</h3>
              <p style={styles.choiceDescription}>
                {t("companySetup.joinCompanyDescription")}
              </p>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>{t("companySetup.createYourCompany")}</h2>
            <form onSubmit={handleCreateCompany} style={styles.form}>
              <div className="input-group">
                <label htmlFor="companyName">
                  {t("companySetup.companyName")}
                  <small
                    style={{
                      marginLeft: "0.5rem",
                      color: "var(--text-secondary)",
                      fontWeight: "normal",
                    }}
                  >
                    ({t("companySetup.charactersRange")})
                  </small>
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("companySetup.enterCompanyName")}
                  minLength={2}
                  maxLength={50}
                  required
                />
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setMode("choose")}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  {t("common.back")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? t("companySetup.creating") : t("companySetup.createCompany")}
                </button>
              </div>
            </form>
          </div>
        )}

        {mode === "join" && (
          <div style={styles.formContainer}>
            <h2 style={styles.formTitle}>{t("companySetup.joinExistingCompany")}</h2>
            <form onSubmit={handleJoinCompany} style={styles.form}>
              <div className="input-group">
                <label htmlFor="inviteCode">{t("companySetup.inviteCode")}</label>
                <input
                  type="text"
                  id="inviteCode"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder={t("companySetup.enterInviteCode")}
                  required
                  style={{ textTransform: "uppercase" }}
                />
                <small style={styles.hint}>
                  {t("companySetup.inviteCodeHint")}
                </small>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setMode("choose")}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  {t("common.back")}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? t("companySetup.joining") : t("companySetup.joinCompany")}
                </button>
              </div>
            </form>
          </div>
        )}
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
  card: {
    backgroundColor: "var(--white)",
    borderRadius: "1rem",
    padding: "clamp(1.5rem, 4vw, 3rem)",
    width: "100%",
    maxWidth: "600px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
  },
  header: {
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
  choiceContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
    gap: "1.5rem",
  },
  choiceButton: {
    padding: "2rem",
    border: "2px solid var(--border-color)",
    borderRadius: "0.75rem",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "all 0.3s",
    textAlign: "center",
  },
  choiceIcon: {
    width: "64px",
    height: "64px",
    margin: "0 auto 1rem",
    borderRadius: "1rem",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    color: "var(--primary-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  choiceTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
    color: "var(--text-primary)",
  },
  choiceDescription: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
  },
  formContainer: {
    marginTop: "1rem",
  },
  formTitle: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    textAlign: "center",
    color: "var(--text-primary)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  hint: {
    display: "block",
    marginTop: "0.25rem",
    fontSize: "0.875rem",
    color: "var(--gray)",
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
  },
};

export default CompanySetup;
