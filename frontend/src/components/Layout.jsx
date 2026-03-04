import React from "react";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    <div style={styles.layout}>
      <Navbar />
      <main style={styles.main}>{children}</main>
    </div>
  );
};

const styles = {
  layout: {
    minHeight: "100vh",
    backgroundColor: "var(--light-gray)",
  },
  main: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "2rem 1rem",
  },
};

export default Layout;

