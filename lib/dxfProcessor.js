import Drawing from "dxf-writer";
import { parseBoundary, closePolygon } from "./koboParser";

export function generateDxf (rows) {
  const dxf = new Drawing();
  dxf.setUnits("Meters");

  rows.forEach((row) => {
    if (!row.FarmBoundary) return;

    const points = closePolygon(parseBoundary(row.FarmBoundary));
    if (points.length < 3) return;

    dxf.drawPolyline(points, true);

    const [x, y] = points[0];
    dxf.drawText(
      x,
      y,
      2,
      0,
      `${row.Farmers_ID} ${row.Name || ""}`,
      "left",
      "baseline"
    );
  });

  return dxf.toDxfString();
}