import Drawing from "dxf-writer";
import proj4 from "proj4";
import { parseBoundary, closePolygon, buildFarmerId } from "./koboParser";

// Utility: calculate polygon centroid
function polygonCentroid (points) {
  let xSum = 0, ySum = 0, n = points.length;
  points.forEach(([x, y]) => { xSum += x; ySum += y; });
  return [xSum / n, ySum / n];
}

const WGS84 = "EPSG:4326";

function getUtmZone (lon, lat) {
  const zone = Math.floor((lon + 180) / 6) + 1;
  return lat >= 0
    ? `EPSG:${32600 + zone}` // northern hemisphere
    : `EPSG:${32700 + zone}`; // southern hemisphere
}

export function generateDxf (rows) {
  const dxf = new Drawing();
  dxf.setUnits("Meters");

  let allPoints = [];
  let processedPolygons = [];

  for (const row of rows) {
    if (!row.FarmBoundary) continue;

    const rawPoints = closePolygon(parseBoundary(row.FarmBoundary));
    if (!rawPoints?.length) continue;

    // 🔥 choose zone dynamically (safer)
    const sample = rawPoints[0];
    const utmCrs = getUtmZone(sample[0], sample[1]);

    const projectedPoints = rawPoints.map(([lon, lat]) =>
      proj4(WGS84, utmCrs, [lon, lat])
    );

    if (projectedPoints.length < 3) continue;

    allPoints.push(...projectedPoints);
    processedPolygons.push({ row, projectedPoints });
  }

  if (!allPoints.length) return "";

  let minX = Infinity;
  let minY = Infinity;

  for (const [x, y] of allPoints) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
  }

  const scale = 1;

  for (const { row, projectedPoints } of processedPolygons) {
    const farmerId = buildFarmerId(row);

    // const points = projectedPoints.map(([x, y]) => [
    //   ((x - minX) * scale),
    //   ((y - minY) * scale),
    // ]);
    const points = projectedPoints.map(([x, y]) => [
      Math.round(x),
      Math.round(y),
    ]);

    dxf.drawPolyline(points, true);

    const [cx, cy] = polygonCentroid(points);

    dxf.drawText(
      cx,
      cy,
      3,
      0,
      `${row.Name || ""}`,
      "center",
      "middle"
    );
  }

  return dxf.toDxfString();
}