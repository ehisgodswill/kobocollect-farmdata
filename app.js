// ================= STATE =================

let parsedFarmers = [];
let generatedWorkbook = null;
let generatedDXF = null;

// ================= DOM =================

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");
const downloadXlsxBtn = document.getElementById("downloadXlsx");
const downloadDxfBtn = document.getElementById("downloadDxf");

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
    setStatus("Reading Excel…");

    parsedFarmers = await parseInputXlsx(file);

    setStatus(`Parsed ${parsedFarmers.length} farmers`);

    setStatus("Building output XLSX…");
    generatedWorkbook = await buildOutputWorkbook(parsedFarmers);

    setStatus("Building DXF…");
    generatedDXF = buildDXF(parsedFarmers);

    downloadXlsxBtn.disabled = false;
    downloadDxfBtn.disabled = false;

    setStatus("Ready for download ✅");

  } catch (err) {
    console.error(err);
    setStatus("❌ Failed to process file");
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

// ================= PLACEHOLDERS (NEXT STEP) =================

// TODO
async function parseInputXlsx (file) {
  throw new Error("parseInputXlsx not implemented");
}

// TODO
async function buildOutputWorkbook (data) {
  throw new Error("buildOutputWorkbook not implemented");
}

// TODO
function buildDXF (data) {
  throw new Error("buildDXF not implemented");
}
