export default function SummaryCard({ summary }) {
  return (
    <div className="card">
      <h3>Summary</h3>
      <p>
        <b>Total Records:</b> {summary.total_records}
      </p>
      <p>
        <b>Avg Flowrate:</b> {summary.avg_flowrate.toFixed(2)}
      </p>
      <p>
        <b>Avg Pressure:</b> {summary.avg_pressure.toFixed(2)}
      </p>
      <p>
        <b>Avg Temperature:</b> {summary.avg_temperature.toFixed(2)}
      </p>
    </div>
  );
}
