import { generateMatchRules } from "@/constant/landcover.constant";
import { ExpressionSpecification, LayerSpecification } from "maplibre-gl";
import { PMTiles } from "pmtiles";
type FillPaint = Extract<LayerSpecification, { type: "fill" }>["paint"];
export async function getFirstVectorLayer(url: string): Promise<string | null> {
  try {
    const p = new PMTiles(url);
    // Ambil metadata (ini melakukan HTTP Range request kecil)
    const metadata: any = await p.getMetadata();

    // Cek apakah ada vector_layers
    if (metadata.vector_layers && metadata.vector_layers.length > 0) {
      // Mengembalikan ID layer pertama (biasanya cuma ada satu)
      return metadata.vector_layers[0].id;
    }
    return null;
  } catch (e) {
    console.error("Gagal baca metadata PMTiles:", e);
    return null;
  }
}
export function extractSourceLayerInfo(url: string): {
  type: "mbtiles" | "geojson" | "vector" | "raster" | "unknown";
  name: string | undefined;
} {
  if (!url) return { type: "unknown", name: undefined };

  const lower = url.toLowerCase().trim();

  // --- Detect type ---
  let type: "mbtiles" | "geojson" | "vector" | "raster" | "unknown" = "unknown";

  if (lower.endsWith(".geojson") || lower.includes("geojson")) {
    type = "geojson";
  } else if (lower.endsWith(".mbtiles") || lower.includes("mbtiles")) {
    type = "mbtiles";
  } else if (lower.includes(".pbf") || lower.includes("{z}/{x}/{y}.pbf")) {
    type = "vector";
  } else if (
    lower.endsWith(".png") ||
    lower.includes("{z}/{x}/{y}.png") ||
    lower.includes("raster")
  ) {
    type = "raster";
  }

  const parts = url.split("/");

  // --- Find the segment before tile placeholders ---
  const placeholderIndex = parts.findIndex(
    (p) => p.includes("{z}") || p.includes("{x}") || p.includes("{y}"),
  );

  // Prefer folder before placeholders
  let candidate =
    placeholderIndex > 0
      ? parts[placeholderIndex - 1]
      : parts[parts.length - 1];

  // Remove query params
  candidate = candidate.split("?")[0];

  // If candidate still contains placeholders, skip to previous folder
  if (/\{z\}|\{x\}|\{y\}/.test(candidate)) {
    if (placeholderIndex > 1) {
      candidate = parts[placeholderIndex - 2];
    }
  }

  // Clean extensions
  candidate = candidate
    .replace(".geojson", "")
    .replace(".mbtiles", "")
    .replace(".pbf", "")
    .replace(".png", "");

  return {
    type,
    name: candidate || undefined,
  };
}

export const LandCoverPaint = (
  primary: string,
  fallback: string,
): FillPaint => ({
  "fill-color": [
    "match",
    ["coalesce", ["get", primary], ["get", fallback]],
    ...generateMatchRules(),
  ] as unknown as ExpressionSpecification,
  "fill-opacity": 0.5,
});

export function createColorExpression(
  colors: Record<string, string>,
  fieldName: string,
  defaultColor: string,
) {
  return [
    "match",
    ["get", fieldName],
    ...Object.entries(colors).flat(),
    defaultColor,
  ] as any;
}

export function createColorExpressionWithFallback(
  colors: Record<string, string>,
  fields: string[],
  defaultColor: string = "#cccccc",
) {
  // Build the coalesce expression to try multiple fields
  const fieldExpression =
    fields.length === 1
      ? ["get", fields[0]]
      : ["coalesce", ...fields.map((field) => ["get", field])];

  return [
    "match",
    fieldExpression,
    ...Object.entries(colors).flat(),
    defaultColor,
  ] as any;
}
