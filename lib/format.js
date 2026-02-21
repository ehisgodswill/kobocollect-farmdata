export function formatDate (iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function cleanKey (key) {
  return key.replace(/^.*\//, "").replace(/_/g, " ");
}

export function getSubmissionDate (sub) {
  if (sub.today) return sub.today;
  if (sub.end) return sub.end.slice(0, 10);
  return "unknown";
}

export function formatGroupDate (dateStr) {
  if (dateStr === "unknown") return "Unknown Date";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function parseGPS (str) {
  if (!str) return [];
  return str.trim().split(";").map((pt) => {
    const [lat, lng, alt, acc] = pt.trim().split(" ").map(Number);
    return { lat, lng, alt, acc };
  });
}