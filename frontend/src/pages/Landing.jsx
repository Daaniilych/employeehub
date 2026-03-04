import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Users,
  FileText,
  Shield,
  TrendingUp,
  ArrowRight,
  Building2,
  Globe,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { setLanguage, getCurrentLanguage, t } from "../i18n";
import { useIsMobile } from "../hooks/useIsMobile";

const Landing = () => {
  const [activeSection, setActiveSection] = useState("product");
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [isLanguageButtonHovered, setIsLanguageButtonHovered] = useState(false);
  const isMobile = useIsMobile(768);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  useEffect(() => {
    if (!isMobile) {
      setShowMobileMenu(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["product", "services", "contact"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      setCurrentLanguage(getCurrentLanguage());
    };
    window.addEventListener("languagechange", handleLanguageChange);
    return () =>
      window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showLanguageMenu &&
        !event.target.closest("[data-language-selector]")
      ) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLanguageMenu]);

  const handleLanguageSelect = (lang) => {
    setLanguage(lang);
    setShowLanguageMenu(false);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navbarHeight = 80; // Высота navbar
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition =
        elementPosition + window.pageYOffset - navbarHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={styles.landing}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContainer}>
          <div style={styles.logo} onClick={scrollToTop} className="logo-hover">
            <Building2 size={28} />
            <span>EmployeeHub</span>
          </div>

          {isMobile ? (
            <>
              {/* Mobile: Hamburger Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={styles.mobileMenuButton}
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* Mobile Menu Dropdown */}
              {showMobileMenu && (
                <div style={styles.mobileMenu}>
                  {/* Navigation Links */}
                  <div style={styles.mobileNavLinks}>
                    {[
                      { id: "product", key: "landing.nav.product" },
                      { id: "services", key: "landing.nav.services" },
                      { id: "contact", key: "landing.nav.contact" },
                    ].map((section) => (
                      <button
                        key={section.id}
                        onClick={() => {
                          scrollToSection(section.id);
                          setShowMobileMenu(false);
                        }}
                        style={{
                          ...styles.mobileNavLink,
                          ...(activeSection === section.id
                            ? styles.activeNavLink
                            : {}),
                        }}
                      >
                        {t(section.key)}
                      </button>
                    ))}
                  </div>

                  {/* Language Selector */}
                  <div style={styles.mobileLanguageSection}>
                    <div style={styles.languageSelector} data-language-selector>
                      <button
                        onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                        style={styles.mobileLanguageButton}
                      >
                        <Globe size={18} />
                        <span>
                          {currentLanguage === "en" ? "English" : "Polski"}
                        </span>
                        <ChevronDown size={16} />
                      </button>
                      {showLanguageMenu && (
                        <div style={styles.languageMenu}>
                          <button
                            onClick={() => {
                              handleLanguageSelect("en");
                              setShowLanguageMenu(false);
                            }}
                            style={{
                              ...styles.languageOption,
                              ...(currentLanguage === "en"
                                ? styles.languageOptionActive
                                : {}),
                            }}
                          >
                            English
                            {currentLanguage === "en" && (
                              <span style={styles.checkmark}>✓</span>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              handleLanguageSelect("pl");
                              setShowLanguageMenu(false);
                            }}
                            style={{
                              ...styles.languageOption,
                              ...(currentLanguage === "pl"
                                ? styles.languageOptionActive
                                : {}),
                            }}
                          >
                            Polski
                            {currentLanguage === "pl" && (
                              <span style={styles.checkmark}>✓</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Auth Buttons */}
                  <div style={styles.mobileAuthButtons}>
                    <Link
                      to="/login"
                      onClick={() => setShowMobileMenu(false)}
                      style={styles.mobileLoginButton}
                    >
                      {t("landing.nav.logIn")}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setShowMobileMenu(false)}
                      className="btn btn-primary"
                      style={styles.mobileGetStartedButton}
                    >
                      {t("landing.nav.getStarted")}
                    </Link>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Desktop: Normal Navigation */}
              <div style={styles.navLinks}>
                {[
                  { id: "product", key: "landing.nav.product" },
                  { id: "services", key: "landing.nav.services" },
                  { id: "contact", key: "landing.nav.contact" },
                ].map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    style={{
                      ...styles.navLink,
                      ...(activeSection === section.id
                        ? styles.activeNavLink
                        : {}),
                    }}
                  >
                    {t(section.key)}
                  </button>
                ))}
              </div>

              <div style={styles.rightSection}>
                {/* Language Selector */}
                <div style={styles.languageSelector} data-language-selector>
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    onMouseEnter={() => setIsLanguageButtonHovered(true)}
                    onMouseLeave={() => setIsLanguageButtonHovered(false)}
                    style={{
                      ...styles.languageButton,
                      ...(isLanguageButtonHovered
                        ? styles.languageButtonHover
                        : {}),
                    }}
                  >
                    <Globe size={18} />
                    <span>
                      {currentLanguage === "en" ? "English" : "Polski"}
                    </span>
                    <ChevronDown size={16} />
                  </button>
                  {showLanguageMenu && (
                    <div style={styles.languageMenu}>
                      <button
                        onClick={() => handleLanguageSelect("en")}
                        style={{
                          ...styles.languageOption,
                          ...(currentLanguage === "en"
                            ? styles.languageOptionActive
                            : {}),
                        }}
                      >
                        English
                        {currentLanguage === "en" && (
                          <span style={styles.checkmark}>✓</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleLanguageSelect("pl")}
                        style={{
                          ...styles.languageOption,
                          ...(currentLanguage === "pl"
                            ? styles.languageOptionActive
                            : {}),
                        }}
                      >
                        Polski
                        {currentLanguage === "pl" && (
                          <span style={styles.checkmark}>✓</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div style={styles.authButtons}>
                  <Link to="/login" style={styles.loginButton}>
                    {t("landing.nav.logIn")}
                  </Link>
                  <Link to="/register" className="btn btn-primary">
                    {t("landing.nav.getStarted")}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div
        style={{
          ...styles.navSpacer,
          ...(isMobile ? styles.navSpacerMobile : {}),
        }}
      ></div>

      {/* Hero Section */}
      <section
        style={{ ...styles.hero, ...(isMobile ? styles.heroMobile : {}) }}
      >
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            {t("landing.hero.title")} <br />
            <span style={styles.heroHighlight}>
              {t("landing.hero.highlight")}
            </span>
          </h1>
          <p style={styles.heroDescription}>{t("landing.hero.description")}</p>
          <div
            style={{
              ...styles.heroButtons,
              ...(isMobile ? styles.heroButtonsMobile : {}),
            }}
          >
            <Link
              to="/register"
              className="btn btn-primary"
              style={{
                fontSize: isMobile ? "1rem" : "1.125rem",
                padding: isMobile ? "0.875rem 1.5rem" : "1rem 2rem",
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              {t("landing.hero.startFreeTrial")} <ArrowRight size={20} />
            </Link>
            <button
              onClick={() => scrollToSection("product")}
              className="btn btn-outline"
              style={{
                fontSize: isMobile ? "1rem" : "1.125rem",
                padding: isMobile ? "0.875rem 1.5rem" : "1rem 2rem",
                width: isMobile ? "100%" : "auto",
                justifyContent: "center",
              }}
            >
              {t("landing.hero.learnMore")}
            </button>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section id="product" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t("landing.features.title")}</h2>
          <p style={styles.sectionDescription}>
            {t("landing.features.description")}
          </p>
        </div>

        <div style={styles.featuresGrid}>
          {[
            {
              icon: Clock,
              title: t("landing.features.timeTracking.title"),
              description: t("landing.features.timeTracking.description"),
            },
            {
              icon: Users,
              title: t("landing.features.employeeManagement.title"),
              description: t("landing.features.employeeManagement.description"),
            },
            {
              icon: FileText,
              title: t("landing.features.smartReports.title"),
              description: t("landing.features.smartReports.description"),
            },
            {
              icon: Shield,
              title: t("landing.features.roleBasedAccess.title"),
              description: t("landing.features.roleBasedAccess.description"),
            },
            {
              icon: TrendingUp,
              title: t("landing.features.analytics.title"),
              description: t("landing.features.analytics.description"),
            },
          ].map((feature, index) => (
            <div key={index} style={styles.featureCard}>
              <div style={styles.featureIcon}>
                <feature.icon size={32} />
              </div>
              <h3 style={styles.featureTitle}>{feature.title}</h3>
              <p style={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t("landing.services.title")}</h2>
          <p style={styles.sectionDescription}>
            {t("landing.services.description")}
          </p>
        </div>

        <div style={styles.servicesGrid}>
          <div style={styles.serviceCard}>
            <h3 style={styles.serviceTitle}>
              🕒 {t("landing.services.timeManagement.title")}
            </h3>
            <ul style={styles.serviceList}>
              <li>{t("landing.services.timeManagement.qrScanning")}</li>
              <li>
                {t("landing.services.timeManagement.automaticCalculation")}
              </li>
              <li>{t("landing.services.timeManagement.manualCorrections")}</li>
              <li>{t("landing.services.timeManagement.shiftScheduling")}</li>
            </ul>
          </div>

          <div style={styles.serviceCard}>
            <h3 style={styles.serviceTitle}>
              📊 {t("landing.services.reportsAnalytics.title")}
            </h3>
            <ul style={styles.serviceList}>
              <li>{t("landing.services.reportsAnalytics.multipleFormats")}</li>
              <li>
                {t("landing.services.reportsAnalytics.automatedGeneration")}
              </li>
              <li>{t("landing.services.reportsAnalytics.customTemplates")}</li>
              <li>{t("landing.services.reportsAnalytics.scheduledReports")}</li>
            </ul>
          </div>

          <div style={styles.serviceCard}>
            <h3 style={styles.serviceTitle}>
              👥 {t("landing.services.teamCollaboration.title")}
            </h3>
            <ul style={styles.serviceList}>
              <li>
                {t("landing.services.teamCollaboration.collaborationTools")}
              </li>
              <li>
                {t("landing.services.teamCollaboration.memberManagement")}
              </li>
              <li>{t("landing.services.teamCollaboration.roleBasedAccess")}</li>
              <li>{t("landing.services.teamCollaboration.announcements")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>{t("landing.contact.title")}</h2>
          <p style={styles.sectionDescription}>
            {t("landing.contact.description")}
          </p>
        </div>

        <div style={styles.contactGrid}>
          <div style={styles.contactInfo}>
            <h3 style={styles.contactTitle}>
              {t("landing.contact.contactInformation")}
            </h3>
            <p style={styles.contactText}>
              {t("landing.contact.email")}: {t("landing.contact.contactEmail")}
              <br />
              {t("landing.contact.phone")}: {t("landing.contact.contactPhone")}
              <br />
              {t("landing.contact.address")}: {t("landing.contact.contactAddress")}
            </p>
          </div>

          <div style={styles.contactForm}>
            <input
              type="text"
              placeholder={t("landing.contact.yourName")}
              className="input-group"
              style={styles.input}
            />
            <input
              type="email"
              placeholder={t("landing.contact.yourEmail")}
              className="input-group"
              style={styles.input}
            />
            <textarea
              placeholder={t("landing.contact.yourMessage")}
              rows="4"
              className="input-group"
              style={styles.input}
            />
            <button
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              {t("landing.contact.sendMessage")}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContainer}>
          <div style={styles.footerGrid}>
            {/* Company Info */}
            <div style={styles.footerColumn}>
              <div style={styles.footerLogo}>
                <Building2 size={28} />
                <span>EmployeeHub</span>
              </div>
              <p style={styles.footerDescription}>
                {t("landing.footer.description")}
              </p>
            </div>

            {/* Quick Links */}
            <div style={styles.footerColumn}>
              <h3 style={styles.footerTitle}>
                {t("landing.footer.quickLinks")}
              </h3>
              <ul style={styles.footerLinks}>
                <li>
                  <button
                    onClick={() => scrollToSection("product")}
                    style={styles.footerLink}
                  >
                    {t("landing.nav.product")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("services")}
                    style={styles.footerLink}
                  >
                    {t("landing.nav.services")}
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    style={styles.footerLink}
                  >
                    {t("landing.nav.contact")}
                  </button>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div style={styles.footerColumn}>
              <h3 style={styles.footerTitle}>
                {t("landing.footer.resources")}
              </h3>
              <ul style={styles.footerLinks}>
                <li>
                  <Link to="/login" style={styles.footerLink}>
                    {t("landing.footer.login")}
                  </Link>
                </li>
                <li>
                  <Link to="/register" style={styles.footerLink}>
                    {t("landing.footer.signUp")}
                  </Link>
                </li>
                <li style={styles.footerLink}>
                  {t("landing.footer.documentation")}
                </li>
                <li style={styles.footerLink}>{t("landing.footer.support")}</li>
              </ul>
            </div>

            {/* Contact */}
            <div style={styles.footerColumn}>
              <h3 style={styles.footerTitle}>
                {t("landing.footer.contactUs")}
              </h3>
              <ul style={styles.footerLinks}>
                <li style={styles.footerLink}>{t("landing.footer.contactEmail")}</li>
                <li style={styles.footerLink}>{t("landing.footer.contactPhone")}</li>
                <li style={styles.footerLink}>{t("landing.footer.address")}</li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div style={styles.footerBottom}>
            <p style={styles.footerCopyright}>
              {t("landing.footer.copyright")}
            </p>
            <div style={styles.footerBottomLinks}>
              <span style={styles.footerBottomLink}>
                {t("landing.footer.privacyPolicy")}
              </span>
              <span style={styles.footerBottomLink}>
                {t("landing.footer.termsOfService")}
              </span>
              <span style={styles.footerBottomLink}>
                {t("landing.footer.cookiePolicy")}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const styles = {
  landing: {
    backgroundColor: "var(--white)",
  },
  navSpacer: {
    height: "80px", // Высота навигации + отступы
  },
  navSpacerMobile: {
    height: "60px", // Компактная высота навигации на мобильных
  },
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "var(--white)",
    borderBottom: "1px solid var(--border-color)",
    padding: "1rem 0",
    zIndex: 1000,
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    transition: "box-shadow 0.3s ease",
  },
  navContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "1rem",
  },
  mobileMenuButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.5rem",
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "var(--text-primary)",
    minWidth: "44px",
    minHeight: "44px",
  },
  mobileMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "var(--white)",
    borderBottom: "1px solid var(--border-color)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    zIndex: 999,
  },
  mobileNavLinks: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  mobileNavLink: {
    padding: "0.875rem 1rem",
    backgroundColor: "transparent",
    border: "none",
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "color 0.3s",
    textAlign: "left",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
  },
  mobileLanguageSection: {
    paddingTop: "0.5rem",
    borderTop: "1px solid var(--border-color)",
  },
  mobileLanguageButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.875rem 1rem",
    backgroundColor: "transparent",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 0.2s ease",
    width: "100%",
    minHeight: "44px",
  },
  mobileAuthButtons: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingTop: "0.5rem",
    borderTop: "1px solid var(--border-color)",
  },
  mobileLoginButton: {
    padding: "0.875rem 1rem",
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    textDecoration: "none",
    textAlign: "center",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileGetStartedButton: {
    width: "100%",
    justifyContent: "center",
    minHeight: "44px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--primary-color)",
    cursor: "pointer",
    transition: "opacity 0.2s ease, transform 0.2s ease",
  },
  navLinks: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  navLinksMobile: {
    flexDirection: "column",
    width: "100%",
    gap: "0.5rem",
  },
  navLink: {
    padding: "0.5rem 1rem",
    backgroundColor: "transparent",
    border: "none",
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-secondary)",
    cursor: "pointer",
    transition: "color 0.3s",
  },
  navLinkMobile: {
    padding: "0.75rem 1rem",
    fontSize: "0.95rem",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
  },
  activeNavLink: {
    color: "var(--primary-color)",
  },
  rightSection: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  rightSectionMobile: {
    width: "100%",
    flexDirection: "column",
    gap: "0.75rem",
  },
  languageSelector: {
    position: "relative",
  },
  languageButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 1rem",
    backgroundColor: "transparent",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    fontSize: "0.9rem",
    fontWeight: "500",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  languageButtonHover: {
    backgroundColor: "var(--bg-secondary)",
    borderColor: "var(--primary-color)",
  },
  languageMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    marginTop: "0.5rem",
    backgroundColor: "var(--white)",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    minWidth: "150px",
    zIndex: 1000,
    overflow: "hidden",
  },
  languageOption: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "0.75rem 1rem",
    backgroundColor: "transparent",
    border: "none",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    textAlign: "left",
  },
  languageOptionHover: {
    backgroundColor: "rgba(79, 70, 229, 0.05)",
  },
  languageOptionActive: {
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    color: "var(--primary-color)",
    fontWeight: "600",
  },
  checkmark: {
    color: "var(--primary-color)",
    fontWeight: "700",
  },
  authButtons: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  authButtonsMobile: {
    width: "100%",
    flexDirection: "column",
    gap: "0.75rem",
  },
  loginButton: {
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    fontWeight: "500",
    color: "var(--text-primary)",
  },
  loginButtonMobile: {
    width: "100%",
    padding: "0.875rem 1rem",
    minHeight: "44px",
    justifyContent: "center",
  },
  hero: {
    padding: "4rem 1rem",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "var(--white)",
    textAlign: "center",
  },
  heroMobile: {
    padding: "2rem 1rem",
  },
  heroContent: {
    maxWidth: "800px",
    margin: "0 auto",
  },
  heroTitle: {
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: "700",
    marginBottom: "1.5rem",
    lineHeight: "1.2",
  },
  heroHighlight: {
    color: "#fbbf24",
  },
  heroDescription: {
    fontSize: "clamp(1rem, 2vw, 1.25rem)",
    marginBottom: "2rem",
    opacity: 0.9,
  },
  heroButtons: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  heroButtonsMobile: {
    flexDirection: "column",
    width: "100%",
  },
  section: {
    padding: "3rem 1rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionHeader: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  sectionTitle: {
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight: "700",
    marginBottom: "1rem",
    color: "var(--text-primary)",
  },
  sectionDescription: {
    fontSize: "clamp(1rem, 2vw, 1.125rem)",
    color: "var(--text-secondary)",
  },
  featuresGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "1.5rem",
  },
  featureCard: {
    flex: "1 1 280px",
    maxWidth: "360px",
    padding: "2rem",
    backgroundColor: "var(--white)",
    borderRadius: "0.75rem",
    border: "1px solid var(--border-color)",
    transition: "transform 0.3s, box-shadow 0.3s",
  },
  featureIcon: {
    width: "64px",
    height: "64px",
    borderRadius: "1rem",
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    color: "var(--primary-color)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  featureTitle: {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
  },
  featureDescription: {
    color: "var(--text-secondary)",
  },
  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: "1.5rem",
  },
  serviceCard: {
    padding: "2rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.75rem",
  },
  serviceTitle: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
  },
  serviceList: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  contactGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: "2rem",
  },
  contactInfo: {
    padding: "2rem",
    backgroundColor: "var(--light-gray)",
    borderRadius: "0.75rem",
  },
  contactTitle: {
    fontSize: "1.5rem",
    marginBottom: "1rem",
  },
  contactText: {
    color: "var(--text-secondary)",
    lineHeight: "1.8",
  },
  contactForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid var(--border-color)",
    borderRadius: "0.5rem",
    fontSize: "1rem",
  },
  footer: {
    backgroundColor: "var(--dark)",
    color: "var(--white)",
    padding: "3rem 1rem 1rem",
    marginTop: "3rem",
  },
  footerContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  footerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
    gap: "2rem",
    marginBottom: "2rem",
    paddingBottom: "2rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  },
  footerColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  footerLogo: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "1.5rem",
    fontWeight: "700",
    marginBottom: "0.5rem",
  },
  footerDescription: {
    fontSize: "0.9rem",
    lineHeight: "1.6",
    opacity: 0.8,
  },
  footerTitle: {
    fontSize: "1.1rem",
    fontWeight: "600",
    marginBottom: "0.5rem",
  },
  footerLinks: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  footerLink: {
    fontSize: "0.9rem",
    opacity: 0.8,
    transition: "opacity 0.2s, color 0.2s",
    cursor: "pointer",
    background: "none",
    border: "none",
    color: "var(--white)",
    padding: 0,
    textAlign: "left",
    textDecoration: "none",
  },
  footerBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "1rem",
    paddingTop: "1rem",
  },
  footerCopyright: {
    fontSize: "0.875rem",
    opacity: 0.7,
  },
  footerBottomLinks: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
  },
  footerBottomLink: {
    fontSize: "0.875rem",
    opacity: 0.7,
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
};

export default Landing;
