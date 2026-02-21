export default async function handler (req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).end("Missing url");

  const upstream = await fetch(decodeURIComponent(url), {
    headers: {
      Authorization: `Token ${process.env.KOBO_TOKEN}`,
    },
  });

  if (!upstream.ok) return res.status(upstream.status).end("Upstream error");

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, max-age=3600");

  // Stream the body straight through
  const buffer = await upstream.arrayBuffer();
  res.send(Buffer.from(buffer));
}