import fetch from "node-fetch";

export default async function handler (req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  const username = process.env.KOBO_USERNAME;
  const password = process.env.KOBO_PASSWORD;

  try {
    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
    const response = await fetch(url, { headers: { Authorization: `Basic ${basicAuth}` } });
    const buffer = await response.arrayBuffer();
    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
