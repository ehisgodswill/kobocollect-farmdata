export function parseBoundary (boundary) {
  if (!boundary) return [];

  return boundary
    .split(";")
    .map((chunk) => {
      const parts = chunk.trim().split(" ");

      const lat = Number(parts[0]);
      const lon = Number(parts[1]);

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

      return [lon, lat]; // DXF uses X=lon, Y=lat
    })
    .filter(Boolean);
}

export function closePolygon (points) {
  if (points.length < 3) return points;

  const [fx, fy] = points[0];
  const [lx, ly] = points[points.length - 1];

  if (fx !== lx || fy !== ly) {
    points.push([fx, fy]);
  }

  return points;
}

export function buildFarmerId (row) {
  const startDate = row.start;
  const date = new Date(startDate);

  return `0${row.Collector_Id}${String(row.Farmers_ID).padStart(2, "0")}-${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear() - 2000}`;
}