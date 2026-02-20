// lib/boundary.js

export function extractXY (boundary) {
  if (!boundary) return [];

  return boundary
    .split(";")
    .map((chunk) => {
      const parts = chunk.trim().split(" ");
      const x = Number(parts[0]);
      const y = Number(parts[1]);

      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y };
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