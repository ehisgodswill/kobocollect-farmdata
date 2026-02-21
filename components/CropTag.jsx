import React from "react";

function CropTag ({ crop }) {
  const name = crop["Crop_information/planted_Crops/Assessed_CropPlanted"] || "?";
  const pct = crop["Crop_information/planted_Crops/CropPercentage"] || "";
  const sym = crop["Crop_information/planted_Crops/CropPercentage_Symbol"] || "";
  const cat = crop["Crop_information/planted_Crops/Category_CropPlanted"] || "";

  return (
    <span className="crop-tag">
      <span className="crop-tag__dot" />
      {name}
      {pct && <strong className="crop-tag__pct">{pct}{sym}</strong>}
      {cat && <span className="crop-tag__cat">[{String(cat).toUpperCase()}]</span>}
    </span>
  );
}

export default React.memo(CropTag);