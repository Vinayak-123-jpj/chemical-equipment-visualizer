export default function UploadCard({ onUpload }) {
  return (
    <div className="card">
      <h3>Upload CSV File</h3>
      <input type="file" accept=".csv" onChange={onUpload} />
    </div>
  );
}
