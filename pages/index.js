import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import DxfWriter  from "dxf-writer";
import proj4 from "proj4";

export default function Home () {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFiles = (e) => {
    const uploaded = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...uploaded]);
  };

  // Drag handlers
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

  // Remove a file from the list
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Fetch image as base64
  const fetchImageBase64 = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Image fetch failed:", url, err);
      return null;
    }
  };

  // Main processing function
  const processFiles = async () => {
    if (!files.length) return alert("Upload at least one XLSX file");
    const file = files[0];
    setProgress(0);

    // 1️⃣ Read XLSX
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const header = data[0];
    const rows = data.slice(1);

    // 2️⃣ DXF setup
    const dxf = new DxfWriter();
    dxf.setUnits("Meters");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const farmerId = row[0];
      const name = row[2];
      const coordsStr = row[7]; // H column
      const farmerPhotoUrl = row[11]; // M column

      // DXF: coordinates
      if (coordsStr) {
        console.log(coordsStr)
        let coords = coordsStr
          .trim()
          .split(";")
          .map((c) => c.trim().split(" ").map(Number))
          .map(([x, y]) => proj4("EPSG:3857", "EPSG:4326", [x, y]));

        // Auto-close polygon
        if (
          coords.length > 2 &&
          (coords[0][0] !== coords[coords.length - 1][0] ||
            coords[0][1] !== coords[coords.length - 1][1])
        ) {
          coords.push(coords[0]);
        }

        dxf.addPolyline(coords.map(([lon, lat]) => [lon, lat]));
        const [tx, ty] = coords[0];
        dxf.addText(`${farmerId} ${name}`, tx, ty, 2);
      }

      // XLSX: insert image as base64
      if (farmerPhotoUrl) {
        const base64 = await fetchImageBase64(farmerPhotoUrl);
        if (base64) {
          const colIndex = 12; // column M
          const cell = XLSX.utils.encode_cell({ c: colIndex, r: i + 1 });
          ws[cell] = { t: "s", v: `=IMAGE("data:image/jpeg;base64,${base64}")` };
        }
      }

      setProgress(Math.round(((i + 1) / rows.length) * 50));
    }

    // 3️⃣ Export XLSX
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const xlsxBlob = new Blob([wbout], { type: "application/octet-stream" });
    const a1 = document.createElement("a");
    a1.href = URL.createObjectURL(xlsxBlob);
    a1.download = "farmers_updated.xlsx";
    a1.click();

    setProgress(60);

    // 4️⃣ Export DXF
    const dxfBlob = new Blob([dxf.toDxfString()], { type: "application/dxf" });
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(dxfBlob);
    a2.download = "farmers.dxf";
    a2.click();

    setProgress(100);
  };

  return (
    <div className="container">
      <h2>Farm XLSX → DXF Tool</h2>

      <div className="upload-section">

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
              {i + 1}. {f.name}{" "}
              <button className="remove-btn" onClick={() => removeFile(i)}>
                ✖
              </button>
            </div>
          ))}
        </div>

        <button disabled={!files.length} onClick={processFiles}>Process XLSX + DXF</button>

        <div className="progress-bar">
          <div style={{ width: `${progress}%` }}></div>
        </div>
      </div>
    </div>
  );
}
