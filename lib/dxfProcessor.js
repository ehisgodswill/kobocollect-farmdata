import Drawing from "dxf-writer";
import proj4 from "proj4";
import { parseBoundary, closePolygon, buildFarmerId } from "./koboParser";

// Utility: calculate polygon centroid
function polygonCentroid (points) {
  let xSum = 0, ySum = 0, n = points.length;
  points.forEach(([x, y]) => { xSum += x; ySum += y; });
  return [xSum / n, ySum / n];
}

export function generateDxf (rows) {
  const dxf = new Drawing();
  dxf.setUnits("Meters");

  const WGS84 = "EPSG:4326";
  const UTM = "EPSG:32631"; // Edo State

  let allPoints = [];
  let processedPolygons = [];

  rows.forEach((row) => {
    if (!row.FarmBoundary) return;

    const rawPoints = closePolygon(parseBoundary(row.FarmBoundary));
    let projectedPoints = rawPoints.map(([lon, lat]) => proj4(WGS84, UTM, [lon, lat]));

    if (projectedPoints.length < 3) return;

    allPoints.push(...projectedPoints);
    processedPolygons.push({ row, projectedPoints });
  });

  if (allPoints.length === 0) return "";

  const minX = Math.min(...allPoints.map(([x]) => x));
  const minY = Math.min(...allPoints.map(([_, y]) => y));

  processedPolygons.forEach(({ row, projectedPoints }) => {
    const farmerId = buildFarmerId(row);

    // Center and scale polygon
    const scale = 0.5;
    const points = projectedPoints.map(([x, y]) => [(x - minX) * scale, (y - minY) * scale]);

    dxf.drawPolyline(points, true);

    // Draw text at centroid
    const [cx, cy] = polygonCentroid(points);
    const textHeight = 3; // tweak if needed
    dxf.drawText(
      cx,
      cy,
      textHeight,
      0,
      `${farmerId} ${row.Name || ""}`,
      "center",
      "middle"
    );
  });

  return dxf.toDxfString();
}