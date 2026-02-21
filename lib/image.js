/* async function fetchImageBuffer (url) {
  if (!url) return null;

  try {
    const headers = {};
    if (process.env.KOBO_USER || process.env.KOBO_PASS) {
      const creds = `${process.env.KOBO_USER || ""}:${process.env.KOBO_PASS || ""}`;
      headers.Authorization = `Token ${Buffer.from(creds).toString("base64")}`;
    }

    const res = await fetch(url, { method: "GET", headers });

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      console.warn("Not an image:", url);
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      extension: contentType.includes("png") ? "png" : "jpeg",
    };
  } catch (err) {
    console.warn("Image fetch failed:", err.message || err);
    return null;
  }
} */

async function fetchImageBuffer (url) {
  if (!url) return null;

  try {
    const KOBO_TOKEN = process.env.KOBO_TOKEN;

    const res = await fetch(url,
      {
        headers: {
          Authorization: `Token ${KOBO_TOKEN}`,
        },
      });
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export async function addImageToSheet ({
  workbook,
  sheet,
  imageUrl,
  rowNumber,
  col,
  width = 180,
  height = 180,
}) {
  try {
    if (!imageUrl) return;

    const buffer = await fetchImageBuffer(imageUrl);
    if (!buffer) return;

    const imageId = workbook.addImage({
      buffer,
      extension: "jpeg",
    });

    sheet.addImage(imageId, {
      tl: { col, row: rowNumber - 1 },
      ext: { width, height },
      editAs: "oneCell",
    });
  } catch (err) {
    console.warn("Image insert failed:", imageUrl, err);
  }
}
