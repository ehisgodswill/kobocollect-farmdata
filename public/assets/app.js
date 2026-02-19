// app.js
let KOBO_TOKEN = null;
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const uploadBox = document.getElementById("uploadBox");

// Login handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginStatus.textContent = "Authenticating…";
  const username = document.getElementById("koboUser").value.trim();
  const password = document.getElementById("koboPass").value.trim();

  try {
    const basicAuth = btoa(`${username}:${password}`);
    const res = await fetch("/api/kobo-token", {
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    const data = await res.json();
    if (!data.token) throw new Error("No token returned");

    KOBO_TOKEN = data.token;
    loginStatus.textContent = "✅ Logged in";
    loginForm.style.display = "none";
    uploadBox.style.display = "block";
  } catch (err) {
    console.error(err);
    loginStatus.textContent = "❌ Login failed";
  }
});

// -------------------- XLSX Drag & Drop --------------------
const dropArea = document.getElementById("drop-area");
const dropFiles = document.getElementById("drop-files");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
let allFiles = [];

["dragenter", "dragover"].forEach(ev =>
  dropArea.addEventListener(ev, (e) => e.preventDefault())
);
["dragleave", "drop"].forEach(ev =>
  dropArea.addEventListener(ev, (e) => e.preventDefault())
);

dropArea.addEventListener("drop", handleDrop);
dropArea.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel";
  fileInput.addEventListener("change", (e) => handleDrop({ dataTransfer: { files: e.target.files } }));
  fileInput.click();
});

async function handleDrop (event) {
  const files = event.dataTransfer.files;
  if (!files.length) return;
  allFiles = Array.from(files);
  dropFiles.innerHTML = "";
  allFiles.forEach((f, i) => {
    dropFiles.innerHTML += `<div>${i + 1}) ${f.name}</div>`;
  });

  progressContainer.style.display = "block";
  progressBar.value = 0;

  await processXlsx(allFiles[0]);
  progressBar.value = 100;
}

import { DxfWriter } from "dxf-writer"; 

async function processXlsx (file) {
  const workbook = await XlsxPopulate.fromDataAsync(await file.arrayBuffer());
  const sheet = workbook.sheet(0);

  const WGS84 = "EPSG:4326";
  const WebMercator = "EPSG:3857";

  const data = [];
  const maxRows = sheet.usedRange()._maxRowNumber;
  const progressStep = 100 / maxRows;

  for (let r = 2; r <= maxRows; r++) { // skip header
    const row = sheet.row(r);
    const obj = {
      FarmerID: row.cell("A").value(),
      Name: row.cell("C").value(),
      FarmBoundary: row.cell("H").value(), // assuming polygon string: "x y; x y; ..."
      FarmerPhotoUrl: row.cell("M").value(), // replace with actual Kobo URL
      FarmPhotoUrl: row.cell("N").value(),
    };

    // parse and convert coordinates
    obj.Cords = obj.FarmBoundary
      .trim()
      .split(";")
      .map((cord) => {
        const [x, y] = cord.trim().split(" ").map(Number);
        const [lon, lat] = proj4(WebMercator, WGS84, [x, y]);
        return [lon, lat];
      });

    // auto-close polygon
    if (
      obj.Cords.length &&
      (obj.Cords[0][0] !== obj.Cords[obj.Cords.length - 1][0] ||
        obj.Cords[0][1] !== obj.Cords[obj.Cords.length - 1][1])
    ) {
      obj.Cords.push([...obj.Cords[0]]);
    }

    data.push(obj);
    progressBar.value += progressStep;
  }

  // -------------------- Insert images into XLSX --------------------
  for (let i = 0; i < data.length; i++) {
    const obj = data[i];

    if (obj.FarmerPhotoUrl) {
      const buffer = await fetchImageBuffer(obj.FarmerPhotoUrl);
      sheet.addImage({
        image: buffer,
        type: "picture",
        position: { row: i + 2, col: 12 }, // M column
      });
    }

    if (obj.FarmPhotoUrl) {
      const buffer = await fetchImageBuffer(obj.FarmPhotoUrl);
      sheet.addImage({
        image: buffer,
        type: "picture",
        position: { row: i + 2, col: 13 }, // N column
      });
    }
  }

  // -------------------- Generate DXF --------------------
  const dxf = new DxfWriter();
  dxf.setUnits('Meters');

  for (const obj of data) {
    dxf.addLayer(obj.FarmerID, DxfWriter.COLOR.BLUE);
    dxf.addPolyline(obj.Cords, { layer: obj.FarmerID, closed: true });
    // add farmer name & ID as text
    const [cx, cy] = obj.Cords[0]; // use first point as label
    dxf.addText(`${obj.Name} (${obj.FarmerID})`, cx, cy, 0.5, { layer: obj.FarmerID });
  }

  // -------------------- Download XLSX --------------------
  const blobXlsx = await workbook.outputAsync({ type: "blob" });
  const aXlsx = document.createElement("a");
  aXlsx.href = URL.createObjectURL(blobXlsx);
  aXlsx.download = "FarmData.xlsx";
  aXlsx.click();

  // -------------------- Download DXF --------------------
  const blobDxf = new Blob([dxf.toDxfString()], { type: "application/dxf" });
  const aDxf = document.createElement("a");
  aDxf.href = URL.createObjectURL(blobDxf);
  aDxf.download = "FarmData.dxf";
  aDxf.click();

  progressBar.value = 100;
}

// -------------------- Helper for image fetch --------------------
async function fetchImageBuffer (url) {
  const proxyUrl = `/api/kobo-image?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  return await res.arrayBuffer();
}
