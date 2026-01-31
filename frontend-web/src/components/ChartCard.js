import { Bar } from "react-chartjs-2";

export default function ChartCard({ distribution }) {
  return (
    <div className="card">
      <h3>Equipment Distribution</h3>
      <Bar
        data={{
          labels: Object.keys(distribution),
          datasets: [
            {
              label: "Count",
              data: Object.values(distribution),
              backgroundColor: "#4f46e5",
            },
          ],
        }}
      />
    </div>
  );
}
