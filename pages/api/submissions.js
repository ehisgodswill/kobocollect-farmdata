export default async function handler (req, res) {
  try {
    const { assetUid, page = 1 } = req.query;
    const KOBO_TOKEN = process.env.KOBO_TOKEN;

    if (!assetUid) {
      return res.status(400).json({ error: "assetUid required" });
    }

    const url =
      `https://kf.kobotoolbox.org/api/v2/assets/${assetUid}/data/` +
      `?format=json&page=${page}&page_size=100`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Token ${KOBO_TOKEN}`,
      },
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: text });
    }

    const data = await r.json();

    res.status(200).json({
      results: data.results || [],
      next: data.next || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
}