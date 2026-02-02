import React, { useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import "./Auth.css";

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login/" : "/api/auth/register/";
      const data = isLogin
        ? { username, password }
        : { username, password, email };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}${endpoint}`,
        data,
      );

      if (response.data.success) {
        localStorage.setItem("token", response.data.tokens.access);
        localStorage.setItem("refresh", response.data.tokens.refresh);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        onLogin(response.data.user, response.data.tokens.access);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  // Demo login function
  const handleDemoLogin = () => {
    setUsername("demo");
    setPassword("demo123");
    setIsLogin(true);
    setTimeout(() => {
      document
        .querySelector("form")
        .dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true }),
        );
    }, 100);
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
        <div className="auth-blob blob-3"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="auth-card"
      >
        <div className="auth-header">
          <h1>⚗️</h1>
          <h2>{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p>Chemical Equipment Intelligence Platform</p>
        </div>

        {/* DEMO CREDENTIALS BOX */}
        <div
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            padding: "15px",
            borderRadius: "12px",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              fontSize: "0.9rem",
            }}
          >
            🎯 Demo Credentials
          </div>
          <div style={{ fontSize: "0.85rem", marginBottom: "10px" }}>
            Username: <strong>demo</strong> | Password: <strong>demo123</strong>
          </div>
          <button
            onClick={handleDemoLogin}
            style={{
              background: "white",
              color: "#059669",
              border: "none",
              padding: "8px 20px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Quick Demo Login
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="auth-error"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
            />
          </div>

          {!isLogin && (
            <div className="form-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
          )}

          <div className="form-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Processing..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;
