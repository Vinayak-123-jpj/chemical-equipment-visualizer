import React, { useState, useEffect, useCallback, useMemo } from "react";

import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Radar } from "react-chartjs-2";
import "./styles/App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

function App() {
  const [summary, setSummary] = useState(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedChart, setSelectedChart] = useState("bar");
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [rawData, setRawData] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState([]);

 const auth = useMemo(
   () => ({
     username: "vinayak",
     password: "test@1234",
   }),
   [],
 );

  // Apply dark mode to document body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/history/", {
        auth,
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, [auth]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/upload/",
        formData,
        { auth },
      );

      setSummary(response.data);
      setAdvancedAnalytics(response.data.advanced_analytics || null);
      setAlerts(response.data.alerts || []);

      // Show notification
      addNotification(
        "Success",
        "Data uploaded and analyzed successfully!",
        "success",
      );

      // Parse CSV data
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split("\n").slice(1);
        const data = rows
          .map((row) => {
            const [name, type, flowrate, pressure, temperature] =
              row.split(",");
            return {
              name,
              type,
              flowrate: parseFloat(flowrate),
              pressure: parseFloat(pressure),
              temperature: parseFloat(temperature),
            };
          })
          .filter((item) => item.name);
        setRawData(data);
      };
      reader.readAsText(file);

      fetchHistory();
    } catch (error) {
      console.error("Upload failed:", error);
      addNotification(
        "Error",
        "Failed to upload file. Please try again.",
        "error",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const addNotification = (title, message, type = "info") => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      time: new Date().toLocaleTimeString(),
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 5));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  };

  const downloadPDF = () => {
    axios
      .get("http://127.0.0.1:8000/api/report/", {
        auth,
        responseType: "blob",
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "equipment_report.pdf");
        document.body.appendChild(link);
        link.click();
        link.remove();
        addNotification(
          "Success",
          "PDF report downloaded successfully!",
          "success",
        );
      })
      .catch((error) => {
        console.error("PDF download failed:", error);
        addNotification("Error", "Failed to generate PDF.", "error");
      });
  };

  const exportToCSV = () => {
    if (!summary) return;

    const csvContent = [
      ["Metric", "Value"],
      ["Total Records", summary.total_records],
      ["Average Flowrate", summary.avg_flowrate.toFixed(2)],
      ["Average Pressure", summary.avg_pressure.toFixed(2)],
      ["Average Temperature", summary.avg_temperature.toFixed(2)],
      [""],
      ["Equipment Type", "Count"],
      ...Object.entries(summary.type_distribution),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "equipment_summary.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    addNotification("Success", "CSV exported successfully!", "success");
  };

  const getChartData = () => {
    if (!summary) return null;

    const labels = Object.keys(summary.type_distribution);
    const data = Object.values(summary.type_distribution);
    const colors = [
      "#667eea",
      "#764ba2",
      "#f093fb",
      "#4facfe",
      "#43e97b",
      "#fa709a",
      "#fee140",
      "#30cfd0",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Equipment Count",
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map((c) => c + "dd"),
          borderWidth: 2,
          borderRadius: selectedChart === "bar" ? 8 : 0,
          hoverBackgroundColor: colors
            .slice(0, labels.length)
            .map((c) => c + "cc"),
        },
      ],
    };
  };

  const getRadarData = () => {
    if (!advancedAnalytics) return null;

    return {
      labels: ["Flowrate", "Pressure", "Temperature", "Efficiency", "Health"],
      datasets: [
        {
          label: "Current Performance",
          data: [
            advancedAnalytics.flowrate_stats?.median || 0,
            advancedAnalytics.pressure_stats?.median || 0,
            advancedAnalytics.temperature_stats?.median || 0,
            advancedAnalytics.efficiency_metrics
              ? Object.values(advancedAnalytics.efficiency_metrics)[0]
                  ?.efficiency_index || 0
              : 0,
            advancedAnalytics.health_scores?.[0]?.score || 0,
          ],
          backgroundColor: "rgba(102, 126, 234, 0.2)",
          borderColor: "#667eea",
          borderWidth: 2,
          pointBackgroundColor: "#667eea",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#667eea",
        },
      ],
    };
  };

  const getTrendData = () => {
    if (history.length < 2) return null;

    const recentHistory = history.slice(0, 10).reverse();

    return {
      labels: recentHistory.map((h) =>
        new Date(h.uploaded_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      ),
      datasets: [
        {
          label: "Flowrate Trend",
          data: recentHistory.map((h) => h.avg_flowrate),
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Pressure Trend",
          data: recentHistory.map((h) => h.avg_pressure),
          borderColor: "#4facfe",
          backgroundColor: "rgba(79, 172, 254, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Temperature Trend",
          data: recentHistory.map((h) => h.avg_temperature),
          borderColor: "#fa709a",
          backgroundColor: "rgba(250, 112, 154, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: selectedChart !== "bar",
        position: "bottom",
        labels: {
          padding: 15,
          font: { size: 12, weight: "bold" },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        borderColor: "rgba(255, 255, 255, 0.3)",
        borderWidth: 1,
      },
    },
    scales:
      selectedChart !== "doughnut"
        ? {
            y: {
              beginAtZero: true,
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              ticks: { font: { size: 12, weight: "500" }, color: "#64748b" },
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 12, weight: "600" }, color: "#1e293b" },
            },
          }
        : {},
  };

  const filteredData = rawData.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "type":
        return a.type.localeCompare(b.type);
      case "flowrate":
        return b.flowrate - a.flowrate;
      case "pressure":
        return b.pressure - a.pressure;
      case "temperature":
        return b.temperature - a.temperature;
      default:
        return 0;
    }
  });

  const getHealthStatus = (flowrate, pressure, temperature) => {
    if (flowrate < 80 || pressure < 4 || temperature < 100) return "low";
    if (flowrate > 150 || pressure > 8 || temperature > 135) return "high";
    return "normal";
  };

  const getHealthScore = (flowrate, pressure, temperature) => {
    const flowrateScore =
      flowrate >= 100 && flowrate <= 130
        ? 100
        : flowrate >= 80 && flowrate <= 150
          ? 80
          : 60;
    const pressureScore =
      pressure >= 4 && pressure <= 8
        ? 100
        : pressure >= 3 && pressure <= 9
          ? 80
          : 60;
    const tempScore =
      temperature >= 100 && temperature <= 135
        ? 100
        : temperature >= 90 && temperature <= 150
          ? 80
          : 60;

    return Math.round((flowrateScore + pressureScore + tempScore) / 3);
  };

  return (
    <div className={`app-container ${darkMode ? "dark-mode" : ""}`}>
      {/* Notifications */}
      <div className="notifications-container">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`notification notification-${notif.type}`}
            >
              <div className="notification-header">
                <span className="notification-icon">
                  {notif.type === "success"
                    ? "✓"
                    : notif.type === "error"
                      ? "✕"
                      : "ℹ"}
                </span>
                <strong>{notif.title}</strong>
                <span className="notification-time">{notif.time}</span>
              </div>
              <p>{notif.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header with controls */}
      <header className="app-header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1>⚗️ Chemical Equipment Intelligence Platform</h1>
          <p className="subtitle">
            Advanced Analytics · Predictive Insights · Real-time Monitoring
          </p>
        </motion.div>

        <div className="header-controls">
          <button
            className="theme-toggle"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            className="alerts-toggle"
            onClick={() => setShowAlerts(!showAlerts)}
          >
            🔔{" "}
            {alerts.length > 0 && (
              <span className="alert-badge">{alerts.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Alerts Panel */}
      <AnimatePresence>
        {showAlerts && alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="alerts-panel"
          >
            <h3>🔔 Active Alerts ({alerts.length})</h3>
            <div className="alerts-grid">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`alert-card alert-${alert.type.toLowerCase()}`}
                >
                  <div className="alert-header">
                    <span className="alert-icon">
                      {alert.type === "Critical" ? "🚨" : "⚠️"}
                    </span>
                    <strong>{alert.equipment}</strong>
                  </div>
                  <p>{alert.message}</p>
                  {alert.recommendation && (
                    <div className="alert-recommendation">
                      💡 {alert.recommendation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="upload-section"
      >
        <label className="upload-label">📂 Upload CSV Data File</label>
        <div className="file-upload-wrapper">
          <label htmlFor="file-input" className="custom-file-upload">
            <span className="upload-icon">📤</span>
            {isUploading ? "Processing..." : "Choose CSV File"}
          </label>
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleUpload}
            disabled={isUploading}
          />
          {fileName && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="file-name"
            >
              ✓ {fileName}
            </motion.span>
          )}
        </div>
      </motion.div>

      {/* Loading State */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card uploading"
        >
          <div className="loading-spinner"></div>
          <div className="loading">Analyzing your data with AI...</div>
          <div className="loading-steps">
            <div className="step">✓ Reading CSV file</div>
            <div className="step active">⚙️ Running statistical analysis</div>
            <div className="step">⏳ Detecting anomalies</div>
            <div className="step">⏳ Generating insights</div>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      {summary && !isUploading && (
        <>
          {/* Navigation Tabs */}
          <div className="tabs-container">
            {["dashboard", "analytics", "equipment", "trends", "reports"].map(
              (tab) => (
                <button
                  key={tab}
                  className={`tab-button ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === "dashboard" && "📊"}
                  {tab === "analytics" && "📈"}
                  {tab === "equipment" && "🔧"}
                  {tab === "trends" && "📉"}
                  {tab === "reports" && "📄"}{" "}
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ),
            )}
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Summary Stats */}
              <div className="card">
                <div className="card-header">
                  <h3>📊 Data Summary</h3>
                  <div className="action-buttons">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      📜 {showHistory ? "Hide" : "Show"} History
                    </button>
                    <button className="btn btn-success" onClick={exportToCSV}>
                      📊 Export CSV
                    </button>
                    <button className="btn" onClick={downloadPDF}>
                      📥 PDF Report
                    </button>
                  </div>
                </div>
                <div className="summary-grid">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="stat-item stat-primary"
                  >
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                      <div className="stat-label">Total Records</div>
                      <div className="stat-value">{summary.total_records}</div>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="stat-item stat-info"
                  >
                    <div className="stat-icon">💧</div>
                    <div className="stat-content">
                      <div className="stat-label">Avg Flowrate</div>
                      <div className="stat-value">
                        {summary.avg_flowrate.toFixed(2)}
                      </div>
                      <div className="stat-unit">L/min</div>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="stat-item stat-warning"
                  >
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                      <div className="stat-label">Avg Pressure</div>
                      <div className="stat-value">
                        {summary.avg_pressure.toFixed(2)}
                      </div>
                      <div className="stat-unit">bar</div>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="stat-item stat-danger"
                  >
                    <div className="stat-icon">🌡️</div>
                    <div className="stat-content">
                      <div className="stat-label">Avg Temperature</div>
                      <div className="stat-value">
                        {summary.avg_temperature.toFixed(2)}
                      </div>
                      <div className="stat-unit">°C</div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Upload History */}
              <AnimatePresence>
                {showHistory && history.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="card"
                  >
                    <h3>📜 Upload History (Last 10)</h3>
                    <div className="history-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Records</th>
                            <th>Flowrate</th>
                            <th>Pressure</th>
                            <th>Temperature</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item, index) => (
                            <motion.tr
                              key={index}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <td>
                                {new Date(item.uploaded_at).toLocaleString()}
                              </td>
                              <td>{item.total_records}</td>
                              <td>{item.avg_flowrate.toFixed(2)}</td>
                              <td>{item.avg_pressure.toFixed(2)}</td>
                              <td>{item.avg_temperature.toFixed(2)}</td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Equipment Distribution Chart */}
              <div className="card">
                <div className="card-header">
                  <h3>📈 Equipment Distribution</h3>
                  <div className="chart-controls">
                    {[
                      { value: "bar", label: "📊 Bar" },
                      { value: "line", label: "📈 Line" },
                      { value: "doughnut", label: "🍩 Doughnut" },
                    ].map((chart) => (
                      <button
                        key={chart.value}
                        className={`chart-btn ${selectedChart === chart.value ? "active" : ""}`}
                        onClick={() => setSelectedChart(chart.value)}
                      >
                        {chart.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-container">
                  {selectedChart === "bar" && (
                    <Bar data={getChartData()} options={chartOptions} />
                  )}
                  {selectedChart === "line" && (
                    <Line data={getChartData()} options={chartOptions} />
                  )}
                  {selectedChart === "doughnut" && (
                    <Doughnut data={getChartData()} options={chartOptions} />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && advancedAnalytics && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="analytics-grid">
                {/* Performance Radar */}
                <div className="card">
                  <h3>🎯 Performance Overview</h3>
                  <div className="chart-container">
                    {getRadarData() && (
                      <Radar
                        data={getRadarData()}
                        options={{
                          ...chartOptions,
                          scales: {
                            r: {
                              beginAtZero: true,
                              max: 150,
                            },
                          },
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Health Scores */}
                <div className="card">
                  <h3>💚 Equipment Health Scores</h3>
                  <div className="health-scores">
                    {advancedAnalytics.health_scores
                      ?.slice(0, 5)
                      .map((item, index) => (
                        <div key={index} className="health-score-item">
                          <div className="health-score-header">
                            <span>{item.equipment}</span>
                            <span
                              className={`health-status health-${item.status.toLowerCase()}`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="health-score-bar">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.score}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
                              className="health-score-fill"
                              style={{
                                backgroundColor:
                                  item.score >= 90
                                    ? "#10b981"
                                    : item.score >= 75
                                      ? "#4facfe"
                                      : item.score >= 60
                                        ? "#fee140"
                                        : "#fa709a",
                              }}
                            />
                          </div>
                          <div className="health-score-value">
                            {item.score}%
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Correlations */}
                <div className="card">
                  <h3>🔗 Parameter Correlations</h3>
                  <div className="correlations-grid">
                    {advancedAnalytics.correlations &&
                      Object.entries(advancedAnalytics.correlations).map(
                        ([key, value]) => (
                          <div key={key} className="correlation-item">
                            <div className="correlation-label">
                              {key
                                .replace("_", " vs ")
                                .replace(/([A-Z])/g, " $1")
                                .trim()}
                            </div>
                            <div className="correlation-value">
                              <div
                                className="correlation-bar"
                                style={{
                                  width: `${Math.abs(value) * 100}%`,
                                  backgroundColor:
                                    value > 0.5
                                      ? "#10b981"
                                      : value > 0
                                        ? "#4facfe"
                                        : "#fa709a",
                                }}
                              />
                              <span>{(value * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ),
                      )}
                  </div>
                </div>

                {/* Anomalies */}
                {advancedAnalytics.anomalies &&
                  advancedAnalytics.anomalies.length > 0 && (
                    <div className="card full-width">
                      <h3>⚠️ Detected Anomalies</h3>
                      <div className="anomalies-list">
                        {advancedAnalytics.anomalies.map((anomaly, index) => (
                          <div
                            key={index}
                            className={`anomaly-item anomaly-${anomaly.severity.toLowerCase()}`}
                          >
                            <div className="anomaly-header">
                              <span className="anomaly-icon">
                                {anomaly.severity === "High" ? "🚨" : "⚠️"}
                              </span>
                              <strong>{anomaly.equipment}</strong>
                              <span className="anomaly-badge">
                                {anomaly.severity}
                              </span>
                            </div>
                            <p>
                              {anomaly.parameter}:{" "}
                              <strong>{anomaly.value}</strong>
                              <br />
                              Expected range: {anomaly.expected_range}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </motion.div>
          )}

          {/* Equipment Details Tab */}
          {activeTab === "equipment" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card">
                <div className="card-header">
                  <h3>🔍 Equipment Details</h3>
                  <div className="filter-controls">
                    <input
                      type="text"
                      placeholder="🔎 Search equipment..."
                      className="search-input"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                      className="sort-select"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">Sort by Name</option>
                      <option value="type">Sort by Type</option>
                      <option value="flowrate">Sort by Flowrate</option>
                      <option value="pressure">Sort by Pressure</option>
                      <option value="temperature">Sort by Temperature</option>
                    </select>
                  </div>
                </div>
                <div className="equipment-grid">
                  <AnimatePresence>
                    {sortedData.map((item, index) => {
                      const status = getHealthStatus(
                        item.flowrate,
                        item.pressure,
                        item.temperature,
                      );
                      const healthScore = getHealthScore(
                        item.flowrate,
                        item.pressure,
                        item.temperature,
                      );

                      return (
                        <motion.div
                          key={index}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          transition={{ duration: 0.2 }}
                          className={`equipment-card status-${status}`}
                          onClick={() => setSelectedEquipment(item)}
                        >
                          <div className="equipment-header">
                            <h4>{item.name}</h4>
                            <span className={`status-badge ${status}`}>
                              {status === "normal"
                                ? "✓"
                                : status === "high"
                                  ? "⚠"
                                  : "⬇"}
                              {status.toUpperCase()}
                            </span>
                          </div>
                          <div className="equipment-type">{item.type}</div>

                          {/* Health Score Circle */}
                          <div className="health-circle-container">
                            <svg
                              className="health-circle"
                              viewBox="0 0 100 100"
                            >
                              <circle
                                className="health-circle-bg"
                                cx="50"
                                cy="50"
                                r="40"
                              />
                              <motion.circle
                                className="health-circle-fill"
                                cx="50"
                                cy="50"
                                r="40"
                                initial={{ strokeDashoffset: 251.2 }}
                                animate={{
                                  strokeDashoffset:
                                    251.2 - (251.2 * healthScore) / 100,
                                }}
                                transition={{
                                  duration: 1,
                                  delay: index * 0.05,
                                }}
                                style={{
                                  stroke:
                                    healthScore >= 90
                                      ? "#10b981"
                                      : healthScore >= 75
                                        ? "#4facfe"
                                        : healthScore >= 60
                                          ? "#fee140"
                                          : "#fa709a",
                                }}
                              />
                              <text
                                x="50"
                                y="50"
                                className="health-circle-text"
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                {healthScore}%
                              </text>
                            </svg>
                            <div className="health-label">Health Score</div>
                          </div>

                          <div className="equipment-metrics">
                            <div className="metric">
                              <span className="metric-label">Flowrate</span>
                              <span className="metric-value">
                                {item.flowrate}
                              </span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Pressure</span>
                              <span className="metric-value">
                                {item.pressure}
                              </span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Temp</span>
                              <span className="metric-value">
                                {item.temperature}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
                {sortedData.length === 0 && (
                  <div className="no-results">
                    No equipment found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Trends Tab */}
          {activeTab === "trends" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="card">
                <h3>📉 Historical Trends</h3>
                <div className="chart-container">
                  {getTrendData() && (
                    <Line
                      data={getTrendData()}
                      options={{
                        ...chartOptions,
                        interaction: {
                          mode: "index",
                          intersect: false,
                        },
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: true,
                            position: "top",
                          },
                        },
                      }}
                    />
                  )}
                  {!getTrendData() && (
                    <div className="empty-state">
                      <div className="empty-icon">📊</div>
                      <h3>Not Enough Data</h3>
                      <p>Upload more datasets to see trends</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="reports-grid">
                <div className="report-card" onClick={downloadPDF}>
                  <div className="report-icon">📄</div>
                  <h4>PDF Report</h4>
                  <p>Comprehensive analysis with charts and insights</p>
                  <button className="btn">Generate PDF</button>
                </div>
                <div className="report-card" onClick={exportToCSV}>
                  <div className="report-icon">📊</div>
                  <h4>CSV Export</h4>
                  <p>Raw data export for further analysis</p>
                  <button className="btn btn-success">Export CSV</button>
                </div>
                <div className="report-card">
                  <div className="report-icon">📈</div>
                  <h4>Excel Report</h4>
                  <p>Detailed report with multiple sheets</p>
                  <button className="btn btn-secondary">Coming Soon</button>
                </div>
                <div className="report-card">
                  <div className="report-icon">📧</div>
                  <h4>Email Report</h4>
                  <p>Schedule automated email reports</p>
                  <button className="btn btn-secondary">Coming Soon</button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Empty State */}
      {!summary && !isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card empty-state"
        >
          <div className="empty-icon">📊</div>
          <h3>Welcome to Equipment Intelligence Platform</h3>
          <p>
            Upload a CSV file to start analyzing your chemical equipment
            parameters
            <br />
            <small>
              Supported format: Equipment Name, Type, Flowrate, Pressure,
              Temperature
            </small>
          </p>
        </motion.div>
      )}

      {/* Equipment Detail Modal */}
      <AnimatePresence>
        {selectedEquipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setSelectedEquipment(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedEquipment(null)}
              >
                ✕
              </button>
              <h2>{selectedEquipment.name}</h2>
              <div className="modal-details">
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">{selectedEquipment.type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Flowrate</span>
                  <span className="detail-value">
                    {selectedEquipment.flowrate} L/min
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pressure</span>
                  <span className="detail-value">
                    {selectedEquipment.pressure} bar
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Temperature</span>
                  <span className="detail-value">
                    {selectedEquipment.temperature}°C
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Health Score</span>
                  <span className="detail-value">
                    {getHealthScore(
                      selectedEquipment.flowrate,
                      selectedEquipment.pressure,
                      selectedEquipment.temperature,
                    )}
                    %
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
