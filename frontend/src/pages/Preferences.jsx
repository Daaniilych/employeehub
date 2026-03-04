import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Moon,
  Sun,
  Eye,
  Save,
  ArrowLeft,
  Palette,
} from "lucide-react";
import { t, setLanguage } from "../i18n";

const Preferences = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isBackButtonHovered, setIsBackButtonHovered] = useState(false);

  // Load preferences from localStorage
  const [preferences, setPreferences] = useState({
    language: localStorage.getItem("preferences_language") || "en",
    theme: localStorage.getItem("preferences_theme") || "light",
  });

  useEffect(() => {
    // Apply theme immediately
    applyTheme(preferences.theme);
  }, [preferences.theme]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setPreferences(prev => ({ ...prev }));
    };
    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  const applyTheme = (theme) => {
    if (theme === "dark" || theme === "high-contrast") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Save to localStorage
      setLanguage(preferences.language);
      localStorage.setItem("preferences_theme", preferences.theme);

      // Apply theme
      applyTheme(preferences.theme);

      setMessage({ type: "success", text: t("preferences.preferencesSaved") });
      
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      setMessage({
        type: "error",
        text: t("errors.generic"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang) => {
    setPreferences({ ...preferences, language: lang });
  };

  const handleThemeChange = (theme) => {
    setPreferences({ ...preferences, theme });
    // Apply theme immediately
    applyTheme(theme);
    // Save to localStorage immediately
    localStorage.setItem("preferences_theme", theme);
  };

  const styles = {
    container: {
      padding: "clamp(1rem, 3vw, 2rem)",
      maxWidth: "1200px",
      margin: "0 auto",
    },
    backButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 1.5rem",
      backgroundColor: "transparent",
      color: "var(--text-primary)",
      border: "1px solid var(--border-color)",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginBottom: "1.5rem",
    },
    backButtonHover: {
      backgroundColor: "var(--bg-secondary)",
      borderColor: "var(--primary-color)",
      color: "var(--primary-color)",
    },
    header: {
      marginBottom: "2rem",
    },
    title: {
      fontSize: "clamp(1.5rem, 4vw, 2rem)",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "0.5rem",
    },
    subtitle: {
      fontSize: "clamp(0.875rem, 2vw, 1rem)",
      color: "var(--text-secondary)",
    },
    card: {
      backgroundColor: "var(--white)",
      borderRadius: "1rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
      padding: "2rem",
    },
    message: {
      padding: "1rem",
      borderRadius: "0.5rem",
      marginBottom: "1.5rem",
      fontSize: "0.9rem",
      fontWeight: "500",
    },
    section: {
      marginBottom: "2rem",
      paddingBottom: "2rem",
      borderBottom: "1px solid var(--border-color)",
    },
    sectionTitle: {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "var(--text-primary)",
      marginBottom: "1rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    sectionDescription: {
      fontSize: "0.875rem",
      color: "var(--text-secondary)",
      marginBottom: "1.5rem",
    },
    optionGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    },
    option: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "1rem",
      backgroundColor: "var(--bg-secondary)",
      borderRadius: "0.5rem",
      border: "1px solid var(--border-color)",
      cursor: "pointer",
      transition: "all 0.3s ease",
    },
    optionSelected: {
      backgroundColor: "rgba(79, 70, 229, 0.1)",
      borderColor: "var(--primary-color)",
    },
    optionLeft: {
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
    },
    optionIcon: {
      color: "var(--primary-color)",
    },
    optionLabel: {
      fontSize: "0.9rem",
      fontWeight: "600",
      color: "var(--text-primary)",
    },
    optionDescription: {
      fontSize: "0.75rem",
      color: "var(--text-secondary)",
      marginTop: "0.25rem",
    },
    saveButton: {
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.75rem 2rem",
      backgroundColor: "var(--success-color)",
      color: "var(--white)",
      border: "none",
      borderRadius: "0.5rem",
      fontSize: "0.9rem",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.3s ease",
      marginTop: "1rem",
    },
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => navigate(-1)}
        onMouseEnter={() => setIsBackButtonHovered(true)}
        onMouseLeave={() => setIsBackButtonHovered(false)}
        style={{
          ...styles.backButton,
          ...(isBackButtonHovered && styles.backButtonHover),
        }}
      >
        <ArrowLeft size={20} />
        <span>{t("common.back")}</span>
      </button>

      <div style={styles.header}>
        <h1 style={styles.title}>{t("preferences.title")}</h1>
        <p style={styles.subtitle}>
          {t("preferences.subtitle")}
        </p>
      </div>

      <div style={styles.card}>
        {message.text && (
          <div
            style={{
              ...styles.message,
              backgroundColor:
                message.type === "success"
                  ? "rgba(16, 185, 129, 0.2)"
                  : "rgba(239, 68, 68, 0.2)",
              color:
                message.type === "success"
                  ? "var(--success-color)"
                  : "var(--danger-color)",
            }}
          >
            {message.text}
          </div>
        )}

        {/* Language Settings */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Globe size={20} />
            {t("preferences.language")}
          </h3>
          <p style={styles.sectionDescription}>
            {t("preferences.languageDescription")}
          </p>
          <div style={styles.optionGroup}>
            {[
              { value: "en", label: "English", description: "English" },
              { value: "pl", label: "Polski", description: "Polish" },
            ].map((lang) => (
              <div
                key={lang.value}
                onClick={() => handleLanguageChange(lang.value)}
                style={{
                  ...styles.option,
                  ...(preferences.language === lang.value && styles.optionSelected),
                }}
              >
                <div style={styles.optionLeft}>
                  <Globe size={20} style={styles.optionIcon} />
                  <div>
                    <div style={styles.optionLabel}>{lang.label}</div>
                    <div style={styles.optionDescription}>{lang.description}</div>
                  </div>
                </div>
                {preferences.language === lang.value && (
                  <div style={{ color: "var(--primary-color)", fontWeight: "600" }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Theme Settings */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <Palette size={20} />
            {t("preferences.theme")}
          </h3>
          <p style={styles.sectionDescription}>
            {t("preferences.themeDescription")}
          </p>
          <div style={styles.optionGroup}>
            {[
              { value: "light", label: t("preferences.light"), icon: Sun, description: t("preferences.lightDescription") },
              { value: "dark", label: t("preferences.dark"), icon: Moon, description: t("preferences.darkDescription") },
              {
                value: "high-contrast",
                label: t("preferences.highContrast"),
                icon: Eye,
                description: t("preferences.highContrastDescription"),
              },
            ].map((theme) => {
              const Icon = theme.icon;
              return (
                <div
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value)}
                  style={{
                    ...styles.option,
                    ...(preferences.theme === theme.value && styles.optionSelected),
                  }}
                >
                  <div style={styles.optionLeft}>
                    <Icon size={20} style={styles.optionIcon} />
                    <div>
                      <div style={styles.optionLabel}>{theme.label}</div>
                      <div style={styles.optionDescription}>{theme.description}</div>
                    </div>
                  </div>
                  {preferences.theme === theme.value && (
                    <div style={{ color: "var(--primary-color)", fontWeight: "600" }}>✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={handleSave} style={styles.saveButton} disabled={loading}>
          <Save size={18} />
          {t("preferences.savePreferences")}
        </button>
      </div>
    </div>
  );
};

export default Preferences;

