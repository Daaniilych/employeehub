import React from "react";
import { X, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { t } from "../i18n";

const QRCodeModal = ({ user, onClose }) => {
  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = 300;
    canvas.height = 300;

    img.onload = () => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${user.firstName}_${user.lastName}_QRCode.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t("qrCodeModal.title")}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.content}>
          <div style={styles.qrContainer}>
            <QRCodeSVG
              id="qr-code-svg"
              value={user.qrCode || ""}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div style={styles.userInfo}>
            <h3 style={styles.userName}>
              {user.firstName} {user.lastName}
            </h3>
            <p style={styles.userEmail}>{user.email}</p>
          </div>

          <div style={styles.info}>
            <p style={styles.infoText}>
              {t("qrCodeModal.description")}
            </p>
          </div>

          <button onClick={handleDownload} style={styles.downloadButton}>
            <Download size={18} />
            <span>{t("qrCodeModal.download")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: "1rem",
  },
  modal: {
    backgroundColor: "var(--white)",
    borderRadius: "1rem",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
    maxHeight: "90vh",
    overflow: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem",
    borderBottom: "1px solid var(--border-color)",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: 0,
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-secondary)",
    padding: "0.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "0.5rem",
    transition: "all 0.2s ease",
  },
  content: {
    padding: "2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
  },
  qrContainer: {
    padding: "1.5rem",
    backgroundColor: "var(--bg-secondary)",
    borderRadius: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  userInfo: {
    textAlign: "center",
  },
  userName: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    margin: "0 0 0.5rem 0",
  },
  userEmail: {
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    margin: 0,
  },
  info: {
    backgroundColor: "var(--bg-secondary)",
    padding: "1rem",
    borderRadius: "0.75rem",
    border: "1px solid var(--border-color)",
  },
  infoText: {
    fontSize: "0.875rem",
    color: "var(--text-secondary)",
    margin: 0,
    textAlign: "center",
    lineHeight: "1.5",
  },
  downloadButton: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    backgroundColor: "var(--primary-color)",
    color: "var(--white)",
    border: "none",
    borderRadius: "0.5rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    width: "100%",
    justifyContent: "center",
  },
};

export default QRCodeModal;







