import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import Drawing from "dxf-writer";
import proj4 from "proj4";

export default function Home () {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Handle files
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

  // Fetch image as base64
  const fetchImageBase64 = async (url) => {
    if (!url) return null;
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

  function parseBoundary (boundary) {
    if (!boundary) return [];

    return boundary
      .split(";")
      .map((chunk) => {
        const parts = chunk.trim().split(" ");

        // Kobo format:
        // lat lon altitude accuracy
        const lat = Number(parts[0]);
        const lon = Number(parts[1]);

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

        // convert 3857 → 4326 ONLY if needed
        // (your sample actually looks like WGS84 already)

        return [lon, lat]; // DXF uses X=lon, Y=lat
      })
      .filter(Boolean);
  }

  function closePolygon (points) {
    if (points.length < 3) return points;

    const [fx, fy] = points[0];
    const [lx, ly] = points[points.length - 1];

    if (fx !== lx || fy !== ly) {
      points.push([fx, fy]);
    }

    return points;
  }

  const processFiles = async () => {
    if (!files.length) return alert("Upload at least one XLSX file");
    const file = files[0];
    setProgress(0);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const header = data[0];
    const rows = data.slice(1);

    const dxf = new Drawing();
    dxf.setUnits("Meters");

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const startDate = row[0];
      const Collector_Id = row[3];
      const Respondent_Status = row[4];
      const Caretaker = row[5];
      const Name = row[6];
      const Sex = row[7];
      const FarmStatus = row[8];
      const Farmers_ID = row[9];
      const Phone_No = row[10];
      const FarmBoundary = row[11];
      const Total_Area_Ha = row[13];
      const AreaCropped = row[15];
      const Farmers_Picture = row[16];
      const Density_Picture = row[17];
      const _id = row[19];
      const _uuid = row[20];

      // Farmer ID
      const date = new Date(startDate);
      const farmerId = `0${Collector_Id}${String(Farmers_ID).padStart(2, "0")}-${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() - 2000}`;

      // DXF coordinates
      if (FarmBoundary) {
        const points = closePolygon(parseBoundary(FarmBoundary));

        if (points.length >= 3) {
          dxf.drawPolyline(points, true);
        }
        if (points.length) {
          const [x, y] = points[0];
          dxf.drawText(
            x,
            y,
            2, // text height
            0, // rotation
            `${row.Farmers_ID} ${row.Name}`,
            "left",
            "baseline"
          );
        }

      }

      // XLSX images
      if (Farmers_Picture) {
        const url = `https://kf.kobotoolbox.org/api/v2/assets/.../${Farmers_Picture}/medium/`;
        const base64 = await fetchImageBase64(url);
        if (base64) {
          const colIndex = 16;
          const cell = XLSX.utils.encode_cell({ c: colIndex, r: i + 1 });
          ws[cell] = { t: "s", v: `=IMAGE("data:image/jpeg;base64,${base64}")` };
        }
      }

      setProgress(Math.round(((i + 1) / rows.length) * 50));
    }

    // XLSX export
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const xlsxBlob = new Blob([wbout], { type: "application/octet-stream" });
    const a1 = document.createElement("a");
    a1.href = URL.createObjectURL(xlsxBlob);
    a1.download = "farmers_updated.xlsx";
    a1.click();

    setProgress(60);

    // DXF export
    const blob = new Blob([dxf.toDxfString()], {
      type: "application/dxf",
    });

    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a");
    a2.href = url;
    a2.download = "farms.dxf";
    a2.click();
    URL.revokeObjectURL(url);

    setProgress(100);
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

      <input hidden type="file" accept=".xlsx" ref={fileInputRef} onChange={handleFiles} multiple />

      <div className="file-list">
        {files.map((f, i) => (
          <div key={i}>
            {i + 1}. {f.name}
            <button className="remove-btn" onClick={() => removeFile(i)}>✖</button>
          </div>
        ))}
      </div>

      <button disabled={!files.length} onClick={processFiles}>Process XLSX + DXF</button>

      <div className="progress-bar">
        <div style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
}
