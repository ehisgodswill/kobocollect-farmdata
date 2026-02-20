import XLSX from "xlsx";

export function extractKoboData (workbook) {
  const sheetNames = workbook.SheetNames;

  // main sheet = first sheet
  const mainSheet = workbook.Sheets[sheetNames[0]];
  const mainRows = XLSX.utils.sheet_to_json(mainSheet, {
    raw: false,
    cellDates: true,
    defval: ""
  });

  // find planted crops sheet
  const cropSheetName = sheetNames.find((n) =>
    n.toLowerCase().includes("planted")
  );

  let plantedCropsMap = {};

  if (cropSheetName) {
    const cropSheet = workbook.Sheets[cropSheetName];
    const cropRows = XLSX.utils.sheet_to_json(cropSheet, {
      raw: false,
      defval: ""
    });

    for (const crop of cropRows) {
      const parent = crop._parent_index;

      const str = `${crop.Assessed_CropPlanted || ""} ${crop.CropPercentage || ""
        }${Number(crop.CropPercentage) ? "%" : ""} ${(crop.Category_CropPlanted || "").toUpperCase()
        };`;

      if (!plantedCropsMap[parent]) {
        plantedCropsMap[parent] = [];
      }

      plantedCropsMap[parent].push(str);
    }
  }

  return {
    data: mainRows,
    crop: plantedCropsMap,
  };
}