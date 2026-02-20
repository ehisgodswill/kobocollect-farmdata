import { useFakeProgress } from "@/hooks/useFakeProgress";
import { useState, useRef } from "react";

export default function Home () {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const { progress, complete, reset } = useFakeProgress(loading);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);


  const handleFiles = (e) => {
    const uploaded = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...uploaded]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
    setIsDragging(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    reset();
    if (!files.length) return;

    setLoading(true);
    const file = files[0];

    const res = await fetch("/api/process", {
      method: "POST",
      body: file,
    });

    const data = await res.json();

    // download excel
    const excelBlob = new Blob(
      [Uint8Array.from(atob(data.excel), (c) => c.charCodeAt(0))],
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );

    const a1 = document.createElement("a");
    a1.href = URL.createObjectURL(excelBlob);
    a1.download = "farmers.xlsx";
    a1.click();

    // download dxf
    const dxfBlob = new Blob(
      [Uint8Array.from(atob(data.dxf), (c) => c.charCodeAt(0))],
      { type: "application/dxf" }
    );

    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(dxfBlob);
    a2.download = "farms.dxf";
    a2.click();

    complete();
    setLoading(false);
  };

  return (
    <div className="container">
      <h2>Farm XLSX → DXF Tool</h2>

      <div
        className={`drop-area ${isDragging ? "dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current.click()}
      >
        Drag & Drop XLSX here or click to upload
      </div>

      <input
        hidden
        type="file"
        accept=".xlsx"
        ref={fileInputRef}
        onChange={handleFiles}
        multiple
      />

      <div className="file-list">
        {files.map((f, i) => (
          <div key={i}>
            {i + 1}. {f.name}
            <button
              className="remove-btn"
              onClick={() => removeFile(i)}
            >
              ✖
            </button>
          </div>
        ))}
      </div>

      <button className="button" disabled={!files.length || loading} onClick={processFiles}>
        Process XLSX + DXF
      </button>

      <div className="progress-bar">
        <div style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}