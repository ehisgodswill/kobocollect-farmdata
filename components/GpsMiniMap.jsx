import React, { useMemo } from "react";

function GpsMiniMap ({ points }) {
  const geometry = useMemo(() => {
    if (!points.length) return null;

    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return { minLat, maxLat, minLng, maxLng };
  }, [points]);
  if (!geometry) return null;

  const { minLat, maxLat, minLng, maxLng } = geometry;
  const W = 200, H = 120, PAD = 10;
  const toX = lng => PAD + ((lng - minLng) / (maxLng - minLng || 1)) * (W - PAD * 2);
  const toY = lat => PAD + ((maxLat - lat) / (maxLat - minLat || 1)) * (H - PAD * 2);
  const pts = points.map(p => `${toX(p.lng)},${toY(p.lat)}`).join(" ");



  return (
    <div className="gps-map">
      <svg width={W} height={H} className="gps-map__svg">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <polygon className="gps-map__polygon" points={pts} filter="url(#glow)" />
        {points.map((p, i) => (
          <circle key={i}
            cx={toX(p.lng)} cy={toY(p.lat)}
            r={i === 0 ? 4 : 2}
            className={i === 0 ? "gps-map__dot gps-map__dot--first" : "gps-map__dot"}
          />
        ))}
      </svg>
      <p className="gps-map__label">{points.length} GPS points</p>
    </div>
  );
}

export default React.memo(GpsMiniMap);