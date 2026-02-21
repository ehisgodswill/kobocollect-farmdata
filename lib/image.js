async function fetchImageBuffer (url) {
  try {
    const res = await fetch(imageProxyUrl(url));
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (e) {
    console.warn("Image fetch failed:", url);
    return null;
  }
}
export function imageProxyUrl (originalUrl) {
  return `/api/attachment?url=${encodeURIComponent(originalUrl)}`;
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
