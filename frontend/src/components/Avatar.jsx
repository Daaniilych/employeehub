const Avatar = ({
  src,
  firstName,
  lastName,
  size = 40,
  style = {},
  onClick = null,
}) => {
  const getInitials = () => {
    const first = (firstName || "").charAt(0).toUpperCase();
    const last = (lastName || "").charAt(0).toUpperCase();
    return `${first}${last}` || "?";
  };

  const styles = {
    avatar: {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      cursor: onClick ? "pointer" : "default",
      ...style,
    },
    image: {
      width: "100%",
      height: "100%",
      objectFit: "cover",
    },
    placeholder: {
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(135deg, var(--primary-color), var(--secondary-color))",
      color: "white",
      fontSize: `${size / 2.5}px`,
      fontWeight: "700",
    },
  };

  return (
    <div
      style={styles.avatar}
      onClick={onClick}
      title={`${firstName} ${lastName}`}
    >
      {src ? (
        <img src={src} alt={`${firstName} ${lastName}`} style={styles.image} />
      ) : (
        <div style={styles.placeholder}>{getInitials()}</div>
      )}
    </div>
  );
};

export default Avatar;







