import React from "react";
import {
  Inbox,
  Users,
  MessageSquare,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react";

const EmptyState = ({
  icon: CustomIcon,
  iconType = "inbox",
  title = "No data found",
  description,
  action,
  actionLabel,
  onAction,
}) => {
  const icons = {
    inbox: Inbox,
    users: Users,
    messages: MessageSquare,
    files: FileText,
    clock: Clock,
    alert: AlertCircle,
  };

  const Icon = CustomIcon || icons[iconType] || icons.inbox;

  return (
    <div style={styles.container}>
      <div style={styles.iconWrapper}>
        <Icon size={64} color="var(--gray)" />
      </div>

      <h3 style={styles.title}>{title}</h3>

      {description && <p style={styles.description}>{description}</p>}

      {action && onAction && (
        <button
          onClick={onAction}
          className="btn btn-primary"
          style={styles.button}
        >
          {actionLabel || "Get Started"}
        </button>
      )}

      {action && !onAction && action}
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem 1.5rem",
    textAlign: "center",
    minHeight: "300px",
  },
  iconWrapper: {
    marginBottom: "1.5rem",
    opacity: 0.5,
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "var(--text-primary)",
    marginBottom: "0.5rem",
  },
  description: {
    fontSize: "1rem",
    color: "var(--text-secondary)",
    marginBottom: "1.5rem",
    maxWidth: "400px",
    lineHeight: "1.6",
  },
  button: {
    marginTop: "0.5rem",
  },
};

export default EmptyState;





