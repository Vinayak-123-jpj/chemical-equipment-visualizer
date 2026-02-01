import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./styles/App.css";

/* Chart.js registration */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
);

function App() {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedChart, setSelectedChart] = useState("bar");
  const [showHistory, setShowHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [rawData, setRawData] = useState([]);

  const auth = {
    username: "vinayak",
    password: "test@1234",
  };

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/history/", {
        auth,
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

      // Parse CSV data for additional features
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split("\n").slice(1); // Skip header
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
          .filter((item) => item.name); // Remove empty rows
        setRawData(data);
      };
      reader.readAsText(file);

      fetchHistory();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setIsUploading(false);
    }
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
      })
      .catch((error) => {
        console.error("PDF download failed:", error);
        alert("Failed to generate PDF. Please try again.");
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
          borderColor: colors
            .slice(0, labels.length)
            .map((c) => c.replace("ea", "d3")),
          borderWidth: 2,
          borderRadius: selectedChart === "bar" ? 8 : 0,
          hoverBackgroundColor: colors
            .slice(0, labels.length)
            .map((c) => c.replace("ea", "d3")),
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: selectedChart === "doughnut",
        position: "bottom",
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: "bold",
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        borderColor: "rgba(255, 255, 255, 0.3)",
        borderWidth: 1,
      },
    },
    scales:
      selectedChart !== "doughnut"
        ? {
            y: {
              beginAtZero: true,
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
              ticks: {
                font: {
                  size: 12,
                  weight: "500",
                },
                color: "#64748b",
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                font: {
                  size: 12,
                  weight: "600",
                },
                color: "#1e293b",
              },
            },
          }
        : {},
  };

  const filteredData = rawData.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type.toLowerCase().includes(searchTerm.toLowerCase()),
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

  return (
    <div className="container">
      <header className="app-header">
        <h1>⚗️ Chemical Equipment Parameter Visualizer</h1>
        <p className="subtitle">Advanced Analytics & Real-time Monitoring</p>
      </header>

      <div className="upload-section">
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
          {fileName && <span className="file-name">✓ {fileName}</span>}
        </div>
      </div>

      {isUploading && (
        <div className="card uploading">
          <div className="loading-spinner"></div>
          <div className="loading">Analyzing your data</div>
        </div>
      )}

      {summary && !isUploading && (
        <>
          <div className="card">
            <div className="card-header">
              <h3>📊 Data Summary</h3>
              <div className="action-buttons">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <span>📜</span> {showHistory ? "Hide" : "Show"} History
                </button>
                <button className="btn btn-success" onClick={exportToCSV}>
                  <span>📊</span> Export CSV
                </button>
                <button className="btn" onClick={downloadPDF}>
                  <span>📥</span> PDF Report
                </button>
              </div>
            </div>
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

          {showHistory && history.length > 0 && (
            <div className="card">
              <h3>📜 Upload History (Last 5)</h3>
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
                      <tr key={index}>
                        <td>{new Date(item.uploaded_at).toLocaleString()}</td>
                        <td>{item.total_records}</td>
                        <td>{item.avg_flowrate.toFixed(2)}</td>
                        <td>{item.avg_pressure.toFixed(2)}</td>
                        <td>{item.avg_temperature.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <h3>📈 Equipment Distribution</h3>
              <div className="chart-controls">
                <button
                  className={`chart-btn ${selectedChart === "bar" ? "active" : ""}`}
                  onClick={() => setSelectedChart("bar")}
                >
                  📊 Bar
                </button>
                <button
                  className={`chart-btn ${selectedChart === "line" ? "active" : ""}`}
                  onClick={() => setSelectedChart("line")}
                >
                  📈 Line
                </button>
                <button
                  className={`chart-btn ${selectedChart === "doughnut" ? "active" : ""}`}
                  onClick={() => setSelectedChart("doughnut")}
                >
                  🍩 Doughnut
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
                <Doughnut data={getChartData()} options={chartOptions} />
              )}
            </div>
          </div>

          {rawData.length > 0 && (
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
                {sortedData.map((item, index) => {
                  const status = getHealthStatus(
                    item.flowrate,
                    item.pressure,
                    item.temperature,
                  );
                  return (
                    <div
                      key={index}
                      className={`equipment-card status-${status}`}
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
                      <div className="equipment-metrics">
                        <div className="metric">
                          <span className="metric-label">Flowrate</span>
                          <span className="metric-value">{item.flowrate}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Pressure</span>
                          <span className="metric-value">{item.pressure}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Temp</span>
                          <span className="metric-value">
                            {item.temperature}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {sortedData.length === 0 && (
                <div className="no-results">
                  No equipment found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!summary && !isUploading && (
        <div className="card empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Yet</h3>
          <p>
            Upload a CSV file to start analyzing your chemical equipment
            parameters
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
