import type { ExpressionSpecification } from "maplibre-gl";
export const geometryClass = {
  pertanian: {
    label: "Pertanian",
    value: "pertanian",
    color: "#a1d99b",
  },
  lowVegetation: {
    label: "Low Vegetation",
    value: "low vegetation",
    color: "#ffffb2",
  },
  jalan: {
    label: "Jalan",
    value: "jalan",
    color: "#636363",
  },
  tanahKosong: {
    label: "Tanah Kosong",
    value: "tanah kosong",
    color: "#fdae6b",
  },
  pemukiman: {
    label: "Pemukiman",
    value: "pemukiman",
    color: "#b30000",
  },
  hutan: {
    label: "Hutan",
    value: "hutan",
    color: "#238b45",
  },
  badanAir: {
    label: "Badan Air",
    value: "badan air",
    color: "#08519c",
  },
  perkebunan: {
    label: "Perkebunan",
    value: "perkebunan",
    color: "#31a354",
  },
  other: {
    label: "Other",
    value: "other",
    color: "#cccccc",
  },
};

export const geometryOptions = [
  {
    color: geometryClass.pertanian.color,
    label: geometryClass.pertanian.label,
  },
  {
    color: geometryClass.lowVegetation.color,
    label: geometryClass.lowVegetation.label,
  },
  { color: geometryClass.jalan.color, label: geometryClass.badanAir.label },
  {
    color: geometryClass.tanahKosong.color,
    label: geometryClass.tanahKosong.label,
  },
  {
    color: geometryClass.pemukiman.color,
    label: geometryClass.pemukiman.label,
  },
  { color: geometryClass.hutan.color, label: geometryClass.hutan.label },
  { color: geometryClass.badanAir.color, label: geometryClass.badanAir.label },
  {
    color: geometryClass.perkebunan.color,
    label: geometryClass.perkebunan.label,
  },
  { color: geometryClass.other.color, label: geometryClass.other.label },
];

export const LandCoverClass = {
  vegetasiTinggi: {
    id: 1,
    label: "Vegetasi Tinggi",
    value: "vegetasi tinggi",
    color: "#166534",
  },
  vegetasiRendah: {
    id: 2,
    label: "Vegetasi Rendah",
    value: "vegetasi rendah",
    color: "#84cc16",
  },
  urban: {
    id: 3,
    label: "Emplacement",
    value: "emplacement",
    color: "#ef4444",
  },
  badanAir: {
    id: 4,
    label: "Badan Air",
    value: "badan air",
    color: "#3b82f6",
  },
  tanahTerbuka: {
    id: 5,
    label: "Tanah Terbuka",
    value: "tanah terbuka",
    color: "#d4d4d8",
  },
  sawit: {
    id: 6,
    label: "Sawit",
    value: "sawit",
    color: "#a16207",
  },
  teh: {
    id: 7,
    label: "Teh",
    value: "teh",
    color: "#22c55e",
  },
  tebu: {
    id: 8,
    label: "Tebu",
    value: "tebu",
    color: "#fbbf24",
  },
  perkebunanLain: {
    id: 9,
    label: "Perkebunan Lain",
    value: "perkebunan lain",
    color: "#22C55E",
  },
  sawah: {
    id: 10,
    label: "Sawah",
    value: "sawah",
    color: "#10b981",
  },
  jalan: {
    id: 11,
    label: "Jalan",
    value: "jalan",
    color: "#808080",
  },
};

export const LandCoverOptions = Object.values(LandCoverClass).map((item) => ({
  id: item.id,
  label: item.label,
  color: item.color,
}));

export const generateMatchRules = (): ExpressionSpecification[] => {
  const entries = Object.values(LandCoverClass).sort((a, b) => a.id - b.id);

  const rules: ExpressionSpecification[] = [];

  for (const item of entries) {
    rules.push(item.id as unknown as ExpressionSpecification);
    rules.push(item.color as unknown as ExpressionSpecification);
  }

  rules.push("transparent" as unknown as ExpressionSpecification);

  return rules;
};
