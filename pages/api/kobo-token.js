import fetch from "node-fetch";

export default async function handler (req, res) {
  const username = process.env.KOBO_USERNAME;
  const password = process.env.KOBO_PASSWORD;

  if (!username || !password) return res.status(500).json({ error: "Missing credentials" });

  try {
    const basicAuth = Buffer.from(`${username}:${password}`).toString("base64");
    const response = await fetch("https://kf.kobotoolbox.org/token/?format=json", {
      method: "GET",
      headers: { Authorization: `Basic ${basicAuth}` },
    });
    const data = await response.json();

    if (!data.token) return res.status(500).json({ error: "No token" });

    res.status(200).json({ token: `Token ${data.token}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
