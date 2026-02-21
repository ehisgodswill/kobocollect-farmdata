import ExcelJS from "exceljs";
import { buildFarmerId, getCropText } from "./koboParser";
import { extractXY } from "./boundary";
import { addImageToSheet } from "./image";

export async function generateExcel (rows, setProgress) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");

  // headers
  sheet.columns = [
    { header: "FarmerID", key: "farmerId", width: 20 },
    { header: "Status", key: "status", width: 12 },
    { header: "Name", key: "name", width: 25 },
    { header: "Sex", key: "sex", width: 10 },
    { header: "Farm", key: "farm", width: 12 },
    { header: "Phone No", key: "phone", width: 18 },
    { header: "Caretaker", key: "caretaker", width: 25 },
    { header: "Hectrage", key: "ha", width: 12 },
    { header: "Percentage", key: "percentage", width: 12 },
    { header: "Area (Ha)", key: "area", width: 12 },
    {
      header: "Crop",
      key: "crop",
      width: 20,
      style: { alignment: { horizontal: "center", wrapText: true } },
    },
    { header: "Farmer", key: "farmer", width: 25 },
    { header: "Farm pic", key: "farmp", width: 25 },
    { header: "uuid", key: "uuid", width: 10, hidden: true },
    { header: "Date", key: "date", width: 25 },
    { header: "X-Cord", key: "x", width: 10 },
    { header: "Y-Cord", key: "y", width: 10 },
  ];

  sheet.getRow(1).font = {
    name: "Serif",
    size: 14,
    bold: true,
  };

  let i = 0;
  for (const row of rows) {
    const farmerId = buildFarmerId(row);

    const coords = extractXY(row.FarmBoundary);
    const startRowNumber = sheet.rowCount + 1;

    const excelRow = sheet.addRow({
      farmerId,
      status: row.Respondent_Status,
      name: row.Name?.trim(),
      sex: row.Sex,
      farm: `Farm${row.FarmStatus}`,
      phone: String(row.Phone_No || "").trim(),
      caretaker: row.Caretaker,
      ha: Number(row.Total_Area_Ha),
      percentage: row.AreaCropped + "%",
      area: Number(
        parseFloat(row.Total_Area_Ha * row.AreaCropped * 0.01).toFixed(2)
      ),
      crop: getCropText(row),
      uuid: row._uuid,
      date: new Date(row.start).toDateString(),
      x: coords[0]?.x ?? "",
      y: coords[0]?.y ?? "",
    });

    for (let i = 1; i < coords.length; i++) {
      sheet.addRow({
        x: coords[i].x,
        y: coords[i].y,
      });
    }

    const endRowNumber = sheet.rowCount;
    if (endRowNumber > startRowNumber) {
      const mergeCols = [
        "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O",
      ];

      for (const col of mergeCols) {
        sheet.mergeCells(`${col}${startRowNumber}:${col}${endRowNumber}`);
        const masterCell = sheet.getCell(`${col}${startRowNumber}`);
        masterCell.alignment = { ...(masterCell.alignment || {}), vertical: "top" };
      }
    }

    const attachments = Object.fromEntries(
      (row._attachments || [])
        .filter((a) => !a.is_deleted)
        .map((a) => [a.question_xpath, a])
    );

    const imageColumns = {
      Farmers_Picture: 11,
      Density_Picture: 12,
    };

    const tasks = Object.entries(imageColumns).reduce((acc, [key, col]) => {
      const att = attachments[key];
      if (!att) return acc;
      acc.push(
        addImageToSheet({
          workbook,
          sheet,
          imageUrl: att.download_small_url,
          rowNumber: excelRow.number,
          col,
        })
      );
      return acc;
    }, []);

    if (tasks.length) await Promise.all(tasks);

    // progress callback
    if (setProgress) {
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    i++;
  }

  return workbook.xlsx.writeBuffer();
}