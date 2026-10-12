import { create } from "zustand";

interface ChangeDetectionState {
  tutupanKiri: string | null;
  tutupanKanan: string | null;

  basemapKiri: string | null;
  basemapKanan: string | null;

  setTutupanKiri: (url: string | null) => void;
  setTutupanKanan: (url: string | null) => void;

  setBasemapKiri: (url: string | null) => void;
  setBasemapKanan: (url: string | null) => void;

  resetTutupan: () => void;
}

export const useSumutComparisonStore = create<ChangeDetectionState>((set) => ({
  tutupanKiri:
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2021.pmtiles",
  tutupanKanan:
    "https://pmtiles-collection.s3.ap-southeast-1.amazonaws.com/sumut_2022.pmtiles",

  basemapKiri:
    "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg",
  basemapKanan:
    "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2022_3857/default/g/{z}/{y}/{x}.jpg",

  setTutupanKiri: (url) => set({ tutupanKiri: url }),
  setTutupanKanan: (url) => set({ tutupanKanan: url }),

  setBasemapKiri: (year) => set({ basemapKiri: year }),
  setBasemapKanan: (year) => set({ basemapKanan: year }),

  resetTutupan: () => set({ tutupanKiri: null, tutupanKanan: null }),
}));
