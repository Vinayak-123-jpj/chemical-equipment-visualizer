import React, { useState, useEffect, useCallback } from "react";
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
import Login from "./Login";
import "./styles/App.css";
import "./styles/NewFeatures.css";

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

// API URL Configuration - MUST be defined FIRST
const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// Request interceptor - adds auth token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - SIMPLIFIED to prevent infinite loops
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If 401 and not a login/register request, clear tokens and reload
    if (error.response?.status === 401) {
      if (!error.config.url?.includes("/auth/")) {
        console.log("Session expired - please login again");
        localStorage.clear();
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setUser] = useState(null);

  const [, setEmailSchedules] = React.useState([]);
  const [, setSelectedEquipment] = React.useState([]);
  const [, setShowMaintenanceModal] = React.useState(false);

  const [summary, setSummary] = useState(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [, setAlerts] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedChart, setSelectedChart] = useState("bar");
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [rawData, setRawData] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [showAlerts, setShowAlerts] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [showResolvedAlerts, setShowResolvedAlerts] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState([]);

  const [theme, setTheme] = useState("light");
  const [rankings, setRankings] = useState([]);
  const [fullscreenChart, setFullscreenChart] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    const savedTheme = localStorage.getItem("theme") || "light";

    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }

    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.body.className = savedTheme === "dark" ? "dark-mode" : "";
  }, []);

  const handleLogin = (userData, token) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    setSummary(null);
    setRawData([]);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.className = newTheme === "dark" ? "dark-mode" : "";
  };

  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/api/trends/?days=90`);
      if (response.data && response.data.dates) {
        const historyItems = response.data.dates.map((date, index) => ({
          date: date,
          flowrate: response.data.flowrate[index],
          pressure: response.data.pressure[index],
          temperature: response.data.temperature[index],
        }));
        setHistory(historyItems);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setHistory([]);
    }
  }, [isAuthenticated]);

  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(
        `${API_URL}/api/alerts/?resolved=${showResolvedAlerts}`,
      );
      setAllAlerts(response.data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  }, [isAuthenticated, showResolvedAlerts]);

  const fetchTrends = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/api/trends/?days=30`);
      setTrendsData(response.data);
    } catch (error) {
      console.error("Failed to fetch trends:", error);
    }
  }, [isAuthenticated]);

  const fetchMaintenance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/api/maintenance/`);
      setMaintenanceSchedule(response.data);
    } catch (error) {
      console.error("Failed to fetch maintenance:", error);
    }
  }, [isAuthenticated]);

  const fetchRankings = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/api/rankings/`);
      setRankings(response.data);
    } catch (error) {
      console.error("Failed to fetch rankings:", error);
    }
  }, [isAuthenticated]);

  const fetchEmailSchedules = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await axios.get(`${API_URL}/api/email-reports/`);

      setEmailSchedules(response.data);
    } catch (error) {
      console.error("Failed to fetch email schedules:", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
      fetchAlerts();
      fetchTrends();
      fetchMaintenance();
      fetchRankings();
      fetchEmailSchedules();
    }
  }, [
    isAuthenticated,
    fetchHistory,
    fetchAlerts,
    fetchTrends,
    fetchMaintenance,
    fetchRankings,
    fetchEmailSchedules,
  ]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("Uploading to:", `${API_URL}/api/upload/`);
      console.log(
        "Token:",
        localStorage.getItem("token") ? "Present" : "Missing",
      );

      const response = await axios.post(`${API_URL}/api/upload/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("Upload successful:", response.data);

      setSummary(response.data);
      setAdvancedAnalytics(response.data.advanced_analytics || null);
      setAlerts(response.data.alerts || []);

      addNotification(
        "Success",
        "Data uploaded and analyzed successfully!",
        "success",
      );

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
      fetchAlerts();
      fetchTrends();
      fetchRankings();
    } catch (error) {
      console.error("Upload failed:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers,
      });

      let errorMessage = "Failed to upload file. Please try again.";

      if (error.response) {
        if (error.response.status === 405) {
          errorMessage =
            "Server configuration error (405). Please check backend CORS settings.";
        } else if (error.response.status === 401) {
          errorMessage = "Authentication required. Please login first.";
        } else if (error.response.status === 403) {
          errorMessage = "Permission denied (403). Try logging in again.";
        } else if (error.response.status === 400) {
          errorMessage = error.response.data?.error || "Invalid file format.";
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = `Cannot reach server at ${API_URL}. Please check if backend is running.`;
      }

      addNotification("Error", errorMessage, "error");
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

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  };

  const downloadPDF = () => {
    axios
      .get(`${API_URL}/api/report/`, {
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

  const downloadExcel = () => {
    if (!isAuthenticated) {
      addNotification("Error", "Please login first", "error");
      return;
    }

    axios
      .get(`${API_URL}/api/export/excel/`, {
        responseType: "blob",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "equipment_analysis.xlsx");
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        addNotification(
          "Success",
          "Excel report downloaded successfully!",
          "success",
        );
      })
      .catch((error) => {
        console.error("Excel download failed:", error);
        addNotification(
          "Error",
          "Failed to generate Excel: " +
            (error.response?.data?.error || error.message),
          "error",
        );
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

  const resolveAlert = async (alertId) => {
    try {
      await axios.post(`${API_URL}/api/alerts/${alertId}/resolve/`, {});
      addNotification("Success", "Alert resolved!", "success");
      fetchAlerts();
    } catch (error) {
      addNotification("Error", "Failed to resolve alert", "error");
    }
  };

  const toggleCompareSelection = (equipmentName) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(equipmentName)) {
        return prev.filter((name) => name !== equipmentName);
      } else if (prev.length < 3) {
        return [...prev, equipmentName];
      } else {
        addNotification(
          "Warning",
          "Maximum 3 equipment can be compared",
          "error",
        );
        return prev;
      }
    });
  };

  const compareEquipment = async () => {
    if (selectedForCompare.length < 2) {
      addNotification(
        "Error",
        "Select at least 2 equipment to compare",
        "error",
      );
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/compare-equipment/`, {
        equipment_names: selectedForCompare,
      });
      setComparisonData(response.data);
      addNotification("Success", "Equipment compared successfully!", "success");
    } catch (error) {
      addNotification("Error", "Failed to compare equipment", "error");
    }
  };

  const updateMaintenanceStatus = async (scheduleId, status) => {
    try {
      await axios.post(`${API_URL}/api/maintenance/${scheduleId}/update/`, {
        status,
      });
      addNotification("Success", "Status updated!", "success");
      fetchMaintenance();
    } catch (error) {
      addNotification("Error", "Failed to update status", "error");
    }
  };

  const getMedalEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "#10b981";
    if (score >= 75) return "#4facfe";
    if (score >= 60) return "#fee140";
    return "#fa709a";
  };

  const getChartData = () => {
    if (!summary) return null;

    const labels = Object.keys(summary.type_distribution);
    const data = Object.values(summary.type_distribution);

    const gradientColors = [
      { start: "#667eea", middle: "#764ba2", end: "#5568d3" },
      { start: "#f093fb", middle: "#f5576c", end: "#d946a6" },
      { start: "#4facfe", middle: "#00f2fe", end: "#0ea5e9" },
      { start: "#43e97b", middle: "#38f9d7", end: "#10b981" },
      { start: "#fa709a", middle: "#fee140", end: "#f59e0b" },
      { start: "#30cfd0", middle: "#330867", end: "#8b5cf6" },
    ];

    if (selectedChart === "line") {
      return {
        labels,
        datasets: [
          {
            label: "Equipment Count",
            data,
            borderColor: "#667eea",
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 400);
              gradient.addColorStop(0, "rgba(102, 126, 234, 0.4)");
              gradient.addColorStop(0.5, "rgba(102, 126, 234, 0.2)");
              gradient.addColorStop(1, "rgba(102, 126, 234, 0.05)");
              return gradient;
            },
            borderWidth: 4,
            tension: 0.4,
            fill: true,
            pointRadius: 8,
            pointHoverRadius: 12,
            pointBackgroundColor: "#667eea",
            pointBorderColor: "#fff",
            pointBorderWidth: 3,
          },
        ],
      };
    }

    if (selectedChart === "doughnut") {
      return {
        labels,
        datasets: [
          {
            label: "Equipment Count",
            data,
            backgroundColor: gradientColors.map((g) => g.start),
            borderColor: "#fff",
            borderWidth: 5,
            hoverBorderWidth: 7,
            hoverOffset: 20,
            hoverBackgroundColor: gradientColors.map((g) => g.middle),
            spacing: 3,
            borderRadius: 8,
          },
        ],
      };
    }

    return {
      labels,
      datasets: [
        {
          label: "Equipment Count",
          data,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            const colors =
              gradientColors[context.dataIndex % gradientColors.length];
            gradient.addColorStop(0, colors.start);
            gradient.addColorStop(0.5, colors.middle);
            gradient.addColorStop(1, colors.end);
            return gradient;
          },
          borderColor: "rgba(255, 255, 255, 0.8)",
          borderWidth: 3,
          borderRadius: 20,
          barThickness: 70,
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
          backgroundColor: "rgba(102, 126, 234, 0.3)",
          borderColor: "#667eea",
          borderWidth: 3,
          pointBackgroundColor: "#667eea",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#667eea",
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  const getTrendData = () => {
    if (!trendsData || trendsData.dates.length === 0) return null;

    return {
      labels: trendsData.dates,
      datasets: [
        {
          label: "Flowrate Trend",
          data: trendsData.flowrate,
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.2)",
          tension: 0.4,
          fill: true,
          borderWidth: 3,
        },
        {
          label: "Pressure Trend",
          data: trendsData.pressure,
          borderColor: "#4facfe",
          backgroundColor: "rgba(79, 172, 254, 0.2)",
          tension: 0.4,
          fill: true,
          borderWidth: 3,
        },
        {
          label: "Temperature Trend",
          data: trendsData.temperature,
          borderColor: "#fa709a",
          backgroundColor: "rgba(250, 112, 154, 0.2)",
          tension: 0.4,
          fill: true,
          borderWidth: 3,
        },
      ],
    };
  };

  const getComparisonData = () => {
    if (!comparisonData) return null;

    const labels = comparisonData.map((eq) => eq.name);

    return {
      labels,
      datasets: [
        {
          label: "Flowrate",
          data: comparisonData.map((eq) => eq.flowrate),
          backgroundColor: "rgba(102, 126, 234, 0.8)",
          borderColor: "#667eea",
          borderWidth: 2,
          borderRadius: 12,
        },
        {
          label: "Pressure",
          data: comparisonData.map((eq) => eq.pressure),
          backgroundColor: "rgba(79, 172, 254, 0.8)",
          borderColor: "#4facfe",
          borderWidth: 2,
          borderRadius: 12,
        },
        {
          label: "Temperature",
          data: comparisonData.map((eq) => eq.temperature),
          backgroundColor: "rgba(250, 112, 154, 0.8)",
          borderColor: "#fa709a",
          borderWidth: 2,
          borderRadius: 12,
        },
        {
          label: "Health Score",
          data: comparisonData.map((eq) => eq.health_score),
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "#10b981",
          borderWidth: 2,
          borderRadius: 12,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: "easeInOutCubic",
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          padding: 25,
          font: {
            size: 14,
            weight: "bold",
            family: "'Inter', sans-serif",
          },
          usePointStyle: true,
          pointStyle: "rectRounded",
          color: "#1e293b",
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(30, 41, 59, 0.98)",
        padding: 20,
        titleFont: { size: 16, weight: "bold" },
        bodyFont: { size: 14, weight: "600" },
        borderColor: "rgba(102, 126, 234, 0.6)",
        borderWidth: 3,
        cornerRadius: 12,
      },
    },
    scales:
      selectedChart !== "doughnut"
        ? {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(148, 163, 184, 0.15)",
                lineWidth: 1.5,
                drawBorder: false,
              },
              ticks: {
                font: { size: 13, weight: "700" },
                color: "#64748b",
                padding: 12,
              },
            },
            x: {
              grid: { display: false },
              ticks: {
                font: { size: 13, weight: "700" },
                color: "#1e293b",
                padding: 12,
              },
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

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={`app-container ${theme === "dark" ? "dark-mode" : ""}`}>
      {/* Fullscreen Chart Modal */}
      <AnimatePresence>
        {fullscreenChart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setFullscreenChart(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="modal-content"
              style={{ maxWidth: "90vw", width: "1200px", padding: "40px" }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setFullscreenChart(null)}
              >
                ✕
              </button>
              <h2 style={{ marginBottom: "30px" }}>
                📊 {fullscreenChart.title}
              </h2>
              <div style={{ height: "600px" }}>
                {fullscreenChart.type === "bar" && (
                  <Bar
                    data={fullscreenChart.data}
                    options={{ ...chartOptions, maintainAspectRatio: false }}
                  />
                )}
                {fullscreenChart.type === "line" && (
                  <Line
                    data={fullscreenChart.data}
                    options={{ ...chartOptions, maintainAspectRatio: false }}
                  />
                )}
                {fullscreenChart.type === "doughnut" && (
                  <Doughnut
                    data={fullscreenChart.data}
                    options={{ ...chartOptions, maintainAspectRatio: false }}
                  />
                )}
                {fullscreenChart.type === "radar" && (
                  <Radar
                    data={fullscreenChart.data}
                    options={{ ...chartOptions, maintainAspectRatio: false }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Header */}
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
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button
            className="alerts-toggle"
            onClick={() => setShowAlerts(!showAlerts)}
            title="View Alerts"
          >
            🔔
            {allAlerts.length > 0 && (
              <span className="alert-badge">{allAlerts.length}</span>
            )}
          </button>
          <button
            className="theme-toggle"
            onClick={handleLogout}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Alerts Panel */}
      <AnimatePresence>
        {showAlerts && allAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="alerts-panel"
          >
            <div className="alert-panel-header">
              <h3>
                🔔 Active Alerts ({allAlerts.filter((a) => !a.resolved).length})
              </h3>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showResolvedAlerts}
                  onChange={() => setShowResolvedAlerts(!showResolvedAlerts)}
                />
                <span>Show Resolved</span>
              </label>
            </div>
            <div className="alerts-grid">
              {allAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-card alert-${alert.alert_type.toLowerCase()} ${alert.resolved ? "resolved" : ""}`}
                >
                  <div className="alert-header">
                    <span className="alert-icon">
                      {alert.alert_type === "CRITICAL" ? "🚨" : "⚠️"}
                    </span>
                    <strong>{alert.equipment_name}</strong>
                  </div>
                  <p className="alert-message">{alert.message}</p>
                  {alert.recommendation && (
                    <div className="alert-recommendation">
                      💡 {alert.recommendation}
                    </div>
                  )}
                  <div className="alert-footer">
                    <span className="alert-time">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                    {!alert.resolved && (
                      <button
                        className="btn-resolve"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        ✓ Resolve
                      </button>
                    )}
                    {alert.resolved && (
                      <span className="resolved-badge">✓ Resolved</span>
                    )}
                  </div>
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
          className="card"
        >
          <div className="loading-spinner"></div>
          <div className="loading">Analyzing your data with AI...</div>
        </motion.div>
      )}

      {/* Main Content */}
      {summary && !isUploading && (
        <>
          {/* Navigation Tabs */}
          <div className="tabs-container">
            {[
              "dashboard",
              "analytics",
              "equipment",
              "rankings",
              "trends",
              "maintenance",
              "reports",
            ].map((tab) => (
              <button
                key={tab}
                className={`tab-button ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "dashboard" && "📊 Dashboard"}
                {tab === "analytics" && "📈 Analytics"}
                {tab === "equipment" && "🔧 Equipment"}
                {tab === "rankings" && "🏆 Rankings"}
                {tab === "trends" && "📉 Trends"}
                {tab === "maintenance" && "🛠️ Maintenance"}
                {tab === "reports" && "📄 Reports"}
              </button>
            ))}
          </div>

          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                    <button className="btn btn-success" onClick={downloadExcel}>
                      📊 Export Excel
                    </button>
                    <button className="btn" onClick={downloadPDF}>
                      📥 PDF Report
                    </button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="summary-grid">
                  <div className="stat-item stat-primary">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                      <div className="stat-label">Total Records</div>
                      <div className="stat-value">{summary.total_records}</div>
                    </div>
                  </div>
                  <div className="stat-item stat-info">
                    <div className="stat-icon">💧</div>
                    <div className="stat-content">
                      <div className="stat-label">Avg Flowrate</div>
                      <div className="stat-value">
                        {summary.avg_flowrate.toFixed(2)}
                      </div>
                      <div className="stat-unit">L/min</div>
                    </div>
                  </div>
                  <div className="stat-item stat-warning">
                    <div className="stat-icon">⚡</div>
                    <div className="stat-content">
                      <div className="stat-label">Avg Pressure</div>
                      <div className="stat-value">
                        {summary.avg_pressure.toFixed(2)}
                      </div>
                      <div className="stat-unit">bar</div>
                    </div>
                  </div>
                  <div className="stat-item stat-danger">
                    <div className="stat-icon">🌡️</div>
                    <div className="stat-content">
                      <div className="stat-label">Avg Temperature</div>
                      <div className="stat-value">
                        {summary.avg_temperature.toFixed(2)}
                      </div>
                      <div className="stat-unit">°C</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* History Table */}
              {showHistory && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="card"
                  >
                    <h3>📜 Upload History</h3>
                    {history.length > 0 ? (
                      <div className="history-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Avg Flowrate (L/min)</th>
                              <th>Avg Pressure (bar)</th>
                              <th>Avg Temperature (°C)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.slice(0, 20).map((item, index) => (
                              <tr key={index}>
                                <td>
                                  {new Date(item.date).toLocaleDateString()}
                                </td>
                                <td>{item.flowrate?.toFixed(2) || "N/A"}</td>
                                <td>{item.pressure?.toFixed(2) || "N/A"}</td>
                                <td>{item.temperature?.toFixed(2) || "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>No History Available</h3>
                        <p>Upload more datasets to see historical trends</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Equipment Distribution Chart */}
              <div className="card">
                <div className="card-header">
                  <h3>📈 Equipment Distribution</h3>
                  <div className="chart-controls">
                    {[
                      { value: "bar", label: "Bar", emoji: "📊" },
                      { value: "line", label: "Line", emoji: "📈" },
                      { value: "doughnut", label: "Doughnut", emoji: "🍩" },
                    ].map((chart) => (
                      <button
                        key={chart.value}
                        className={`chart-btn ${selectedChart === chart.value ? "active" : ""}`}
                        onClick={() => setSelectedChart(chart.value)}
                      >
                        {chart.emoji} {chart.label}
                      </button>
                    ))}
                    <button
                      className="chart-btn"
                      onClick={() =>
                        setFullscreenChart({
                          type: selectedChart,
                          data: getChartData(),
                          title: "Equipment Distribution",
                        })
                      }
                      title="Fullscreen"
                    >
                      ⛶ Fullscreen
                    </button>
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
                    <div style={{ maxWidth: "500px", margin: "0 auto" }}>
                      <Doughnut
                        data={getChartData()}
                        options={{ ...chartOptions, cutout: "65%" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && advancedAnalytics && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="analytics-grid">
                <div className="card">
                  <div className="card-header">
                    <h3>🎯 Performance Overview</h3>
                    <button
                      className="btn"
                      onClick={() =>
                        setFullscreenChart({
                          type: "radar",
                          data: getRadarData(),
                          title: "Performance Overview",
                        })
                      }
                    >
                      ⛶ Fullscreen
                    </button>
                  </div>
                  <div className="chart-container">
                    {getRadarData() && (
                      <Radar data={getRadarData()} options={chartOptions} />
                    )}
                  </div>
                </div>

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
                              transition={{ duration: 1 }}
                              className="health-score-fill"
                              style={{
                                backgroundColor:
                                  item.score >= 90
                                    ? "#10b981"
                                    : item.score >= 75
                                      ? "#4facfe"
                                      : "#fee140",
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
              </div>
            </motion.div>
          )}

          {/* Equipment Tab */}
          {activeTab === "equipment" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="card">
                <div className="card-header">
                  <h3>🔍 Equipment Details</h3>
                  <div className="action-buttons">
                    <button
                      className={`btn ${compareMode ? "btn-success" : "btn-secondary"}`}
                      onClick={() => {
                        setCompareMode(!compareMode);
                        if (compareMode) {
                          setSelectedForCompare([]);
                          setComparisonData(null);
                        }
                      }}
                    >
                      {compareMode
                        ? "✓ Compare Mode Active"
                        : "⚖️ Compare Equipment"}
                    </button>
                    {selectedForCompare.length >= 2 && compareMode && (
                      <button className="btn" onClick={compareEquipment}>
                        📊 Compare Selected ({selectedForCompare.length})
                      </button>
                    )}
                  </div>
                </div>

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

                {/* Comparison Results */}
                {comparisonData && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="comparison-results"
                  >
                    <div className="card-header">
                      <h4>📊 Comparison Results</h4>
                      <button
                        className="btn"
                        onClick={() =>
                          setFullscreenChart({
                            type: "bar",
                            data: getComparisonData(),
                            title: "Equipment Comparison",
                          })
                        }
                      >
                        ⛶ Fullscreen
                      </button>
                    </div>
                    <div className="chart-container">
                      <Bar data={getComparisonData()} options={chartOptions} />
                    </div>
                    <div className="comparison-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Equipment</th>
                            <th>Type</th>
                            <th>Flowrate</th>
                            <th>Pressure</th>
                            <th>Temperature</th>
                            <th>Health Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {comparisonData.map((eq, idx) => (
                            <tr key={idx}>
                              <td>
                                <strong>{eq.name}</strong>
                              </td>
                              <td>
                                <span className="type-badge">{eq.type}</span>
                              </td>
                              <td>{eq.flowrate}</td>
                              <td>{eq.pressure}</td>
                              <td>{eq.temperature}</td>
                              <td>
                                <span
                                  className="health-badge"
                                  style={{
                                    backgroundColor: getScoreColor(
                                      eq.health_score,
                                    ),
                                    padding: "4px 12px",
                                    borderRadius: "8px",
                                  }}
                                >
                                  {eq.health_score}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                <div className="equipment-grid">
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
                    const isSelected = selectedForCompare.includes(item.name);

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`equipment-card status-${status} ${isSelected ? "selected" : ""}`}
                        onClick={() =>
                          !compareMode && setSelectedEquipment(item)
                        }
                      >
                        {compareMode && (
                          <div className="compare-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleCompareSelection(item.name);
                              }}
                            />
                          </div>
                        )}
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

                        <div className="health-circle-container">
                          <svg className="health-circle" viewBox="0 0 100 100">
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
                              transition={{ duration: 1 }}
                              style={{
                                stroke:
                                  healthScore >= 90
                                    ? "#10b981"
                                    : healthScore >= 75
                                      ? "#4facfe"
                                      : "#fee140",
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
                </div>
              </div>
            </motion.div>
          )}

          {/* Rankings Tab */}
          {activeTab === "rankings" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="card">
                <div className="card-header">
                  <h3>🏆 Performance Rankings</h3>
                  <p
                    style={{
                      color: "#64748b",
                      fontSize: "0.9rem",
                      margin: "10px 0 0 0",
                    }}
                  >
                    Equipment ranked by overall performance score
                  </p>
                </div>

                {rankings.length > 0 ? (
                  <>
                    <div className="rankings-leaderboard">
                      {rankings.slice(0, 3).map((ranking, index) => (
                        <motion.div
                          key={ranking.rank}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.15 }}
                          className={`podium-item podium-${index + 1}`}
                        >
                          <div className="podium-medal">
                            {getMedalEmoji(ranking.rank)}
                          </div>
                          <div className="podium-details">
                            <h4>{ranking.equipment_name}</h4>
                            <span className="podium-type">
                              {ranking.equipment_type}
                            </span>
                            <div className="podium-score">
                              <svg
                                width="120"
                                height="120"
                                viewBox="0 0 120 120"
                              >
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="50"
                                  fill="none"
                                  stroke="#e2e8f0"
                                  strokeWidth="10"
                                />
                                <motion.circle
                                  cx="60"
                                  cy="60"
                                  r="50"
                                  fill="none"
                                  stroke={getScoreColor(ranking.overall_score)}
                                  strokeWidth="10"
                                  strokeLinecap="round"
                                  strokeDasharray={314}
                                  initial={{ strokeDashoffset: 314 }}
                                  animate={{
                                    strokeDashoffset:
                                      314 - (314 * ranking.overall_score) / 100,
                                  }}
                                  transition={{ duration: 1.5 }}
                                  style={{
                                    transformOrigin: "center",
                                    transform: "rotate(-90deg)",
                                  }}
                                />
                                <text
                                  x="60"
                                  y="60"
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  fontSize="24"
                                  fontWeight="bold"
                                  fill="#1e293b"
                                >
                                  {ranking.overall_score.toFixed(1)}
                                </text>
                              </svg>
                            </div>
                            <div className="podium-metrics">
                              <div className="metric-badge">
                                <span className="metric-label">Efficiency</span>
                                <span className="metric-rank">
                                  #{ranking.efficiency_rank}
                                </span>
                              </div>
                              <div className="metric-badge">
                                <span className="metric-label">
                                  Performance
                                </span>
                                <span className="metric-rank">
                                  #{ranking.performance_rank}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {rankings.length > 3 && (
                      <div className="rankings-table">
                        <h4
                          style={{ margin: "40px 0 20px 0", color: "#1e293b" }}
                        >
                          Complete Rankings
                        </h4>
                        <table>
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Equipment</th>
                              <th>Type</th>
                              <th>Overall Score</th>
                              <th>Efficiency Rank</th>
                              <th>Performance Rank</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rankings.map((ranking) => (
                              <tr key={ranking.rank}>
                                <td>
                                  <strong>{getMedalEmoji(ranking.rank)}</strong>
                                </td>
                                <td>{ranking.equipment_name}</td>
                                <td>
                                  <span className="type-badge">
                                    {ranking.equipment_type}
                                  </span>
                                </td>
                                <td>
                                  <div className="score-cell">
                                    <div
                                      className="score-bar"
                                      style={{
                                        width: `${ranking.overall_score}%`,
                                        backgroundColor: getScoreColor(
                                          ranking.overall_score,
                                        ),
                                      }}
                                    />
                                    <span className="score-text">
                                      {ranking.overall_score.toFixed(1)}
                                    </span>
                                  </div>
                                </td>
                                <td>#{ranking.efficiency_rank}</td>
                                <td>#{ranking.performance_rank}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🏆</div>
                    <h3>No Rankings Available</h3>
                    <p>Upload data to see equipment rankings</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Trends Tab */}
          {activeTab === "trends" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="card">
                <div className="card-header">
                  <h3>📉 Historical Trends (Last 30 Days)</h3>
                  <button
                    className="btn"
                    onClick={() =>
                      setFullscreenChart({
                        type: "line",
                        data: getTrendData(),
                        title: "Historical Trends",
                      })
                    }
                  >
                    ⛶ Fullscreen
                  </button>
                </div>
                <div className="chart-container">
                  {getTrendData() ? (
                    <Line data={getTrendData()} options={chartOptions} />
                  ) : (
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

          {/* Maintenance Tab */}
          {activeTab === "maintenance" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="card">
                <div className="card-header">
                  <h3>🛠️ Maintenance Schedule</h3>
                  <button
                    className="btn btn-success"
                    onClick={() => setShowMaintenanceModal(true)}
                  >
                    + Schedule Maintenance
                  </button>
                </div>

                {maintenanceSchedule.length > 0 ? (
                  <div className="maintenance-grid">
                    {maintenanceSchedule.map((schedule) => (
                      <div
                        key={schedule.id}
                        className={`maintenance-card priority-${schedule.priority.toLowerCase()}`}
                      >
                        <div className="maintenance-header">
                          <h4>{schedule.equipment_name}</h4>
                          <span
                            className={`priority-badge priority-${schedule.priority.toLowerCase()}`}
                          >
                            {schedule.priority}
                          </span>
                        </div>
                        <div className="maintenance-details">
                          <p>
                            <strong>Type:</strong> {schedule.equipment_type}
                          </p>
                          <p>
                            <strong>Date:</strong>{" "}
                            {new Date(
                              schedule.scheduled_date,
                            ).toLocaleDateString()}
                          </p>
                          <p>
                            <strong>Est. Hours:</strong>{" "}
                            {schedule.estimated_hours}h
                          </p>
                          <p>
                            <strong>Status:</strong>
                            <select
                              value={schedule.status}
                              onChange={(e) =>
                                updateMaintenanceStatus(
                                  schedule.id,
                                  e.target.value,
                                )
                              }
                              className="status-select"
                            >
                              <option value="SCHEDULED">Scheduled</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </p>
                          <p className="description">{schedule.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">🛠️</div>
                    <h3>No Maintenance Scheduled</h3>
                    <p>Schedule maintenance for your equipment</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Reports Tab */}
          {activeTab === "reports" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                <div className="report-card" onClick={downloadExcel}>
                  <div className="report-icon">📈</div>
                  <h4>Excel Report</h4>
                  <p>Detailed report with multiple sheets</p>
                  <button className="btn btn-success">Export Excel</button>
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
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default App;
