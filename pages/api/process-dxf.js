import { generateDxf } from "@/lib/dxfProcessor";

export default async function handler (req, res) {
  try {
    const { assetUid, ids } = req.body;
    const KOBO_TOKEN = process.env.KOBO_TOKEN;

    const url =
      `https://kf.kobotoolbox.org/api/v2/assets/${assetUid}/data/` +
      `?format=json&query={"_id":{"$in":[${ids.join(",")} ]}}`;

    const r = await fetch(url, {
      headers: { Authorization: `Token ${KOBO_TOKEN}` },
    });

    const data = await r.json();
    const rows = data.results || [];

    const dxfString = generateDxf(rows);

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=kobo_export.dxf"
    );
    res.setHeader("Content-Type", "application/dxf");

    res.status(200).send(dxfString);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DXF generation failed" });
  }
}