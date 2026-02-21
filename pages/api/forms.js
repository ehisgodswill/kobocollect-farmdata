export default async function handler (req, res) {
  try {
    const KOBO_TOKEN = process.env.KOBO_TOKEN;

    const r = await fetch(
      "https://kf.kobotoolbox.org/api/v2/assets/?format=json",
      {
        headers: {
          Authorization: `Token ${KOBO_TOKEN}`,
        },
      }
    );

    if (!r.ok) {
      const text = await r.text();
      return res.status(500).json({ error: text });
    }

    const data = await r.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
}