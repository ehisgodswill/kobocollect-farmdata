
const KOBO_TOKEN = "";

let parsedFarmers = [];
let generatedWorkbook = null;
let generatedDXF = null;

// ================= DOM =================

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const downloadXlsxBtn = document.getElementById("downloadXlsx");
const downloadDxfBtn = document.getElementById("downloadDxf");

// ================= PROJECTIONS =================

// Web Mercator → WGS84
const MERCATOR = "EPSG:3857";
const WGS84 = "EPSG:4326";

proj4.defs(
  MERCATOR,
  "+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
);

// ================= EVENTS =================

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", e => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// ================= MAIN PIPELINE =================

async function handleFile (file) {
  try {
    setProgress(5);
    setStatus("Reading Excel…");

    parsedFarmers = await parseInputXlsx(file);

    setProgress(30);
    setStatus(`Parsed ${parsedFarmers.length} farmers`);

    setStatus("Building output XLSX…");
    generatedWorkbook = await buildOutputWorkbook(parsedFarmers);

    setProgress(70);
    setStatus("Building DXF…");
    generatedDXF = buildDXF(parsedFarmers);

    setProgress(100);

    downloadXlsxBtn.disabled = false;
    downloadDxfBtn.disabled = false;

    setStatus("Ready for download ✅");
  } catch (err) {
    console.error(err);
    setStatus("❌ Failed to process file");
    setProgress(0);
  }
}

// ================= DOWNLOADS =================

downloadXlsxBtn.onclick = async () => {
  const buffer = await generatedWorkbook.xlsx.writeBuffer();
  downloadBlob(buffer, "Converted_Data.xlsx");
};

downloadDxfBtn.onclick = () => {
  const blob = new Blob([generatedDXF], { type: "application/dxf" });
  downloadBlob(blob, "Farm_Map.dxf");
};

// ================= HELPERS =================

function setStatus (msg) {
  statusEl.textContent = msg;
}

function downloadBlob (data, filename) {
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}



async function parseInputXlsx (file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const farmers = [];
  let currentFarmer = null;

  for (const row of rows) {
    const hasFarmerId = row["FarmerID"] && String(row["FarmerID"]).trim();

    // ✅ New farmer starts
    if (hasFarmerId) {
      currentFarmer = {
        id: row["FarmerID"],
        name: row["Name"],
        status: row["Status"],
        sex: row["Sex"],
        farm: row["Farm"],
        phone: row["Phone No"],
        caretaker: row["Caretaker"],
        hectrage: Number(row["Hectrage"]) || 0,
        percentage: row["Percentage"],
        area: row["Area (Ha)"],
        crop: row["Crop"],
        farmerPhoto: row["Farmer Photo"],
        farmPhoto: row["Farm Photo"],
        date: row["Date"],
        coords: []
      };

      farmers.push(currentFarmer);
    }

    // ✅ Append coordinates to current farmer
    if (currentFarmer && row["X-Cord"] && row["Y-Cord"]) {
      currentFarmer.coords.push([
        Number(row["X-Cord"]),
        Number(row["Y-Cord"])
      ]);
    }
  }

  return farmers;
}

async function fetchImageBuffer (url) {
  try {
    if (!url || typeof url !== "string") return null;
    if (!url.startsWith("http")) return null;

    const headers = {};

    if (KOBO_TOKEN) {
      headers["Authorization"] = KOBO_TOKEN;
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
      console.warn("Image fetch failed:", res.status);
      return null;
    }

    return await res.arrayBuffer();
  } catch (err) {
    console.warn("Image error:", err);
    return null;
  }
}

async function buildOutputWorkbook (farmers) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Farm Data");

  sheet.columns = [
    { header: "FarmerID", key: "id", width: 18 },
    { header: "Name", key: "name", width: 28 },
    { header: "Status", key: "status", width: 12 },
    { header: "Sex", key: "sex", width: 10 },
    { header: "Farm", key: "farm", width: 12 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Hectrage", key: "hectrage", width: 12 },
    { header: "Crop", key: "crop", width: 30 },
    { header: "Date", key: "date", width: 20 }
  ];

  let rowIndex = 2;

  for (const farmer of farmers) {
    const row = sheet.addRow({
      id: farmer.id,
      name: farmer.name,
      status: farmer.status,
      sex: farmer.sex,
      farm: farmer.farm,
      phone: farmer.phone,
      hectrage: farmer.hectrage,
      crop: farmer.crop,
      date: farmer.date
    });

    // ===== IMAGE INSERTION =====
    await tryInsertImage(workbook, sheet, farmer.farmerPhoto, rowIndex, 9);
    await tryInsertImage(workbook, sheet, farmer.farmPhoto, rowIndex, 10);

    rowIndex++;
  }

  return workbook;
}

async function tryInsertImage (workbook, sheet, url, row, col) {
  const buffer = await fetchImageBuffer(url);
  if (!buffer) return;

  try {
    const imageId = workbook.addImage({
      buffer,
      extension: "jpeg"
    });

    sheet.addImage(imageId, {
      tl: { col: col - 1, row: row - 1 },
      ext: { width: 110, height: 110 }
    });
  } catch (e) {
    console.warn("Image insert failed", e);
  }
}

function buildDXF (farmers) {
  let dxf = `
0
SECTION
2
ENTITIES
`;

  farmers.forEach(farmer => {
    if (!farmer.coords.length) return;

    // ===== convert + clean coords =====
    let coords = farmer.coords
      .map(([x, y]) => mercatorToWGS84(x, y))
      .filter(c => isFinite(c[0]) && isFinite(c[1]));

    if (coords.length < 3) return;

    // ===== AUTO CLOSE POLYGON =====
    const first = coords[0];
    const last = coords[coords.length - 1];

    const closed =
      Math.abs(first[0] - last[0]) < 1e-9 &&
      Math.abs(first[1] - last[1]) < 1e-9;

    if (!closed) {
      coords.push([...first]);
    }

    // ===== LWPOLYLINE =====
    dxf += `
0
LWPOLYLINE
8
FARM_BOUNDARY
90
${coords.length}
70
1
`;

    coords.forEach(([lon, lat]) => {
      dxf += `
10
${lon}
20
${lat}
`;
    });

    // ===== LABEL =====
    const [lx, ly] = coords[0];

    dxf += `
0
TEXT
8
FARM_LABELS
10
${lx}
20
${ly}
30
0
40
2.5
1
${sanitizeDXFText(farmer.name)} (${farmer.id})
`;
  });

  dxf += `
0
ENDSEC
0
EOF
`;

  return dxf;
}

function sanitizeDXFText (text) {
  return String(text || "")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ")
    .slice(0, 200);
}

function mercatorToWGS84 (x, y) {
  try {
    const [lon, lat] = proj4(MERCATOR, WGS84, [x, y]);
    return [lon, lat];
  } catch {
    return [x, y]; // fallback
  }
}
