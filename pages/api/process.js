import XLSX from "xlsx";
import { generateExcel } from "@/lib/excelProcessor";
import { generateDxf } from "@/lib/dxfProcessor";
import { extractKoboData } from "@/lib/koboCrops";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler (req, res) {
  try {
    const buffers = [];

    for await (const chunk of req) {
      buffers.push(chunk);
    }

    const fileBuffer = Buffer.concat(buffers);
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const resultObj = extractKoboData(workbook);
    const rows = resultObj.data;
    const excelBuffer = await generateExcel(rows, resultObj.crop);
    const dxfString = generateDxf(rows);

    res.status(200).json({
      excel: Buffer.from(excelBuffer).toString("base64"),
      dxf: Buffer.from(dxfString).toString("base64"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Processing failed" });
  }
}