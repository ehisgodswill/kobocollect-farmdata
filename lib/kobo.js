const KOBO_BASE = "https://kf.kobotoolbox.org/api/v2";
const TOKEN = process.env.KOBO_TOKEN;

export async function koboFetch (path) {
  const res = await fetch(`${KOBO_BASE}${path}`, {
    headers: {
      Authorization: `Token ${TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Kobo error: ${res.status}`);
  }

  return res.json();
}