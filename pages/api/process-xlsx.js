import { generateExcel } from "@/lib/excelProcessor";

export default async function handler (req, res) {
  try {
    const { assetUid, ids } = req.body;
    const KOBO_TOKEN = process.env.KOBO_TOKEN;

    if (!assetUid || !ids?.length) {
      return res.status(400).json({ error: "Missing params" });
    }

    // fetch selected submissions only
    const url =
      `https://kf.kobotoolbox.org/api/v2/assets/${assetUid}/data/` +
      `?format=json&query={"_id":{"$in":[${ids.join(",")} ]}}`;

    const r = await fetch(url, {
      headers: { Authorization: `Token ${KOBO_TOKEN}` },
    });

    const data = await r.json();
    const rows = data.results || [];

    const buffer = await generateExcel(rows);

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=kobo_export.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "xlsx generation failed" });
  }
}