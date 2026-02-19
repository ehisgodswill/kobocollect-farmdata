import { useState } from "react";
import XLSXPopulate from "xlsx-populate";
import proj4 from "proj4";
import { DxfWriter } from "dxf-writer";
import "../pages/style.css";

export default function Home () {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);

  const handleFiles = (e) => {
    const uploaded = Array.from(e.target.files);
    setFiles(uploaded);
  };

  const fetchImageBlob = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return blob;
    } catch (err) {
      console.warn("Failed to fetch image:", url, err);
      return null;
    }
  };

  const processFiles = async () => {
    if (!files.length) return alert("Upload a file first");
    const file = files[0];
    setProgress(0);

    // 1️⃣ Load XLSX
    const arrayBuffer = await file.arrayBuffer();
    const workbook = await XLSXPopulate.fromDataAsync(arrayBuffer);
    const sheet = workbook.sheet(0);
    const rows = sheet.usedRange().value().slice(1); // skip header
    const totalRows = rows.length;

    // 2️⃣ DXF setup
    const dxf = new DxfWriter();
    dxf.setUnits("Meters");

    for (let i = 0; i < totalRows; i++) {
      const row = rows[i];
      const farmerId = row[0];
      const name = row[2];
      const coordsStr = row[7]; // column H
      const farmerPhotoUrl = row[11]; // column M

      // Convert coordinates → WGS84
      if (coordsStr) {
        let coords = coordsStr
          .trim()
          .split(";")
          .map((c) => c.trim().split(" ").map(Number))
          .map(([x, y]) => proj4("EPSG:3857", "EPSG:4326", [x, y]));

        // Auto-close polygon
        if (coords.length > 2 && (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1])) {
          coords.push(coords[0]);
        }

        // DXF polygon
        dxf.addPolyline(coords.map(([lon, lat]) => [lon, lat]));

        // DXF text
        const [tx, ty] = coords[0];
        dxf.addText(`${farmerId} ${name}`, tx, ty, 2);
      }

      // Insert image into XLSX
      if (farmerPhotoUrl) {
        const blob = await fetchImageBlob(farmerPhotoUrl);
        if (blob) {
          const buffer = await blob.arrayBuffer();
          sheet.addImage({
            image: buffer,
            type: "picture",
            position: { row: i + 2, column: 12 }, // column M
            scale: 0.3,
          });
        }
      }

      setProgress(Math.round(((i + 1) / totalRows) * 50));
    }

    // 3️⃣ Save XLSX
    const xlsxBlob = await workbook.outputAsync({ type: "blob" });
    const xlsxLink = document.createElement("a");
    xlsxLink.href = URL.createObjectURL(xlsxBlob);
    xlsxLink.download = "farmers_updated.xlsx";
    xlsxLink.click();

    setProgress(60);

    // 4️⃣ Save DXF
    const dxfBlob = new Blob([dxf.toDxfString()], { type: "application/dxf" });
    const dxfLink = document.createElement("a");
    dxfLink.href = URL.createObjectURL(dxfBlob);
    dxfLink.download = "farmers.dxf";
    dxfLink.click();

    setProgress(100);
  };

  return (
    <div className="container">
      <h2>Farm XLSX → DXF Tool</h2>

      <div className="upload-section">
        <input type="file" accept=".xlsx" onChange={handleFiles} />
        <button onClick={processFiles} style={{ marginLeft: "10px" }}>
          Process XLSX + DXF
        </button>

        <div
          className="progress-bar"
          style={{ border: "1px solid #000", width: "100%", height: "10px", marginTop: "10px" }}
        >
          <div style={{ width: `${progress}%`, background: "green", height: "100%" }}></div>
        </div>
      </div>
    </div>
  );
}
