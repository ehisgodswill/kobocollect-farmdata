async function fetchImageBuffer (url) {
  if (!url) return null;

  try {
    const res = await fetch(url);
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
  width = 80,
  height = 80,
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
    });
  } catch (err) {
    console.warn("Image insert failed:", imageUrl, err);
  }
}
