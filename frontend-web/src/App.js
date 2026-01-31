import React, { useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
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
  Title,
  Tooltip,
  Legend,
);

function App() {
  const [summary, setSummary] = useState(null);

  const auth = {
    username: "vinayak",
    password: "test@1234",
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      "http://127.0.0.1:8000/api/upload/",
      formData,
      { auth },
    );

    setSummary(response.data);
  };

  /* ✅ PDF download handler */
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
      });
  };

  return (
    <div className="container">
      <h2>Chemical Equipment Parameter Visualizer</h2>

      <input type="file" accept=".csv" onChange={handleUpload} />

      {summary && (
        <div className="card">
          <h3>Summary</h3>
          <p>Total Records: {summary.total_records}</p>
          <p>Average Flowrate: {summary.avg_flowrate.toFixed(2)}</p>
          <p>Average Pressure: {summary.avg_pressure.toFixed(2)}</p>
          <p>Average Temperature: {summary.avg_temperature.toFixed(2)}</p>

          <button className="btn" onClick={downloadPDF}>
            ⬇️ Download PDF Report
          </button>

          <Bar
            key={JSON.stringify(summary.type_distribution)}
            data={{
              labels: Object.keys(summary.type_distribution),
              datasets: [
                {
                  label: "Equipment Count",
                  data: Object.values(summary.type_distribution),
                  backgroundColor: "#4f46e5",
                },
              ],
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
